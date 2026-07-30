namespace Seatify.Domain.Enums;

/// <summary>
/// Denormalized, persisted view of a table's live state. The source of truth for an
/// active hold is the Redis lock; this column exists so GET /floorplan can render
/// state without a Redis round trip and so it survives a Redis flush.
/// </summary>
public enum TableStatus
{
    Available = 0,
    Held = 1,
    Booked = 2
}
