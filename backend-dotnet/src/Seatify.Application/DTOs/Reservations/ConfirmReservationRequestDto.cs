using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.Reservations;

public class ConfirmReservationRequestDto
{
    [Required]
    public Guid ReservationId { get; set; }

    [Required]
    public string HoldToken { get; set; } = string.Empty;

    /// <summary>Placeholder for a payment gateway reference; not validated against a real processor here.</summary>
    public string? PaymentReference { get; set; }
}
