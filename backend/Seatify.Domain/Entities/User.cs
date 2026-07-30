using Seatify.Domain.Common;
using Seatify.Domain.Enums;

namespace Seatify.Domain.Entities;

public class User : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Customer;
    public string? Phone { get; set; }

    /// <summary>Platform-admin on/off switch — a deactivated account is blocked from
    /// logging in but keeps all its data (distinct from Venue.IsActive).</summary>
    public bool IsActive { get; set; } = true;

    public bool IsEmailVerified { get; set; } = false;

    // OTP codes are never stored in plaintext — only a BCrypt hash of the 6-digit code, mirroring
    // how PasswordHash is stored. Purpose scopes a code to what it was issued for (verify-otp
    // can't be replayed against reset-password and vice versa).
    public string? OtpCodeHash { get; set; }
    public DateTime? OtpExpiresAt { get; set; }
    public OtpPurpose? OtpPurpose { get; set; }

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
    public ICollection<Venue> OwnedVenues { get; set; } = new List<Venue>();
}
