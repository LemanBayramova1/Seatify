using Seatify.Application.DTOs.Auth;

namespace Seatify.Application.Interfaces;

public interface IAuthService
{
    Task<MessageResponseDto> RegisterAsync(RegisterRequestDto request);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request);
    Task<AuthResponseDto> GoogleLoginAsync(GoogleAuthRequestDto request);
    Task<MessageResponseDto> SendOtpAsync(SendOtpRequestDto request);
    Task<AuthResponseDto> VerifyOtpAsync(VerifyOtpRequestDto request);
    Task<MessageResponseDto> ForgotPasswordAsync(ForgotPasswordRequestDto request);
    Task<MessageResponseDto> ResetPasswordAsync(ResetPasswordRequestDto request);
}
