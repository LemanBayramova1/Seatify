using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.FloorPlans;

public class CreateFloorRequestDto
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Stacking order for multi-floor venues, e.g. 0 = ground floor, 1 = mezzanine.</summary>
    public int Level { get; set; }

    public string? BackgroundImageUrl { get; set; }

    [Range(100, 20000)]
    public double CanvasWidth { get; set; } = 1000;

    [Range(100, 20000)]
    public double CanvasHeight { get; set; } = 700;
}
