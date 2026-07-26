using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seatify.Application.DTOs.FloorPlans;
using Seatify.Application.DTOs.Venues;
using Seatify.Application.Interfaces;
using Seatify.Domain.Enums;

namespace Seatify.Api.Controllers;

[Route("api/venues")]
public class VenuesController : ApiControllerBase
{
    private readonly IVenueService _venueService;
    private readonly IFloorPlanService _floorPlanService;

    public VenuesController(IVenueService venueService, IFloorPlanService floorPlanService)
    {
        _venueService = venueService;
        _floorPlanService = floorPlanService;
    }

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

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<VenueDto>> GetById(Guid id)
    {
        return Ok(await _venueService.GetByIdAsync(id));
    }

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

    [HttpPost]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<VenueDto>> Create(CreateVenueRequestDto request)
    {
        var venue = await _venueService.CreateAsync(CurrentUserId, request);
        return CreatedAtAction(nameof(GetById), new { id = venue.Id }, venue);
    }
}
