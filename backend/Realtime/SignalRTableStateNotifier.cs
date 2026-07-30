using Microsoft.AspNetCore.SignalR;
using Seatify.Api.Hubs;
using Seatify.Application.DTOs.Realtime;
using Seatify.Application.Interfaces;

namespace Seatify.Api.Realtime;

public class SignalRTableStateNotifier : ITableStateNotifier
{
    private readonly IHubContext<TableStateHub> _hubContext;

    public SignalRTableStateNotifier(IHubContext<TableStateHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyTableStatusChangedAsync(TableStatusChangedMessage message)
    {
        await _hubContext.Clients
            .Group($"venue-{message.VenueId}")
            .SendAsync("TableStatusChanged", message);
    }
}
