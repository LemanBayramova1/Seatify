using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Seatify.Domain.Entities;

namespace Seatify.Infrastructure.Persistence.Configurations;

public class FloorPlanConfiguration : IEntityTypeConfiguration<FloorPlan>
{
    public void Configure(EntityTypeBuilder<FloorPlan> builder)
    {
        builder.ToTable("floor_plans");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Name).HasMaxLength(120).IsRequired();
        builder.Property(f => f.Level).HasDefaultValue(0);

        builder.HasMany(f => f.Tables)
            .WithOne(t => t.FloorPlan)
            .HasForeignKey(t => t.FloorPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        // Venues now own many floor plans (multi-floor layouts); order/lookup by level is the
        // common access pattern, so index the pair rather than VenueId alone.
        builder.HasIndex(f => new { f.VenueId, f.Level });
    }
}
