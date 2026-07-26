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
        await AttachActiveHoldsAsync(dto);
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
            var shape = Enum.Parse<TableShape>(tableRequest.Shape, ignoreCase: true);

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
                floorPlan.Tables.Add(new Table
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
        await AttachActiveHoldsAsync(dto);
        return dto;
    }

    private async Task AttachActiveHoldsAsync(FloorPlanDto dto)
    {
        var tableIds = dto.Tables.Select(t => t.Id).ToList();

        var activeHolds = await _db.Reservations
            .Where(r => tableIds.Contains(r.TableId) && r.Status == ReservationStatus.Held)
            .Select(r => new { r.TableId, r.HoldExpiresAt })
            .ToListAsync();

        var holdsByTable = activeHolds.ToDictionary(h => h.TableId, h => h.HoldExpiresAt);

        foreach (var table in dto.Tables)
        {
            if (holdsByTable.TryGetValue(table.Id, out var expiresAt))
            {
                table.HoldExpiresAt = expiresAt;
            }
        }
    }

    private static FloorPlanDto ToDto(FloorPlan floorPlan) => new()
    {
        Id = floorPlan.Id,
        VenueId = floorPlan.VenueId,
        Name = floorPlan.Name,
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
            Status = t.Status.ToString()
        }).ToList()
    };
}
