using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Seatify.Application.Common.Exceptions;
using Seatify.Application.DTOs.Chatbot;
using Seatify.Application.Interfaces;
using Seatify.Domain.Enums;
using Seatify.Infrastructure.Options;
using Seatify.Infrastructure.Persistence;

namespace Seatify.Infrastructure.Services;

/// <summary>Real chatbot backend — calls OpenRouter's OpenAI-compatible chat completions API
/// with a strict domain-scoped system prompt plus a live snapshot of Seatify's own venue/table
/// data, so answers about "what's open" or "how many tables does X have" are grounded in the
/// actual database rather than the model's imagination. Falls back to a canned Azerbaijani
/// message (never throws to the caller) whenever the API key is missing or the request fails —
/// a flaky/misconfigured LLM provider shouldn't 500 the chat widget.</summary>
public class OpenRouterChatbotService : IChatbotService
{
    private const string FallbackReply =
        "Bağışlayın, hazırda köməkçi xidmətinə qoşula bilmirəm. Zəhmət olmasa bir az sonra yenidən cəhd edin.";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private const string SystemPromptTemplate = """
        You are the official, specialized AI Virtual Assistant for the Seatify Reservation Platform.

        STRICT OPERATIONAL RULES & GUARDRAILS:
        1. DOMAIN SCOPE: You are ONLY allowed to answer questions strictly related to Seatify, registered restaurants/venues, table availability, operating hours, cuisine, floor plans, and reservation guidance.
        2. OFF-TOPIC REJECTION: If a user asks ANY question outside of Seatify or restaurant reservations (e.g., coding, mathematics, general history, weather, general knowledge, personal advice, news, etc.), you MUST IMMEDIATELY refuse politely.
        3. REFUSAL STANDARD RESPONSE (in Azerbaijani):
           "Bağışlayın, mən yalnız Seatify platforması, restoranlar və masa rezervasiyaları ilə bağlı suallara cavab verə bilərəm. Sizə rezervasiya ilə bağlı necə kömək edə bilərəm?"
        4. LANGUAGE: Always respond in natural, friendly, and professional Azerbaijani.
        5. ACCURACY: Use the injected database context below to state which venues exist, their operating hours, and table arrangements accurately. Do not invent non-existent venues.

        CURRENT SEATIFY DATABASE CONTEXT (JSON):
        {0}
        """;

    // A chat reply never needs more than a few hundred tokens — capping this is what actually
    // matters for reliability: several OpenRouter models (e.g. Gemini) default to reserving a
    // huge max_tokens budget (tens of thousands) when none is specified, which 402s on any
    // account that doesn't have that many credits available even though the reply itself would
    // have been short and cheap.
    private const int MaxReplyTokens = 800;

    // Tried in order after _options.Model — covers the primary model being temporarily
    // rate-limited, deprecated, or unavailable on OpenRouter without failing the whole request.
    // NOTE: "meta-llama/llama-3.3-70b-instruct:free" is NOT used here — OpenRouter currently
    // retires that free slug (404, "use this slug instead: meta-llama/llama-3.3-70b-instruct").
    private static readonly string[] FallbackModels =
    {
        "meta-llama/llama-3.3-70b-instruct",
        "deepseek/deepseek-chat"
    };

    private readonly AppDbContext _db;
    private readonly HttpClient _httpClient;
    private readonly OpenRouterOptions _options;
    private readonly ILogger<OpenRouterChatbotService> _logger;

    public OpenRouterChatbotService(
        AppDbContext db,
        IHttpClientFactory httpClientFactory,
        IOptions<OpenRouterOptions> options,
        ILogger<OpenRouterChatbotService> logger)
    {
        _db = db;
        _httpClient = httpClientFactory.CreateClient(nameof(OpenRouterChatbotService));
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ChatMessageResponseDto> GetReplyAsync(ChatMessageRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            throw new ValidationException("Message is required.");
        }

        var hasApiKey = !string.IsNullOrWhiteSpace(_options.ApiKey);
        _logger.LogInformation("[Chatbot] API Key present: {HasApiKey}, Model: {Model}", hasApiKey, _options.Model);

        if (!hasApiKey)
        {
            _logger.LogError("[Chatbot Error] OpenRouter:ApiKey is not configured — returning fallback chatbot reply.");
            return new ChatMessageResponseDto { Reply = FallbackReply };
        }

        // A broken/slow DB context query must never take the whole chatbot down with it — on
        // failure, fall through to the same guardrail prompt with a note instead of real data.
        object context;
        try
        {
            context = await BuildDatabaseContextAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Chatbot Error] Database context fetch failed: {Message}", ex.Message);
            context = new { error = "Live venue data is temporarily unavailable." };
        }

        var systemPrompt = string.Format(SystemPromptTemplate, JsonSerializer.Serialize(context, JsonOptions));
        var modelsToTry = new[] { _options.Model }.Concat(FallbackModels).Distinct();

