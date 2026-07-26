using Seatify.Application.DTOs.Reservations;

namespace Seatify.Application.Interfaces;

public interface IReservationService
{
    Task<HoldTableResponseDto> HoldAsync(Guid userId, HoldTableRequestDto request);
    Task<ReservationDto> ConfirmAsync(Guid userId, ConfirmReservationRequestDto request);
    Task<List<ReservationDto>> GetMyBookingsAsync(Guid userId);

    /// <summary>Cancels a reservation the caller owns, whether it's still Held or already Confirmed.</summary>
    Task CancelAsync(Guid userId, Guid reservationId);

    /// <summary>Called by the background sweep to expire holds whose TTL has elapsed.</summary>
    Task ReleaseExpiredHoldsAsync();
}
