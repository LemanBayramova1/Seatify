using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.Venues;

public class CreateVenueRequestDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(300)]
    public string Address { get; set; } = string.Empty;

    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
}
