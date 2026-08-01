namespace Seatify.Application.DTOs.FloorPlans;

public class FloorPlanDto
{
    public Guid Id { get; set; }
    public Guid VenueId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Level { get; set; }
    public string? BackgroundImageUrl { get; set; }
    public double CanvasWidth { get; set; }
    public double CanvasHeight { get; set; }
    public List<TableDto> Tables { get; set; } = new();

    /// <summary>Decorative elements (doors, windows, walls, stage, bar) for this floor.</summary>
    public List<LayoutElementDto> Elements { get; set; } = new();
}
