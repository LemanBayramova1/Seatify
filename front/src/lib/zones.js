export const ZONES = [
  { id: "VIP", color: "#f5b23a" },
  { id: "WINDOW", color: "#38bdf8" },
  { id: "STAGE", color: "#f472b6" },
  { id: "QUIET_CORNER", color: "#a78bfa" },
  { id: "BAR", color: "#fbbf24" },
  { id: "TERRACE", color: "#34d399" },
  { id: "GENERAL", color: "#94a3b8" },
];

export function zoneColor(zoneId) {
  return ZONES.find((z) => z.id === zoneId)?.color ?? ZONES[ZONES.length - 1].color;
}

export const ELEMENT_TYPES = {
  ROUND_TABLE: "ROUND_TABLE",
  SQUARE_TABLE: "SQUARE_TABLE",
  RECT_TABLE: "RECT_TABLE",
  STAGE: "STAGE",
  WINDOW: "WINDOW",
  DOOR: "DOOR",
  WALL: "WALL",
  BAR_KITCHEN: "BAR_KITCHEN",
  ZONE_LABEL: "ZONE_LABEL",
};

export const TABLE_ELEMENT_TYPES = [
  ELEMENT_TYPES.ROUND_TABLE,
  ELEMENT_TYPES.SQUARE_TABLE,
  ELEMENT_TYPES.RECT_TABLE,
];

// Render/z-order for the canvas: lower first (drawn behind). Walls sit at the very back,
// tables always draw in front of every architectural element.
const Z_ORDER = {
  [ELEMENT_TYPES.WALL]: 0,
  [ELEMENT_TYPES.ZONE_LABEL]: 1,
  [ELEMENT_TYPES.WINDOW]: 1,
  [ELEMENT_TYPES.DOOR]: 1,
  [ELEMENT_TYPES.STAGE]: 2,
  [ELEMENT_TYPES.BAR_KITCHEN]: 2,
  [ELEMENT_TYPES.ROUND_TABLE]: 3,
  [ELEMENT_TYPES.SQUARE_TABLE]: 3,
  [ELEMENT_TYPES.RECT_TABLE]: 3,
};

export function sortByZOrder(elements) {
  return elements.map((el, i) => [el, i]).sort(([a, ai], [b, bi]) => (Z_ORDER[a.type] ?? 1) - (Z_ORDER[b.type] ?? 1) || ai - bi).map(([el]) => el);
}

export const STATUS = {
  FREE: "FREE",
  HELD: "HELD",
  BOOKED: "BOOKED",
};

// Core fill colors per live table status.
export const STATUS_COLOR = {
  FREE: "#10b981",
  HELD: "#f59e0b",
  BOOKED: "#e11d48",
};

// Glow/stroke colors — slightly brighter than the fill for a neon rim effect.
export const STATUS_GLOW = {
  FREE: "#34d399",
  HELD: "#fbbf24",
  BOOKED: "#fb7185",
};

// Electric-blue used for the locally-selected table ring, independent of server status.
export const SELECTION_COLOR = "#3b82f6";
export const SELECTION_GLOW = "#60a5fa";

// Maps the real API's Table.Status / TableStatusChanged.status strings ("Available",
// "Held", "Booked") onto the editor's own STATUS constants. Shared by apiService.js and
// realtimeBus.js so both agree on what a live SignalR event or floor-plan fetch means.
export const API_STATUS_TO_STATUS = {
  Available: STATUS.FREE,
  Held: STATUS.HELD,
  Booked: STATUS.BOOKED,
};
