using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Seatify.Application.Interfaces;
using Seatify.Infrastructure.Options;

namespace Seatify.Infrastructure.BackgroundServices;

/// <summary>
/// Polls for reservations whose Redis hold has (or should have) expired and releases them.
/// This is the safety net behind Redis's own TTL: it guarantees the DB row and the
/// SignalR-broadcast table status stay in sync even if a client never confirms payment.
/// </summary>
public class ExpiredHoldReleaseService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ReservationOptions _options;
    private readonly ILogger<ExpiredHoldReleaseService> _logger;

    public ExpiredHoldReleaseService(
        IServiceScopeFactory scopeFactory,
        IOptions<ReservationOptions> options,
        ILogger<ExpiredHoldReleaseService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(_options.ExpirySweepIntervalSeconds);

        using var timer = new PeriodicTimer(interval);

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var reservationService = scope.ServiceProvider.GetRequiredService<IReservationService>();
                await reservationService.ReleaseExpiredHoldsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to sweep expired table holds.");
            }
        }
    }
}
