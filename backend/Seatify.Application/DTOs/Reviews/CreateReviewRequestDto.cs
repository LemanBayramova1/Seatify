using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.Reviews;

public class CreateReviewRequestDto
{
    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(1000)]
    public string? Comment { get; set; }
}
