using Seatify.Domain.Common;
using Seatify.Domain.Enums;

namespace Seatify.Domain.Entities;

public class Table : BaseEntity
{
    public Guid FloorPlanId { get; set; }
    public FloorPlan FloorPlan { get; set; } = null!;

    public string Label { get; set; } = string.Empty;

    // Canvas coordinates/size in px at 1:1 editor scale.
    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public double Rotation { get; set; }

    public TableShape Shape { get; set; } = TableShape.Rectangle;
    public string? Zone { get; set; }
    public int Capacity { get; set; }
    public decimal DepositFee { get; set; }

    public TableStatus Status { get; set; } = TableStatus.Available;

    /// <summary>Soft on/off switch for the builder UI; inactive tables are hidden from the public floor plan.</summary>
    public bool IsActive { get; set; } = true;

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
