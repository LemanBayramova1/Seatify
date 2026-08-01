namespace Seatify.Application.DTOs.FloorPlans;

/// <summary>A purely-decorative canvas element (door, window, wall, stage, bar) — not a
/// bookable Table, so it carries no capacity/deposit/zone and no server-side identity beyond
/// whatever client-generated `Id` the editor already assigned it. Used both for saving (as part
/// of SaveLayoutFloorPlanRequestDto) and for reading back (as part of FloorPlanDto).</summary>
public class LayoutElementDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Label { get; set; }
    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public double Rotation { get; set; }
}
