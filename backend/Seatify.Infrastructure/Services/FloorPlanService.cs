using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Seatify.Application.Common.Exceptions;
using Seatify.Application.DTOs.FloorPlans;
using Seatify.Application.Interfaces;
using Seatify.Domain.Entities;
using Seatify.Domain.Enums;
using Seatify.Infrastructure.Persistence;

namespace Seatify.Infrastructure.Services;

public class FloorPlanService : IFloorPlanService
{
    private readonly AppDbContext _db;

    public FloorPlanService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<FloorPlanDto> GetByVenueIdAsync(Guid venueId)
    {
        var venueExists = await _db.Venues.AnyAsync(v => v.Id == venueId);
        if (!venueExists)
        {
            throw new NotFoundException(nameof(Venue), venueId);
        }

        var floorPlan = await _db.FloorPlans
            .Include(f => f.Tables)
            .FirstOrDefaultAsync(f => f.VenueId == venueId);

        if (floorPlan is null)
        {
            throw new NotFoundException("This venue does not have a floor plan yet.");
        }

        var dto = ToDto(floorPlan);
        await AttachActiveHoldsAsync(dto.Tables);
        return dto;
    }

    public async Task<FloorPlanDto> SaveAsync(Guid venueId, Guid callerId, bool callerIsAdmin, SaveFloorPlanRequestDto request)
    {
        var venue = await _db.Venues.FirstOrDefaultAsync(v => v.Id == venueId)
            ?? throw new NotFoundException(nameof(Venue), venueId);

        if (!callerIsAdmin && venue.OwnerId != callerId)
        {
            throw new UnauthorizedAppException("You do not manage this venue.");
        }

        // One floor plan per venue: look it up by venue rather than a posted floor-plan id,
        // since only VenueId is guaranteed stable across the very first save.
        var floorPlan = await _db.FloorPlans
            .Include(f => f.Tables)
            .FirstOrDefaultAsync(f => f.VenueId == venueId);

        if (floorPlan is null)
        {
            floorPlan = new FloorPlan { VenueId = venueId };
            _db.FloorPlans.Add(floorPlan);
        }

        floorPlan.Name = request.Name.Trim();
        floorPlan.BackgroundImageUrl = request.BackgroundImageUrl;
        floorPlan.CanvasWidth = request.CanvasWidth;
        floorPlan.CanvasHeight = request.CanvasHeight;

        var incomingIds = request.Tables.Where(t => t.Id.HasValue).Select(t => t.Id!.Value).ToHashSet();
        var tablesToRemove = floorPlan.Tables.Where(t => !incomingIds.Contains(t.Id)).ToList();

        foreach (var table in tablesToRemove)
        {
            var hasActiveReservation = await _db.Reservations.AnyAsync(r =>
                r.TableId == table.Id && (r.Status == ReservationStatus.Held || r.Status == ReservationStatus.Confirmed));

            if (hasActiveReservation)
            {
                throw new ConflictException($"Table '{table.Label}' has an active hold or booking and cannot be removed.");
            }

            floorPlan.Tables.Remove(table);
            _db.Tables.Remove(table);
        }

        foreach (var tableRequest in request.Tables)
        {
            var shape = ParseShape(tableRequest.Shape, tableRequest.Label);

            if (tableRequest.Id.HasValue)
            {
                var existing = floorPlan.Tables.FirstOrDefault(t => t.Id == tableRequest.Id.Value)
                    ?? throw new NotFoundException(nameof(Table), tableRequest.Id.Value);

                existing.Label = tableRequest.Label.Trim();
                existing.X = tableRequest.X;
                existing.Y = tableRequest.Y;
                existing.Width = tableRequest.Width;
                existing.Height = tableRequest.Height;
                existing.Rotation = tableRequest.Rotation;
                existing.Shape = shape;
                existing.Zone = tableRequest.Zone;
                existing.Capacity = tableRequest.Capacity;
                existing.DepositFee = tableRequest.DepositFee;
            }
            else
            {
                // _db.Tables.Add (not floorPlan.Tables.Add) is required, not stylistic: Table.Id
                // is a client-generated Guid (BaseEntity's `= Guid.NewGuid()` initializer) that's
                // already non-default the instant this object is constructed. Reaching a new
                // entity only via a navigation collection on an already-tracked parent lets EF's
                // disconnected-graph heuristic see that non-default key and infer
                // EntityState.Modified instead of Added — it then issues an UPDATE that matches
                // zero rows and throws DbUpdateConcurrencyException. Adding directly to the DbSet
                // sidesteps the heuristic and forces the correct INSERT.
                _db.Tables.Add(new Table
                {
                    FloorPlanId = floorPlan.Id,
                    Label = tableRequest.Label.Trim(),
                    X = tableRequest.X,
                    Y = tableRequest.Y,
                    Width = tableRequest.Width,
                    Height = tableRequest.Height,
                    Rotation = tableRequest.Rotation,
                    Shape = shape,
                    Zone = tableRequest.Zone,
                    Capacity = tableRequest.Capacity,
                    DepositFee = tableRequest.DepositFee,
                    Status = TableStatus.Available
                });
            }
        }

        await _db.SaveChangesAsync();

        var dto = ToDto(floorPlan);
        await AttachActiveHoldsAsync(dto.Tables);
        return dto;
    }

