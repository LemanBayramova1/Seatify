using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seatify.Application.Common.Exceptions;
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

    /// <summary>All floor plans for the restaurant, ordered by level, each with its active tables.
    /// Pass `date`/`timeSlot` (used by the customer booking flow) to get each table's real
    /// availability for that exact slot instead of the date-agnostic default.</summary>
    [HttpGet("{restaurantId:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<List<FloorPlanDto>>> GetByRestaurantId(Guid restaurantId, [FromQuery] DateOnly? date, [FromQuery] string? timeSlot)
    {
        return Ok(await _floorPlanService.GetAllByVenueIdAsync(restaurantId, date, timeSlot));
    }

    /// <summary>Creates or fully replaces a restaurant's entire multi-floor layout in one transaction.</summary>
    [HttpPost("save-layout")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<List<FloorPlanDto>>> SaveLayout(SaveLayoutRequestDto request)
    {
        try
        {
            var isAdmin = User.IsInRole(nameof(UserRole.Admin));
            var result = await _floorPlanService.SaveLayoutAsync(CurrentUserId, isAdmin, request);
            return Ok(result);
        }
        // Known, already-typed failures (not found / conflict / unauthorized / validation) keep
        // flowing to ExceptionHandlingMiddleware, which maps them to their proper status code —
        // this only catches genuinely unexpected failures, replacing the middleware's generic
        // "An unexpected error occurred." with the real cause so a layout save failure is
        // actionable instead of opaque.
        catch (Exception ex) when (ex is not NotFoundException and not ConflictException
            and not UnauthorizedAppException and not ValidationException and not GoneException)
        {
            return BadRequest(new { error = ex.Message, message = ex.Message, details = ex.InnerException?.Message });
        }
    }
}
