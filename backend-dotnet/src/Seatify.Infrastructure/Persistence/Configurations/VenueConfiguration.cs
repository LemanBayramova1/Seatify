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
        builder.Property(v => v.City).HasMaxLength(100);
        builder.Property(v => v.BusinessEmail).HasMaxLength(256);
        builder.Property(v => v.BusinessPhone).HasMaxLength(30);
        builder.Property(v => v.CuisineTypes).HasMaxLength(500);
        builder.Property(v => v.GalleryImageUrls).HasMaxLength(2000);
        builder.Property(v => v.IsActive).HasDefaultValue(true);

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
