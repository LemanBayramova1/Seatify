using Microsoft.EntityFrameworkCore;
using Seatify.Application.Common.Exceptions;
using Seatify.Application.DTOs.Reviews;
using Seatify.Application.Interfaces;
using Seatify.Domain.Entities;
using Seatify.Infrastructure.Persistence;

namespace Seatify.Infrastructure.Services;

public class ReviewService : IReviewService
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notificationService;

    public ReviewService(AppDbContext db, INotificationService notificationService)
    {
        _db = db;
        _notificationService = notificationService;
    }

    public async Task<List<ReviewDto>> GetVenueReviewsAsync(Guid venueId)
    {
        var reviews = await _db.Reviews
            .Include(r => r.User)
            .Where(r => r.VenueId == venueId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return reviews.Select(ToDto).ToList();
    }

    public async Task<ReviewDto> CreateAsync(Guid userId, Guid venueId, CreateReviewRequestDto request)
    {
        var venue = await _db.Venues.FirstOrDefaultAsync(v => v.Id == venueId)
            ?? throw new NotFoundException(nameof(Venue), venueId);

        if (request.Rating is < 1 or > 5)
        {
            throw new ValidationException("Rating must be between 1 and 5 stars.");
        }

        var review = await _db.Reviews.FirstOrDefaultAsync(r => r.VenueId == venueId && r.UserId == userId);
        var isNewReview = review is null;
        if (review is not null)
        {
            review.Rating = request.Rating;
            review.Comment = request.Comment?.Trim();
        }
        else
        {
            review = new Review
            {
                VenueId = venueId,
                UserId = userId,
                Rating = request.Rating,
                Comment = request.Comment?.Trim()
            };
            _db.Reviews.Add(review);
        }

        await _db.SaveChangesAsync();

        if (isNewReview)
        {
            await _notificationService.NotifyNewReviewAsync(venue.OwnerId, venue.Name);
        }

        var user = await _db.Users.FindAsync(userId);
        return new ReviewDto
        {
            Id = review.Id,
            VenueId = venueId,
            UserId = userId,
            UserName = user?.Name ?? "Guest",
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt
        };
    }

    private static ReviewDto ToDto(Review r) => new()
    {
        Id = r.Id,
        VenueId = r.VenueId,
        UserId = r.UserId,
        UserName = r.User.Name,
        Rating = r.Rating,
        Comment = r.Comment,
        CreatedAt = r.CreatedAt
    };
}
