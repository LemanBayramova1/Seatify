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

        // Every submission notifies the owner — including a guest editing their existing
        // review — so the owner is never silently skipped on a resubmission.
        await _notificationService.NotifyNewReviewAsync(venue.OwnerId, venue.Name);

        var user = await _db.Users.FindAsync(userId);
        return new ReviewDto
        {
            Id = review.Id,
            VenueId = venueId,
            UserId = userId,
            UserName = user?.Name ?? "Guest",
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt,
            OwnerReply = review.OwnerReply,
            OwnerReplyDate = review.OwnerReplyDate
        };
    }

    public async Task<ReviewDto> ReplyAsync(Guid reviewId, Guid callerId, bool callerIsAdmin, ReplyReviewRequestDto request)
    {
        var review = await _db.Reviews
            .Include(r => r.User)
            .Include(r => r.Venue)
            .FirstOrDefaultAsync(r => r.Id == reviewId)
            ?? throw new NotFoundException(nameof(Review), reviewId);

        if (!callerIsAdmin && review.Venue.OwnerId != callerId)
        {
            throw new UnauthorizedAppException("You do not manage this venue.");
        }

        review.OwnerReply = request.Reply.Trim();
        review.OwnerReplyDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ToDto(review);
    }

    public async Task<ReviewDto> DeleteReplyAsync(Guid reviewId, Guid callerId, bool callerIsAdmin)
    {
        var review = await _db.Reviews
            .Include(r => r.User)
            .Include(r => r.Venue)
            .FirstOrDefaultAsync(r => r.Id == reviewId)
            ?? throw new NotFoundException(nameof(Review), reviewId);

        if (!callerIsAdmin && review.Venue.OwnerId != callerId)
        {
            throw new UnauthorizedAppException("You do not manage this venue.");
        }

        review.OwnerReply = null;
        review.OwnerReplyDate = null;
        await _db.SaveChangesAsync();

        return ToDto(review);
    }

    public async Task DeleteAsync(Guid reviewId, Guid callerId, bool callerIsAdmin)
    {
        var review = await _db.Reviews
            .Include(r => r.Venue)
            .FirstOrDefaultAsync(r => r.Id == reviewId)
            ?? throw new NotFoundException(nameof(Review), reviewId);

        if (!callerIsAdmin && review.Venue.OwnerId != callerId)
        {
            throw new UnauthorizedAppException("You do not manage this venue.");
        }

        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync();
    }

    private static ReviewDto ToDto(Review r) => new()
    {
        Id = r.Id,
        VenueId = r.VenueId,
        UserId = r.UserId,
        UserName = r.User.Name,
        Rating = r.Rating,
        Comment = r.Comment,
        CreatedAt = r.CreatedAt,
        OwnerReply = r.OwnerReply,
        OwnerReplyDate = r.OwnerReplyDate
    };
}
