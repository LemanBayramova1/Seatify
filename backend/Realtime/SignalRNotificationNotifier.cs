using Microsoft.AspNetCore.SignalR;
using Seatify.Api.Hubs;
using Seatify.Application.DTOs.Notifications;
using Seatify.Application.Interfaces;

namespace Seatify.Api.Realtime;

public class SignalRNotificationNotifier : INotificationRealtimeNotifier
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public SignalRNotificationNotifier(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyUserAsync(Guid userId, NotificationDto notification)
    {
        await _hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", notification);
    }

    public async Task NotifyAdminsAsync(NotificationDto notification)
    {
        await _hubContext.Clients.Group(NotificationHub.AdminsGroup).SendAsync("ReceiveNotification", notification);
    }
}
