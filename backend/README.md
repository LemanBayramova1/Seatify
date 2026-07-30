# Seatify.Api — .NET 8 backend

Layered/Clean Architecture Web API for Seatify: JWT auth with `Customer` / `RestaurantOwner` /
`Admin` roles, EF Core, an in-process or Redis-backed table-hold lock, and SignalR real-time
table status.

**Runs with zero external dependencies by default** — In-Memory EF Core provider + an in-process
lock table, so `dotnet run` works immediately with no Docker, Postgres, or Redis. Postgres/Redis
are one config change away when you want persistence across restarts or to run more than one
API instance.

## Projects

```
backend/
  Seatify.Api.csproj      controllers, SignalR hub, JWT/Swagger/CORS setup, Program.cs
                          (depends on all three below) — run `dotnet run` right here
  Controllers/ Hubs/ Middleware/ Realtime/ Properties/   Seatify.Api's own source
  Seatify.Domain/         entities + enums, no dependencies
  Seatify.Application/    DTOs, service interfaces, exceptions (depends on Domain)
  Seatify.Infrastructure/ EF Core DbContext, service implementations, distributed lock
                          (In-Memory or Redis), background hold-expiry sweep
```

The solution file (`Seatify.slnx`, listing all four projects) lives one level up, at the repo
root, so it doesn't collide with `Seatify.Api.csproj` as the single project file in this folder.

`ITableStateNotifier` is declared in Application and implemented in the API layer
(`SignalRTableStateNotifier`), so Infrastructure never takes a dependency on ASP.NET Core
SignalR packages — it only knows about the interface. Likewise `IDistributedLockService` is
one interface with two implementations (`InMemoryLockService`, `RedisLockService`) selected at
startup by config — nothing else in the codebase knows or cares which one is active.

## Prerequisites

- .NET 8 SDK (this scaffold was built/verified with the .NET 10 SDK present on this machine,
  targeting `net8.0` with `<RollForward>LatestMajor</RollForward>` in `Seatify.Api.csproj` so
  `dotnet run` still works here; remove that property once a real net8.0 runtime is installed)
- Nothing else, by default. Postgres + Redis are optional — see "Switching to Postgres/Redis"
  below — both are available via the root `docker-compose.yml` (`docker compose up -d postgres redis`).

## First run

```
cd backend
dotnet run
```

That's it — the in-memory database is created automatically at startup. Swagger UI is at
`/swagger` in Development, with an **Authorize** button for pasting a JWT. Update
`appsettings.json` → `Jwt:Secret` before running anywhere near production; the checked-in value
is a placeholder.

Note: the in-memory database resets every time the process restarts. If you need data to
survive restarts, switch to Postgres (below).

## Switching to Postgres / Redis

`backend/appsettings.json`:

```json
"Database": { "Provider": "Postgres", "ConnectionString": "Host=localhost;Port=5432;Database=seatify;Username=seatify;Password=seatify" },
"Cache":    { "Provider": "Redis",    "ConnectionString": "localhost:6379" }
```

Then apply the checked-in migration:

```
dotnet tool install -g dotnet-ef   # if you don't already have it
dotnet ef database update --project Seatify.Infrastructure --startup-project .
```

`Program.cs` calls `Database.Migrate()` on startup whenever the active provider is relational
(so once Postgres is configured, migrations apply automatically on every run) and
`Database.EnsureCreated()` for the in-memory provider.

