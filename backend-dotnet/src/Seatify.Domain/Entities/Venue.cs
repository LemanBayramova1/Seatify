using Seatify.Domain.Common;

namespace Seatify.Domain.Entities;

public class Venue : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? City { get; set; }
    public string? BusinessEmail { get; set; }
    public string? BusinessPhone { get; set; }

    /// <summary>Comma-separated cuisine tags (e.g. "Italian,Japanese"). Kept as a flat string
    /// rather than a child table — display/filter metadata only, never queried by tag.</summary>
    public string? CuisineTypes { get; set; }

    /// <summary>Free-text operating hours (e.g. "Mon-Sun 10:00-23:00"). Display/context metadata
    /// only, same pattern as CuisineTypes — not structured per-day, not queried against.</summary>
    public string? OperatingHours { get; set; }

    /// <summary>Comma-separated photo gallery URLs, in addition to the single cover `ImageUrl`.</summary>
    public string? GalleryImageUrls { get; set; }

    /// <summary>Platform-admin on/off switch — an inactive venue is hidden from the public
    /// marketplace but keeps all its data (distinct from a table's own `IsActive`).</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>The Restaurant Owner who manages this venue's floor plan. Admins may also manage any venue.</summary>
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    public ICollection<FloorPlan> FloorPlans { get; set; } = new List<FloorPlan>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}