    public async Task<List<FloorPlanDto>> GetAllByVenueIdAsync(Guid venueId, DateOnly? date = null, string? timeSlot = null)
    {
        var venueExists = await _db.Venues.AnyAsync(v => v.Id == venueId);
        if (!venueExists)
        {
            throw new NotFoundException(nameof(Venue), venueId);
        }

        var floorPlans = await _db.FloorPlans
            .Where(f => f.VenueId == venueId)
            .Include(f => f.Tables.Where(t => t.IsActive))
            .OrderBy(f => f.Level)
            .ToListAsync();

        var dtos = floorPlans.Select(ToDto).ToList();

        // Availability is per date+time-slot: when the caller (the customer booking flow)
        // specifies one, compute each table's Status fresh from Reservations for that exact
        // slot instead of the stale global `Table.Status` column — see ReservationService's
        // remarks on why that column is no longer trustworthy across dates. The builder's own
        // call (no date/timeSlot) keeps the old, date-agnostic behavior.
        if (date.HasValue && !string.IsNullOrWhiteSpace(timeSlot))
        {
            await ApplySlotAvailabilityAsync(dtos.SelectMany(d => d.Tables), date.Value, timeSlot);
        }
        else
        {
            await AttachActiveHoldsAsync(dtos.SelectMany(d => d.Tables));
        }

        return dtos;
    }

