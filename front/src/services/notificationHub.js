import * as signalR from "@microsoft/signalr";

/**
 * Live push feed for NotificationHub — delivers a `NotificationDto` the instant the backend
 * creates one (new review, new booking, etc.), so the bell updates without waiting for its
 * 30s poll. No-op in mock mode, since mock notifications never come from a server push.
 */
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

const hubUrl = `${(import.meta.env.VITE_API_URL ?? "https://localhost:5001/api").replace(/\/api\/?$/, "")}/hubs/notifications`;

let connectionPromise = null;

function getConnection() {
  if (!connectionPromise) {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => localStorage.getItem("seatify.token") ?? "" })
      .withAutomaticReconnect()
      .build();

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

/**
 * Subscribes to live notification pushes. Returns an unsubscribe function. Best-effort — the
 * caller's own polling loop is the fallback if the hub is unreachable.
 * @param {(notification: object) => void} onNotification
 */
export function subscribeToNotifications(onNotification) {
  if (USE_MOCKS) {
    return () => {};
  }

  let cancelled = false;

  getConnection()
    .then((connection) => {
      if (cancelled) return;
      connection.on("ReceiveNotification", onNotification);
    })
    .catch(() => {
      // Ignore — bell keeps working off its poll interval.
    });

  return () => {
    cancelled = true;
    connectionPromise?.then((connection) => connection.off("ReceiveNotification", onNotification)).catch(() => {});
  };
}
