export const TIME_SLOTS = ["12:00-14:00", "14:00-16:00", "19:00-21:00", "21:00-23:00"];

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
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
