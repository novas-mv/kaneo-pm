import { dayInZone, shiftToDay } from "./zone";

// A slot is one end of a task's span as Google holds it: a day such as
// "2026-11-02" for all-day values, or an exact instant in ISO 8601 UTC such as
// "2026-11-02T10:00:00.000Z" for timed ones.

function wallClockIn(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

// Tasks store an instant even when people only picked a day. Kaneo writes those
// at local midnight or local noon in the project zone, and plain date strings
// sent to the API land at midnight UTC. Any other time counts as a time of day.
export function isDayOnly(date: Date, timeZone: string) {
  if (date.getUTCMilliseconds() !== 0) return false;
  if (date.toISOString().endsWith("T00:00:00.000Z")) return true;
  const wall = wallClockIn(date, timeZone);
  return wall === "00:00:00" || wall === "12:00:00";
}

export function isInstant(slot: string) {
  return slot.includes("T");
}

export function slotDay(slot: string, timeZone: string) {
  return isInstant(slot) ? dayInZone(new Date(slot), timeZone) : slot;
}

export function slotBefore(a: string, b: string, timeZone: string) {
  if (isInstant(a) && isInstant(b)) return Date.parse(a) < Date.parse(b);
  return slotDay(a, timeZone) < slotDay(b, timeZone);
}

// Whether the task still holds what Kaneo last wrote. A day and an instant on
// that day count as the same: the snapshot then comes from an event whose
// times Kaneo kept, or from an all-day event written before timed sync.
export function sameSlot(current: string, snapshot: string, timeZone: string) {
  if (isInstant(current) === isInstant(snapshot)) return current === snapshot;
  return slotDay(current, timeZone) === slotDay(snapshot, timeZone);
}

// Turns a slot from Google into a task date. An instant is stored as is. A day
// keeps the old value's local time, unless the event just stopped being timed:
// then a timed value drops its time and lands at local noon.
export function slotToDate(
  slot: string,
  existing: Date | null,
  timeZone: string,
  { dropTime = false }: { dropTime?: boolean } = {},
) {
  if (isInstant(slot)) return new Date(slot);
  const keep =
    existing && (!dropTime || isDayOnly(existing, timeZone)) ? existing : null;
  return shiftToDay(keep, slot, timeZone);
}
