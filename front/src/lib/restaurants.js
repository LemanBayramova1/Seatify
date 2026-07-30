import { ELEMENT_TYPES } from "./zones";

const { ROUND_TABLE, SQUARE_TABLE, RECT_TABLE, STAGE, WINDOW, DOOR, ZONE_LABEL } = ELEMENT_TYPES;

function tableSize(type, capacity) {
  if (type === ROUND_TABLE) return capacity <= 2 ? 78 : capacity <= 4 ? 100 : 130;
  if (type === SQUARE_TABLE) return capacity <= 4 ? 100 : 120;
  if (capacity <= 6) return { width: 160, height: 90 };
  if (capacity <= 8) return { width: 190, height: 100 };
  return { width: 220, height: 100 };
}

let tableSeq = 0;
function table(type, x, y, capacity, zone, minDeposit, overrides = {}) {
  tableSeq += 1;
  const size = tableSize(type, capacity);
  const dims = typeof size === "number" ? { width: size, height: size } : size;
  return {
    id: `t${tableSeq}`,
    type,
    x,
    y,
    rotation: 0,
    label: `T${tableSeq}`,
    capacity,
    minDeposit,
    zone,
    ...dims,
    ...overrides,
  };
}

function label(id, x, y, width, text) {
  return { id, type: ZONE_LABEL, x, y, width, rotation: 0, label: text };
}

function windowDecor(id, x, y, width = 140) {
  return { id, type: WINDOW, x, y, width, height: 16, rotation: 0, label: "Window" };
}

function doorDecor(id, x, y) {
  return { id, type: DOOR, x, y, width: 60, height: 16, rotation: 0, label: "Entrance" };
}

function resetTableSeq() {
  tableSeq = 0;
}

resetTableSeq();
const sultanSeed = [
  label("zl-1", 140, 30, 220, "Terrace Area"),
  label("zl-2", 430, 30, 220, "Main Hall"),
  label("zl-3", 730, 30, 200, "VIP Section"),
  table(ROUND_TABLE, 100, 110, 2, "TERRACE", 20),
  table(ROUND_TABLE, 220, 110, 2, "TERRACE", 20),
  table(SQUARE_TABLE, 380, 140, 4, "GENERAL", 35),
  table(SQUARE_TABLE, 520, 140, 4, "GENERAL", 35),
  table(RECT_TABLE, 430, 320, 6, "GENERAL", 55),
  table(RECT_TABLE, 720, 160, 8, "VIP", 95),
  table(ROUND_TABLE, 760, 340, 2, "VIP", 45),
  windowDecor("w-1", 40, 560, 140),
  doorDecor("d-1", 430, 560),
];

resetTableSeq();
const bellaSeed = [
  label("zl-1", 130, 30, 220, "Window Row"),
  label("zl-2", 430, 30, 220, "Main Hall"),
  label("zl-3", 740, 30, 200, "Bar Counter"),
  table(ROUND_TABLE, 90, 110, 2, "WINDOW", 18),
  table(ROUND_TABLE, 90, 240, 2, "WINDOW", 18),
  table(ROUND_TABLE, 90, 370, 2, "WINDOW", 18),
  table(SQUARE_TABLE, 300, 130, 4, "GENERAL", 30),
  table(SQUARE_TABLE, 460, 130, 4, "GENERAL", 30),
  table(RECT_TABLE, 380, 340, 6, "GENERAL", 50),
  table(SQUARE_TABLE, 740, 150, 4, "BAR", 25),
  table(SQUARE_TABLE, 740, 300, 4, "BAR", 25),
  windowDecor("w-1", 40, 40, 16),
  doorDecor("d-1", 500, 560),
];

resetTableSeq();
const bakuLoungeSeed = [
  label("zl-1", 700, 30, 220, "Stage"),
  label("zl-2", 400, 30, 220, "Main Hall"),
  label("zl-3", 120, 30, 220, "Quiet Corner"),
  { id: "stage-1", type: STAGE, x: 720, y: 150, width: 200, height: 100, rotation: 0, label: "Stage" },
  table(ROUND_TABLE, 100, 130, 2, "QUIET_CORNER", 22),
  table(ROUND_TABLE, 100, 260, 2, "QUIET_CORNER", 22),
  table(SQUARE_TABLE, 260, 380, 4, "QUIET_CORNER", 32),
  table(SQUARE_TABLE, 420, 150, 4, "GENERAL", 30),
  table(RECT_TABLE, 420, 340, 6, "GENERAL", 55),
  table(ROUND_TABLE, 620, 340, 4, "GENERAL", 40),
  table(SQUARE_TABLE, 760, 380, 4, "STAGE", 45),
  windowDecor("w-1", 40, 560, 140),
  doorDecor("d-1", 430, 40),
];

resetTableSeq();
const narSeed = [
  label("zl-1", 130, 30, 220, "Terrace Area"),
  label("zl-2", 430, 30, 220, "Window Row"),
  label("zl-3", 730, 30, 200, "VIP Section"),
  table(ROUND_TABLE, 100, 120, 2, "TERRACE", 25),
  table(ROUND_TABLE, 100, 260, 2, "TERRACE", 25),
  table(RECT_TABLE, 140, 400, 6, "TERRACE", 60),
  table(SQUARE_TABLE, 380, 130, 4, "WINDOW", 35),
  table(SQUARE_TABLE, 380, 280, 4, "WINDOW", 35),
  table(ROUND_TABLE, 420, 420, 2, "WINDOW", 28),
  table(RECT_TABLE, 700, 160, 8, "VIP", 100),
  table(ROUND_TABLE, 760, 380, 4, "VIP", 55),
  windowDecor("w-1", 380, 40, 160),
  doorDecor("d-1", 60, 560),
];

