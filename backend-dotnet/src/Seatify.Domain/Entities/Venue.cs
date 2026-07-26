using Seatify.Domain.Common;

namespace Seatify.Domain.Entities;

public class Venue : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }

    /// <summary>The Restaurant Owner who manages this venue's floor plan. Admins may also manage any venue.</summary>
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    public ICollection<FloorPlan> FloorPlans { get; set; } = new List<FloorPlan>();
}
