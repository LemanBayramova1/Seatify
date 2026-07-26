using Seatify.Application.DTOs.Venues;

namespace Seatify.Application.Interfaces;

public interface IVenueService
{
    Task<List<VenueDto>> GetAllAsync();
    Task<VenueDto> GetByIdAsync(Guid id);
    Task<VenueDto> CreateAsync(Guid ownerId, CreateVenueRequestDto request);

    /// <summary>Venues owned by the given Restaurant Owner (or Admin).</summary>
    Task<List<VenueDto>> GetMineAsync(Guid ownerId);
}
