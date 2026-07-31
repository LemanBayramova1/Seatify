namespace Seatify.Application.DTOs.Admin;

public class AdminReviewDto
{
    public Guid Id { get; set; }
    public Guid VenueId { get; set; }
    public string VenueName { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? OwnerReply { get; set; }
    public DateTime? OwnerReplyDate { get; set; }
}
