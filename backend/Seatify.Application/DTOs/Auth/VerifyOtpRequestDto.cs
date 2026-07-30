namespace Seatify.Application.DTOs.Auth;

public class VerifyOtpRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}
