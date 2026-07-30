using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.FloorPlans;

public class SaveTableRequestDto
{
    /// <summary>Null when creating a brand-new table; set when updating an existing one.</summary>
    public Guid? Id { get; set; }

    [Required, MaxLength(50)]
    public string Label { get; set; } = string.Empty;

    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public double Rotation { get; set; }

    [Required]
    public string Shape { get; set; } = "Rectangle";

    public string? Zone { get; set; }

    [Range(1, 100)]
    public int Capacity { get; set; }

    [Range(0, double.MaxValue)]
    public decimal DepositFee { get; set; }

    public bool IsActive { get; set; } = true;
}

public class SaveFloorPlanRequestDto
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    public string? BackgroundImageUrl { get; set; }

    [Range(100, 20000)]
    public double CanvasWidth { get; set; } = 1000;

    [Range(100, 20000)]
    public double CanvasHeight { get; set; } = 700;

    public List<SaveTableRequestDto> Tables { get; set; } = new();
}
