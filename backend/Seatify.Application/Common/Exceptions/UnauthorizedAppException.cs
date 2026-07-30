namespace Seatify.Application.Common.Exceptions;

/// <summary>Thrown for domain-level authorization failures (e.g. wrong credentials, hold token mismatch).</summary>
public class UnauthorizedAppException : Exception
{
    public UnauthorizedAppException(string message) : base(message) { }
}
