using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Seatify.Application.Interfaces;
using Seatify.Infrastructure.BackgroundServices;
using Seatify.Infrastructure.Options;
using Seatify.Infrastructure.Persistence;
using Seatify.Infrastructure.Services;
using StackExchange.Redis;

namespace Seatify.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var databaseOptions = configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>()
            ?? new DatabaseOptions();
        var cacheOptions = configuration.GetSection(CacheOptions.SectionName).Get<CacheOptions>()
            ?? new CacheOptions();

        services.AddDbContext<AppDbContext>(options =>
        {
            if (databaseOptions.Provider.Equals("Postgres", StringComparison.OrdinalIgnoreCase))
            {
                options.UseNpgsql(databaseOptions.ConnectionString);
            }
            else if (databaseOptions.Provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
            {
                var connectionString = configuration.GetConnectionString("DefaultConnection")
                    ?? databaseOptions.ConnectionString;
                options.UseSqlite(connectionString);
            }
            else
            {
                // "InMemory": no external DB or file required, but note this provider does not
                // support migrations. Every request shares the same named instance so data
                // survives across the app's lifetime, not per-request.
                options.UseInMemoryDatabase("SeatifyDb");
            }
        });

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<CacheOptions>(configuration.GetSection(CacheOptions.SectionName));
        services.Configure<DatabaseOptions>(configuration.GetSection(DatabaseOptions.SectionName));
        services.Configure<ReservationOptions>(configuration.GetSection(ReservationOptions.SectionName));

        if (cacheOptions.Provider.Equals("Redis", StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<IConnectionMultiplexer>(_ =>
                ConnectionMultiplexer.Connect(cacheOptions.ConnectionString));
            services.AddSingleton<IDistributedLockService, RedisLockService>();
        }
        else
        {
            // Default: an in-process lock table. Fine for a single API instance; switch to
            // Redis (Cache:Provider = "Redis") before scaling out to more than one.
            services.AddSingleton<IDistributedLockService, InMemoryLockService>();
        }

        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IVenueService, VenueService>();
        services.AddScoped<IFloorPlanService, FloorPlanService>();
        services.AddScoped<IReservationService, ReservationService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<IReviewService, ReviewService>();

        services.AddHostedService<ExpiredHoldReleaseService>();

        return services;
    }
}
