using Seatify.Domain.Common;
using Seatify.Domain.Enums;

namespace Seatify.Domain.Entities;

public class User : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Customer;

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
    public ICollection<Venue> OwnedVenues { get; set; } = new List<Venue>();
}
