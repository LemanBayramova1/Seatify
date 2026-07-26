import * as signalR from "@microsoft/signalr";
import { API_STATUS_TO_STATUS } from "../lib/zones";

/**
 * Real-time table status feed. In mock mode this is a cross-tab BroadcastChannel
 * simulation (hold a table in one tab, a second tab open on the same booking page sees
 * it flip to "Held" live, without a real server). In real mode it's a genuine
 * `@microsoft/signalr` connection to TableStateHub — every caller (BookingMap) keeps the
 * same `publish`/`subscribe` API either way; only `joinVenue`/`leaveVenue` matter for
 * telling the real hub which venue's group to receive broadcasts for.
 */
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

const CHANNEL_NAME = "seatify-mock-realtime";
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;
const listeners = new Set();

if (channel) {
  channel.onmessage = (event) => {
    listeners.forEach((listener) => listener(event.data));
  };
}

/** @param {{ type: string, tableId: string, date: string, timeSlot: string, status: string }} event */
export function publish(event) {
  // BroadcastChannel never echoes back to its own sender, so this tab's
  // listeners are notified directly and other tabs get it via postMessage.
  listeners.forEach((listener) => listener(event));
  channel?.postMessage(event);
}

/** @returns {() => void} unsubscribe */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Real-mode hub connection — lazily started on the first joinVenue() call so
// mock mode (the default) never touches the network.
// ---------------------------------------------------------------------------
const hubUrl = `${(import.meta.env.VITE_API_URL ?? "https://localhost:5001/api").replace(/\/api\/?$/, "")}/hubs/table-state`;
const joinedVenues = new Set();
let connectionPromise = null;

function getConnection() {
  if (!connectionPromise) {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => localStorage.getItem("seatify.token") ?? "" })
      .withAutomaticReconnect()
      .build();

    connection.on("TableStatusChanged", (message) => {
      publish({
        type: "TableStatusChanged",
        venueId: message.venueId,
        tableId: message.tableId,
        status: API_STATUS_TO_STATUS[message.status] ?? message.status,
        holdExpiresAt: message.holdExpiresAt,
        date: message.reservationDate,
        timeSlot: message.timeSlot,
      });
    });

    // The server drops group membership on disconnect — rejoin whatever this
    // tab cared about once withAutomaticReconnect() brings the socket back.
    connection.onreconnected(() => {
      joinedVenues.forEach((venueId) => connection.invoke("JoinVenue", venueId).catch(() => {}));
    });

    connectionPromise = connection
      .start()
      .then(() => connection)
      .catch((err) => {
        connectionPromise = null;
        throw err;
      });
  }
  return connectionPromise;
}

/** Scopes incoming broadcasts to one venue's group. No-op in mock mode (BroadcastChannel already fans out globally; callers filter by venueId themselves). */
export async function joinVenue(venueId) {
  if (USE_MOCKS || !venueId) return;
  joinedVenues.add(venueId);
  try {
    const connection = await getConnection();
    await connection.invoke("JoinVenue", venueId);
  } catch {
    // Best-effort: a booking page still works off the initial GET fetch if the hub is unreachable.
  }
}

export async function leaveVenue(venueId) {
  if (USE_MOCKS || !venueId) return;
  joinedVenues.delete(venueId);
  try {
    const connection = await getConnection();
    await connection.invoke("LeaveVenue", venueId);
  } catch {
    // Ignore — the connection may already be closed on unmount.
  }
}
