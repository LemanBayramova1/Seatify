using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.Reservations;

public class HoldTableRequestDto
{
    [Required]
    public Guid TableId { get; set; }

    [Required]
    public DateOnly ReservationDate { get; set; }

    /// <summary>Descriptive time window, e.g. "19:00-21:00" — matches the frontend's TIME_SLOTS.</summary>
    [Required, MaxLength(20)]
    public string TimeSlot { get; set; } = string.Empty;

    [Range(1, 50)]
    public int PartySize { get; set; }
}
