using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seatify.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewOwnerReply : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OwnerReply",
                table: "reviews",
                type: "TEXT",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OwnerReplyDate",
                table: "reviews",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OwnerReply",
                table: "reviews");

            migrationBuilder.DropColumn(
                name: "OwnerReplyDate",
                table: "reviews");
        }
    }
}
