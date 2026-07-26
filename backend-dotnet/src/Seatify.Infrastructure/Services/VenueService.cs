using Microsoft.EntityFrameworkCore;
using Seatify.Application.Common.Exceptions;
using Seatify.Application.DTOs.Venues;
using Seatify.Application.Interfaces;
using Seatify.Domain.Entities;
using Seatify.Domain.Enums;
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
        var venues = await _db.Venues.OrderBy(v => v.Name).ToListAsync();
        return venues.Select(ToDto).ToList();
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
        var venues = await _db.Venues.Where(v => v.OwnerId == ownerId).OrderBy(v => v.Name).ToListAsync();
        return venues.Select(ToDto).ToList();
    }

    public async Task<VenueDto> UpdateAsync(Guid venueId, Guid callerId, bool callerIsAdmin, UpdateVenueRequestDto request)
    {
        var venue = await _db.Venues.FirstOrDefaultAsync(v => v.Id == venueId)
            ?? throw new NotFoundException(nameof(Venue), venueId);

        if (!callerIsAdmin && venue.OwnerId != callerId)
        {
            throw new UnauthorizedAppException("You do not manage this venue.");
        }

        venue.Name = request.Name.Trim();
        venue.Address = request.Address.Trim();
        venue.City = request.City?.Trim();
        venue.BusinessEmail = request.BusinessEmail?.Trim();
        venue.BusinessPhone = request.BusinessPhone?.Trim();
        venue.Description = request.Description;
        venue.ImageUrl = request.ImageUrl;
        venue.CuisineTypes = ToCsv(request.CuisineTypes);
        venue.GalleryImageUrls = ToCsv(request.GalleryImageUrls);

        await _db.SaveChangesAsync();

        return ToDto(venue);
    }

    public async Task<VenueDashboardDto> GetDashboardAsync(Guid venueId, Guid callerId, bool callerIsAdmin)
    {
        var venue = await _db.Venues.FirstOrDefaultAsync(v => v.Id == venueId)
            ?? throw new NotFoundException(nameof(Venue), venueId);

        if (!callerIsAdmin && venue.OwnerId != callerId)
        {
            throw new UnauthorizedAppException("You do not manage this venue.");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var tableIds = await _db.Tables
            .Where(t => t.FloorPlan.VenueId == venueId)
            .Select(t => t.Id)
            .ToListAsync();

        var todayReservations = await _db.Reservations
            .Where(r => tableIds.Contains(r.TableId) && r.ReservationDate == today
                && (r.Status == ReservationStatus.Confirmed || r.Status == ReservationStatus.Held))
            .CountAsync();

        var activeHolds = await _db.Reservations
            .Where(r => tableIds.Contains(r.TableId) && r.Status == ReservationStatus.Held)
            .CountAsync();

        // SQLite can't translate Sum() over `decimal` server-side — pull the paid deposit
        // fees back and sum them client-side instead.
        var paidDepositFees = await _db.Reservations
            .Where(r => tableIds.Contains(r.TableId) && r.DepositPaid)
            .Select(r => r.DepositFee)
            .ToListAsync();
        var totalDepositRevenue = paidDepositFees.Sum();

        return new VenueDashboardDto
        {
            TodayReservations = todayReservations,
            ActiveHolds = activeHolds,
            TotalTables = tableIds.Count,
            TotalDepositRevenue = totalDepositRevenue
        };
    }

    private static List<string> FromCsv(string? csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? new List<string>()
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    private static string? ToCsv(List<string>? values) =>
        values is null || values.Count == 0
            ? null
            : string.Join(',', values.Select(v => v.Trim()).Where(v => v.Length > 0));

    private static VenueDto ToDto(Venue v) => new()
    {
        Id = v.Id,
        Name = v.Name,
        Address = v.Address,
        Description = v.Description,
        ImageUrl = v.ImageUrl,
        City = v.City,
        BusinessEmail = v.BusinessEmail,
        BusinessPhone = v.BusinessPhone,
        CuisineTypes = FromCsv(v.CuisineTypes),
        GalleryImageUrls = FromCsv(v.GalleryImageUrls)
    };
}