resetTableSeq();
const marinaSeed = [
  label("zl-1", 130, 30, 220, "Terrace Area"),
  label("zl-2", 430, 30, 220, "Main Hall"),
  label("zl-3", 740, 30, 200, "Bar Counter"),
  table(ROUND_TABLE, 90, 130, 2, "TERRACE", 24),
  table(ROUND_TABLE, 210, 130, 2, "TERRACE", 24),
  table(RECT_TABLE, 150, 340, 6, "TERRACE", 58),
  table(SQUARE_TABLE, 420, 150, 4, "GENERAL", 32),
  table(RECT_TABLE, 430, 340, 8, "GENERAL", 70),
  table(SQUARE_TABLE, 740, 150, 4, "BAR", 26),
  table(SQUARE_TABLE, 740, 300, 4, "BAR", 26),
  table(ROUND_TABLE, 740, 430, 2, "BAR", 20),
  windowDecor("w-1", 40, 560, 140),
  doorDecor("d-1", 430, 560),
];

resetTableSeq();
const sakuraSeed = [
  label("zl-1", 130, 30, 220, "Bar Counter"),
  label("zl-2", 430, 30, 220, "Main Hall"),
  label("zl-3", 730, 30, 220, "Quiet Corner"),
  table(SQUARE_TABLE, 100, 140, 4, "BAR", 28),
  table(SQUARE_TABLE, 100, 290, 4, "BAR", 28),
  table(ROUND_TABLE, 220, 420, 2, "BAR", 20),
  table(ROUND_TABLE, 400, 140, 2, "WINDOW", 24),
  table(RECT_TABLE, 430, 320, 6, "GENERAL", 52),
  table(ROUND_TABLE, 560, 140, 2, "WINDOW", 24),
  table(SQUARE_TABLE, 740, 160, 4, "QUIET_CORNER", 34),
  table(ROUND_TABLE, 760, 380, 2, "QUIET_CORNER", 26),
  windowDecor("w-1", 480, 40, 180),
  doorDecor("d-1", 60, 560),
];

export const RESTAURANTS = [
  {
    id: "sultan-steakhouse",
    name: "Sultan Steakhouse",
    cover: "https://picsum.photos/seed/sultan-steakhouse/800/500",
    rating: 4.9,
    reviewCount: 214,
    address: "28 May küç. 12, Bakı",
    cuisines: ["Steakhouse", "Grill"],
    zonesOffered: ["TERRACE", "GENERAL", "VIP"],
    floorPlanSeed: sultanSeed,
  },
  {
    id: "bella-italia",
    name: "Bella Italia",
    cover: "https://picsum.photos/seed/bella-italia/800/500",
    rating: 4.7,
    reviewCount: 156,
    address: "Nizami küç. 45, Bakı",
    cuisines: ["Italian", "Pizza"],
    zonesOffered: ["WINDOW", "GENERAL", "BAR"],
    floorPlanSeed: bellaSeed,
  },
  {
    id: "baku-lounge",
    name: "Baku Lounge",
    cover: "https://picsum.photos/seed/baku-lounge/800/500",
    rating: 4.8,
    reviewCount: 98,
    address: "Fəvvarələr Meydanı 3, Bakı",
    cuisines: ["National", "Lounge"],
    zonesOffered: ["STAGE", "GENERAL", "QUIET_CORNER"],
    floorPlanSeed: bakuLoungeSeed,
  },
  {
    id: "nar-restaurant",
    name: "Nar Restaurant",
    cover: "https://picsum.photos/seed/nar-restaurant/800/500",
    rating: 4.9,
    reviewCount: 261,
    address: "Xətai rayonu, H. Əliyev pr. 78, Bakı",
    cuisines: ["National", "Fine Dining"],
    zonesOffered: ["TERRACE", "WINDOW", "VIP"],
    floorPlanSeed: narSeed,
  },
  {
    id: "marina-grill",
    name: "Marina Grill & Bar",
    cover: "https://picsum.photos/seed/marina-grill/800/500",
    rating: 4.6,
    reviewCount: 87,
    address: "Bulvar, Neftçilər pr. 152, Bakı",
    cuisines: ["Seafood", "Grill"],
    zonesOffered: ["TERRACE", "GENERAL", "BAR"],
    floorPlanSeed: marinaSeed,
  },
  {
    id: "sakura-sushi",
    name: "Sakura Sushi",
    cover: "https://picsum.photos/seed/sakura-sushi/800/500",
    rating: 4.8,
    reviewCount: 142,
    address: "28 Mall, Yasamal, Bakı",
    cuisines: ["Japanese", "Sushi"],
    zonesOffered: ["BAR", "WINDOW", "QUIET_CORNER"],
    floorPlanSeed: sakuraSeed,
  },
];

export function getRestaurant(venueId) {
  return RESTAURANTS.find((r) => r.id === venueId) ?? null;
}
