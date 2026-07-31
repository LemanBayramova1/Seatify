using Seatify.Domain.Common;

namespace Seatify.Domain.Entities;

public class Review : BaseEntity
{
    public Guid VenueId { get; set; }
    public Venue Venue { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>1-5 star rating.</summary>
    public int Rating { get; set; }
    public string? Comment { get; set; }

    /// <summary>The venue owner's public reply to this review, if any.</summary>
    public string? OwnerReply { get; set; }
    public DateTime? OwnerReplyDate { get; set; }
}
