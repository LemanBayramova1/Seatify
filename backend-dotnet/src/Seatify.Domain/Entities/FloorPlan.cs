using Seatify.Domain.Common;

namespace Seatify.Domain.Entities;

public class FloorPlan : BaseEntity
{
    public Guid VenueId { get; set; }
    public Venue Venue { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string? BackgroundImageUrl { get; set; }
    public double CanvasWidth { get; set; } = 1000;
    public double CanvasHeight { get; set; } = 700;

    public ICollection<Table> Tables { get; set; } = new List<Table>();
}
