using System.ComponentModel.DataAnnotations;

namespace Seatify.Application.DTOs.Auth;

public class RegisterRequestDto
{
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
}
