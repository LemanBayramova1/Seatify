using Seatify.Application.DTOs.Chatbot;

namespace Seatify.Application.Interfaces;

public interface IChatbotService
{
    Task<ChatMessageResponseDto> GetReplyAsync(ChatMessageRequestDto request);
}
