using Seatify.Application.DTOs.FloorPlans;

namespace Seatify.Application.Interfaces;

public interface IFloorPlanService
{
    /// <summary>Returns the venue's active floor plan (creating none implicitly) with live table statuses.</summary>
    Task<FloorPlanDto> GetByVenueIdAsync(Guid venueId);

    /// <summary>
    /// Creates or updates the venue's floor plan and its tables. Restricted to the venue's
    /// owner or an Admin — throws UnauthorizedAppException otherwise.
    /// </summary>
    Task<FloorPlanDto> SaveAsync(Guid venueId, Guid callerId, bool callerIsAdmin, SaveFloorPlanRequestDto request);
}
