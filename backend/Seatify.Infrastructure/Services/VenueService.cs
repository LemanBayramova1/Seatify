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
    private readonly INotificationService _notificationService;

    public VenueService(AppDbContext db, INotificationService notificationService)
    {
        _db = db;
        _notificationService = notificationService;
    }

    public async Task<List<VenueDto>> GetAllAsync()
    {
        var venues = await _db.Venues.AsNoTracking().Where(v => v.IsActive).OrderBy(v => v.Name).ToListAsync();
        var stats = await GetRatingStatsAsync(venues.Select(v => v.Id));
        return venues.Select(v => ToDto(v, stats)).ToList();
    }

    public async Task<VenueDto> GetByIdAsync(Guid id)
    {
        var venue = await _db.Venues.FindAsync(id)
            ?? throw new NotFoundException(nameof(Venue), id);

        var stats = await GetRatingStatsAsync(new[] { id });
        return ToDto(venue, stats);
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

        if (venue.IsActive)
        {
            await _notificationService.NotifyNewVenueAsync(venue.Id, venue.Name);
        }

        // A freshly-created venue has no reviews yet — Rating/ReviewCount default to 0 rather
        // than a fabricated starting score.
        return ToDto(venue, new Dictionary<Guid, (double Average, int Count)>());
    }

    public async Task<List<VenueDto>> GetMineAsync(Guid ownerId)
    {
        var venues = await _db.Venues.AsNoTracking().Where(v => v.OwnerId == ownerId).OrderBy(v => v.Name).ToListAsync();
        var stats = await GetRatingStatsAsync(venues.Select(v => v.Id));
        return venues.Select(v => ToDto(v, stats)).ToList();
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
        venue.OperatingHours = request.OperatingHours?.Trim();
        venue.CuisineTypes = ToCsv(request.CuisineTypes);
        venue.GalleryImageUrls = ToCsv(request.GalleryImageUrls);

        await _db.SaveChangesAsync();

        var stats = await GetRatingStatsAsync(new[] { venueId });
        return ToDto(venue, stats);
    }

    /// <summary>Average rating (rounded to 1 decimal) and review count per venue, in one grouped
    /// query rather than one round-trip per venue.</summary>
    private async Task<Dictionary<Guid, (double Average, int Count)>> GetRatingStatsAsync(IEnumerable<Guid> venueIds)
    {
        var ids = venueIds.ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, (double Average, int Count)>();
        }

        var raw = await _db.Reviews
            .Where(r => ids.Contains(r.VenueId))
            .GroupBy(r => r.VenueId)
            .Select(g => new { VenueId = g.Key, Sum = g.Sum(r => r.Rating), Count = g.Count() })
            .ToListAsync();

        return raw.ToDictionary(x => x.VenueId, x => (Math.Round((double)x.Sum / x.Count, 1), x.Count));
    }

    public async Task<VenueDashboardDto> GetDashboardAsync(Guid venueId, Guid callerId, bool callerIsAdmin)
    {
        var venue = await _db.Venues.AsNoTracking().FirstOrDefaultAsync(v => v.Id == venueId)
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

    private static VenueDto ToDto(Venue v, Dictionary<Guid, (double Average, int Count)> stats)
    {
        stats.TryGetValue(v.Id, out var stat);
        return new()
        {
            Id = v.Id,
            Name = v.Name,
            Address = v.Address,
            Description = v.Description,
            ImageUrl = v.ImageUrl,
            City = v.City,
            BusinessEmail = v.BusinessEmail,
            BusinessPhone = v.BusinessPhone,
            OperatingHours = v.OperatingHours,
            CuisineTypes = FromCsv(v.CuisineTypes),
            GalleryImageUrls = FromCsv(v.GalleryImageUrls),
            Rating = stat.Average,
            ReviewCount = stat.Count
        };
    }
}
