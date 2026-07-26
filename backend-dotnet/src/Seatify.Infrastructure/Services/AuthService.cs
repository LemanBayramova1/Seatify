using Microsoft.EntityFrameworkCore;
using Seatify.Application.Common.Exceptions;
using Seatify.Application.DTOs.Auth;
using Seatify.Application.Interfaces;
using Seatify.Domain.Entities;
using Seatify.Domain.Enums;
using Seatify.Infrastructure.Persistence;

namespace Seatify.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(AppDbContext db, IJwtTokenService jwtTokenService)
    {
        _db = db;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
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

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAppException("Invalid email or password.");
        }

        return BuildAuthResponse(user);
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
