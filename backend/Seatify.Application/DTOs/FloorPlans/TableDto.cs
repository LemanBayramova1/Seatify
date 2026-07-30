namespace Seatify.Application.DTOs.FloorPlans;

public class TableDto
{
    public Guid Id { get; set; }
    public string Label { get; set; } = string.Empty;
    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public double Rotation { get; set; }
    public string Shape { get; set; } = string.Empty;
    public string? Zone { get; set; }
    public int Capacity { get; set; }
    public decimal DepositFee { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime? HoldExpiresAt { get; set; }
}
