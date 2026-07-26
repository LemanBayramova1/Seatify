using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Seatify.Application.Common.Exceptions;
using Seatify.Application.DTOs.Realtime;
using Seatify.Application.DTOs.Reservations;
using Seatify.Application.Interfaces;
using Seatify.Domain.Entities;
using Seatify.Domain.Enums;
using Seatify.Infrastructure.Options;
using Seatify.Infrastructure.Persistence;

namespace Seatify.Infrastructure.Services;

public class ReservationService : IReservationService
{
    private readonly AppDbContext _db;
    private readonly IDistributedLockService _redisLock;
    private readonly ITableStateNotifier _notifier;
    private readonly ReservationOptions _options;

    public ReservationService(
        AppDbContext db,
        IDistributedLockService redisLock,
        ITableStateNotifier notifier,
        IOptions<ReservationOptions> options)
    {
        _db = db;
        _redisLock = redisLock;
        _notifier = notifier;
        _options = options.Value;
    }

    private static string LockKey(Guid tableId) => $"table-hold:{tableId}";

    public async Task<HoldTableResponseDto> HoldAsync(Guid userId, HoldTableRequestDto request)
    {
        var table = await _db.Tables
            .Include(t => t.FloorPlan)
            .FirstOrDefaultAsync(t => t.Id == request.TableId)
            ?? throw new NotFoundException(nameof(Table), request.TableId);

        if (table.Status == TableStatus.Booked)
        {
            throw new ConflictException("This table is already booked.");
        }

        var holdToken = Guid.NewGuid().ToString("N");
        var ttl = TimeSpan.FromMinutes(_options.HoldDurationMinutes);

        // Redis SET NX is the actual concurrency gate: if two requests race here, only one
        // acquires the key and the other gets false back atomically.
        var acquired = await _redisLock.TryAcquireLockAsync(LockKey(table.Id), holdToken, ttl);
        if (!acquired)
        {
            throw new ConflictException("This table is currently held by another guest. Please try another table.");
        }

        var expiresAt = DateTime.UtcNow.Add(ttl);

        var reservation = new Reservation
        {
            TableId = table.Id,
            UserId = userId,
            ReservationDate = request.ReservationDate,
            TimeSlot = request.TimeSlot,
            PartySize = request.PartySize,
            Status = ReservationStatus.Held,
            HoldToken = holdToken,
            HoldExpiresAt = expiresAt,
            DepositFee = table.DepositFee
        };

        table.Status = TableStatus.Held;

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();

        await _notifier.NotifyTableStatusChangedAsync(new TableStatusChangedMessage
        {
            VenueId = table.FloorPlan.VenueId,
            FloorPlanId = table.FloorPlanId,
            TableId = table.Id,
            Status = TableStatus.Held.ToString(),
            HoldExpiresAt = expiresAt
        });

        return new HoldTableResponseDto
        {
            ReservationId = reservation.Id,
            TableId = table.Id,
            HoldToken = holdToken,
            HoldExpiresAt = expiresAt,
            DepositFee = table.DepositFee
        };
    }

    public async Task<ReservationDto> ConfirmAsync(Guid userId, ConfirmReservationRequestDto request)
    {
        var reservation = await _db.Reservations
            .Include(r => r.Table).ThenInclude(t => t.FloorPlan).ThenInclude(f => f.Venue)
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId)
            ?? throw new NotFoundException(nameof(Reservation), request.ReservationId);

        if (reservation.UserId != userId)
        {
            throw new UnauthorizedAppException("You do not own this reservation.");
        }

        if (reservation.Status != ReservationStatus.Held)
        {
            throw new GoneException("This hold is no longer active.");
        }

        if (reservation.HoldToken != request.HoldToken)
        {
            throw new UnauthorizedAppException("Invalid hold token.");
        }

        var lockKey = LockKey(reservation.TableId);
        var currentLockValue = await _redisLock.GetLockValueAsync(lockKey);

