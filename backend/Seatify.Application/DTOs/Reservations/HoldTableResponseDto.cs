namespace Seatify.Application.DTOs.Reservations;

public class HoldTableResponseDto
{
    public Guid ReservationId { get; set; }
    public Guid TableId { get; set; }

    /// <summary>Must be echoed back in POST /reservations/confirm to prove ownership of the hold.</summary>
    public string HoldToken { get; set; } = string.Empty;
    public DateTime HoldExpiresAt { get; set; }
    public decimal DepositFee { get; set; }
}
