export const TIME_SLOTS = ["12:00-14:00", "14:00-16:00", "19:00-21:00", "21:00-23:00"];

/** Today's calendar date in the browser's LOCAL timezone, as "yyyy-MM-dd". Deliberately not
 * `new Date().toISOString().slice(0,10)` — toISOString() always converts to UTC, which drifts
 * a day off local "today" for part of the day in every timezone that isn't UTC+0 (e.g. still
 * "yesterday" in UTC while it's already tomorrow locally, or vice versa), incorrectly marking
 * every time slot as past/future around local midnight. */
export function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** True once `slot`'s start time has already passed — only meaningful for today's date; any
 * other date is never "past" here (an actually past date is blocked separately via the date
 * input's `min`). */
export function isSlotPast(date, slot, now = new Date()) {
  if (date !== todayIso()) return false;
  const [startTime] = slot.split("-");
  const [hours, minutes] = startTime.split(":").map(Number);
  const slotStart = new Date(now);
  slotStart.setHours(hours, minutes, 0, 0);
  return slotStart.getTime() <= now.getTime();
}

/** First slot (in `slots`' order) that isn't past yet for `date` — falls back to the last slot
 * if every slot for today has already passed. */
export function firstAvailableSlot(date, slots = TIME_SLOTS) {
  return slots.find((slot) => !isSlotPast(date, slot)) ?? slots[slots.length - 1];
}
