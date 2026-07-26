namespace Seatify.Infrastructure.Options;

public class DatabaseOptions
{
    public const string SectionName = "Database";

    /// <summary>"InMemory" (default, zero-setup local dev) or "Postgres".</summary>
    public string Provider { get; set; } = "InMemory";

    public string ConnectionString { get; set; } = string.Empty;
}
