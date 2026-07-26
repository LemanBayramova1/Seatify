using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Seatify.Domain.Entities;

namespace Seatify.Infrastructure.Persistence.Configurations;

public class ReservationConfiguration : IEntityTypeConfiguration<Reservation>
{
    public void Configure(EntityTypeBuilder<Reservation> builder)
    {
        builder.ToTable("reservations");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(r => r.TimeSlot).HasMaxLength(20).IsRequired();
        builder.Property(r => r.HoldToken).HasMaxLength(64);
        builder.Property(r => r.DepositFee).HasColumnType("decimal(10,2)");

        builder.HasOne(r => r.User)
            .WithMany(u => u.Reservations)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(r => new { r.TableId, r.ReservationDate });
        builder.HasIndex(r => r.UserId);
        builder.HasIndex(r => r.Status);
    }
}