To add a **new** migration later, the design-time tooling resolves the DbContext through the
same config, so temporarily set `Database:Provider` to `"Postgres"` before running
`dotnet ef migrations add <Name> ...` (the in-memory provider doesn't support migrations),
then switch the default back if you want.

## Config (`backend/appsettings.json`)

| Section | Purpose |
|---|---|
| `Database:Provider` / `Database:ConnectionString` | `InMemory` (default) or `Postgres` |
| `Jwt` | Secret/issuer/audience/expiry for signing tokens |
| `Cache:Provider` / `Cache:ConnectionString` | `InMemory` (default) or `Redis` — backs the table-hold lock |
| `Reservation:HoldDurationMinutes` | Table hold TTL (5–10 min per spec; default 7) |
| `Reservation:ExpirySweepIntervalSeconds` | How often the background sweep checks for holds the lock already expired |
| `Cors:AllowedOrigins` | Frontend origins allowed to call the API / connect to the hub |

## Roles & venue ownership

- `UserRole`: `Customer`, `RestaurantOwner`, `Admin`. Public registration
  (`POST /api/auth/register`) only accepts `"Customer"` or `"RestaurantOwner"` in the `role`
  field — `Admin` can't be self-assigned; promote a user directly in the store for now.
- Registering as a `RestaurantOwner` auto-creates a starter `Venue` owned by that user (there's
  no separate "create my first venue" screen yet), so the floor plan builder always has
  somewhere to save to immediately after signup. `GET /api/venues/mine` lists the venues a
  Restaurant Owner (or Admin) manages, which is how the frontend resolves which `venueId` to
  edit.
- `POST /api/venues/{id}/floorplan` is restricted to that venue's owner or an Admin —
  `FloorPlanService.SaveAsync` checks `venue.OwnerId` against the caller and throws
  `UnauthorizedAppException` (→ 401) otherwise.

## How the table hold works

1. `POST /api/reservations/hold` — `IDistributedLockService.TryAcquireLockAsync` does an atomic
   "set if not present, with a TTL" keyed by `table-hold:{tableId}` (Redis: `SET NX EX`;
   in-memory: a dictionary entry guarded by a lock and checked against its own expiry). That
   single atomic operation is the actual race-condition guard: if two requests hit it at once,
   only one gets `true` back. The winner gets a `Reservation` row (`Status=Held`) and the table
   flips to `Held`; `TableStateHub` broadcasts the change to everyone viewing that venue.
2. `POST /api/reservations/confirm` — checks the caller owns the reservation and the posted
   hold token still matches what the lock service has stored, then releases the lock, flips the
   reservation to `Confirmed` and the table to `Booked`, and broadcasts again.
3. If nobody confirms in time, `ExpiredHoldReleaseService` (a `BackgroundService` polling every
   `ExpirySweepIntervalSeconds`) finds reservations past `HoldExpiresAt`, releases the lock if
   it's still there, marks the reservation `Expired`, flips the table back to `Available`, and
   broadcasts. The lock's own TTL is the primary release mechanism; this sweep is the safety net
   that keeps the DB row and the SignalR broadcast consistent with it.

`ReservationDate` + `TimeSlot` (a plain string like `"19:00-21:00"`) travel with the hold/confirm
calls and end up on the `Reservation` row for the guest's receipt and `my-bookings`, but they are
**not** part of the concurrency key — a hold locks the table as a whole, matching the spec's
live Available/Held/Booked model (a floor-plan/hostess-stand view of the room right now) rather
than a multi-slot booking calendar. If you need independent per-slot availability (a table free
at lunch but booked at dinner), key the lock and the `Table.Status` projection by
`(tableId, date, timeSlot)` instead — the frontend's own mock-mode simulation already models
booking that way, so that's the shape to match if you extend this.

## SignalR

Hub endpoint: `/hubs/table-state`. Clients call `JoinVenue(venueId)` after connecting to scope
broadcasts to that venue, and listen for a `TableStatusChanged` message
(`{ venueId, floorPlanId, tableId, status, holdExpiresAt }`).

Browsers can't set custom headers on the WebSocket handshake, so the JWT has to travel as a
query string param on the connection URL:

```ts
new HubConnectionBuilder()
  .withUrl("http://localhost:5071/hubs/table-state", { accessTokenFactory: () => token })
  .build();
```

`Program.cs` reads `access_token` off the query string specifically for requests under
`/hubs` and validates it the same way as the `Authorization` header.

## Notes / things a real deployment should revisit

- The in-memory database and in-memory lock are per-process — they don't share state across
  multiple API instances or survive a restart. Switch both to Postgres/Redis before deploying
  more than one instance.
- One floor plan per venue is assumed (matches the singular `GET /api/venues/{id}/floorplan`
  endpoint in the spec). `POST /api/venues/{id}/floorplan` upserts by `venueId` from the route,
  not by floor-plan id.
