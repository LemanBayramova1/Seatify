using Seatify.Domain.Common;

namespace Seatify.Domain.Entities;

public class FloorPlan : BaseEntity
{
    public Guid VenueId { get; set; }
    public Venue Venue { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    /// <summary>Stacking order for multi-floor venues, e.g. 0 = ground floor, 1 = mezzanine.</summary>
    public int Level { get; set; }

    public string? BackgroundImageUrl { get; set; }
    public double CanvasWidth { get; set; } = 1000;
    public double CanvasHeight { get; set; } = 700;

    /// <summary>JSON-serialized array of purely-decorative canvas elements (doors, windows,
    /// walls, stage, bar) that aren't bookable Tables — kept separate from the Tables relation
    /// so a decoration's loose shape never has to satisfy Table's stricter validation
    /// (Capacity/Label/etc.), and a malformed entry here can never break a reservation.</summary>
    public string? LayoutData { get; set; }

    public ICollection<Table> Tables { get; set; } = new List<Table>();
}
