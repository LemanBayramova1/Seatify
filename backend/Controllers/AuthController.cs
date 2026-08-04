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

    /// <summary>Registers a new Customer or RestaurantOwner account. Admin can't be self-assigned here.</summary>
    [HttpPost("register")]
    public async Task<ActionResult<MessageResponseDto>> Register(RegisterRequestDto request)
    {
        var result = await _authService.RegisterAsync(request);
        return Ok(result);
    }

    /// <summary>Authenticates with email/password and returns a JWT on success.</summary>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginRequestDto request)
    {
        var result = await _authService.LoginAsync(request);
        return Ok(result);
    }

    /// <summary>Signs in (or registers) a user via a Google OAuth 2.0 ID token and returns a JWT.</summary>
    [HttpPost("google")]
    public async Task<ActionResult<AuthResponseDto>> Google(GoogleAuthRequestDto request)
    {
        var result = await _authService.GoogleLoginAsync(request);
        return Ok(result);
    }

    /// <summary>Sends a one-time password to the given account for passwordless verification.</summary>
    [HttpPost("send-otp")]
    public async Task<ActionResult<MessageResponseDto>> SendOtp(SendOtpRequestDto request)
    {
        var result = await _authService.SendOtpAsync(request);
        return Ok(result);
    }

    /// <summary>Verifies a previously sent one-time password and returns a JWT on success.</summary>
    [HttpPost("verify-otp")]
    public async Task<ActionResult<AuthResponseDto>> VerifyOtp(VerifyOtpRequestDto request)
    {
        var result = await _authService.VerifyOtpAsync(request);
        return Ok(result);
    }

    /// <summary>Starts the password-reset flow by sending a reset link/code to the account's email.</summary>
    [HttpPost("forgot-password")]
    public async Task<ActionResult<MessageResponseDto>> ForgotPassword(ForgotPasswordRequestDto request)
    {
        var result = await _authService.ForgotPasswordAsync(request);
        return Ok(result);
    }

    /// <summary>Completes the password-reset flow, setting a new password using a valid reset token.</summary>
    [HttpPost("reset-password")]
    public async Task<ActionResult<MessageResponseDto>> ResetPassword(ResetPasswordRequestDto request)
    {
        var result = await _authService.ResetPasswordAsync(request);
        return Ok(result);
    }
}
