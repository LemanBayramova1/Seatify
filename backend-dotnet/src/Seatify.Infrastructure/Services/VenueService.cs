using Microsoft.EntityFrameworkCore;
using Seatify.Application.Common.Exceptions;
using Seatify.Application.DTOs.Venues;
using Seatify.Application.Interfaces;
using Seatify.Domain.Entities;
using Seatify.Infrastructure.Persistence;

namespace Seatify.Infrastructure.Services;

public class VenueService : IVenueService
{
    private readonly AppDbContext _db;

    public VenueService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<VenueDto>> GetAllAsync()
    {
        return await _db.Venues
            .OrderBy(v => v.Name)
            .Select(v => ToDto(v))
            .ToListAsync();
    }

    public async Task<VenueDto> GetByIdAsync(Guid id)
    {
        var venue = await _db.Venues.FindAsync(id)
            ?? throw new NotFoundException(nameof(Venue), id);

        return ToDto(venue);
    }

    public async Task<VenueDto> CreateAsync(Guid ownerId, CreateVenueRequestDto request)
    {
        var venue = new Venue
        {
            Name = request.Name.Trim(),
            Address = request.Address.Trim(),
            Description = request.Description,
            ImageUrl = request.ImageUrl,
            OwnerId = ownerId
        };

        _db.Venues.Add(venue);
        await _db.SaveChangesAsync();

        return ToDto(venue);
    }

    public async Task<List<VenueDto>> GetMineAsync(Guid ownerId)
    {
        return await _db.Venues
            .Where(v => v.OwnerId == ownerId)
            .OrderBy(v => v.Name)
            .Select(v => ToDto(v))
            .ToListAsync();
    }

    private static VenueDto ToDto(Venue v) => new()
    {
        Id = v.Id,
        Name = v.Name,
        Address = v.Address,
        Description = v.Description,
        ImageUrl = v.ImageUrl
    };
}
