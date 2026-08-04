using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seatify.Application.DTOs.Notifications;
using Seatify.Application.Interfaces;

namespace Seatify.Api.Controllers;

[Route("api/notifications")]
[Authorize]
public class NotificationsController : ApiControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    /// <summary>Lists the signed-in user's notifications, newest first.</summary>
    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> GetMine()
    {
        return Ok(await _notificationService.GetForUserAsync(CurrentUserId));
    }

    /// <summary>Marks a single notification belonging to the signed-in user as read.</summary>
    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        await _notificationService.MarkAsReadAsync(CurrentUserId, id);
        return NoContent();
    }
}
