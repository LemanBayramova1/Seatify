using Seatify.Application.DTOs.Notifications;

namespace Seatify.Application.Interfaces;

/// <summary>
/// Abstraction over the SignalR notification hub so Application/Infrastructure services can
/// push live notification events without taking a dependency on ASP.NET Core SignalR packages.
/// Implemented in the API layer, where the hub actually lives — mirrors ITableStateNotifier.
/// </summary>
public interface INotificationRealtimeNotifier
{
    /// <summary>Pushes a notification event to every connection belonging to this user.</summary>
    Task NotifyUserAsync(Guid userId, NotificationDto notification);

    /// <summary>Pushes a notification event to every connected Admin, regardless of user.</summary>
    Task NotifyAdminsAsync(NotificationDto notification);
}
