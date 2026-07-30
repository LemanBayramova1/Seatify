namespace Seatify.Infrastructure.Options;

public class OpenRouterOptions
{
    public const string SectionName = "OpenRouter";

    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "google/gemini-2.5-flash";
    public string BaseUrl { get; set; } = "https://openrouter.ai/api/v1/chat/completions";

    // OpenRouter asks for these on every request (HTTP-Referer / X-Title headers) for its
    // app-usage leaderboard — cosmetic, not auth, but good citizenship.
    public string SiteUrl { get; set; } = "https://seatify.app";
    public string AppName { get; set; } = "Seatify";
}
