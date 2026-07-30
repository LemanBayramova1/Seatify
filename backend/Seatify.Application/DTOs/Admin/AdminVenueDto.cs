namespace Seatify.Application.DTOs.Admin;

public class AdminVenueDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string? City { get; set; }
    public int TableCount { get; set; }
    public bool IsActive { get; set; }
}

public class ToggleVenueActiveRequestDto
{
    public bool IsActive { get; set; }
}
