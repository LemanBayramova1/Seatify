using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.FloorPlans;

public class SaveLayoutFloorPlanRequestDto
{
    /// <summary>Null when creating a brand-new floor; set when updating an existing one.</summary>
    public Guid? Id { get; set; }

    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    public int Level { get; set; }

    public string? BackgroundImageUrl { get; set; }

    [Range(100, 20000)]
    public double CanvasWidth { get; set; } = 1000;

    [Range(100, 20000)]
    public double CanvasHeight { get; set; } = 700;

    public List<SaveTableRequestDto> Tables { get; set; } = new();

    /// <summary>Decorative elements (doors, windows, walls, stage, bar) for this floor — stored
    /// as-is in FloorPlan.LayoutData, never validated against Table's rules.</summary>
    public List<LayoutElementDto> Elements { get; set; } = new();
}

/// <summary>Replaces a restaurant's entire multi-floor layout (all floors and their tables) in one call.</summary>
public class SaveLayoutRequestDto
{
    [Required]
    public Guid RestaurantId { get; set; }

    public List<SaveLayoutFloorPlanRequestDto> FloorPlans { get; set; } = new();
}
