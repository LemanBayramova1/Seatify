using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seatify.Application.DTOs.Reviews;
using Seatify.Application.Interfaces;
using Seatify.Domain.Enums;

namespace Seatify.Api.Controllers;

[Route("api/venues/{venueId:guid}/reviews")]
public class ReviewsController : ApiControllerBase
{
    private readonly IReviewService _reviewService;

    public ReviewsController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<ReviewDto>>> GetForVenue(Guid venueId)
    {
        return Ok(await _reviewService.GetVenueReviewsAsync(venueId));
    }

    /// <summary>Submits (or updates) the signed-in guest's review for this venue.</summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ReviewDto>> Create(Guid venueId, CreateReviewRequestDto request)
    {
        var result = await _reviewService.CreateAsync(CurrentUserId, venueId, request);
        return Ok(result);
    }

    /// <summary>Adds or updates the venue owner's reply to a review. The venueId in the route is
    /// unused by the handler (the review already knows its venue) but kept so the route stays
    /// nested consistently with the rest of this controller.</summary>
    [HttpPost("{reviewId:guid}/reply")]
    [HttpPost("~/api/reviews/{reviewId:guid}/reply")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<ReviewDto>> Reply(Guid reviewId, ReplyReviewRequestDto request)
    {
        var isAdmin = User.IsInRole(nameof(UserRole.Admin));
        var result = await _reviewService.ReplyAsync(reviewId, CurrentUserId, isAdmin, request);
        return Ok(result);
    }

    /// <summary>Removes the venue owner's reply from a review, leaving the review itself intact.</summary>
    [HttpDelete("{reviewId:guid}/reply")]
    [HttpDelete("~/api/reviews/{reviewId:guid}/reply")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<ActionResult<ReviewDto>> DeleteReply(Guid reviewId)
    {
        var isAdmin = User.IsInRole(nameof(UserRole.Admin));
        var result = await _reviewService.DeleteReplyAsync(reviewId, CurrentUserId, isAdmin);
        return Ok(result);
    }

    /// <summary>Permanently deletes a review — the venue's owner or an Admin may do this.</summary>
    [HttpDelete("{reviewId:guid}")]
    [HttpDelete("~/api/reviews/{reviewId:guid}")]
    [Authorize(Roles = $"{nameof(UserRole.RestaurantOwner)},{nameof(UserRole.Admin)}")]
    public async Task<IActionResult> Delete(Guid reviewId)
    {
        var isAdmin = User.IsInRole(nameof(UserRole.Admin));
        await _reviewService.DeleteAsync(reviewId, CurrentUserId, isAdmin);
        return NoContent();
    }
}
