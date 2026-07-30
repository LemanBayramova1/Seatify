using Microsoft.AspNetCore.SignalR;

namespace Seatify.Api.Hubs;

/// <summary>
/// Pushes live table status updates (Available/Held/Booked) to everyone viewing a venue's
/// floor plan. Clients join the venue's group right after connecting so broadcasts stay
/// scoped to that venue instead of fanning out to every connected client.
/// </summary>
public class TableStateHub : Hub
{
    private static string VenueGroup(string venueId) => $"venue-{venueId}";

    public async Task JoinVenue(string venueId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, VenueGroup(venueId));
    }

    public async Task LeaveVenue(string venueId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, VenueGroup(venueId));
    }
}
