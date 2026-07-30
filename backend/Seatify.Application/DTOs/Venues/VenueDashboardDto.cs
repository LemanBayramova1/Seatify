namespace Seatify.Application.DTOs.Venues;

public class VenueDashboardDto
{
    public int TodayReservations { get; set; }
    public int ActiveHolds { get; set; }
    public int TotalTables { get; set; }
    public decimal TotalDepositRevenue { get; set; }
}
