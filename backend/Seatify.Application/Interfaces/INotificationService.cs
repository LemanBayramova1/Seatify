using Seatify.Application.DTOs.Notifications;

namespace Seatify.Application.Interfaces;

public interface INotificationService
{
    /// <summary>The caller's most recent notifications (read and unread), newest first.</summary>
    Task<List<NotificationDto>> GetForUserAsync(Guid userId);

    Task MarkAsReadAsync(Guid userId, Guid notificationId);

    /// <summary>Notifies every active Customer that a new venue has opened.</summary>
    Task NotifyNewVenueAsync(Guid venueId, string venueName);

    /// <summary>Notifies customers with a prior booking history at this venue (other than
    /// <paramref name="excludeUserId"/>, whose own reservation just ended) that a table opened
    /// up — there's no separate waitlist/favorites feature to target more precisely than that.</summary>
    Task NotifyTableAvailableAsync(Guid venueId, Guid excludeUserId);

    /// <summary>Notifies a venue's owner that a customer left a new review.</summary>
    Task NotifyNewReviewAsync(Guid ownerId, string venueName);

    /// <summary>Notifies a venue's owner that a customer confirmed a new booking.</summary>
    Task NotifyNewBookingAsync(Guid ownerId, string venueName, string tableLabel);
}