    public async Task<List<FloorPlanDto>> SaveLayoutAsync(Guid callerId, bool callerIsAdmin, SaveLayoutRequestDto request)
    {
        var venue = await _db.Venues.FirstOrDefaultAsync(v => v.Id == request.RestaurantId)
            ?? throw new NotFoundException(nameof(Venue), request.RestaurantId);

        if (!callerIsAdmin && venue.OwnerId != callerId)
        {
            throw new UnauthorizedAppException("You do not manage this venue.");
        }

        var existingFloorPlans = await _db.FloorPlans
            .Include(f => f.Tables)
            .Where(f => f.VenueId == request.RestaurantId)
            .ToListAsync();

        await using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var incomingFloorPlanIds = request.FloorPlans.Where(f => f.Id.HasValue).Select(f => f.Id!.Value).ToHashSet();
            var floorPlansToRemove = existingFloorPlans.Where(f => !incomingFloorPlanIds.Contains(f.Id)).ToList();

            foreach (var floorPlan in floorPlansToRemove)
            {
                await EnsureNoActiveReservationsAsync(floorPlan.Tables.Select(t => t.Id), floorPlan.Name);
                _db.FloorPlans.Remove(floorPlan); // cascade removes its tables
            }

            var savedFloorPlans = new List<FloorPlan>();

            // Two passes, two SaveChanges calls: pass 1 only ever touches floor-plan rows
            // (insert/update) and table DELETEs; pass 2 only ever touches table INSERT/UPDATEs.
            // Splitting them is required, not just tidy — batching a floor_plans UPDATE together
            // with a tables INSERT in the same SaveChangesAsync() call hits a real bug in the
            // Sqlite provider's RETURNING-based affected-row-count check: it misattributes the
            // inserted table's result to the floor plan's UPDATE, which then throws
            // DbUpdateConcurrencyException ("expected to affect 1 row(s), but actually affected
            // 0 row(s)") even though the floor plan row is untouched and perfectly fine. This is
            // the exact "An unexpected error occurred" a user hits saving a table onto an
            // existing floor — a brand-new floor plan (INSERT, not UPDATE) never triggered it,
            // which is why it looked intermittent.
            foreach (var floorPlanRequest in request.FloorPlans)
            {
                var floorPlan = floorPlanRequest.Id.HasValue
                    ? existingFloorPlans.FirstOrDefault(f => f.Id == floorPlanRequest.Id.Value)
                        ?? throw new NotFoundException(nameof(FloorPlan), floorPlanRequest.Id.Value)
                    : new FloorPlan { VenueId = request.RestaurantId };

                if (!floorPlanRequest.Id.HasValue)
                {
                    _db.FloorPlans.Add(floorPlan);
                }

                floorPlan.Name = floorPlanRequest.Name.Trim();
                floorPlan.Level = floorPlanRequest.Level;
                floorPlan.BackgroundImageUrl = floorPlanRequest.BackgroundImageUrl;
                floorPlan.LayoutData = SerializeElements(floorPlanRequest.Elements);
                floorPlan.CanvasWidth = floorPlanRequest.CanvasWidth;
                floorPlan.CanvasHeight = floorPlanRequest.CanvasHeight;

                var incomingTableIds = floorPlanRequest.Tables.Where(t => t.Id.HasValue).Select(t => t.Id!.Value).ToHashSet();
                var tablesToRemove = floorPlan.Tables.Where(t => !incomingTableIds.Contains(t.Id)).ToList();

                await EnsureNoActiveReservationsAsync(tablesToRemove.Select(t => t.Id), floorPlan.Name);
                foreach (var table in tablesToRemove)
                {
                    floorPlan.Tables.Remove(table);
                    _db.Tables.Remove(table);
                }

                savedFloorPlans.Add(floorPlan);
            }

            await _db.SaveChangesAsync();

            // savedFloorPlans was built by iterating request.FloorPlans in the exact same order
            // above (one entry appended per request item) — zip by position rather than
            // matching on Name/Level, which could collide for two new same-named floors.
            foreach (var (floorPlanRequest, floorPlan) in request.FloorPlans.Zip(savedFloorPlans))
            {
                foreach (var tableRequest in floorPlanRequest.Tables)
                {
                    var shape = ParseShape(tableRequest.Shape, tableRequest.Label);

                    if (tableRequest.Id.HasValue)
                    {
                        var existing = floorPlan.Tables.FirstOrDefault(t => t.Id == tableRequest.Id.Value)
                            ?? throw new NotFoundException(nameof(Table), tableRequest.Id.Value);

                        existing.Label = tableRequest.Label.Trim();
                        existing.X = tableRequest.X;
                        existing.Y = tableRequest.Y;
                        existing.Width = tableRequest.Width;
                        existing.Height = tableRequest.Height;
                        existing.Rotation = tableRequest.Rotation;
                        existing.Shape = shape;
                        existing.Zone = tableRequest.Zone;
                        existing.Capacity = tableRequest.Capacity;
                        existing.DepositFee = tableRequest.DepositFee;
                        existing.IsActive = tableRequest.IsActive;
                    }
                    else
                    {
                        // See the matching comment in SaveAsync above — _db.Tables.Add is required
                        // here for the same reason, not floorPlan.Tables.Add.
                        _db.Tables.Add(new Table
                        {
                            FloorPlanId = floorPlan.Id,
                            Label = tableRequest.Label.Trim(),
                            X = tableRequest.X,
                            Y = tableRequest.Y,
                            Width = tableRequest.Width,
                            Height = tableRequest.Height,
                            Rotation = tableRequest.Rotation,
                            Shape = shape,
                            Zone = tableRequest.Zone,
                            Capacity = tableRequest.Capacity,
                            DepositFee = tableRequest.DepositFee,
                            IsActive = tableRequest.IsActive,
                            Status = TableStatus.Available
                        });
                    }
                }
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            var dtos = savedFloorPlans.OrderBy(f => f.Level).Select(ToDto).ToList();
            await AttachActiveHoldsAsync(dtos.SelectMany(d => d.Tables));
            return dtos;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<FloorPlanDto> CreateFloorAsync(Guid venueId, Guid callerId, bool callerIsAdmin, CreateFloorRequestDto request)
    {
        var venue = await _db.Venues.FirstOrDefaultAsync(v => v.Id == venueId)
            ?? throw new NotFoundException(nameof(Venue), venueId);

        if (!callerIsAdmin && venue.OwnerId != callerId)
        {
            throw new UnauthorizedAppException("You do not manage this venue.");
        }

        var floorPlan = new FloorPlan
        {
            VenueId = venueId,
            Name = request.Name.Trim(),
            Level = request.Level,
            BackgroundImageUrl = request.BackgroundImageUrl,
            CanvasWidth = request.CanvasWidth,
            CanvasHeight = request.CanvasHeight
        };

        _db.FloorPlans.Add(floorPlan);
        await _db.SaveChangesAsync();

        return ToDto(floorPlan);
    }

    public async Task<FloorPlanDto> UpdateFloorAsync(Guid floorId, Guid callerId, bool callerIsAdmin, UpdateFloorRequestDto request)
    {
        var floorPlan = await _db.FloorPlans
            .Include(f => f.Venue)
            .Include(f => f.Tables)
            .FirstOrDefaultAsync(f => f.Id == floorId)
            ?? throw new NotFoundException(nameof(FloorPlan), floorId);

        if (!callerIsAdmin && floorPlan.Venue.OwnerId != callerId)
        {
            throw new UnauthorizedAppException("You do not manage this venue.");
        }

        floorPlan.Name = request.Name.Trim();
        floorPlan.Level = request.Level;
        floorPlan.BackgroundImageUrl = request.BackgroundImageUrl;
        if (request.CanvasWidth.HasValue)
        {
            floorPlan.CanvasWidth = request.CanvasWidth.Value;
        }
        if (request.CanvasHeight.HasValue)
        {
            floorPlan.CanvasHeight = request.CanvasHeight.Value;
        }

        await _db.SaveChangesAsync();

        var dto = ToDto(floorPlan);
        await AttachActiveHoldsAsync(dto.Tables);
        return dto;
    }

    public async Task DeleteFloorAsync(Guid floorId, Guid callerId, bool callerIsAdmin)
    {
        var floorPlan = await _db.FloorPlans
            .Include(f => f.Venue)
            .Include(f => f.Tables)
            .FirstOrDefaultAsync(f => f.Id == floorId)
            ?? throw new NotFoundException(nameof(FloorPlan), floorId);

        if (!callerIsAdmin && floorPlan.Venue.OwnerId != callerId)
        {
            throw new UnauthorizedAppException("You do not manage this venue.");
        }

        await EnsureNoActiveReservationsAsync(floorPlan.Tables.Select(t => t.Id), floorPlan.Name);

        _db.FloorPlans.Remove(floorPlan);
        await _db.SaveChangesAsync();
    }

    private static string? SerializeElements(List<LayoutElementDto>? elements) =>
        elements is null || elements.Count == 0 ? null : JsonSerializer.Serialize(elements);

    /// <summary>Never throws on corrupt/legacy LayoutData — a floor plan should still load (just
    /// without its decorations) rather than fail entirely over a malformed JSON blob.</summary>
    private static List<LayoutElementDto> DeserializeElements(string? layoutData)
    {
        if (string.IsNullOrWhiteSpace(layoutData))
        {
            return new List<LayoutElementDto>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<LayoutElementDto>>(layoutData) ?? new List<LayoutElementDto>();
        }
        catch (JsonException)
        {
            return new List<LayoutElementDto>();
        }
    }

    /// <summary>A bad/unrecognized shape string used to throw an unhandled ArgumentException from
    /// Enum.Parse, which the global exception handler could only report as an opaque 500 — this
    /// surfaces a clear 400 naming the offending table instead.</summary>
    private static TableShape ParseShape(string? shape, string tableLabel)
    {
        if (!Enum.TryParse<TableShape>(shape, ignoreCase: true, out var parsed))
        {
            throw new ValidationException(
                $"Invalid shape '{shape}' for table '{tableLabel}'. Expected Rectangle, Circle, or Square.");
        }

        return parsed;
    }

    private async Task EnsureNoActiveReservationsAsync(IEnumerable<Guid> tableIds, string floorPlanName)
    {
        var ids = tableIds.ToList();
        if (ids.Count == 0)
        {
            return;
        }

        var hasActiveReservation = await _db.Reservations.AnyAsync(r =>
            ids.Contains(r.TableId) && (r.Status == ReservationStatus.Held || r.Status == ReservationStatus.Confirmed));

        if (hasActiveReservation)
        {
            throw new ConflictException($"Floor '{floorPlanName}' has a table with an active hold or booking and cannot be removed.");
        }
    }

    private async Task AttachActiveHoldsAsync(IEnumerable<TableDto> tables)
    {
        var tableList = tables.ToList();
        var tableIds = tableList.Select(t => t.Id).ToList();

        var activeHolds = await _db.Reservations
            .Where(r => tableIds.Contains(r.TableId) && r.Status == ReservationStatus.Held)
            .Select(r => new { r.TableId, r.HoldExpiresAt })
            .ToListAsync();

        var holdsByTable = activeHolds.ToDictionary(h => h.TableId, h => h.HoldExpiresAt);

        foreach (var table in tableList)
        {
            if (holdsByTable.TryGetValue(table.Id, out var expiresAt))
            {
                table.HoldExpiresAt = expiresAt;
            }
        }
    }

    private async Task ApplySlotAvailabilityAsync(IEnumerable<TableDto> tables, DateOnly date, string timeSlot)
    {
        var tableList = tables.ToList();
        var tableIds = tableList.Select(t => t.Id).ToList();
        var now = DateTime.UtcNow;

        var slotReservations = await _db.Reservations
            .Where(r => tableIds.Contains(r.TableId) && r.ReservationDate == date && r.TimeSlot == timeSlot
                && (r.Status == ReservationStatus.Confirmed || (r.Status == ReservationStatus.Held && r.HoldExpiresAt > now)))
            .Select(r => new { r.TableId, r.Status, r.HoldExpiresAt })
            .ToListAsync();

        // Group defensively in case a table somehow has more than one active row for the same
        // slot — Confirmed always wins over Held for display purposes.
        var byTable = slotReservations
            .GroupBy(r => r.TableId)
            .ToDictionary(g => g.Key, g => g.OrderBy(r => r.Status == ReservationStatus.Confirmed ? 0 : 1).First());

        foreach (var table in tableList)
        {
            if (byTable.TryGetValue(table.Id, out var reservation))
            {
                table.Status = reservation.Status == ReservationStatus.Confirmed
                    ? TableStatus.Booked.ToString()
                    : TableStatus.Held.ToString();
                table.HoldExpiresAt = reservation.Status == ReservationStatus.Held ? reservation.HoldExpiresAt : null;
            }
            else
            {
                table.Status = TableStatus.Available.ToString();
                table.HoldExpiresAt = null;
            }
        }
    }

    private static FloorPlanDto ToDto(FloorPlan floorPlan) => new()
    {
        Id = floorPlan.Id,
        VenueId = floorPlan.VenueId,
        Name = floorPlan.Name,
        Level = floorPlan.Level,
        BackgroundImageUrl = floorPlan.BackgroundImageUrl,
        CanvasWidth = floorPlan.CanvasWidth,
        CanvasHeight = floorPlan.CanvasHeight,
        Tables = floorPlan.Tables.Select(t => new TableDto
        {
            Id = t.Id,
            Label = t.Label,
            X = t.X,
            Y = t.Y,
            Width = t.Width,
            Height = t.Height,
            Rotation = t.Rotation,
            Shape = t.Shape.ToString(),
            Zone = t.Zone,
            Capacity = t.Capacity,
            DepositFee = t.DepositFee,
            Status = t.Status.ToString(),
            IsActive = t.IsActive
        }).ToList(),
        Elements = DeserializeElements(floorPlan.LayoutData)
    };
}
