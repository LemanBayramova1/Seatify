using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Seatify.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReservationSlotIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_reservations_TableId_ReservationDate",
                table: "reservations");

            migrationBuilder.CreateIndex(
                name: "IX_reservations_TableId_ReservationDate_TimeSlot_Status",
                table: "reservations",
                columns: new[] { "TableId", "ReservationDate", "TimeSlot", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_reservations_TableId_ReservationDate_TimeSlot_Status",
                table: "reservations");

            migrationBuilder.CreateIndex(
                name: "IX_reservations_TableId_ReservationDate",
                table: "reservations",
                columns: new[] { "TableId", "ReservationDate" });
        }
    }
}
