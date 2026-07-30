using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Seatify.Domain.Entities;

namespace Seatify.Infrastructure.Persistence.Configurations;

public class TableConfiguration : IEntityTypeConfiguration<Table>
{
    public void Configure(EntityTypeBuilder<Table> builder)
    {
        builder.ToTable("tables");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Label).HasMaxLength(50).IsRequired();
        builder.Property(t => t.Zone).HasMaxLength(50);
        builder.Property(t => t.Shape).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.DepositFee).HasColumnType("decimal(10,2)");
        builder.Property(t => t.IsActive).HasDefaultValue(true);

        builder.HasMany(t => t.Reservations)
            .WithOne(r => r.Table)
            .HasForeignKey(r => r.TableId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.FloorPlanId);
        builder.HasIndex(t => new { t.FloorPlanId, t.IsActive });
    }
}
