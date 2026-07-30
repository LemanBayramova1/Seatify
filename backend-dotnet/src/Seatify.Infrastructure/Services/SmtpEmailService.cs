using System.Linq;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using Seatify.Application.Interfaces;
using Seatify.Infrastructure.Options;

namespace Seatify.Infrastructure.Services;

public class SmtpEmailService : IEmailService
{
    // Domains reserved by RFC 2606 / commonly used in test fixtures — real SMTP delivery to
    // these either bounces immediately or silently blackholes, so route-of-flight decides
    // "test address" at the domain level rather than trying to match specific mailboxes.
    private static readonly string[] TestDomains = { "example.com", "test.com", "localhost" };

    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<SmtpOptions> options, ILogger<SmtpEmailService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<bool> SendAsync(string toEmail, string subject, string htmlBody)
    {
        if (IsTestOrInvalidAddress(toEmail))
        {
            _logger.LogInformation("[EmailService] Skipping real email delivery for test address: {Email}", toEmail);
            return true;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.SenderName, _options.SenderEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(_options.Server, _options.Port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_options.SenderEmail, _options.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(quit: true);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {ToEmail} with subject {Subject}", toEmail, subject);
            return false;
        }
    }

    private static bool IsTestOrInvalidAddress(string email)
    {
        if (!MailboxAddress.TryParse(email, out var mailbox))
        {
            return true;
        }

        var domain = mailbox.Address.Split('@').ElementAtOrDefault(1) ?? string.Empty;
        return TestDomains.Contains(domain, StringComparer.OrdinalIgnoreCase);
    }
}
