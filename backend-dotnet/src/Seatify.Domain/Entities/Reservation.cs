using Seatify.Domain.Common;
using Seatify.Domain.Enums;

namespace Seatify.Domain.Entities;

public class Reservation : BaseEntity
{
    public Guid TableId { get; set; }
    public Table Table { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateOnly ReservationDate { get; set; }

    /// <summary>Descriptive time window the guest picked, e.g. "19:00-21:00". Not part of the
    /// concurrency key — see ReservationService remarks: a hold locks the whole table.</summary>
    public string TimeSlot { get; set; } = string.Empty;
    public int PartySize { get; set; }

    public ReservationStatus Status { get; set; } = ReservationStatus.Held;

    /// <summary>Opaque token that must match the Redis hold value to confirm this reservation.</summary>
    public string HoldToken { get; set; } = string.Empty;
    public DateTime? HoldExpiresAt { get; set; }

    public decimal DepositFee { get; set; }
    public bool DepositPaid { get; set; }
}
