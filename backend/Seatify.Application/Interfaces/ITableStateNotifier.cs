using Seatify.Application.DTOs.Realtime;

namespace Seatify.Application.Interfaces;

/// <summary>
/// Abstraction over the SignalR hub so Application/Infrastructure services can broadcast
/// table state changes without taking a dependency on ASP.NET Core SignalR packages.
/// Implemented in the API layer, where the hub actually lives.
/// </summary>
public interface ITableStateNotifier
{
    Task NotifyTableStatusChangedAsync(TableStatusChangedMessage message);
}
