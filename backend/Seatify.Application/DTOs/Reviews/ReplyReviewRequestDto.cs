using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.Reviews;

public class ReplyReviewRequestDto
{
    [Required]
    [MaxLength(1000)]
    public string Reply { get; set; } = string.Empty;
}
