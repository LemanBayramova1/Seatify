using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seatify.Application.DTOs.FloorPlans;
using Seatify.Application.Interfaces;
using Seatify.Domain.Enums;

namespace Seatify.Api.Controllers;

/// <summary>Per-floor CRUD for a venue's floors/sections, additive alongside
/// FloorPlansController's whole-layout save-layout endpoint (which the builder UI still uses
/// for bulk saves) — useful for callers that want to add/rename/delete a single floor without
/// resending every other floor and table.</summary>
[Route("api/venues/{venueId:guid}/floors")]
public class FloorsController : ApiControllerBase
{
    private readonly IFloorPlanService _floorPlanService;

    public FloorsController(IFloorPlanService floorPlanService)
    {
        _floorPlanService = floorPlanService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<FloorPlanDto>>> GetFloors(Guid venueId)
    {
        return Ok(await _floorPlanService.GetAllByVenueIdAsync(venueId));
    }

    [HttpPost]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<FloorPlanDto>> CreateFloor(Guid venueId, CreateFloorRequestDto request)
    {
        var isAdmin = User.IsInRole(nameof(UserRole.Admin));
        var result = await _floorPlanService.CreateFloorAsync(venueId, CurrentUserId, isAdmin, request);
        return Ok(result);
    }

    [HttpPut("~/api/floors/{floorId:guid}")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<FloorPlanDto>> UpdateFloor(Guid floorId, UpdateFloorRequestDto request)
    {
        var isAdmin = User.IsInRole(nameof(UserRole.Admin));
        var result = await _floorPlanService.UpdateFloorAsync(floorId, CurrentUserId, isAdmin, request);
        return Ok(result);
    }

    [HttpDelete("~/api/floors/{floorId:guid}")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<IActionResult> DeleteFloor(Guid floorId)
    {
        var isAdmin = User.IsInRole(nameof(UserRole.Admin));
        await _floorPlanService.DeleteFloorAsync(floorId, CurrentUserId, isAdmin);
        return NoContent();
    }
}
