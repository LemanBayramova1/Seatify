using Microsoft.EntityFrameworkCore;
using Seatify.Application.Common;
using Seatify.Application.Common.Exceptions;
using Seatify.Application.DTOs.Admin;
using Seatify.Application.DTOs.Realtime;
using Seatify.Application.DTOs.Reservations;
using Seatify.Application.Interfaces;
using Seatify.Domain.Entities;
using Seatify.Domain.Enums;
using Seatify.Infrastructure.Persistence;

namespace Seatify.Infrastructure.Services;

public class AdminService : IAdminService
{
    private readonly AppDbContext _db;
    private readonly IDistributedLockService _redisLock;
    private readonly ITableStateNotifier _notifier;

    public AdminService(AppDbContext db, IDistributedLockService redisLock, ITableStateNotifier notifier)
    {
        _db = db;
        _redisLock = redisLock;
        _notifier = notifier;
    }

    public async Task<AdminAnalyticsDto> GetAnalyticsAsync()
    {
        var monthStart = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        // SQLite can't translate Sum() over `decimal` server-side (see VenueService.GetDashboardAsync) —
        // pull the relevant fees back and sum them client-side throughout this method.
        var monthlyPaidFees = await _db.Reservations
            .Where(r => r.DepositPaid && r.ReservationDate >= monthStart)
            .Select(r => r.DepositFee)
            .ToListAsync();

        var trendStart = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-13);
        var recentReservations = await _db.Reservations
            .Where(r => r.ReservationDate >= trendStart)
            .Select(r => new { r.ReservationDate, r.DepositFee, r.DepositPaid })
            .ToListAsync();

        var reservationTrend = Enumerable.Range(0, 14)
            .Select(offset => trendStart.AddDays(offset))
            .Select(date => new DailyCountDto { Date = date, Count = recentReservations.Count(r => r.ReservationDate == date) })
            .ToList();

        var revenueTrend = Enumerable.Range(0, 14)
            .Select(offset => trendStart.AddDays(offset))
            .Select(date => new DailyRevenueDto
            {
                Date = date,
                Amount = recentReservations.Where(r => r.ReservationDate == date && r.DepositPaid).Sum(r => r.DepositFee)
            })
            .ToList();

