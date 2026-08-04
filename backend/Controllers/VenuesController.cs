using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seatify.Application.DTOs.FloorPlans;
using Seatify.Application.DTOs.Reservations;
using Seatify.Application.DTOs.Venues;
using Seatify.Application.Interfaces;
using Seatify.Domain.Enums;

namespace Seatify.Api.Controllers;

[Route("api/venues")]
public class VenuesController : ApiControllerBase
{
    private readonly IVenueService _venueService;
    private readonly IFloorPlanService _floorPlanService;
    private readonly IReservationService _reservationService;

    public VenuesController(IVenueService venueService, IFloorPlanService floorPlanService, IReservationService reservationService)
    {
        _venueService = venueService;
        _floorPlanService = floorPlanService;
        _reservationService = reservationService;
    }

    /// <summary>Lists every active venue on the platform.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<VenueDto>>> GetAll()
    {
        return Ok(await _venueService.GetAllAsync());
    }

    /// <summary>Venues the signed-in Restaurant Owner manages — lets the builder UI resolve a venueId.</summary>
    [HttpGet("mine")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<List<VenueDto>>> GetMine()
    {
        return Ok(await _venueService.GetMineAsync(CurrentUserId));
    }

    /// <summary>Fetches a single venue's public details by id.</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<VenueDto>> GetById(Guid id)
    {
        return Ok(await _venueService.GetByIdAsync(id));
    }

    /// <summary>Gets this venue's floor plan (table layout and current statuses).</summary>
    [HttpGet("{id:guid}/floorplan")]
    [AllowAnonymous]
    public async Task<ActionResult<FloorPlanDto>> GetFloorPlan(Guid id)
    {
        return Ok(await _floorPlanService.GetByVenueIdAsync(id));
    }

    /// <summary>Creates or fully replaces the layout (tables + canvas size) for this venue's floor plan.</summary>
    [HttpPost("{id:guid}/floorplan")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<FloorPlanDto>> SaveFloorPlan(Guid id, SaveFloorPlanRequestDto request)
    {
        var isAdmin = User.IsInRole(nameof(UserRole.Admin));
        var result = await _floorPlanService.SaveAsync(id, CurrentUserId, isAdmin, request);
        return Ok(result);
    }

    /// <summary>Creates a new venue owned by the signed-in Restaurant Owner (or Admin).</summary>
    [HttpPost]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<VenueDto>> Create(CreateVenueRequestDto request)
    {
        var venue = await _venueService.CreateAsync(CurrentUserId, request);
        return CreatedAtAction(nameof(GetById), new { id = venue.Id }, venue);
    }

    /// <summary>Updates a venue's marketing/contact details (name, address, description, cuisine, gallery, ...).</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<VenueDto>> Update(Guid id, UpdateVenueRequestDto request)
    {
        var isAdmin = User.IsInRole(nameof(UserRole.Admin));
        var result = await _venueService.UpdateAsync(id, CurrentUserId, isAdmin, request);
        return Ok(result);
    }

    /// <summary>Overview metrics for the owner dashboard.</summary>
    [HttpGet("{id:guid}/dashboard")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<VenueDashboardDto>> GetDashboard(Guid id)
    {
        var isAdmin = User.IsInRole(nameof(UserRole.Admin));
        var result = await _venueService.GetDashboardAsync(id, CurrentUserId, isAdmin);
        return Ok(result);
    }

    /// <summary>Reservations for this venue's tables — the owner dashboard's Bronlar list. Optional
    /// `date` (yyyy-MM-dd) and `status` (Held/Confirmed/Cancelled/Expired) filters.</summary>
    [HttpGet("{id:guid}/reservations")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<List<ReservationDto>>> GetReservations(Guid id, [FromQuery] DateOnly? date, [FromQuery] string? status)
    {
        var isAdmin = User.IsInRole(nameof(UserRole.Admin));
        var result = await _reservationService.GetVenueReservationsAsync(id, CurrentUserId, isAdmin, date, status);
        return Ok(result);
    }
}
