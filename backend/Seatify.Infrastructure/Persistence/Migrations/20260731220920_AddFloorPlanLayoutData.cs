using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seatify.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFloorPlanLayoutData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LayoutData",
                table: "floor_plans",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LayoutData",
                table: "floor_plans");
        }
    }
}
