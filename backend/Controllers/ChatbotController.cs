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

    /// <summary>Sends a user message to the OpenRouter-backed AI chatbot and returns its reply.</summary>
    [HttpPost("message")]
    public async Task<ActionResult<ChatMessageResponseDto>> Message(ChatMessageRequestDto request)
    {
        var requestOrigin = Request.Headers.Origin.FirstOrDefault();
        var result = await _chatbotService.GetReplyAsync(request, requestOrigin);
        return Ok(result);
    }
}
