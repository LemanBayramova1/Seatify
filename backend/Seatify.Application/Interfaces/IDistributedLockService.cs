namespace Seatify.Application.Interfaces;

/// <summary>
/// Arbitrates which concurrent request wins the right to hold a table. Backed by Redis
/// (SET NX/EX + a Lua compare-and-delete) in production, or an in-process implementation
/// for local development with no external dependencies — see DependencyInjection's
/// Cache:Provider switch.
/// </summary>
public interface IDistributedLockService
{
    /// <summary>Atomically acquires the lock iff it doesn't already exist. Returns false if already held.</summary>
    Task<bool> TryAcquireLockAsync(string key, string value, TimeSpan expiry);

    /// <summary>Atomically releases the lock only if its current value matches, avoiding releasing someone else's lock.</summary>
    Task<bool> ReleaseLockAsync(string key, string value);

    Task<string?> GetLockValueAsync(string key);

    Task<bool> KeyExistsAsync(string key);
}
