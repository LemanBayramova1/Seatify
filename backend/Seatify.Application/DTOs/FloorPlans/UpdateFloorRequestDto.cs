using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.FloorPlans;

public class UpdateFloorRequestDto
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    public int Level { get; set; }

    public string? BackgroundImageUrl { get; set; }

    [Range(100, 20000)]
    public double? CanvasWidth { get; set; }

    [Range(100, 20000)]
    public double? CanvasHeight { get; set; }
}
