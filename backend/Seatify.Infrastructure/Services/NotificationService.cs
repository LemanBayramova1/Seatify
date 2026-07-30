using Microsoft.EntityFrameworkCore;
using Seatify.Application.Common.Exceptions;
using Seatify.Application.DTOs.Notifications;
using Seatify.Application.Interfaces;
using Seatify.Domain.Entities;
using Seatify.Domain.Enums;
using Seatify.Infrastructure.Persistence;

namespace Seatify.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<NotificationDto>> GetForUserAsync(Guid userId)
    {
        var notifications = await _db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();

        return notifications.Select(ToDto).ToList();
    }

    public async Task MarkAsReadAsync(Guid userId, Guid notificationId)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId)
            ?? throw new NotFoundException(nameof(Notification), notificationId);

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            await _db.SaveChangesAsync();
        }
    }

    public async Task NotifyNewVenueAsync(Guid venueId, string venueName)
    {
        var customerIds = await _db.Users
            .Where(u => u.Role == UserRole.Customer && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync();

        if (customerIds.Count == 0)
        {
            return;
        }

        var notifications = customerIds.Select(userId => new Notification
        {
            UserId = userId,
            Title = "Yeni restoran!",
            Message = $"Yeni restoran açıldı: {venueName}!",
            Type = NotificationType.NewVenue
        });

        _db.Notifications.AddRange(notifications);
        await _db.SaveChangesAsync();
    }

    public async Task NotifyTableAvailableAsync(Guid venueId, Guid excludeUserId)
    {
        var venue = await _db.Venues.FindAsync(venueId);
        if (venue is null)
        {
            return;
        }

        var interestedUserIds = await _db.Reservations
            .Where(r => r.Table.FloorPlan.VenueId == venueId && r.UserId != excludeUserId)
            .Select(r => r.UserId)
            .Distinct()
            .ToListAsync();

        if (interestedUserIds.Count == 0)
        {
            return;
        }

        var notifications = interestedUserIds.Select(userId => new Notification
        {
            UserId = userId,
            Title = "Masa açıldı!",
            Message = $"{venue.Name} restoranında masa açıldı!",
            Type = NotificationType.TableAvailable
        });

        _db.Notifications.AddRange(notifications);
        await _db.SaveChangesAsync();
    }

    public async Task NotifyNewReviewAsync(Guid ownerId, string venueName)
    {
        _db.Notifications.Add(new Notification
        {
            UserId = ownerId,
            Title = "Yeni rəy!",
            Message = $"Restoranınıza yeni rəy yazıldı: {venueName}",
            Type = NotificationType.NewReview
        });

        await _db.SaveChangesAsync();
    }

    public async Task NotifyNewBookingAsync(Guid ownerId, string venueName, string tableLabel)
    {
        _db.Notifications.Add(new Notification
        {
            UserId = ownerId,
            Title = "Yeni bron!",
            Message = $"{venueName} üçün yeni masa bron edildi: {tableLabel}",
            Type = NotificationType.NewBooking
        });

        await _db.SaveChangesAsync();
    }

    private static NotificationDto ToDto(Notification n) => new()
    {
        Id = n.Id,
        Title = n.Title,
        Message = n.Message,
        Type = n.Type.ToString(),
        IsRead = n.IsRead,
        CreatedAt = n.CreatedAt
    };
}
