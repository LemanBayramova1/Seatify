using Microsoft.AspNetCore.Mvc;
using Seatify.Application.DTOs.Chatbot;
using Seatify.Application.Interfaces;

namespace Seatify.Api.Controllers;

[Route("api/chatbot")]
public class ChatbotController : ApiControllerBase
{
    private readonly IChatbotService _chatbotService;

    public ChatbotController(IChatbotService chatbotService)
    {
        _chatbotService = chatbotService;
    }

    [HttpPost("message")]
    public async Task<ActionResult<ChatMessageResponseDto>> Message(ChatMessageRequestDto request)
    {
        var result = await _chatbotService.GetReplyAsync(request);
        return Ok(result);
    }
}
