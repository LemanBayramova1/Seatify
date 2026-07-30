using System.Security.Cryptography;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Seatify.Application.Common.Exceptions;
using Seatify.Application.DTOs.Auth;
using Seatify.Application.Interfaces;
using Seatify.Domain.Entities;
using Seatify.Domain.Enums;
using Seatify.Infrastructure.Options;
using Seatify.Infrastructure.Persistence;

namespace Seatify.Infrastructure.Services;

public class AuthService : IAuthService
{
    private static readonly TimeSpan OtpValidity = TimeSpan.FromMinutes(10);

    private readonly AppDbContext _db;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IEmailService _emailService;
    private readonly GoogleAuthOptions _googleOptions;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        AppDbContext db,
        IJwtTokenService jwtTokenService,
        IEmailService emailService,
        IOptions<GoogleAuthOptions> googleOptions,
        ILogger<AuthService> logger)
    {
        _db = db;
        _jwtTokenService = jwtTokenService;
        _emailService = emailService;
        _googleOptions = googleOptions.Value;
        _logger = logger;
    }

    public async Task<MessageResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (!TryNormalizeRole(request.Role, out var role) || role == UserRole.Admin)
        {
            throw new Application.Common.Exceptions.ValidationException(
                "Role must be 'Customer' or 'RestaurantOwner'.");
        }

        var alreadyExists = await _db.Users.AnyAsync(u => u.Email == email);
        if (alreadyExists)
        {
            throw new ConflictException($"An account with email '{email}' already exists.");
        }

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
            Phone = request.Phone?.Trim()
        };

        _db.Users.Add(user);

        if (role == UserRole.RestaurantOwner)
        {
            if (string.IsNullOrWhiteSpace(request.RestaurantName) || string.IsNullOrWhiteSpace(request.City))
            {
                throw new Application.Common.Exceptions.ValidationException(
                    "Restaurant name and city are required when registering as a Restaurant Owner.");
            }

            _db.Venues.Add(new Venue
            {
                Name = request.RestaurantName.Trim(),
                Address = request.RestaurantAddress?.Trim() ?? "",
                City = request.City.Trim(),
                BusinessEmail = request.BusinessEmail?.Trim(),
                BusinessPhone = request.BusinessPhone?.Trim(),
                OwnerId = user.Id,
                Owner = user
            });
        }

        await _db.SaveChangesAsync();

        // Best-effort: a down SMTP server shouldn't fail registration itself, just leave the
        // account unverified until the user requests another code from the UI. Registration
        // deliberately does NOT issue a JWT — the account isn't usable until verify-otp succeeds,
        // which is what actually logs the user in.
        await TrySendOtpEmailAsync(user, OtpPurpose.EmailVerification);

        return new MessageResponseDto { Message = "Registration successful. Please verify your email." };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAppException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAppException("This account has been deactivated. Contact support for help.");
        }

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponseDto> GoogleLoginAsync(GoogleAuthRequestDto request)
    {
        var idToken = request.IdToken ?? request.Credential;
        if (string.IsNullOrWhiteSpace(idToken))
        {
            throw new Application.Common.Exceptions.ValidationException("Google ID token is required.");
        }

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _googleOptions.ClientId }
            });
        }
        catch (Exception ex) when (ex is InvalidJwtException or FormatException)
        {
            throw new UnauthorizedAppException("Invalid Google ID token.");
        }

        var email = payload.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email);

        if (user is null)
        {
            user = new User
            {
                Name = payload.Name ?? email,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
                Role = UserRole.Customer,
                IsEmailVerified = true
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }
        else if (!user.IsActive)
        {
            throw new UnauthorizedAppException("This account has been deactivated. Contact support for help.");
        }

        return BuildAuthResponse(user);
    }

    public async Task<MessageResponseDto> SendOtpAsync(SendOtpRequestDto request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email)
            ?? throw new NotFoundException(nameof(User), email);

        if (user.IsEmailVerified)
        {
            return new MessageResponseDto { Message = "This email is already verified." };
        }

        var sent = await TrySendOtpEmailAsync(user, OtpPurpose.EmailVerification);
        if (!sent)
        {
            throw new Application.Common.Exceptions.ValidationException(
                "Could not send the verification email right now. Please try again shortly.");
        }

        return new MessageResponseDto { Message = "Verification code sent." };
    }

    public async Task<AuthResponseDto> VerifyOtpAsync(VerifyOtpRequestDto request)
    {
        var user = await GetUserWithValidOtpAsync(request.Email, request.Code, OtpPurpose.EmailVerification);

        user.IsEmailVerified = true;
        ClearOtp(user);
        await _db.SaveChangesAsync();

        // This is the step that actually logs the newly-registered user in — RegisterAsync
        // itself only creates the (unverified, tokenless) account.
        return BuildAuthResponse(user);
    }

    public async Task<MessageResponseDto> ForgotPasswordAsync(ForgotPasswordRequestDto request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email);

        // Same response whether or not the account exists — don't let this endpoint be used to
        // enumerate registered emails. The email itself only goes out when there's a real user.
        if (user is not null)
        {
            await TrySendOtpEmailAsync(user, OtpPurpose.PasswordReset);
        }

        return new MessageResponseDto { Message = "If that email is registered, a reset code has been sent." };
    }

    public async Task<MessageResponseDto> ResetPasswordAsync(ResetPasswordRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 4)
        {
            throw new Application.Common.Exceptions.ValidationException("Password must be at least 4 characters.");
        }

        var user = await GetUserWithValidOtpAsync(request.Email, request.Code, OtpPurpose.PasswordReset);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        ClearOtp(user);
        await _db.SaveChangesAsync();

        return new MessageResponseDto { Message = "Password has been reset." };
    }

    private async Task<User> GetUserWithValidOtpAsync(string email, string code, OtpPurpose purpose)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == normalizedEmail)
            ?? throw new Application.Common.Exceptions.ValidationException("Invalid or expired code.");

        var valid = user.OtpPurpose == purpose
            && user.OtpCodeHash is not null
            && user.OtpExpiresAt is not null
            && user.OtpExpiresAt > DateTime.UtcNow
            && BCrypt.Net.BCrypt.Verify(code, user.OtpCodeHash);

        if (!valid)
        {
            throw new Application.Common.Exceptions.ValidationException("Invalid or expired code.");
        }

        return user;
    }

    private static void ClearOtp(User user)
    {
        user.OtpCodeHash = null;
        user.OtpExpiresAt = null;
        user.OtpPurpose = null;
    }

    /// <summary>Generates a 6-digit code, stores its hash on the user, and emails it. Returns
    /// false (never throws) if the email failed to send, so callers can decide how to surface
    /// that — e.g. RegisterAsync swallows it, SendOtpAsync turns it into a client error.</summary>
    private async Task<bool> TrySendOtpEmailAsync(User user, OtpPurpose purpose)
    {
        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

        user.OtpCodeHash = BCrypt.Net.BCrypt.HashPassword(code);
        user.OtpExpiresAt = DateTime.UtcNow.Add(OtpValidity);
        user.OtpPurpose = purpose;
        await _db.SaveChangesAsync();

        var (subject, heading, intro, expiry) = purpose == OtpPurpose.PasswordReset
            ? ("Seatify — Password Reset Code", "Reset your password", "Your Seatify code is:",
               $"This code expires in {OtpValidity.TotalMinutes:0} minutes. If you didn't request this, you can ignore this email.")
            : ("Seatify — Qeydiyyat Təsdiq Kodu", "E-poçtunuzu təsdiqləyin", "Seatify təsdiq kodunuz:",
               $"Bu kodun etibarlılıq müddəti {OtpValidity.TotalMinutes:0} dəqiqədir. Əgər bu tələbi siz göndərməmisinizsə, bu e-poçtu nəzərə almayın.");

        var html = $"""
            <div style="font-family:sans-serif;max-width:480px;margin:auto">
              <h2>{heading}</h2>
              <p>{intro}</p>
              <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{code}</p>
              <p>{expiry}</p>
            </div>
            """;

        var sent = await _emailService.SendAsync(user.Email, subject, html);
        if (!sent)
        {
            _logger.LogWarning("OTP email ({Purpose}) could not be sent to {Email}", purpose, user.Email);
        }

        return sent;
    }

    // Accepts loose client-side variants ("Restaurant Owner", "Owner", "restaurant_owner", ...)
    // by stripping everything but letters before matching against the enum's canonical names.
    private static bool TryNormalizeRole(string? role, out UserRole parsed)
    {
        var key = new string((role ?? string.Empty).Where(char.IsLetter).ToArray()).ToLowerInvariant();

        switch (key)
        {
            case "customer":
                parsed = UserRole.Customer;
                return true;
            case "restaurantowner":
            case "owner":
            case "restaurant":
                parsed = UserRole.RestaurantOwner;
                return true;
            case "admin":
                parsed = UserRole.Admin;
                return true;
            default:
                parsed = default;
                return false;
        }
    }

    private AuthResponseDto BuildAuthResponse(User user)
    {
        var (token, expiresAt) = _jwtTokenService.GenerateToken(user);

        return new AuthResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            User = new UserDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role.ToString(),
                Phone = user.Phone
            }
        };
    }
}
