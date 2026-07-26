using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Seatify.Application.DTOs.Reviews;
using Seatify.Application.Interfaces;

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
}
