using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace Seatify.Api.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Request is missing the NameIdentifier claim."));
}
