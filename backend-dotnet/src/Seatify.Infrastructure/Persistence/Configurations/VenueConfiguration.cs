using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Seatify.Domain.Entities;

namespace Seatify.Infrastructure.Persistence.Configurations;

public class VenueConfiguration : IEntityTypeConfiguration<Venue>
{
    public void Configure(EntityTypeBuilder<Venue> builder)
    {
        builder.ToTable("venues");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.Name).HasMaxLength(200).IsRequired();
        builder.Property(v => v.Address).HasMaxLength(300).IsRequired();

        builder.HasMany(v => v.FloorPlans)
            .WithOne(f => f.Venue)
            .HasForeignKey(f => f.VenueId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(v => v.Owner)
            .WithMany(u => u.OwnedVenues)
            .HasForeignKey(v => v.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(v => v.OwnerId);
    }
}
