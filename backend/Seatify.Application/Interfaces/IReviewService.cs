using Seatify.Application.DTOs.Reviews;

namespace Seatify.Application.Interfaces;

public interface IReviewService
{
    Task<List<ReviewDto>> GetVenueReviewsAsync(Guid venueId);

    /// <summary>Creates the caller's review for this venue, or updates their existing one if
    /// they already reviewed it — one review per guest per venue.</summary>
    Task<ReviewDto> CreateAsync(Guid userId, Guid venueId, CreateReviewRequestDto request);

    /// <summary>Adds or updates the venue owner's reply to a review. Only the venue's owner or
    /// an Admin may reply.</summary>
    Task<ReviewDto> ReplyAsync(Guid reviewId, Guid callerId, bool callerIsAdmin, ReplyReviewRequestDto request);

    /// <summary>Deletes the owner's reply from a review, leaving the review itself intact.</summary>
    Task<ReviewDto> DeleteReplyAsync(Guid reviewId, Guid callerId, bool callerIsAdmin);

    /// <summary>Permanently deletes a review. Only the venue's owner or an Admin may delete it.</summary>
    Task DeleteAsync(Guid reviewId, Guid callerId, bool callerIsAdmin);
}
