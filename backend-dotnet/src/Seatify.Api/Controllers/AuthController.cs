using Microsoft.AspNetCore.Mvc;
using Seatify.Application.DTOs.Auth;
using Seatify.Application.Interfaces;

namespace Seatify.Api.Controllers;

[Route("api/auth")]
public class AuthController : ApiControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<MessageResponseDto>> Register(RegisterRequestDto request)
    {
        var result = await _authService.RegisterAsync(request);
        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginRequestDto request)
    {
        var result = await _authService.LoginAsync(request);
        return Ok(result);
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponseDto>> Google(GoogleAuthRequestDto request)
    {
        var result = await _authService.GoogleLoginAsync(request);
        return Ok(result);
    }

    [HttpPost("send-otp")]
    public async Task<ActionResult<MessageResponseDto>> SendOtp(SendOtpRequestDto request)
    {
        var result = await _authService.SendOtpAsync(request);
        return Ok(result);
    }

    [HttpPost("verify-otp")]
    public async Task<ActionResult<AuthResponseDto>> VerifyOtp(VerifyOtpRequestDto request)
    {
        var result = await _authService.VerifyOtpAsync(request);
        return Ok(result);
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<MessageResponseDto>> ForgotPassword(ForgotPasswordRequestDto request)
    {
        var result = await _authService.ForgotPasswordAsync(request);
        return Ok(result);
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<MessageResponseDto>> ResetPassword(ResetPasswordRequestDto request)
    {
        var result = await _authService.ResetPasswordAsync(request);
        return Ok(result);
    }
}
