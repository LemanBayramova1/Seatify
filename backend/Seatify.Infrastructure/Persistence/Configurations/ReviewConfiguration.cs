using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Seatify.Domain.Entities;

namespace Seatify.Infrastructure.Persistence.Configurations;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("reviews");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Comment).HasMaxLength(1000);
        builder.Property(r => r.OwnerReply).HasMaxLength(1000);

        builder.HasOne(r => r.Venue)
            .WithMany(v => v.Reviews)
            .HasForeignKey(r => r.VenueId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // One review per guest per venue — a resubmission updates their existing review
        // instead of creating a duplicate (see ReviewService.CreateAsync).
        builder.HasIndex(r => new { r.VenueId, r.UserId }).IsUnique();
    }
}
