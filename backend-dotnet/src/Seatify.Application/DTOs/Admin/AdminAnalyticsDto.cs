namespace Seatify.Application.DTOs.Admin;

public class DailyCountDto
{
    public DateOnly Date { get; set; }
    public int Count { get; set; }
}

public class DailyRevenueDto
{
    public DateOnly Date { get; set; }
    public decimal Amount { get; set; }
}

public class StatusBreakdownDto
{
    public int Confirmed { get; set; }
    public int Held { get; set; }
    public int Cancelled { get; set; }
    public int Expired { get; set; }
}

public class AdminAnalyticsDto
{
    public int TotalBookings { get; set; }
    public decimal MonthlyRevenueAzn { get; set; }
    public int ActiveVenuesCount { get; set; }
    public int RegisteredUsersCount { get; set; }
    public List<DailyCountDto> ReservationTrend { get; set; } = new();
    public List<DailyRevenueDto> RevenueTrend { get; set; } = new();
    public StatusBreakdownDto StatusBreakdown { get; set; } = new();
}
