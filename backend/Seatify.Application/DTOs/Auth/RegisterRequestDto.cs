using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.Auth;

public class RegisterRequestDto
{
    private const string AzPhonePattern = @"^\+994\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$";

    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(4), MaxLength(128)]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// "Customer" or "RestaurantOwner" — public registration cannot self-assign Admin.
    /// Accepts loose variants too ("Restaurant Owner", "Owner"); see AuthService.NormalizeRole.
    /// </summary>
    [Required]
    public string Role { get; set; } = "Customer";

    [RegularExpression(AzPhonePattern, ErrorMessage = "Phone must be a valid Azerbaijan number, e.g. +994 50 123 45 67.")]
    [MaxLength(30)]
    public string? Phone { get; set; }

    // The following are only required/used when Role resolves to RestaurantOwner — enforced in
    // AuthService.RegisterAsync rather than with [Required] here, since one DTO shape serves
    // both registration roles.
    [MaxLength(200)]
    public string? RestaurantName { get; set; }

    [MaxLength(300)]
    public string? RestaurantAddress { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [EmailAddress, MaxLength(256)]
    public string? BusinessEmail { get; set; }

    [RegularExpression(AzPhonePattern, ErrorMessage = "Business phone must be a valid Azerbaijan number, e.g. +994 50 123 45 67.")]
    [MaxLength(30)]
    public string? BusinessPhone { get; set; }
}
