using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seatify.Application.DTOs.FloorPlans;
using Seatify.Application.Interfaces;
using Seatify.Domain.Enums;

namespace Seatify.Api.Controllers;

/// <summary>Multi-floor layout API: a restaurant (venue) can have several floor plans
/// (e.g. "Ground Floor", "Terrace"), each with its own tables.</summary>
[Route("api/floorplans")]
public class FloorPlansController : ApiControllerBase
{
    private readonly IFloorPlanService _floorPlanService;

    public FloorPlansController(IFloorPlanService floorPlanService)
    {
        _floorPlanService = floorPlanService;
    }

    /// <summary>All floor plans for the restaurant, ordered by level, each with its active tables.</summary>
    [HttpGet("{restaurantId:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<List<FloorPlanDto>>> GetByRestaurantId(Guid restaurantId)
    {
        return Ok(await _floorPlanService.GetAllByVenueIdAsync(restaurantId));
    }

    /// <summary>Creates or fully replaces a restaurant's entire multi-floor layout in one transaction.</summary>
    [HttpPost("save-layout")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<List<FloorPlanDto>>> SaveLayout(SaveLayoutRequestDto request)
    {
        var isAdmin = User.IsInRole(nameof(UserRole.Admin));
        var result = await _floorPlanService.SaveLayoutAsync(CurrentUserId, isAdmin, request);
        return Ok(result);
    }
}
