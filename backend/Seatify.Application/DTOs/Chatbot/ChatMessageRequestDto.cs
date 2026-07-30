namespace Seatify.Application.DTOs.Chatbot;

public class ChatMessageRequestDto
{
    public string Message { get; set; } = string.Empty;

    /// <summary>Optional UI language hint ("az" | "en" | "ru" | "tr") — the frontend's current
    /// i18n locale. Not a source of truth (the model still detects the message's actual
    /// language and switches to match it), but resolves ambiguous/short messages ("hi", "ok")
    /// and picks which localized canned message to use if OpenRouter itself is unreachable.</summary>
    public string? Language { get; set; }
}
