namespace Seatify.Infrastructure.Options;

public class ReservationOptions
{
    public const string SectionName = "Reservation";

    /// <summary>How long a table hold lasts before it's auto-released. Requirement: 5-10 minutes.</summary>
    public int HoldDurationMinutes { get; set; } = 7;

    /// <summary>How often the background sweep checks for expired holds.</summary>
    public int ExpirySweepIntervalSeconds { get; set; } = 30;
}
