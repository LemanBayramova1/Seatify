# Seatify

Seatify is a real-time restaurant table reservation platform. Restaurant owners design
interactive floor plans and manage venues; customers browse venues, reserve tables, and see
availability update live; admins oversee users and venues platform-wide.

The repo is a monorepo: an npm workspace root, a Vite/React frontend in `front/`, and a .NET 8
Web API backend in `backend/` (see `backend/README.md` for backend-specific setup and
architecture details).

## Tech Stack

### Backend — .NET Core
- **.NET 8** Web API (`Seatify.Api`) following a layered/Clean Architecture split across
  `Seatify.Domain`, `Seatify.Application`, and `Seatify.Infrastructure` projects.
- **Entity Framework Core** for data access, with a pluggable provider (In-Memory by default for
  zero-setup local development, PostgreSQL for persistent/production use).
- **JWT Bearer authentication** with `Customer` / `RestaurantOwner` / `Admin` roles, plus
  **Google OAuth 2.0** login.
- A distributed **table-hold lock** (in-process by default, Redis-backed when scaled across
  multiple API instances) that guarantees only one customer can hold a given table at a time.
- **Swagger / Swashbuckle** for interactive API documentation and testing.

### Frontend — React + Vite
- **React 18** single-page application scaffolded and bundled with **Vite**.
- **Tailwind CSS** for styling, **Framer Motion** for animation.
- **Zustand** for client state management and **React Router** for navigation.
- **Konva / react-konva** powering the drag-and-drop interactive floor plan editor.
- **Recharts** for analytics/dashboard charts.
- **i18next / react-i18next** for multi-language support.
- **Stripe** (`@stripe/react-stripe-js`, `@stripe/stripe-js`) for payments and **Google OAuth**
  for social login on the client.

### Real-time — SignalR
- **ASP.NET Core SignalR** hub (`/hubs/table-state`) broadcasts live table status changes
  (Available / Held / Booked) to every client viewing a venue's floor plan.
- The **`@microsoft/signalr`** JS client keeps the frontend floor plan and booking UI in sync
  the moment a table is held, confirmed, or released — no polling required.
- A background hold-expiry sweep releases abandoned holds and broadcasts the change, keeping
  the UI consistent even if a client disconnects mid-reservation.

### AI — OpenRouter
- An AI-powered chatbot (`OpenRouterChatbotService`) integrates with **OpenRouter** to give
  customers a conversational assistant for finding venues, understanding availability, and
  general help — with multi-language support matching the frontend's i18n setup.

### Infrastructure
- **PostgreSQL** and **Redis**, available via the root `docker-compose.yml` for persistent
  storage and distributed locking/caching when running beyond a single local instance.
- npm **workspaces** at the repo root tie the frontend build/dev scripts together with the
  backend's `dotnet run`, including a combined `dev:full` script for running both at once.

## Key Features

- **Interactive floor plan editor** — restaurant owners design and edit their venue's table
  layout visually (drag, arrange, resize) and persist it per venue.
- **Live table availability** — Available / Held / Booked status updates propagate to every
  connected client in real time via SignalR, so no two customers can double-book a table.
- **Atomic table holds with automatic expiry** — a distributed lock guarantees only one
  customer can hold a table at a time; unconfirmed holds expire automatically and release the
  table back to the pool.
- **Role-based access** — separate experiences and permissions for `Customer`,
  `RestaurantOwner`, and `Admin` accounts, enforced both in the API and the UI.
- **Venue management** — restaurant owners manage their venue profile, floor plans, and
  incoming reservations; a starter venue is auto-created on owner signup.
- **Reservation flow** — customers browse venues, hold a table, confirm a reservation with a
  date/time slot, and view their bookings.
- **Reviews and notifications** — customers leave venue reviews; owners and admins receive
  real-time notifications for new reviews and can manage them.
- **AI chatbot assistant** — an OpenRouter-backed chatbot helps customers with venue discovery
  and general questions, with multi-language support.
- **Authentication** — email/password registration and login plus Google OAuth 2.0, secured
  with JWT.
- **Payments** — Stripe integration for handling reservation-related payments.
- **Admin dashboard** — platform-wide oversight of users, venues, and reviews, with analytics
  charts.
- **Multi-language UI** — the frontend supports multiple languages via i18next.
- **Zero-setup local development** — the backend runs immediately with `dotnet run` using an
  in-memory database and lock, no Docker/Postgres/Redis required; both are one config change
  away when needed.

## Getting Started

See `backend/README.md` for detailed backend setup (prerequisites, running, switching to
Postgres/Redis, SignalR details). At the repo root:

```bash
npm install
npm run dev:full   # runs backend (dotnet run) and frontend (vite) together
```
