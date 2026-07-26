namespace Seatify.Application.DTOs.Reservations;

public class ReservationDto
{
    public Guid Id { get; set; }
    public Guid TableId { get; set; }
    public string TableLabel { get; set; } = string.Empty;
    public Guid VenueId { get; set; }
    public string VenueName { get; set; } = string.Empty;

    public DateOnly ReservationDate { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public int PartySize { get; set; }

    public string Status { get; set; } = string.Empty;
    public decimal DepositFee { get; set; }
    public bool DepositPaid { get; set; }
    public DateTime CreatedAt { get; set; }
}
