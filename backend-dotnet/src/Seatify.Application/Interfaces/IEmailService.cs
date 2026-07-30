namespace Seatify.Application.Interfaces;

public interface IEmailService
{
    /// <summary>Returns false (and logs the underlying error) instead of throwing, so a down
    /// SMTP server degrades a caller into "couldn't send the email" rather than a 500.</summary>
    Task<bool> SendAsync(string toEmail, string subject, string htmlBody);
}