        foreach (var model in modelsToTry)
        {
            var (success, reply, errorDetail) = await TrySendAsync(model, systemPrompt, request.Message);
            if (success)
            {
                if (model != _options.Model)
                {
                    _logger.LogWarning("[Chatbot] Primary model {PrimaryModel} failed, succeeded with fallback model {FallbackModel}", _options.Model, model);
                }

                return new ChatMessageResponseDto { Reply = reply! };
            }

            _logger.LogError("[Chatbot Error] Model {Model} failed: {ErrorDetail}", model, errorDetail);
        }

        return new ChatMessageResponseDto { Reply = FallbackReply };
    }

    private async Task<(bool Success, string? Reply, string? ErrorDetail)> TrySendAsync(string model, string systemPrompt, string userMessage)
    {
        var payload = new OpenRouterRequest
        {
            Model = model,
            MaxTokens = MaxReplyTokens,
            Messages = new[]
            {
                new OpenRouterMessage { Role = "system", Content = systemPrompt },
                new OpenRouterMessage { Role = "user", Content = userMessage }
            }
        };

        try
        {
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, _options.BaseUrl);
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
            httpRequest.Headers.Add("HTTP-Referer", _options.SiteUrl);
            httpRequest.Headers.Add("X-Title", _options.AppName);
            httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

            using var response = await _httpClient.SendAsync(httpRequest);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                var detail = $"OpenRouter API Status: {(int)response.StatusCode} {response.StatusCode}, Content: {body}";
                return (false, null, detail);
            }

            var completion = JsonSerializer.Deserialize<OpenRouterResponse>(body, JsonOptions);
            var reply = completion?.Choices?.FirstOrDefault()?.Message?.Content?.Trim();

            return string.IsNullOrWhiteSpace(reply)
                ? (false, null, "OpenRouter returned a success status but no message content.")
                : (true, reply, null);
        }
        catch (Exception ex)
        {
            return (false, null, $"{ex.GetType().Name}: {ex.Message}");
        }
    }

    /// <summary>Live, compact snapshot of the marketplace — active venues only, each with its
    /// cuisine/hours/contact plus a floor-plan rollup (table count, capacity range, how many
    /// tables are free right now). Deliberately a summary rather than every table/reservation
    /// row: keeps the prompt small and cheap while still being enough for the model to answer
    /// "does X exist", "what does X serve", "how many tables does X have" truthfully.</summary>
    private async Task<object> BuildDatabaseContextAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var venues = await _db.Venues
            .Where(v => v.IsActive)
            .Include(v => v.FloorPlans).ThenInclude(f => f.Tables)
            .OrderBy(v => v.Name)
            .ToListAsync();

        var venueIds = venues.Select(v => v.Id).ToList();

        var todaysActiveReservationCounts = await _db.Reservations
            .Where(r => venueIds.Contains(r.Table.FloorPlan.VenueId)
                && r.ReservationDate == today
                && (r.Status == ReservationStatus.Held || r.Status == ReservationStatus.Confirmed))
            .GroupBy(r => r.Table.FloorPlan.VenueId)
            .Select(g => new { VenueId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.VenueId, x => x.Count);

        var venueSummaries = venues.Select(v =>
        {
            var tables = v.FloorPlans.SelectMany(f => f.Tables).Where(t => t.IsActive).ToList();

            return new
            {
                name = v.Name,
                cuisine = v.CuisineTypes,
                address = v.Address,
                city = v.City,
                operatingHours = v.OperatingHours,
                contactPhone = v.BusinessPhone,
                floorPlanCount = v.FloorPlans.Count,
                totalTables = tables.Count,
                capacityRange = tables.Count > 0 ? $"{tables.Min(t => t.Capacity)}-{tables.Max(t => t.Capacity)} guests" : null,
                tablesAvailableRightNow = tables.Count(t => t.Status == TableStatus.Available),
                activeReservationsToday = todaysActiveReservationCounts.GetValueOrDefault(v.Id, 0)
            };
        }).ToList();

        return new
        {
            generatedAtUtc = DateTime.UtcNow,
            venueCount = venueSummaries.Count,
            venues = venueSummaries
        };
    }

    private class OpenRouterRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("max_tokens")]
        public int MaxTokens { get; set; }

        [JsonPropertyName("messages")]
        public OpenRouterMessage[] Messages { get; set; } = Array.Empty<OpenRouterMessage>();
    }

    private class OpenRouterMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    private class OpenRouterResponse
    {
        [JsonPropertyName("choices")]
        public List<OpenRouterChoice>? Choices { get; set; }
    }

    private class OpenRouterChoice
    {
        [JsonPropertyName("message")]
        public OpenRouterMessage? Message { get; set; }
    }
}
