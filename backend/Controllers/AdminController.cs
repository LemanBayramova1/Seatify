using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seatify.Application.DTOs.Admin;
using Seatify.Application.DTOs.Reservations;
using Seatify.Application.Interfaces;
using Seatify.Domain.Enums;

namespace Seatify.Api.Controllers;

/// <summary>Platform-wide admin panel — every endpoint here spans all venues/users and is
/// restricted to UserRole.Admin, distinct from the Restaurant Owner's own-venue dashboard
/// endpoints on VenuesController.</summary>
[Route("api/admin")]
[Authorize(Roles = nameof(UserRole.Admin))]
public class AdminController : ApiControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    /// <summary>Platform-wide summary metrics (venues, users, reservations, ...) for the admin dashboard.</summary>
    [HttpGet("analytics")]
    public async Task<ActionResult<AdminAnalyticsDto>> GetAnalytics()
    {
        return Ok(await _adminService.GetAnalyticsAsync());
    }

    /// <summary>Lists every venue on the platform, including inactive ones.</summary>
    [HttpGet("venues")]
    public async Task<ActionResult<List<AdminVenueDto>>> GetVenues()
    {
        return Ok(await _adminService.GetVenuesAsync());
    }

    /// <summary>Activates or deactivates a venue platform-wide.</summary>
    [HttpPatch("venues/{id:guid}/active")]
    public async Task<IActionResult> ToggleVenueActive(Guid id, ToggleVenueActiveRequestDto request)
    {
        await _adminService.ToggleVenueActiveAsync(id, request.IsActive);
        return NoContent();
    }

    /// <summary>Permanently deletes a venue.</summary>
    [HttpDelete("venues/{id:guid}")]
    public async Task<IActionResult> DeleteVenue(Guid id)
    {
        await _adminService.DeleteVenueAsync(id);
        return NoContent();
    }

    /// <summary>Lists every user account on the platform.</summary>
    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers()
    {
        return Ok(await _adminService.GetUsersAsync());
    }

    /// <summary>Updates a user's account details/role as an admin.</summary>
    [HttpPut("users/{id:guid}")]
    public async Task<ActionResult<AdminUserDto>> UpdateUser(Guid id, UpdateUserRequestDto request)
    {
        return Ok(await _adminService.UpdateUserAsync(id, request));
    }

    /// <summary>Activates or deactivates a user account platform-wide.</summary>
    [HttpPatch("users/{id:guid}/active")]
    public async Task<IActionResult> ToggleUserActive(Guid id, ToggleUserActiveRequestDto request)
    {
        await _adminService.ToggleUserActiveAsync(id, request.IsActive);
        return NoContent();
    }

    /// <summary>Permanently deletes a user account.</summary>
    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        await _adminService.DeleteUserAsync(id);
        return NoContent();
    }

    /// <summary>Lists reservations across every venue, with optional `date`/`status` filters.</summary>
    [HttpGet("reservations")]
    public async Task<ActionResult<List<ReservationDto>>> GetReservations([FromQuery] DateOnly? date, [FromQuery] string? status)
    {
        return Ok(await _adminService.GetReservationsAsync(date, status));
    }

    /// <summary>Approves a pending reservation as an admin.</summary>
    [HttpPost("reservations/{id:guid}/approve")]
    public async Task<IActionResult> ApproveReservation(Guid id)
    {
        await _adminService.ApproveReservationAsync(id);
        return NoContent();
    }

    /// <summary>Rejects a pending reservation as an admin.</summary>
    [HttpPost("reservations/{id:guid}/reject")]
    public async Task<IActionResult> RejectReservation(Guid id)
    {
        await _adminService.RejectReservationAsync(id);
        return NoContent();
    }

    /// <summary>Lists every review across all venues.</summary>
    [HttpGet("reviews")]
    public async Task<ActionResult<List<AdminReviewDto>>> GetReviews()
    {
        return Ok(await _adminService.GetAllReviewsAsync());
    }
}
