using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.Venues;

public class UpdateVenueRequestDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(300)]
    public string Address { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? City { get; set; }

    [EmailAddress, MaxLength(256)]
    public string? BusinessEmail { get; set; }

    [MaxLength(30)]
    public string? BusinessPhone { get; set; }

    public string? Description { get; set; }
    public string? ImageUrl { get; set; }

    public List<string> CuisineTypes { get; set; } = new();
    public List<string> GalleryImageUrls { get; set; } = new();
}
