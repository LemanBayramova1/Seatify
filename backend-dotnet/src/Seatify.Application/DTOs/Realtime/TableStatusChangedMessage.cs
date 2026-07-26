namespace Seatify.Application.DTOs.Realtime;

/// <summary>Payload broadcast over TableStateHub whenever a table's status changes.</summary>
public class TableStatusChangedMessage
{
    public Guid VenueId { get; set; }
    public Guid FloorPlanId { get; set; }
    public Guid TableId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? HoldExpiresAt { get; set; }

    /// <summary>Which date/time-slot this status change applies to — availability is scoped per
    /// slot, so clients must ignore broadcasts for a slot they aren't currently viewing.</summary>
    public DateOnly ReservationDate { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
}