        if (currentLockValue is null || currentLockValue != reservation.HoldToken)
        {
            // The Redis TTL already expired even though the background sweep hasn't caught up yet.
            reservation.Status = ReservationStatus.Expired;
            reservation.Table.Status = TableStatus.Available;
            await _db.SaveChangesAsync();

            await _notifier.NotifyTableStatusChangedAsync(new TableStatusChangedMessage
            {
                VenueId = reservation.Table.FloorPlan.VenueId,
                FloorPlanId = reservation.Table.FloorPlanId,
                TableId = reservation.TableId,
                Status = TableStatus.Available.ToString()
            });

            throw new GoneException("Your hold has expired. Please hold the table again.");
        }

        await _redisLock.ReleaseLockAsync(lockKey, reservation.HoldToken);

        reservation.Status = ReservationStatus.Confirmed;
        reservation.DepositPaid = true;
        reservation.Table.Status = TableStatus.Booked;

        await _db.SaveChangesAsync();

        await _notifier.NotifyTableStatusChangedAsync(new TableStatusChangedMessage
        {
            VenueId = reservation.Table.FloorPlan.VenueId,
            FloorPlanId = reservation.Table.FloorPlanId,
            TableId = reservation.TableId,
            Status = TableStatus.Booked.ToString()
        });

        return ToDto(reservation);
    }

    public async Task CancelAsync(Guid userId, Guid reservationId)
    {
        var reservation = await _db.Reservations
            .Include(r => r.Table).ThenInclude(t => t.FloorPlan)
            .FirstOrDefaultAsync(r => r.Id == reservationId)
            ?? throw new NotFoundException(nameof(Reservation), reservationId);

        if (reservation.UserId != userId)
        {
            throw new UnauthorizedAppException("You do not own this reservation.");
        }

        if (reservation.Status is not (ReservationStatus.Held or ReservationStatus.Confirmed))
        {
            throw new GoneException("This reservation is no longer active.");
        }

        if (reservation.Status == ReservationStatus.Held)
        {
            await _redisLock.ReleaseLockAsync(LockKey(reservation.TableId), reservation.HoldToken);
        }

        reservation.Status = ReservationStatus.Cancelled;
        reservation.Table.Status = TableStatus.Available;

        await _db.SaveChangesAsync();

        await _notifier.NotifyTableStatusChangedAsync(new TableStatusChangedMessage
        {
            VenueId = reservation.Table.FloorPlan.VenueId,
            FloorPlanId = reservation.Table.FloorPlanId,
            TableId = reservation.TableId,
            Status = TableStatus.Available.ToString()
        });
    }

    public async Task<List<ReservationDto>> GetMyBookingsAsync(Guid userId)
    {
        var reservations = await _db.Reservations
            .Include(r => r.Table).ThenInclude(t => t.FloorPlan).ThenInclude(f => f.Venue)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return reservations.Select(ToDto).ToList();
    }

    public async Task ReleaseExpiredHoldsAsync()
    {
        var now = DateTime.UtcNow;

        var expired = await _db.Reservations
            .Include(r => r.Table).ThenInclude(t => t.FloorPlan)
            .Where(r => r.Status == ReservationStatus.Held && r.HoldExpiresAt <= now)
            .ToListAsync();

        if (expired.Count == 0)
        {
            return;
        }

        var notifications = new List<TableStatusChangedMessage>();

        foreach (var reservation in expired)
        {
            var lockKey = LockKey(reservation.TableId);
            var currentValue = await _redisLock.GetLockValueAsync(lockKey);

            if (currentValue == reservation.HoldToken)
            {
                // Redis hasn't expired the key yet (clock skew / just crossed the boundary) — release it explicitly.
                await _redisLock.ReleaseLockAsync(lockKey, reservation.HoldToken);
            }

            reservation.Status = ReservationStatus.Expired;
            reservation.Table.Status = TableStatus.Available;

            notifications.Add(new TableStatusChangedMessage
            {
                VenueId = reservation.Table.FloorPlan.VenueId,
                FloorPlanId = reservation.Table.FloorPlanId,
                TableId = reservation.TableId,
                Status = TableStatus.Available.ToString()
            });
        }

        await _db.SaveChangesAsync();

        foreach (var notification in notifications)
        {
            await _notifier.NotifyTableStatusChangedAsync(notification);
        }
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
