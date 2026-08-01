namespace Seatify.Application.DTOs.Venues;

public class VenueDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? City { get; set; }
    public string? BusinessEmail { get; set; }
    public string? BusinessPhone { get; set; }
    public string? OperatingHours { get; set; }
    public List<string> CuisineTypes { get; set; } = new();
    public List<string> GalleryImageUrls { get; set; } = new();

    /// <summary>Average of all Review.Rating for this venue, rounded to 1 decimal. 0 when
    /// ReviewCount is 0 — a brand-new venue starts with no rating, never a fabricated default.</summary>
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
}
