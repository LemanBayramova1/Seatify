import axios from "axios";
import { publish } from "./realtimeBus";
import { API_STATUS_TO_STATUS, ELEMENT_TYPES, STATUS, TABLE_ELEMENT_TYPES } from "../lib/zones";
import { getRestaurant, RESTAURANTS } from "../lib/restaurants";

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
// elements (stage/window/door/zone labels) are an editor-only convenience and
// are dropped before saving to the real backend.
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
  return {
    id: GUID_PATTERN.test(el.id) ? el.id : undefined,
    label: el.label,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation ?? 0,
    shape: SHAPE_TO_API[el.type] ?? "Rectangle",
    zone: el.zone,
    capacity: el.capacity ?? 0,
    depositFee: el.minDeposit ?? 0,
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
const floorPlanKey = (venueId) => `seatify.mock.floorplan.v1.${venueId}`;
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

function seedFloorPlan(venueId) {
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
  const plan = { id: `${venueId}-floor-plan`, elements };
  saveJSON(floorPlanKey(venueId), plan);
  return plan;
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

// The API's Venue entity has no cuisine/rating/cover fields yet — fill in
// sensible display defaults so the marketplace UI (built against the richer
// mock catalog shape) renders real venues without changes.
function apiVenueToRestaurant(v, zonesOffered = []) {
  return {
    id: v.id,
    name: v.name,
    cover: v.imageUrl || `https://picsum.photos/seed/${v.id}/800/500`,
    rating: 4.5,
    address: v.address,
    cuisines: [],
    zonesOffered,
  };
}

async function zonesOfferedFor(venueId) {
  const plan = await getFloorPlan(venueId);
  return Array.from(new Set(plan.elements.map((el) => el.zone).filter(Boolean)));
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

// ---------------------------------------------------------------------------
// Floor plan (Admin builder)
// ---------------------------------------------------------------------------

export async function getFloorPlan(venueId) {
  if (USE_MOCKS) {
    await wait(jitter());
    return loadJSON(floorPlanKey(venueId), null) ?? seedFloorPlan(venueId);
  }
  try {
    const { data } = await http.get(`/venues/${venueId}/floorplan`);
    return { id: data.id, elements: data.tables.map(apiTableToElement) };
  } catch (err) {
    if (err.response?.status === 404) {
      // Brand-new Restaurant Owner: a Venue exists (auto-created at registration) but no
      // FloorPlan yet — the API only creates one on the first save.
      return { id: null, elements: [] };
    }
    throw err;
  }
}

export async function saveFloorPlan(venueId, elements) {
  if (USE_MOCKS) {
    await wait(jitter());
    const plan = { id: `${venueId}-floor-plan`, elements };
    saveJSON(floorPlanKey(venueId), plan);
    return plan;
  }
  const tables = elements.filter((el) => TABLE_ELEMENT_TYPES.includes(el.type)).map(tableElementToApi);
  const { data } = await http.post(`/venues/${venueId}/floorplan`, {
    name: "Main Floor",
    canvasWidth: 1000,
    canvasHeight: 700,
    tables,
  });
  return { id: data.id, elements: data.tables.map(apiTableToElement) };
}

// ---------------------------------------------------------------------------
// Availability & booking (Customer view)
// ---------------------------------------------------------------------------

export async function getAvailability({ venueId, date, timeSlot, partySize, zone }) {
  if (USE_MOCKS) {
    await wait(jitter());
    const plan = loadJSON(floorPlanKey(venueId), null) ?? seedFloorPlan(venueId);
    const reservations = readReservations(venueId);
    const now = Date.now();

    const tables = plan.elements
      .filter((el) => [ELEMENT_TYPES.ROUND_TABLE, ELEMENT_TYPES.SQUARE_TABLE, ELEMENT_TYPES.RECT_TABLE].includes(el.type))
      .filter((el) => (partySize ? el.capacity >= partySize : true))
      .filter((el) => (zone ? el.zone === zone : true))
      .map((el) => {
        const record = reservations[slotKey(el.id, date, timeSlot)];
        const expired = record?.holdExpiresAt && record.holdExpiresAt < now;
        const status = record && !expired ? record.status : STATUS.FREE;
        return { ...el, status };
      });

    return { floorPlanId: plan.id, tables };
  }

  // The API models one live status per table (Available/Held/Booked), not per-slot
  // availability — there's no GET /tables/availability endpoint. Reuse the floor plan
  // fetch (which already carries each table's current status) and apply the same
  // partySize/zone filters client-side; `date`/`timeSlot` only travel along at hold time,
  // for the reservation's own record.
  const plan = await getFloorPlan(venueId);
  const tables = plan.elements
    .filter((el) => (partySize ? el.capacity >= partySize : true))
    .filter((el) => (zone ? el.zone === zone : true));
  return { floorPlanId: plan.id, tables };
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
