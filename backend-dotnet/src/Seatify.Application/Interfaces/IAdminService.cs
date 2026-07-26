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

    /// <summary>Permanently deletes a venue and its floor plans, tables, reviews, and reservations.</summary>
    Task DeleteVenueAsync(Guid venueId);

    Task<List<AdminUserDto>> GetUsersAsync();

    /// <summary>Updates a user's name/email/phone/role. Throws ConflictException if the new
    /// email is already taken by another account.</summary>
    Task<AdminUserDto> UpdateUserAsync(Guid userId, UpdateUserRequestDto request);

    /// <summary>Activates or deactivates a user's account. Throws ConflictException for Admin accounts.</summary>
    Task ToggleUserActiveAsync(Guid userId, bool isActive);

    /// <summary>Permanently deletes a user. Throws ConflictException for Admin accounts, or for
    /// any account with existing venues/reservations/reviews — deactivate those instead.</summary>
    Task DeleteUserAsync(Guid userId);

    Task<List<ReservationDto>> GetReservationsAsync(DateOnly? date, string? status);

    /// <summary>Manually confirms a Held reservation (Held → Confirmed, deposit marked paid).</summary>
    Task ApproveReservationAsync(Guid reservationId);

    /// <summary>Cancels a Held or Confirmed reservation, freeing its table.</summary>
    Task RejectReservationAsync(Guid reservationId);
}
