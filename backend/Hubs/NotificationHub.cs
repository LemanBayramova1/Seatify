using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Seatify.Domain.Enums;

namespace Seatify.Api.Hubs;

/// <summary>
/// Pushes live notification events (new review, new booking, etc.) straight to the affected
/// user, and separately to every connected Admin so the platform panel can react without
/// polling. User-targeted delivery relies on NameIdentifierUserIdProvider mapping each
/// connection back to its JWT `sub`/NameIdentifier claim — [Authorize] guarantees that claim is
/// always present, unlike TableStateHub which stays anonymous since it only groups by venue.
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
    public const string AdminsGroup = "Admins";

    public override async Task OnConnectedAsync()
    {
        if (Context.User?.IsInRole(nameof(UserRole.Admin)) == true)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, AdminsGroup);
        }

        await base.OnConnectedAsync();
    }
}
