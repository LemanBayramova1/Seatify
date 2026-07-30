using System.Collections.Concurrent;
using Seatify.Application.Interfaces;

namespace Seatify.Infrastructure.Services;

/// <summary>
/// Zero-dependency stand-in for <see cref="RedisLockService"/>, used when Cache:Provider is
/// "InMemory" (the default for local dev). Semantically equivalent to Redis's SET NX/EX +
/// compare-and-delete, just backed by a process-local dictionary instead of a shared server —
/// fine for a single API instance, but won't coordinate holds across multiple instances the
/// way Redis does, so switch to Redis before scaling out horizontally.
/// </summary>
public class InMemoryLockService : IDistributedLockService
{
    private sealed record Entry(string Value, DateTime ExpiresAtUtc);

    private readonly ConcurrentDictionary<string, Entry> _locks = new();
    private readonly object _gate = new();

    public Task<bool> TryAcquireLockAsync(string key, string value, TimeSpan expiry)
    {
        lock (_gate)
        {
            if (_locks.TryGetValue(key, out var existing) && existing.ExpiresAtUtc > DateTime.UtcNow)
            {
                return Task.FromResult(false);
            }

            _locks[key] = new Entry(value, DateTime.UtcNow.Add(expiry));
            return Task.FromResult(true);
        }
    }

    public Task<bool> ReleaseLockAsync(string key, string value)
    {
        lock (_gate)
        {
            if (_locks.TryGetValue(key, out var existing) && existing.Value == value)
            {
                _locks.TryRemove(key, out _);
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }
    }

    public Task<string?> GetLockValueAsync(string key)
    {
        lock (_gate)
        {
            if (_locks.TryGetValue(key, out var existing) && existing.ExpiresAtUtc > DateTime.UtcNow)
            {
                return Task.FromResult<string?>(existing.Value);
            }

            return Task.FromResult<string?>(null);
        }
    }

    public Task<bool> KeyExistsAsync(string key)
    {
        lock (_gate)
        {
            var exists = _locks.TryGetValue(key, out var existing) && existing.ExpiresAtUtc > DateTime.UtcNow;
            return Task.FromResult(exists);
        }
    }
}