        return new AdminAnalyticsDto
        {
            TotalBookings = await _db.Reservations.CountAsync(r => r.Status == ReservationStatus.Confirmed),
            MonthlyRevenueAzn = monthlyPaidFees.Sum(),
            ActiveVenuesCount = await _db.Venues.CountAsync(v => v.IsActive),
            RegisteredUsersCount = await _db.Users.CountAsync(),
            ReservationTrend = reservationTrend,
            RevenueTrend = revenueTrend,
            StatusBreakdown = new StatusBreakdownDto
            {
                Confirmed = await _db.Reservations.CountAsync(r => r.Status == ReservationStatus.Confirmed),
                Held = await _db.Reservations.CountAsync(r => r.Status == ReservationStatus.Held),
                Cancelled = await _db.Reservations.CountAsync(r => r.Status == ReservationStatus.Cancelled),
                Expired = await _db.Reservations.CountAsync(r => r.Status == ReservationStatus.Expired)
            }
        };
    }

    public async Task<List<AdminVenueDto>> GetVenuesAsync()
    {
        var venues = await _db.Venues
            .Include(v => v.Owner)
            .Include(v => v.FloorPlans).ThenInclude(f => f.Tables)
            .OrderBy(v => v.Name)
            .ToListAsync();

        return venues.Select(v => new AdminVenueDto
        {
            Id = v.Id,
            Name = v.Name,
            OwnerName = v.Owner.Name,
            City = v.City,
            TableCount = v.FloorPlans.Sum(f => f.Tables.Count),
            IsActive = v.IsActive
        }).ToList();
    }

    public async Task ToggleVenueActiveAsync(Guid venueId, bool isActive)
    {
        var venue = await _db.Venues.FirstOrDefaultAsync(v => v.Id == venueId)
            ?? throw new NotFoundException(nameof(Venue), venueId);

        venue.IsActive = isActive;
        await _db.SaveChangesAsync();
    }

    public async Task<List<AdminUserDto>> GetUsersAsync()
    {
        var users = await _db.Users.OrderByDescending(u => u.CreatedAt).ToListAsync();

        return users.Select(u => new AdminUserDto
        {
            Id = u.Id,
            Name = u.Name,
            Email = u.Email,
            Phone = u.Phone,
            Role = u.Role.ToString(),
            CreatedAt = u.CreatedAt
        }).ToList();
    }

    public async Task<List<ReservationDto>> GetReservationsAsync(DateOnly? date, string? status)
    {
        var query = _db.Reservations
            .Include(r => r.Table).ThenInclude(t => t.FloorPlan).ThenInclude(f => f.Venue)
            .AsQueryable();

        if (date.HasValue)
        {
            query = query.Where(r => r.ReservationDate == date.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ReservationStatus>(status, ignoreCase: true, out var parsedStatus))
        {
            query = query.Where(r => r.Status == parsedStatus);
        }

        var reservations = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return reservations.Select(ToDto).ToList();
    }

    public async Task ApproveReservationAsync(Guid reservationId)
    {
        var reservation = await _db.Reservations
            .Include(r => r.Table).ThenInclude(t => t.FloorPlan)
            .FirstOrDefaultAsync(r => r.Id == reservationId)
            ?? throw new NotFoundException(nameof(Reservation), reservationId);

        if (reservation.Status != ReservationStatus.Held)
        {
            throw new ConflictException("Only a pending (Held) reservation can be approved.");
        }

        await _redisLock.ReleaseLockAsync(ReservationLock.Key(reservation.TableId, reservation.ReservationDate, reservation.TimeSlot), reservation.HoldToken);

        reservation.Status = ReservationStatus.Confirmed;
        reservation.DepositPaid = true;
        await _db.SaveChangesAsync();

        await _notifier.NotifyTableStatusChangedAsync(new TableStatusChangedMessage
        {
            VenueId = reservation.Table.FloorPlan.VenueId,
            FloorPlanId = reservation.Table.FloorPlanId,
            TableId = reservation.TableId,
            Status = TableStatus.Booked.ToString(),
            ReservationDate = reservation.ReservationDate,
            TimeSlot = reservation.TimeSlot
        });
    }

    public async Task RejectReservationAsync(Guid reservationId)
    {
        var reservation = await _db.Reservations
            .Include(r => r.Table).ThenInclude(t => t.FloorPlan)
            .FirstOrDefaultAsync(r => r.Id == reservationId)
            ?? throw new NotFoundException(nameof(Reservation), reservationId);

        if (reservation.Status is not (ReservationStatus.Held or ReservationStatus.Confirmed))
        {
            throw new ConflictException("This reservation is no longer active.");
        }

        if (reservation.Status == ReservationStatus.Held)
        {
            await _redisLock.ReleaseLockAsync(ReservationLock.Key(reservation.TableId, reservation.ReservationDate, reservation.TimeSlot), reservation.HoldToken);
        }

        reservation.Status = ReservationStatus.Cancelled;
        await _db.SaveChangesAsync();

        await _notifier.NotifyTableStatusChangedAsync(new TableStatusChangedMessage
        {
            VenueId = reservation.Table.FloorPlan.VenueId,
            FloorPlanId = reservation.Table.FloorPlanId,
            TableId = reservation.TableId,
            Status = TableStatus.Available.ToString(),
            ReservationDate = reservation.ReservationDate,
            TimeSlot = reservation.TimeSlot
        });
    }

    private static ReservationDto ToDto(Reservation r) => new()
    {
        Id = r.Id,
        TableId = r.TableId,
        TableLabel = r.Table.Label,
        VenueId = r.Table.FloorPlan.VenueId,
        VenueName = r.Table.FloorPlan.Venue.Name,
        ReservationDate = r.ReservationDate,
        TimeSlot = r.TimeSlot,
        PartySize = r.PartySize,
        Status = r.Status.ToString(),
        DepositFee = r.DepositFee,
        DepositPaid = r.DepositPaid,
        CreatedAt = r.CreatedAt
    };
}
