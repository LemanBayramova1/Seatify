using Seatify.Application.DTOs.Reviews;

namespace Seatify.Application.Interfaces;

public interface IReviewService
{
    Task<List<ReviewDto>> GetVenueReviewsAsync(Guid venueId);

    /// <summary>Creates the caller's review for this venue, or updates their existing one if
    /// they already reviewed it — one review per guest per venue.</summary>
    Task<ReviewDto> CreateAsync(Guid userId, Guid venueId, CreateReviewRequestDto request);
}
