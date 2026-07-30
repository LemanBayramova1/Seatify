namespace Seatify.Infrastructure.Options;

public class DatabaseOptions
{
    public const string SectionName = "Database";

    /// <summary>"Sqlite" (default), "Postgres", or "InMemory" (no persistence, no migrations support).</summary>
    public string Provider { get; set; } = "Sqlite";

    public string ConnectionString { get; set; } = string.Empty;
}
