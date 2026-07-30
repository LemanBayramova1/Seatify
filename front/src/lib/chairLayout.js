import { ELEMENT_TYPES } from "./zones";

const CHAIR_GAP = 16; // distance from the table edge to the chair center

function rotatePoint(x, y, deg) {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/**
 * Returns absolute canvas positions + facing rotation for the chairs around
 * a table, so seat count always matches guest capacity. Round tables get an
 * even radial spread; square/rect tables distribute chairs across the 4
 * edges proportionally to each edge's length (long sides get more seats).
 * `rotation` is the table's own rotation — chairs are computed in the
 * table's local space first, then rotated together with it.
 */
export function getChairPositions({ type, x, y, width, height, rotation = 0, capacity = 0 }) {
  if (!capacity || capacity <= 0) return [];

  if (type === ELEMENT_TYPES.ROUND_TABLE) {
    const radius = width / 2 + CHAIR_GAP;
    const chairs = [];
    for (let i = 0; i < capacity; i++) {
      const angleDeg = (360 / capacity) * i - 90;
      const angleRad = (angleDeg * Math.PI) / 180;
      const local = { x: radius * Math.cos(angleRad), y: radius * Math.sin(angleRad) };
      const rotated = rotatePoint(local.x, local.y, rotation);
      chairs.push({ x: x + rotated.x, y: y + rotated.y, rotation: angleDeg + rotation });
    }
    return chairs;
  }

  // Square / rect tables: proportionally distribute seats across the 4 edges.
  const halfW = width / 2;
  const halfH = height / 2;
  const sides = [
    { name: "top", length: width },
    { name: "right", length: height },
    { name: "bottom", length: width },
    { name: "left", length: height },
  ];
  const totalLength = 2 * (width + height);
  const raw = sides.map((s) => (capacity * s.length) / totalLength);
  const counts = raw.map(Math.floor);
  let remaining = capacity - counts.reduce((a, b) => a + b, 0);
  const byRemainder = raw.map((v, i) => ({ i, frac: v - counts[i] })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remaining; k++) counts[byRemainder[k % byRemainder.length].i] += 1;

  const chairs = [];
  sides.forEach((side, sideIndex) => {
    const count = counts[sideIndex];
    if (count <= 0) return;
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1); // even spacing, keeps chairs off the corners
      let local;
      let outwardAngle;
      switch (side.name) {
        case "top":
          local = { x: -halfW + t * width, y: -halfH - CHAIR_GAP };
          outwardAngle = -90;
          break;
        case "bottom":
          local = { x: -halfW + t * width, y: halfH + CHAIR_GAP };
          outwardAngle = 90;
          break;
        case "left":
          local = { x: -halfW - CHAIR_GAP, y: -halfH + t * height };
          outwardAngle = 180;
          break;
        default:
          local = { x: halfW + CHAIR_GAP, y: -halfH + t * height };
          outwardAngle = 0;
      }
      const rotated = rotatePoint(local.x, local.y, rotation);
      chairs.push({ x: x + rotated.x, y: y + rotated.y, rotation: outwardAngle + rotation });
    }
  });

  return chairs;
}
