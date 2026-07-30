namespace Seatify.Application.DTOs.Auth;

public class GoogleAuthRequestDto
{
    public string? IdToken { get; set; }
    public string? Credential { get; set; }
}
