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

    /// <summary>Free-text operating hours (e.g. "Mon-Sun 10:00-23:00") — display/context metadata
    /// only, same pattern as CuisineTypes/GalleryImageUrls.</summary>
    [MaxLength(200)]
    public string? OperatingHours { get; set; }

    public List<string> CuisineTypes { get; set; } = new();
    public List<string> GalleryImageUrls { get; set; } = new();
}
