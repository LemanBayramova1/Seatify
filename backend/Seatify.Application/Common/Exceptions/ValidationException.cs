namespace Seatify.Application.Common.Exceptions;

/// <summary>Thrown for business-rule validation failures that aren't covered by DataAnnotations.</summary>
public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}
