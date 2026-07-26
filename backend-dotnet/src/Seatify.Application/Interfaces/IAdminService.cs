using Seatify.Application.DTOs.Admin;
using Seatify.Application.DTOs.Reservations;

namespace Seatify.Application.Interfaces;

/// <summary>Platform-wide operations for the Admin-only `/platform-admin` panel — spans every
/// venue and user, unlike IVenueService's owner-scoped methods.</summary>
public interface IAdminService
{
    Task<AdminAnalyticsDto> GetAnalyticsAsync();
    Task<List<AdminVenueDto>> GetVenuesAsync();
    Task ToggleVenueActiveAsync(Guid venueId, bool isActive);
    Task<List<AdminUserDto>> GetUsersAsync();
    Task<List<ReservationDto>> GetReservationsAsync(DateOnly? date, string? status);

    /// <summary>Manually confirms a Held reservation (Held → Confirmed, deposit marked paid).</summary>
    Task ApproveReservationAsync(Guid reservationId);

    /// <summary>Cancels a Held or Confirmed reservation, freeing its table.</summary>
    Task RejectReservationAsync(Guid reservationId);
}
