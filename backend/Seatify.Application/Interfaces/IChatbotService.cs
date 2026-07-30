using Seatify.Application.DTOs.Chatbot;

namespace Seatify.Application.Interfaces;

public interface IChatbotService
{
    /// <summary>`requestOrigin` is the caller's browser-set `Origin` header (e.g.
    /// "http://localhost:5175"), not client-supplied JSON — used only to make the outbound
    /// HTTP-Referer sent to OpenRouter reflect whichever dev port is actually running, falling
    /// back to the configured `OpenRouter:SiteUrl` when absent (e.g. non-browser callers).</summary>
    Task<ChatMessageResponseDto> GetReplyAsync(ChatMessageRequestDto request, string? requestOrigin = null);
}
