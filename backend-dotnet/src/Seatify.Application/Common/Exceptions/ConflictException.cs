namespace Seatify.Application.Common.Exceptions;

/// <summary>Thrown when a request conflicts with current state, e.g. holding an already-held table.</summary>
public class ConflictException : Exception
{
    public ConflictException(string message) : base(message) { }
}
