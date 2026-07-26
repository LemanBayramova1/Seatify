using Seatify.Application.DTOs.Venues;

namespace Seatify.Application.Interfaces;

public interface IVenueService
{
    Task<List<VenueDto>> GetAllAsync();
    Task<VenueDto> GetByIdAsync(Guid id);
    Task<VenueDto> CreateAsync(Guid ownerId, CreateVenueRequestDto request);

    /// <summary>Venues owned by the given Restaurant Owner (or Admin).</summary>
    Task<List<VenueDto>> GetMineAsync(Guid ownerId);

    /// <summary>
    /// Updates a venue's marketing/contact details. Restricted to the venue's owner or an Admin —
    /// throws UnauthorizedAppException otherwise.
    /// </summary>
    Task<VenueDto> UpdateAsync(Guid venueId, Guid callerId, bool callerIsAdmin, UpdateVenueRequestDto request);

    /// <summary>Overview metrics for the owner dashboard (today's reservations, active holds,
    /// total tables, total paid deposit revenue). Restricted to the venue's owner or an Admin.</summary>
    Task<VenueDashboardDto> GetDashboardAsync(Guid venueId, Guid callerId, bool callerIsAdmin);
}
