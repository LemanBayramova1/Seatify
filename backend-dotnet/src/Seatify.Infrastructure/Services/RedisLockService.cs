using Seatify.Application.Interfaces;
using StackExchange.Redis;

namespace Seatify.Infrastructure.Services;

public class RedisLockService : IDistributedLockService
{
    private readonly IConnectionMultiplexer _redis;

    // Atomically release the lock only if it still holds the caller's own value —
    // without this check, a request could delete a lock some other request already
    // re-acquired after this one's TTL expired.
    private const string ReleaseIfOwnedScript = @"
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end";

    public RedisLockService(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    private IDatabase Db => _redis.GetDatabase();

    public async Task<bool> TryAcquireLockAsync(string key, string value, TimeSpan expiry)
    {
        return await Db.StringSetAsync(key, value, expiry, When.NotExists);
    }

    public async Task<bool> ReleaseLockAsync(string key, string value)
    {
        var result = await Db.ScriptEvaluateAsync(ReleaseIfOwnedScript, new RedisKey[] { key }, new RedisValue[] { value });
        return (long)result == 1;
    }

    public async Task<string?> GetLockValueAsync(string key)
    {
        var value = await Db.StringGetAsync(key);
        return value.IsNullOrEmpty ? null : value.ToString();
    }

    public async Task<bool> KeyExistsAsync(string key)
    {
        return await Db.KeyExistsAsync(key);
    }
}
