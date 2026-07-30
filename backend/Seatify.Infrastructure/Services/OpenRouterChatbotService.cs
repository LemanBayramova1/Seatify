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
/// with a strict domain-scoped, multi-language system prompt plus a live snapshot of Seatify's
/// own venue/table data, so answers about "what's open" or "how many tables does X have" are
/// grounded in the actual database rather than the model's imagination. Falls back to a canned
/// message in the caller's language (never throws to the caller) whenever the API key is
/// missing or the request fails — a flaky/misconfigured LLM provider shouldn't 500 the chat
/// widget.</summary>
public class OpenRouterChatbotService : IChatbotService
{
    // Keyed by the same 4 language codes the frontend's i18n uses (az/en/ru/tr) — see
    // ChatMessageRequestDto.Language. Azerbaijani is the platform default, matching the
    // frontend's own fallbackLng.
    private static readonly Dictionary<string, string> FallbackReplies = new()
    {
        ["az"] = "Bağışlayın, hazırda köməkçi xidmətinə qoşula bilmirəm. Zəhmət olmasa bir az sonra yenidən cəhd edin.",
        ["en"] = "Sorry, I'm unable to reach the assistant service right now. Please try again in a moment.",
        ["ru"] = "Извините, сейчас не удаётся подключиться к сервису помощника. Пожалуйста, повторите попытку чуть позже.",
        ["tr"] = "Üzgünüm, şu anda asistan hizmetine bağlanamıyorum. Lütfen kısa bir süre sonra tekrar deneyin."
    };

    private static string ResolveFallbackReply(string? language) =>
        FallbackReplies.TryGetValue(language?.Trim().ToLowerInvariant() ?? "", out var reply)
            ? reply
            : FallbackReplies["az"];

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private const string SystemPromptTemplate = """
        You are the official AI Assistant for the Seatify Reservation Platform.

        STRICT OPERATIONAL RULES & GUARDRAILS:
        1. DOMAIN SCOPE: You are ONLY allowed to answer questions strictly related to Seatify, registered restaurants/venues, table availability, operating hours, cuisine, floor plans, and reservation guidance.
        2. DYNAMIC LANGUAGE DETECTION: Detect the user's query language automatically and respond fluently in that exact language. You natively support Azerbaijani, English, Russian, and Turkish. If the user's language is ambiguous or not one of these four, default to Azerbaijani. If the user switches language mid-conversation, switch with them on the very next reply.{1}
        2a. SHORT GREETING MATCHING: Pay strict attention to short greetings and greeting-only messages with no other request attached, and reply with the matching canned welcome below verbatim:
           - English ("hi", "hello", "hey", "good morning", etc.): "Hello! Welcome to Seatify. How can I assist you with your table reservation today?"
           - Azerbaijani ("salam", "sabahınız xeyir", etc.): "Salam! Seatify-a xoş gəlmisiniz. Sizə necə kömək edə bilərəm?"
           - Turkish ("merhaba", "selam", "günaydın", etc.): "Merhaba! Seatify'a hoş geldiniz. Size nasıl yardımcı olabilirim?"
           - Russian ("привет", "здравствуйте", "добрый день", etc.): "Здравствуйте! Добро пожаловать в Seatify. Как я могу вам помочь?"
           If the message greets you AND also asks something (e.g. "hi, do you have a table for 4?"), greet naturally in-language and then answer the actual request — do not use the canned line verbatim in that case.
        3. OFF-TOPIC REJECTION: Off-topic means genuinely unrelated to Seatify — coding, mathematics, general history, weather, general knowledge, personal advice, news, etc. It does NOT mean "written in Russian/Azerbaijani/Turkish" or "a short/simple question" — a plain, ordinary question like "What restaurants do you have?" / "Hansı restoranlarınız var?" / "Какие рестораны у вас есть?" / "Hangi restoranlarınız var?" is a completely normal, on-topic request in every one of your four languages and must ALWAYS be answered using the CURRENT SEATIFY DATABASE CONTEXT below — never refused. Only when a question is truly outside Seatify's domain, IMMEDIATELY refuse politely IN THE USER'S LANGUAGE, using exactly one of these standard refusals (matched to the detected language, verbatim, no translation of your own):
           - Azerbaijani: "Bağışlayın, mən yalnız Seatify platforması, restoranlar və masa rezervasiyaları ilə bağlı suallara cavab verə bilərəm. Sizə rezervasiya ilə bağlı necə kömək edə bilərəm?"
           - English: "I'm sorry, I can only assist with questions regarding the Seatify platform, restaurants, and table reservations. How can I help you with your booking today?"
           - Russian: "Извините, я могу отвечать только на вопросы, касающиеся платформы Seatify, ресторанов и бронирования столиков. Как я могу помочь вам с бронированием?"
           - Turkish: "Üzgünüm, sadece Seatify platformu, restoranlar ve masa rezervasyonları ile ilgili sorulara cevap verebilirim. Rezervasyonunuzla ilgili size nasıl yardımcı olabilirim?"
        4. TONE: Always respond in a natural, friendly, and professional tone, in whichever of the four supported languages the user is currently using.
        5. ACCURACY: Use the injected database context below to state which venues exist, their operating hours, and table arrangements accurately, translated naturally into the detected language. Do not invent non-existent venues.

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

    public async Task<ChatMessageResponseDto> GetReplyAsync(ChatMessageRequestDto request, string? requestOrigin = null)
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
            return new ChatMessageResponseDto { Reply = ResolveFallbackReply(request.Language) };
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

        var languageHint = BuildLanguageHint(request.Language);
        var systemPrompt = string.Format(SystemPromptTemplate, JsonSerializer.Serialize(context, JsonOptions), languageHint);
        var modelsToTry = new[] { _options.Model }.Concat(FallbackModels).Distinct();
        var siteUrl = string.IsNullOrWhiteSpace(requestOrigin) ? _options.SiteUrl : requestOrigin;

        foreach (var model in modelsToTry)
        {
            var (success, reply, errorDetail) = await TrySendAsync(model, systemPrompt, request.Message, siteUrl);
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

        return new ChatMessageResponseDto { Reply = ResolveFallbackReply(request.Language) };
    }

    private static readonly HashSet<string> SupportedLanguageCodes = new(StringComparer.OrdinalIgnoreCase) { "az", "en", "ru", "tr" };

    /// <summary>Builds the sentence appended to guardrail #2 telling the model which language the
    /// caller's UI is currently set to — a strong tiebreaker for short/ambiguous messages (e.g.
    /// "hi", "ok") that don't carry enough signal on their own, without overriding the model's
    /// own detection when the message content clearly indicates a different language.</summary>
    private static string BuildLanguageHint(string? language)
    {
        var code = language?.Trim().ToLowerInvariant();
        if (code is null || !SupportedLanguageCodes.Contains(code))
        {
            return string.Empty;
        }

        var languageName = code switch
        {
            "az" => "Azerbaijani",
            "en" => "English",
            "ru" => "Russian",
            "tr" => "Turkish",
            _ => code
        };

        return $" The user's app interface is currently set to {languageName} — treat this as a strong hint for short or ambiguous messages, but always defer to the actual language of their message when it clearly indicates otherwise.";
    }

    private async Task<(bool Success, string? Reply, string? ErrorDetail)> TrySendAsync(string model, string systemPrompt, string userMessage, string siteUrl)
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
            httpRequest.Headers.Add("HTTP-Referer", siteUrl);
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
