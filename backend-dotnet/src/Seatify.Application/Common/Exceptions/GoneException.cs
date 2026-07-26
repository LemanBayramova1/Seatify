namespace Seatify.Application.Common.Exceptions;

/// <summary>Thrown when a hold has expired or been released before confirmation completes.</summary>
public class GoneException : Exception
{
    public GoneException(string message) : base(message) { }
}
