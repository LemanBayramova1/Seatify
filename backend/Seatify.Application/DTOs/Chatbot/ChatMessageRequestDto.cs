namespace Seatify.Application.DTOs.Chatbot;

public class ChatMessageRequestDto
{
    public string Message { get; set; } = string.Empty;

    /// <summary>Optional UI language hint ("az" | "en" | "ru" | "tr") — the frontend's current
    /// i18n locale. Not a source of truth (the model still detects the message's actual
    /// language and switches to match it), but resolves ambiguous/short messages ("hi", "ok")
    /// and picks which localized canned message to use if OpenRouter itself is unreachable.</summary>
    public string? Language { get; set; }

    /// <summary>Prior turns of this conversation (oldest first), NOT including the current
    /// <see cref="Message"/>. Sent back to the model on every request so slot-filling context
    /// (venue, date, time, party size mentioned earlier in the chat) survives across turns
    /// instead of resetting on each call.</summary>
    public List<ChatHistoryItemDto>? History { get; set; }
}

public class ChatHistoryItemDto
{
    /// <summary>"user" or "bot" — matches the frontend chat store's message roles.</summary>
    public string Role { get; set; } = string.Empty;

    public string Text { get; set; } = string.Empty;
}
