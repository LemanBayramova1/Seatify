namespace Seatify.Infrastructure.Options;

public class SmtpOptions
{
    public const string SectionName = "SmtpSettings";

    public string Server { get; set; } = string.Empty;
    public int Port { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
