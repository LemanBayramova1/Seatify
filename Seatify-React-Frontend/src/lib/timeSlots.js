export const TIME_SLOTS = ["12:00-14:00", "14:00-16:00", "19:00-21:00", "21:00-23:00"];

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
