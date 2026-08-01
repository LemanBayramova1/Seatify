import axios from "axios";
import { publish } from "./realtimeBus";
import { API_STATUS_TO_STATUS, ELEMENT_TYPES, STATUS, TABLE_ELEMENT_TYPES } from "../lib/zones";
import { getRestaurant, RESTAURANTS } from "../lib/restaurants";
import { todayIso } from "../lib/timeSlots";

// ---------------------------------------------------------------------------
// Axios client for the REAL C# .NET API. Every exported function below is
// already wired to call this once `USE_MOCKS` is false (or once you delete
// the mock branch) — just point VITE_API_URL at your API and flip the flag.
// ---------------------------------------------------------------------------
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://localhost:5001/api",
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("seatify.token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";
const HOLD_TTL_MS = 5 * 60 * 1000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const jitter = () => 250 + Math.random() * 350;
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Shape/status mapping between the editor's element taxonomy (ROUND_TABLE,
// SQUARE_TABLE, RECT_TABLE, ...) and the real API's Table.Shape enum (Circle,
// Square, Rectangle). The API only models bookable tables — decorative
// elements (stage/window/door/wall/bar-kitchen/zone labels) are an
// editor-only convenience and are dropped before saving to the real backend.
// ---------------------------------------------------------------------------
const SHAPE_TO_API = {
  [ELEMENT_TYPES.ROUND_TABLE]: "Circle",
  [ELEMENT_TYPES.SQUARE_TABLE]: "Square",
  [ELEMENT_TYPES.RECT_TABLE]: "Rectangle",
};

const SHAPE_FROM_API = {
  Circle: ELEMENT_TYPES.ROUND_TABLE,
  Square: ELEMENT_TYPES.SQUARE_TABLE,
  Rectangle: ELEMENT_TYPES.RECT_TABLE,
};

function tableElementToApi(el) {
  // Defensive clamping at the network boundary: the properties panel's number inputs let a table
  // momentarily hold an empty/NaN/zero value mid-edit (e.g. clearing the field to retype it), and
  // the backend's Capacity/Label are required/[Range(1,100)] — an out-of-range value here used to
  // fail the ENTIRE layout save with a validation error naming a field, not the offending table.
  const capacity = Number.isFinite(el.capacity) && el.capacity > 0 ? Math.round(el.capacity) : 1;
  const depositFee = Number.isFinite(el.minDeposit) && el.minDeposit >= 0 ? el.minDeposit : 0;
  const label = typeof el.label === "string" && el.label.trim() ? el.label.trim() : "Table";

  return {
    id: GUID_PATTERN.test(el.id) ? el.id : undefined,
    label,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation ?? 0,
    shape: SHAPE_TO_API[el.type] ?? "Rectangle",
    zone: el.zone,
    capacity,
    depositFee,
  };
}

// Decorative elements (doors, windows, walls, stage, bar, zone labels) aren't bookable Tables —
// they round-trip through FloorPlan.LayoutData (a separate, weakly-typed JSON blob) instead of
// the Tables list, so a decoration's loose shape never has to satisfy Table's stricter
// validation (Capacity/Label/etc.) and can never fail a save over that.
function decorativeElementToApi(el) {
  return {
    id: el.id,
    type: el.type,
    label: el.label ?? "",
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation ?? 0,
  };
}

function apiElementToDecorative(el) {
  return {
    id: el.id,
    type: el.type,
    label: el.label ?? "",
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation ?? 0,
  };
}

function apiTableToElement(table) {
  return {
    id: table.id,
    type: SHAPE_FROM_API[table.shape] ?? ELEMENT_TYPES.RECT_TABLE,
    x: table.x,
    y: table.y,
    width: table.width,
    height: table.height,
    rotation: table.rotation ?? 0,
    label: table.label,
    capacity: table.capacity,
    minDeposit: table.depositFee,
    zone: table.zone ?? "GENERAL",
    status: API_STATUS_TO_STATUS[table.status] ?? STATUS.FREE,
    holdExpiresAt: table.holdExpiresAt ? new Date(table.holdExpiresAt).getTime() : null,
  };
}

// ---------------------------------------------------------------------------
// Mock persistence — localStorage stands in for the database until the C#
// API exists. Structured so every mock function has an obvious 1:1 real
// counterpart below it. Floor plans and reservations are keyed per venue so
// the marketplace can host several independent restaurants side by side.
// ---------------------------------------------------------------------------
const floorPlansKey = (venueId) => `seatify.mock.floorplans.v2.${venueId}`;
const reservationsKey = (venueId) => `seatify.mock.reservations.v1.${venueId}`;
const BOOKINGS_KEY = "seatify.mock.myBookings.v1";
const holdTimers = new Map();

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedFloorPlans(venueId) {
  const restaurant = getRestaurant(venueId);
  const elements = restaurant
    ? restaurant.floorPlanSeed
    : [
        { id: "t1", type: ELEMENT_TYPES.ROUND_TABLE, x: 120, y: 120, width: 90, height: 90, rotation: 0, label: "T1", capacity: 2, minDeposit: 20, zone: "WINDOW" },
        { id: "t2", type: ELEMENT_TYPES.SQUARE_TABLE, x: 280, y: 120, width: 100, height: 100, rotation: 0, label: "T2", capacity: 4, minDeposit: 35, zone: "GENERAL" },
        { id: "t3", type: ELEMENT_TYPES.RECT_TABLE, x: 460, y: 130, width: 160, height: 90, rotation: 0, label: "T3", capacity: 6, minDeposit: 60, zone: "VIP" },
        { id: "t4", type: ELEMENT_TYPES.ROUND_TABLE, x: 140, y: 320, width: 90, height: 90, rotation: 0, label: "T4", capacity: 2, minDeposit: 20, zone: "QUIET_CORNER" },
        { id: "t5", type: ELEMENT_TYPES.SQUARE_TABLE, x: 320, y: 320, width: 100, height: 100, rotation: 0, label: "T5", capacity: 4, minDeposit: 35, zone: "BAR" },
        { id: "stage-1", type: ELEMENT_TYPES.STAGE, x: 600, y: 340, width: 180, height: 90, rotation: 0, label: "Stage" },
        { id: "window-1", type: ELEMENT_TYPES.WINDOW, x: 40, y: 40, width: 140, height: 16, rotation: 0, label: "Window" },
        { id: "door-1", type: ELEMENT_TYPES.DOOR, x: 700, y: 40, width: 60, height: 16, rotation: 0, label: "Entrance" },
      ];
  const plans = [
    // 860x560 matches the builder/booking-map Stage's native pixel size (see FloorPlanCanvas.jsx)
    // so this seed's existing 860x560-shaped coordinates render at 1:1 scale, not stretched.
    { id: `${venueId}-floor-1`, name: "Əsas Zal", level: 0, canvasWidth: 860, canvasHeight: 560, backgroundImageUrl: null, elements },
  ];
  saveJSON(floorPlansKey(venueId), plans);
  return plans;
}

function slotKey(tableId, date, timeSlot) {
  return `${tableId}|${date}|${timeSlot}`;
}

function readReservations(venueId) {
  return loadJSON(reservationsKey(venueId), {});
}

function writeReservations(venueId, map) {
  saveJSON(reservationsKey(venueId), map);
}

function readBookings() {
  return loadJSON(BOOKINGS_KEY, []);
}

function writeBookings(list) {
  saveJSON(BOOKINGS_KEY, list);
}

function scheduleAutoRelease(reservationId, venueId, key, tableId, date, timeSlot) {
  clearTimeout(holdTimers.get(reservationId));
  const timer = setTimeout(() => {
    const reservations = readReservations(venueId);
    if (reservations[key]?.reservationId === reservationId && reservations[key].status === STATUS.HELD) {
      delete reservations[key];
      writeReservations(venueId, reservations);
      publish({ type: "TableStatusChanged", venueId, tableId, date, timeSlot, status: STATUS.FREE });
    }
    holdTimers.delete(reservationId);
  }, HOLD_TTL_MS);
  holdTimers.set(reservationId, timer);
}

// ---------------------------------------------------------------------------
// Venues (marketplace + Restaurant Owner dashboard)
// ---------------------------------------------------------------------------

// The API's Venue entity has no cuisine/cover fields yet — fill in sensible display defaults
// so the marketplace UI (built against the richer mock catalog shape) renders real venues
// without changes. Rating/reviewCount DO come from the API now (VenueDto.Rating/ReviewCount,
// computed server-side from the Reviews table) — a brand-new venue with no reviews yet is
// `rating: 0, reviewCount: 0`, never a fabricated starting score.
function apiVenueToRestaurant(v, zonesOffered = []) {
  return {
    id: v.id,
    name: v.name,
    cover: v.imageUrl || `https://picsum.photos/seed/${v.id}/800/500`,
    rating: v.rating ?? 0,
    reviewCount: v.reviewCount ?? 0,
    address: v.address,
    cuisines: [],
    zonesOffered,
  };
}

async function zonesOfferedFor(venueId) {
  const plans = await getFloorPlans(venueId);
  const elements = plans.flatMap((fp) => fp.elements);
  return Array.from(new Set(elements.map((el) => el.zone).filter(Boolean)));
}

/** Marketplace listing. */
export async function getVenues() {
  if (USE_MOCKS) {
    await wait(jitter());
    return RESTAURANTS;
  }
  const { data } = await http.get("/venues");
  return Promise.all(
    data.map(async (v) => apiVenueToRestaurant(v, await zonesOfferedFor(v.id)))
  );
}

/** Single venue's marketplace/booking-page metadata. */
export async function getVenueById(venueId) {
  if (USE_MOCKS) {
    await wait(jitter());
    return getRestaurant(venueId);
  }
  const { data: v } = await http.get(`/venues/${venueId}`);
  return apiVenueToRestaurant(v, await zonesOfferedFor(venueId));
}

/** Venues the signed-in Restaurant Owner manages — resolves which venueId the builder edits. */
export async function getMyVenues() {
  if (USE_MOCKS) {
    await wait(jitter());
    return [{ id: "demo-venue", name: "My Restaurant (Demo)" }];
  }
  const { data } = await http.get("/venues/mine");
  return data;
}

/**
 * Resolves which venue the signed-in Restaurant Owner should see in the builder/dashboard.
 * Normally this is just their own venue (from `getMyVenues`), but for edge cases where an
 * owner account has no venue yet — a legacy/seeded account, or a race right after
 * registration — falls back to the first venue in the public catalog so the UI never sits
 * on a permanently-empty, unexplained screen. `isFallback` lets the UI show a small notice
 * when that happened.
 */
export async function resolveMyVenueId() {
  const mine = await getMyVenues();
  if (mine?.length) {
    return { venueId: mine[0].id, venueName: mine[0].name, isFallback: false };
  }

  if (USE_MOCKS) {
    return { venueId: "demo-venue", venueName: "My Restaurant (Demo)", isFallback: true };
  }

  const { data } = await http.get("/venues");
  const fallback = data?.[0];
  return fallback
    ? { venueId: fallback.id, venueName: fallback.name, isFallback: true }
    : { venueId: null, venueName: null, isFallback: false };
}

const venueDetailsKey = (venueId) => `seatify.mock.venueDetails.v1.${venueId}`;

/** Full venue record for the Venue Settings edit form (name, address, contact, cuisine, gallery). */
export async function getVenueDetails(venueId) {
  if (USE_MOCKS) {
    await wait(jitter());
    const restaurant = getRestaurant(venueId);
    const defaults = {
      id: venueId,
      name: restaurant?.name ?? "My Restaurant (Demo)",
      address: restaurant?.address ?? "",
      city: "Bakı",
      businessEmail: "",
      businessPhone: "",
      description: "",
      imageUrl: restaurant?.cover ?? "",
      cuisineTypes: restaurant?.cuisines ?? [],
      galleryImageUrls: [],
    };
    return loadJSON(venueDetailsKey(venueId), null) ?? defaults;
  }
  const { data } = await http.get(`/venues/${venueId}`);
  return data;
}

/** Owner-facing venue update (Venue Settings page). */
export async function updateVenue(venueId, payload) {
  if (USE_MOCKS) {
    await wait(jitter());
    const updated = { id: venueId, ...payload };
    saveJSON(venueDetailsKey(venueId), updated);
    return updated;
  }
  const { data } = await http.put(`/venues/${venueId}`, payload);
  return data;
}

/** Overview metrics for the owner dashboard. */
export async function getVenueDashboard(venueId) {
  if (USE_MOCKS) {
    await wait(jitter());
    const plans = loadJSON(floorPlansKey(venueId), null) ?? seedFloorPlans(venueId);
    const totalTables = plans.flatMap((fp) => fp.elements).filter((el) => TABLE_ELEMENT_TYPES.includes(el.type)).length;

    const reservations = readReservations(venueId);
    const now = Date.now();
    const activeHolds = Object.values(reservations).filter(
      (r) => r.status === STATUS.HELD && (!r.holdExpiresAt || r.holdExpiresAt > now)
    ).length;

    const bookings = readBookings().filter((b) => b.venueId === venueId);
    const today = todayIso();
    const todayReservations = bookings.filter((b) => b.date === today && b.status !== "CANCELLED").length;
    const totalDepositRevenue = bookings
      .filter((b) => b.status === "CONFIRMED")
      .reduce((sum, b) => sum + (b.minDeposit ?? 0), 0);

    return { todayReservations, activeHolds, totalTables, totalDepositRevenue };
  }
  const { data } = await http.get(`/venues/${venueId}/dashboard`);
  return data;
}

// Mock bookings store status as "CONFIRMED" (see confirmBooking); normalize to the same
// PascalCase the real API's ReservationStatus enum serializes as ("Confirmed", "Held", ...)
// so both modes render with the same status labels/filter values.
function pascalStatus(status) {
  return status ? status[0].toUpperCase() + status.slice(1).toLowerCase() : status;
}

/** Bronlar (reservations) list for the owner dashboard, optionally filtered by date/status. */
export async function getVenueReservations(venueId, { date, status } = {}) {
  if (USE_MOCKS) {
    await wait(jitter());
    let bookings = readBookings().filter((b) => b.venueId === venueId);
    if (date) bookings = bookings.filter((b) => b.date === date);
    if (status) bookings = bookings.filter((b) => pascalStatus(b.status) === status);
    return bookings.map((b) => ({
      id: b.id,
      tableId: b.tableId,
      tableLabel: b.tableLabel,
      venueId: b.venueId,
      venueName: b.restaurantName,
      reservationDate: b.date,
      timeSlot: b.timeSlot,
      partySize: b.guests,
      status: pascalStatus(b.status),
      depositFee: b.minDeposit,
      depositPaid: b.status === "CONFIRMED",
      createdAt: b.createdAt,
    }));
  }
  const { data } = await http.get(`/venues/${venueId}/reservations`, { params: { date, status } });
  return data;
}

// ---------------------------------------------------------------------------
// Reviews & ratings (Customer view)
// ---------------------------------------------------------------------------

const reviewsKey = (venueId) => `seatify.mock.reviews.v1.${venueId}`;

function readReviews(venueId) {
  return loadJSON(reviewsKey(venueId), []);
}

function writeReviews(venueId, list) {
  saveJSON(reviewsKey(venueId), list);
}

function currentMockUser() {
  try {
    return JSON.parse(localStorage.getItem("seatify.auth.user") ?? "null");
  } catch {
    return null;
  }
}

/** Every review left for a venue, newest first. */
export async function getVenueReviews(venueId) {
  if (USE_MOCKS) {
    await wait(jitter());
    return readReviews(venueId);
  }
  const { data } = await http.get(`/venues/${venueId}/reviews`);
  return data;
}

/** Submits (or updates, if the signed-in guest already reviewed this venue) a 1-5 star review. */
export async function submitReview(venueId, { rating, comment }) {
  if (USE_MOCKS) {
    await wait(jitter());
    const user = currentMockUser();
    const userId = user?.email ?? "anon";
    const reviews = readReviews(venueId);
    const existingIndex = reviews.findIndex((r) => r.userId === userId);
    const review = {
      id: existingIndex >= 0 ? reviews[existingIndex].id : `rev_${venueId}_${Date.now()}`,
      venueId,
      userId,
      userName: user?.name ?? "Guest",
      rating,
      comment: comment?.trim() || null,
      createdAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) reviews[existingIndex] = review;
    else reviews.unshift(review);
    writeReviews(venueId, reviews);
    return review;
  }
  const { data } = await http.post(`/venues/${venueId}/reviews`, { rating, comment });
  return data;
}

function findMockReview(venueId, reviewId) {
  const reviews = readReviews(venueId);
  const index = reviews.findIndex((r) => r.id === reviewId);
  return { reviews, index };
}

/** Adds or updates the venue owner's reply to a review (Owner or Admin only). */
export async function replyToReview(venueId, reviewId, reply) {
  if (USE_MOCKS) {
    await wait(jitter());
    const { reviews, index } = findMockReview(venueId, reviewId);
    if (index < 0) throw new Error("Review not found.");
    reviews[index] = { ...reviews[index], ownerReply: reply.trim(), ownerReplyDate: new Date().toISOString() };
    writeReviews(venueId, reviews);
    return reviews[index];
  }
  const { data } = await http.post(`/reviews/${reviewId}/reply`, { reply });
  return data;
}

/** Removes the venue owner's reply from a review, leaving the review itself intact. */
export async function deleteReviewReply(venueId, reviewId) {
  if (USE_MOCKS) {
    await wait(jitter());
    const { reviews, index } = findMockReview(venueId, reviewId);
    if (index < 0) throw new Error("Review not found.");
    reviews[index] = { ...reviews[index], ownerReply: null, ownerReplyDate: null };
    writeReviews(venueId, reviews);
    return reviews[index];
  }
  const { data } = await http.delete(`/reviews/${reviewId}/reply`);
  return data;
}

/** Permanently deletes a review (Owner of the venue, or Admin, only). */
export async function deleteReview(venueId, reviewId) {
  if (USE_MOCKS) {
    await wait(jitter());
    const { reviews, index } = findMockReview(venueId, reviewId);
    if (index >= 0) {
      reviews.splice(index, 1);
      writeReviews(venueId, reviews);
    }
    return { ok: true };
  }
  await http.delete(`/reviews/${reviewId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Notifications (Customer + Restaurant Owner bell)
// ---------------------------------------------------------------------------

const notificationsKey = () => `seatify.mock.notifications.v1.${currentMockUser()?.email ?? "anon"}`;

/** Every notification for the signed-in user, most recent first. */
export async function getNotifications() {
  if (USE_MOCKS) {
    await wait(jitter());
    return loadJSON(notificationsKey(), []);
  }
  const { data } = await http.get("/notifications");
  return data;
}

/** Marks a single notification read (no-op if it's already read or not the caller's). */
export async function markNotificationRead(notificationId) {
  if (USE_MOCKS) {
    await wait(jitter());
    const list = loadJSON(notificationsKey(), []);
    saveJSON(notificationsKey(), list.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
    return { ok: true };
  }
  await http.put(`/notifications/${notificationId}/read`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Platform Admin (`/platform-admin`, UserRole.Admin only) — spans every venue/user, unlike
// the owner-scoped getVenueDashboard/getVenueReservations above. Mock branches are a
// best-effort approximation built from the same localStorage stores the rest of this file
// already uses (there's no separate "mock backend" to query cross-venue).
// ---------------------------------------------------------------------------
const MOCK_VENUE_ACTIVE_KEY = "seatify.mock.venueActive.v1";
const MOCK_USER_ROLES_KEY = "seatify.mock.userRoles.v1";

function mockVenueActiveMap() {
  return loadJSON(MOCK_VENUE_ACTIVE_KEY, {});
}

function dailyBuckets(days) {
  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.push(d.toISOString().slice(0, 10));
  }
  return buckets;
}

/** Cross-venue KPI cards + trend/status-breakdown charts for the platform admin dashboard. */
export async function getAdminAnalytics() {
  if (USE_MOCKS) {
    await wait(jitter());
    const bookings = readBookings();
    const monthPrefix = todayIso().slice(0, 7);
    const roles = loadJSON(MOCK_USER_ROLES_KEY, {});
    const days = dailyBuckets(14);

    return {
      totalBookings: bookings.length,
      monthlyRevenueAzn: bookings.filter((b) => b.date?.startsWith(monthPrefix)).reduce((sum, b) => sum + (b.minDeposit ?? 0), 0),
      activeVenuesCount: RESTAURANTS.length,
      registeredUsersCount: Object.keys(roles).length + 3,
      totalVenuesCount: RESTAURANTS.length,
      activeBookingsCount: bookings.filter((b) => b.status === "HELD" || b.status === "CONFIRMED").length,
      totalDepositsAzn: bookings.filter((b) => b.status === "CONFIRMED").reduce((sum, b) => sum + (b.minDeposit ?? 0), 0),
      reservationTrend: days.map((date) => ({ date, count: bookings.filter((b) => b.date === date).length })),
      revenueTrend: days.map((date) => ({
        date,
        amount: bookings.filter((b) => b.date === date).reduce((sum, b) => sum + (b.minDeposit ?? 0), 0),
      })),
      statusBreakdown: { confirmed: bookings.length, held: 0, cancelled: 0, expired: 0 },
    };
  }
  const { data } = await http.get("/admin/analytics");
  return {
    totalBookings: data.totalBookings,
    monthlyRevenueAzn: data.monthlyRevenueAzn,
    activeVenuesCount: data.activeVenuesCount,
    registeredUsersCount: data.registeredUsersCount,
    totalVenuesCount: data.totalVenuesCount,
    activeBookingsCount: data.activeBookingsCount,
    totalDepositsAzn: data.totalDepositsAzn,
    reservationTrend: data.reservationTrend.map((d) => ({ date: d.date, count: d.count })),
    revenueTrend: data.revenueTrend.map((d) => ({ date: d.date, amount: d.amount })),
    statusBreakdown: {
      confirmed: data.statusBreakdown.confirmed,
      held: data.statusBreakdown.held,
      cancelled: data.statusBreakdown.cancelled,
      expired: data.statusBreakdown.expired,
    },
  };
}

/** Every venue on the platform, with owner name + table count + active toggle. */
export async function getAdminVenues() {
  if (USE_MOCKS) {
    await wait(jitter());
    const activeMap = mockVenueActiveMap();
    return RESTAURANTS.map((r) => ({
      id: r.id,
      name: r.name,
      ownerName: "Demo Owner",
      city: "Bakı",
      tableCount: r.floorPlanSeed?.filter((el) => TABLE_ELEMENT_TYPES.includes(el.type)).length ?? 0,
      isActive: activeMap[r.id] ?? true,
    }));
  }
  const { data } = await http.get("/admin/venues");
  return data;
}

export async function toggleVenueActive(venueId, isActive) {
  if (USE_MOCKS) {
    await wait(jitter());
    const activeMap = mockVenueActiveMap();
    activeMap[venueId] = isActive;
    saveJSON(MOCK_VENUE_ACTIVE_KEY, activeMap);
    return { ok: true };
  }
  await http.patch(`/admin/venues/${venueId}/active`, { isActive });
  return { ok: true };
}

/** Permanently removes a venue and everything under it (floor plans, tables, reservations, reviews). */
export async function deleteAdminVenue(venueId) {
  if (USE_MOCKS) {
    await wait(jitter());
    return { ok: true };
  }
  await http.delete(`/admin/venues/${venueId}`);
  return { ok: true };
}

/** Every review across every venue on the platform, newest first — Admin-only moderation view. */
export async function getAdminReviews() {
  if (USE_MOCKS) {
    await wait(jitter());
    return RESTAURANTS.flatMap((r) =>
      readReviews(r.id).map((review) => ({ ...review, venueId: r.id, venueName: r.name })),
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  const { data } = await http.get("/admin/reviews");
  return data;
}

const MOCK_USER_ACTIVE_KEY = "seatify.mock.userActive.v1";

function mockUserActiveMap() {
  return loadJSON(MOCK_USER_ACTIVE_KEY, {});
}

/** Every registered user on the platform (guests + owners). */
export async function getAdminUsers() {
  if (USE_MOCKS) {
    await wait(jitter());
    const roles = loadJSON(MOCK_USER_ROLES_KEY, {});
    const activeMap = mockUserActiveMap();
    const seeded = [
      { id: "seed-owner", name: "Demo Owner", email: "owner@seatify.dev", phone: null, role: "RestaurantOwner", createdAt: Date.now() },
      { id: "seed-customer", name: "Demo Customer", email: "customer@seatify.dev", phone: null, role: "Customer", createdAt: Date.now() },
    ];
    const registered = Object.entries(roles).map(([email, role]) => ({
      id: email,
      name: email.split("@")[0],
      email,
      phone: null,
      role,
      createdAt: Date.now(),
    }));
    return [...seeded, ...registered].map((u) => ({ ...u, isActive: activeMap[u.id] ?? true }));
  }
  const { data } = await http.get("/admin/users");
  return data;
}

/** Updates a user's name/email/phone/role. */
export async function updateAdminUser(userId, { name, email, phone, role }) {
  if (USE_MOCKS) {
    await wait(jitter());
    return { id: userId, name, email, phone, role };
  }
  const { data } = await http.put(`/admin/users/${userId}`, { name, email, phone, role });
  return data;
}

export async function toggleUserActive(userId, isActive) {
  if (USE_MOCKS) {
    await wait(jitter());
    const activeMap = mockUserActiveMap();
    activeMap[userId] = isActive;
    saveJSON(MOCK_USER_ACTIVE_KEY, activeMap);
    return { ok: true };
  }
  await http.patch(`/admin/users/${userId}/active`, { isActive });
  return { ok: true };
}

/** Permanently deletes a user account. */
export async function deleteAdminUser(userId) {
  if (USE_MOCKS) {
    await wait(jitter());
    return { ok: true };
  }
  await http.delete(`/admin/users/${userId}`);
  return { ok: true };
}

/** Every reservation on the platform, optionally filtered by date/status. */
export async function getAdminReservations({ date, status } = {}) {
  if (USE_MOCKS) {
    await wait(jitter());
    let bookings = readBookings();
    if (date) bookings = bookings.filter((b) => b.date === date);
    if (status) bookings = bookings.filter((b) => pascalStatus(b.status) === status);
    return bookings.map((b) => ({
      id: b.id,
      tableId: b.tableId,
      tableLabel: b.tableLabel,
      venueId: b.venueId,
      venueName: b.restaurantName,
      reservationDate: b.date,
      timeSlot: b.timeSlot,
      partySize: b.guests,
      status: pascalStatus(b.status),
      depositFee: b.minDeposit,
      depositPaid: b.status === "CONFIRMED",
      createdAt: b.createdAt,
    }));
  }
  const { data } = await http.get("/admin/reservations", { params: { date, status } });
  return data;
}

export async function approveReservation(reservationId) {
  if (USE_MOCKS) {
    await wait(jitter());
    return { ok: true };
  }
  await http.post(`/admin/reservations/${reservationId}/approve`);
  return { ok: true };
}

export async function rejectReservation(reservationId) {
  if (USE_MOCKS) {
    await wait(jitter());
    const bookings = readBookings();
    const booking = bookings.find((b) => b.id === reservationId);
    if (booking) {
      const key = slotKey(booking.tableId, booking.date, booking.timeSlot);
      const reservations = readReservations(booking.venueId);
      if (reservations[key]?.reservationId === booking.reservationId) {
        delete reservations[key];
        writeReservations(booking.venueId, reservations);
        publish({ type: "TableStatusChanged", venueId: booking.venueId, tableId: booking.tableId, date: booking.date, timeSlot: booking.timeSlot, status: STATUS.FREE });
      }
    }
    writeBookings(bookings.filter((b) => b.id !== reservationId));
    return { ok: true };
  }
  await http.post(`/admin/reservations/${reservationId}/reject`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Floor plan (Admin builder)
// ---------------------------------------------------------------------------

function floorPlanFromApi(fp) {
  return {
    id: fp.id,
    name: fp.name,
    level: fp.level,
    canvasWidth: fp.canvasWidth,
    canvasHeight: fp.canvasHeight,
    backgroundImageUrl: fp.backgroundImageUrl ?? null,
    elements: [...fp.tables.map(apiTableToElement), ...(fp.elements ?? []).map(apiElementToDecorative)],
  };
}

/**
 * Every floor plan (zone/room) for a venue, ordered by level, each with its own tables.
 * Pass `date`/`timeSlot` (the customer booking flow) to get each table's real availability
 * for that exact slot instead of the date-agnostic default the builder uses.
 */
export async function getFloorPlans(venueId, { date, timeSlot } = {}) {
  if (USE_MOCKS) {
    await wait(jitter());
    return loadJSON(floorPlansKey(venueId), null) ?? seedFloorPlans(venueId);
  }
  const { data } = await http.get(`/floorplans/${venueId}`, { params: { date, timeSlot } });
  return data.map(floorPlanFromApi);
}

/** Replaces a venue's entire multi-floor layout — every zone/room and its tables — at once. */
export async function saveLayout(venueId, floorPlans) {
  if (USE_MOCKS) {
    await wait(jitter());
    saveJSON(floorPlansKey(venueId), floorPlans);
    return floorPlans;
  }
  const { data } = await http.post("/floorplans/save-layout", {
    restaurantId: venueId,
    floorPlans: floorPlans.map((fp) => ({
      id: fp.id && GUID_PATTERN.test(fp.id) ? fp.id : undefined,
      name: fp.name,
      level: fp.level,
      backgroundImageUrl: fp.backgroundImageUrl,
      canvasWidth: fp.canvasWidth,
      canvasHeight: fp.canvasHeight,
      tables: fp.elements.filter((el) => TABLE_ELEMENT_TYPES.includes(el.type)).map(tableElementToApi),
      elements: fp.elements.filter((el) => !TABLE_ELEMENT_TYPES.includes(el.type)).map(decorativeElementToApi),
    })),
  });
  return data.map(floorPlanFromApi);
}

// ---------------------------------------------------------------------------
// Availability & booking (Customer view)
// ---------------------------------------------------------------------------

export async function getAvailability({ venueId, date, timeSlot, partySize, zone }) {
  if (USE_MOCKS) {
    await wait(jitter());
    const plans = loadJSON(floorPlansKey(venueId), null) ?? seedFloorPlans(venueId);
    const reservations = readReservations(venueId);
    const now = Date.now();

    const tables = plans
      .flatMap((fp) => fp.elements)
      .filter((el) => [ELEMENT_TYPES.ROUND_TABLE, ELEMENT_TYPES.SQUARE_TABLE, ELEMENT_TYPES.RECT_TABLE].includes(el.type))
      .filter((el) => (partySize ? el.capacity >= partySize : true))
      .filter((el) => (zone ? el.zone === zone : true))
      .map((el) => {
        const record = reservations[slotKey(el.id, date, timeSlot)];
        const expired = record?.holdExpiresAt && record.holdExpiresAt < now;
        const status = record && !expired ? record.status : STATUS.FREE;
        return { ...el, status };
      });

    return { tables };
  }

  // There's no dedicated GET /tables/availability endpoint — reuse the floor plans fetch,
  // passing date/timeSlot through so the backend computes each table's Status for that exact
  // slot (see FloorPlanService.ApplySlotAvailabilityAsync), flattened across every zone/room,
  // then apply the same partySize/zone filters client-side.
  const plans = await getFloorPlans(venueId, { date, timeSlot });
  const tables = plans
    .flatMap((fp) => fp.elements)
    .filter((el) => (partySize ? el.capacity >= partySize : true))
    .filter((el) => (zone ? el.zone === zone : true));
  return { tables };
}

/**
 * Simulates the concurrency-safe hold the C# API performs (a distributed
 * lock keyed on tableId, see Seatify.Infrastructure's ReservationService).
 * Throws a 409-shaped error if the slot is already held/booked, mirroring
 * the real API's contract.
 */
export async function holdTable({ venueId, tableId, date, timeSlot, partySize }) {
  if (USE_MOCKS) {
    await wait(jitter());
    const key = slotKey(tableId, date, timeSlot);
    const reservations = readReservations(venueId);
    const existing = reservations[key];
    const now = Date.now();
    const stillActive = existing && (!existing.holdExpiresAt || existing.holdExpiresAt > now);

    if (stillActive) {
      const error = new Error("This table was just taken for that time slot. Please choose another.");
      error.status = 409;
      throw error;
    }

    const reservationId = `res_${tableId}_${now}`;
    const holdExpiresAt = now + HOLD_TTL_MS;
    reservations[key] = { reservationId, tableId, date, timeSlot, partySize, status: STATUS.HELD, holdExpiresAt };
    writeReservations(venueId, reservations);
    scheduleAutoRelease(reservationId, venueId, key, tableId, date, timeSlot);
    publish({ type: "TableStatusChanged", venueId, tableId, date, timeSlot, status: STATUS.HELD });

    return { reservationId, tableId, date, timeSlot, status: STATUS.HELD, holdExpiresAt };
  }
  const { data } = await http.post("/reservations/hold", {
    tableId,
    reservationDate: date,
    timeSlot,
    partySize,
  });
  return { ...data, holdExpiresAt: new Date(data.holdExpiresAt).getTime() };
}

export async function cancelHold({ venueId, reservationId, tableId, date, timeSlot }) {
  if (USE_MOCKS) {
    await wait(jitter());
    const key = slotKey(tableId, date, timeSlot);
    const reservations = readReservations(venueId);
    if (reservations[key]?.reservationId === reservationId) {
      delete reservations[key];
      writeReservations(venueId, reservations);
    }
    clearTimeout(holdTimers.get(reservationId));
    holdTimers.delete(reservationId);
    publish({ type: "TableStatusChanged", venueId, tableId, date, timeSlot, status: STATUS.FREE });
    return { ok: true };
  }
  const { data } = await http.post(`/reservations/${reservationId}/cancel`);
  return data;
}

/**
 * Always mocked, regardless of USE_MOCKS: the .NET API in this project has no Stripe
 * Connect / payment-intent endpoint (POST /reservations/confirm takes an optional
 * `paymentReference` instead, as if payment were already handled upstream). This returns
 * a fake secret so the <PaymentElement /> / mock card form UI can still be exercised
 * end-to-end. Wire this up to a real payment endpoint if/when the API grows one.
 */
export async function createPaymentIntent({ reservationId, amount, currency = "azn" }) {
  await wait(jitter());
  return { clientSecret: `mock_secret_${reservationId}`, amount, currency };
}

export async function confirmBooking({
  venueId,
  restaurantName,
  reservationId,
  holdToken,
  tableId,
  tableLabel,
  zone,
  minDeposit,
  date,
  timeSlot,
  name,
  phone,
  guests,
  specialRequests,
}) {
  if (USE_MOCKS) {
    await wait(jitter());
    const key = slotKey(tableId, date, timeSlot);
    const reservations = readReservations(venueId);
    reservations[key] = {
      ...reservations[key],
      reservationId,
      status: STATUS.BOOKED,
      holdExpiresAt: null,
      guest: { name, phone, guests },
    };
    writeReservations(venueId, reservations);
    clearTimeout(holdTimers.get(reservationId));
    holdTimers.delete(reservationId);
    publish({ type: "TableStatusChanged", venueId, tableId, date, timeSlot, status: STATUS.BOOKED });

    const bookings = readBookings();
    const booking = {
      id: `bk_${venueId}_${tableId}_${Date.now()}`,
      venueId,
      restaurantName,
      reservationId,
      tableId,
      tableLabel,
      zone,
      minDeposit,
      date,
      timeSlot,
      guests,
      specialRequests: specialRequests || "",
      guestName: name,
      guestPhone: phone,
      status: "CONFIRMED",
      createdAt: Date.now(),
    };
    bookings.unshift(booking);
    writeBookings(bookings);

    return { ok: true, reservationId, booking };
  }

  const { data } = await http.post("/reservations/confirm", { reservationId, holdToken });

  // The API's Reservation entity doesn't persist guest contact info, special requests, or
  // zone — those are display-only conveniences here, filled in from what the client already
  // knows. They won't come back from a later GET /reservations/my-bookings refresh.
  const booking = {
    id: data.id,
    venueId,
    restaurantName: restaurantName ?? data.venueName,
    reservationId: data.id,
    tableId: data.tableId,
    tableLabel: data.tableLabel,
    zone: zone ?? "GENERAL",
    minDeposit: data.depositFee,
    date: data.reservationDate,
    timeSlot: data.timeSlot,
    guests: data.partySize,
    specialRequests: specialRequests || "",
    guestName: name,
    guestPhone: phone,
    status: data.status.toUpperCase(),
    createdAt: new Date(data.createdAt).getTime(),
  };

  return { ok: true, reservationId: data.id, booking };
}

// ---------------------------------------------------------------------------
// My Bookings (Customer view)
// ---------------------------------------------------------------------------

export async function getMyBookings() {
  if (USE_MOCKS) {
    await wait(jitter());
    return readBookings();
  }
  const { data } = await http.get("/reservations/my-bookings");
  return data.map((r) => ({
    id: r.id,
    venueId: r.venueId,
    restaurantName: r.venueName,
    reservationId: r.id,
    tableId: r.tableId,
    tableLabel: r.tableLabel,
    zone: "GENERAL", // not persisted by the API — see confirmBooking's remarks
    minDeposit: r.depositFee,
    date: r.reservationDate,
    timeSlot: r.timeSlot,
    guests: r.partySize,
    specialRequests: "",
    status: r.status.toUpperCase(),
    createdAt: new Date(r.createdAt).getTime(),
  }));
}

export async function cancelBooking({ bookingId }) {
  if (USE_MOCKS) {
    await wait(jitter());
    const bookings = readBookings();
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      const key = slotKey(booking.tableId, booking.date, booking.timeSlot);
      const reservations = readReservations(booking.venueId);
      if (reservations[key]?.reservationId === booking.reservationId) {
        delete reservations[key];
        writeReservations(booking.venueId, reservations);
        publish({ type: "TableStatusChanged", venueId: booking.venueId, tableId: booking.tableId, date: booking.date, timeSlot: booking.timeSlot, status: STATUS.FREE });
      }
    }
    writeBookings(bookings.filter((b) => b.id !== bookingId));
    return { ok: true };
  }
  await http.post(`/reservations/${bookingId}/cancel`);
  return { ok: true };
}
