namespace Seatify.Application.DTOs.Realtime;

/// <summary>Payload broadcast over TableStateHub whenever a table's status changes.</summary>
public class TableStatusChangedMessage
{
    public Guid VenueId { get; set; }
    public Guid FloorPlanId { get; set; }
    public Guid TableId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? HoldExpiresAt { get; set; }
}
