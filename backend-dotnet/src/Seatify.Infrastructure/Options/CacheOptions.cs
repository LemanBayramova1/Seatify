namespace Seatify.Infrastructure.Options;

public class CacheOptions
{
    public const string SectionName = "Cache";

    /// <summary>"InMemory" (default, zero-setup local dev) or "Redis".</summary>
    public string Provider { get; set; } = "InMemory";

    public string ConnectionString { get; set; } = "localhost:6379";
}
