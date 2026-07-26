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

    /// <summary>Returns every floor plan for the venue (ordered by level), each with its active tables.</summary>
    Task<List<FloorPlanDto>> GetAllByVenueIdAsync(Guid venueId);

    /// <summary>
    /// Replaces a venue's entire multi-floor layout — floors and tables — in a single transaction.
    /// Floors/tables omitted from the request are deleted; existing ones (matched by Id) are updated;
    /// the rest are created. Restricted to the venue's owner or an Admin.
    /// </summary>
    Task<List<FloorPlanDto>> SaveLayoutAsync(Guid callerId, bool callerIsAdmin, SaveLayoutRequestDto request);
}
