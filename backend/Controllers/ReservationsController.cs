using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seatify.Application.DTOs.Reservations;
using Seatify.Application.Interfaces;

namespace Seatify.Api.Controllers;

[Route("api/reservations")]
[Authorize]
public class ReservationsController : ApiControllerBase
{
    private readonly IReservationService _reservationService;

    public ReservationsController(IReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    /// <summary>Places a temporary Redis-backed hold on a table for the configured TTL (5-10 min).</summary>
    [HttpPost("hold")]
    public async Task<ActionResult<HoldTableResponseDto>> Hold(HoldTableRequestDto request)
    {
        var result = await _reservationService.HoldAsync(CurrentUserId, request);
        return Ok(result);
    }

    /// <summary>Confirms a held reservation, releasing the Redis lock and marking the table Booked.</summary>
    [HttpPost("confirm")]
    public async Task<ActionResult<ReservationDto>> Confirm(ConfirmReservationRequestDto request)
    {
        var result = await _reservationService.ConfirmAsync(CurrentUserId, request);
        return Ok(result);
    }

    /// <summary>Lists every reservation (Held, Confirmed, Cancelled, Expired) made by the signed-in user.</summary>
    [HttpGet("my-bookings")]
    public async Task<ActionResult<List<ReservationDto>>> MyBookings()
    {
        var result = await _reservationService.GetMyBookingsAsync(CurrentUserId);
        return Ok(result);
    }

    /// <summary>Cancels a reservation the caller owns, whether it's still Held or already Confirmed.</summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        await _reservationService.CancelAsync(CurrentUserId, id);
        return NoContent();
    }
}
