using Microsoft.EntityFrameworkCore;
using Seatify.Domain.Entities;
using Seatify.Domain.Enums;

namespace Seatify.Infrastructure.Persistence;

/// <summary>Seeds a couple of demo venues/floor plans so the marketplace and floor plan
/// viewer are never empty on a fresh in-memory database.</summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // Seeded independently of the venues check below — an existing dev database (already
        // full of venues from earlier runs) would otherwise never get the demo Admin account.
        if (!await db.Users.AnyAsync(u => u.Role == UserRole.Admin))
        {
            db.Users.Add(new User
            {
                Name = "Demo Admin",
                Email = "admin@seatify.dev",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Passw0rd!"),
                Role = UserRole.Admin
            });
            await db.SaveChangesAsync();
        }

        await SeedForcedAdminAsync(db);

        if (await db.Venues.AnyAsync())
        {
            return;
        }

        var owner = new User
        {
            Name = "Demo Owner",
            Email = "owner@seatify.dev",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Passw0rd!"),
            Role = UserRole.RestaurantOwner
        };

        var customer = new User
        {
            Name = "Demo Customer",
            Email = "customer@seatify.dev",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Passw0rd!"),
            Role = UserRole.Customer
        };

        db.Users.AddRange(owner, customer);

        var bistro = new Venue
        {
            Name = "The Copper Bistro",
            Address = "12 Nizami Street, Baku",
            Description = "Modern European cuisine in a warm, industrial-chic setting.",
            ImageUrl = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
            Owner = owner
        };

        var sakura = new Venue
        {
            Name = "Sakura Terrace",
            Address = "45 Fountain Square, Baku",
            Description = "Japanese-fusion rooftop dining with skyline views.",
            ImageUrl = "https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800",
            Owner = owner
        };

        db.Venues.AddRange(bistro, sakura);

        var bistroPlan = new FloorPlan
        {
            Venue = bistro,
            Name = "Main Floor",
            CanvasWidth = 1000,
            CanvasHeight = 700,
            Tables = new List<Table>
            {
                new() { Label = "M1", X = 80, Y = 80, Width = 90, Height = 90, Shape = TableShape.Circle, Zone = "GENERAL", Capacity = 2, DepositFee = 10, Status = TableStatus.Available },
                new() { Label = "M2", X = 220, Y = 80, Width = 90, Height = 90, Shape = TableShape.Circle, Zone = "GENERAL", Capacity = 2, DepositFee = 10, Status = TableStatus.Booked },
                new() { Label = "M3", X = 80, Y = 220, Width = 120, Height = 90, Shape = TableShape.Rectangle, Zone = "GENERAL", Capacity = 4, DepositFee = 15, Status = TableStatus.Available },
                new() { Label = "M4", X = 260, Y = 220, Width = 120, Height = 90, Shape = TableShape.Rectangle, Zone = "GENERAL", Capacity = 4, DepositFee = 15, Status = TableStatus.Available },
                new() { Label = "V1", X = 500, Y = 80, Width = 100, Height = 100, Shape = TableShape.Square, Zone = "VIP", Capacity = 6, DepositFee = 30, Status = TableStatus.Available },
                new() { Label = "V2", X = 650, Y = 80, Width = 100, Height = 100, Shape = TableShape.Square, Zone = "VIP", Capacity = 6, DepositFee = 30, Status = TableStatus.Booked },
                new() { Label = "T1", X = 500, Y = 300, Width = 90, Height = 90, Shape = TableShape.Circle, Zone = "TERRACE", Capacity = 2, DepositFee = 12, Status = TableStatus.Available },
                new() { Label = "T2", X = 650, Y = 300, Width = 90, Height = 90, Shape = TableShape.Circle, Zone = "TERRACE", Capacity = 2, DepositFee = 12, Status = TableStatus.Available },
            }
        };

        var sakuraPlan = new FloorPlan
        {
            Venue = sakura,
            Name = "Rooftop",
            CanvasWidth = 1000,
            CanvasHeight = 700,
            Tables = new List<Table>
            {
                new() { Label = "R1", X = 100, Y = 100, Width = 90, Height = 90, Shape = TableShape.Circle, Zone = "TERRACE", Capacity = 2, DepositFee = 15, Status = TableStatus.Available },
                new() { Label = "R2", X = 260, Y = 100, Width = 120, Height = 90, Shape = TableShape.Rectangle, Zone = "TERRACE", Capacity = 4, DepositFee = 20, Status = TableStatus.Available },
                new() { Label = "R3", X = 440, Y = 100, Width = 120, Height = 90, Shape = TableShape.Rectangle, Zone = "TERRACE", Capacity = 4, DepositFee = 20, Status = TableStatus.Booked },
                new() { Label = "VIP1", X = 100, Y = 300, Width = 110, Height = 110, Shape = TableShape.Square, Zone = "VIP", Capacity = 8, DepositFee = 40, Status = TableStatus.Available },
            }
        };

        db.FloorPlans.AddRange(bistroPlan, sakuraPlan);

        await db.SaveChangesAsync();
    }

    /// <summary>Unconditionally guarantees a working login at admin@seatify.com / Admin123!,
    /// independent of the "Demo Admin" seeded above — creates the account if it's missing, or
    /// force-resets its password hash (this project has no ASP.NET Identity UserManager, so
    /// there's no separate Remove/AddPassword step — overwriting PasswordHash directly is the
    /// equivalent operation) and re-asserts Admin/active/verified on every startup, so the
    /// credential can never silently drift out of sync with what's documented.</summary>
    private static async Task SeedForcedAdminAsync(AppDbContext db)
    {
        const string email = "admin@seatify.com";
        const string password = "Admin123!";

        var admin = await db.Users.SingleOrDefaultAsync(u => u.Email == email);

        if (admin is null)
        {
            admin = new User
            {
                Name = "System Admin",
                Email = email,
                Role = UserRole.Admin
            };
            db.Users.Add(admin);
        }

        admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
        admin.Role = UserRole.Admin;
        admin.IsActive = true;
        admin.IsEmailVerified = true;

        await db.SaveChangesAsync();

        Console.WriteLine("[Seed] Admin user verified: admin@seatify.com / Admin123!");
    }
}
