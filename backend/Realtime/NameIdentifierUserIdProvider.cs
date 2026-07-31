using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace Seatify.Api.Realtime;

/// <summary>
/// Maps each hub connection to its JWT NameIdentifier claim so Clients.User(userId) can target
/// a specific signed-in user across every tab/device they have open.
/// </summary>
public class NameIdentifierUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}
