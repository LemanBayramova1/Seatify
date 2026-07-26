namespace Seatify.Application.Common;

/// <summary>Canonical Redis hold-lock key, shared by ReservationService (which creates/releases
/// holds during the guest booking flow) and AdminService (which can also release one via
/// Approve/Reject). Scoped to date+time-slot — a hold on one date must never block another.</summary>
public static class ReservationLock
{
    public static string Key(Guid tableId, DateOnly date, string timeSlot) =>
        $"table-hold:{tableId}:{date:yyyy-MM-dd}:{timeSlot}";
}
