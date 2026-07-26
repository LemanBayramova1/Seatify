using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seatify.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixVenueIsActiveDefault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "venues",
                type: "INTEGER",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "INTEGER");

            // The prior migration's ALTER TABLE ... ADD COLUMN used SQLite's bare CLR default
            // (0/false) for every existing row, not the C# property's `= true` — silently
            // hiding every already-seeded venue from the public marketplace. Nobody has had a
            // chance to intentionally deactivate a venue yet (this column didn't exist before),
            // so it's safe to backfill every existing row to active.
            migrationBuilder.Sql("UPDATE venues SET IsActive = 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "venues",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "INTEGER",
                oldDefaultValue: true);
        }
    }
}
