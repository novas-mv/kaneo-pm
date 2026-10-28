export type WallClock = { hour: number; minute: number; second: number };

export function dayInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function partsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

// How far the zone's wall clock is ahead of UTC at this instant.
function offsetMs(date: Date, timeZone: string) {
  const p = partsInZone(date, timeZone);
  const wallAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function instantOnDay(day: string, wall: WallClock, timeZone: string) {
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
  const wallAsUtc = Date.UTC(
    year,
    month - 1,
    date,
    wall.hour,
    wall.minute,
    wall.second,
  );
  // Two passes settle the offset when the target day sits across a DST change.
  const first = wallAsUtc - offsetMs(new Date(wallAsUtc), timeZone);
  return new Date(wallAsUtc - offsetMs(new Date(first), timeZone));
}

// Moves a task date to another calendar day in the zone, keeping its local time
// of day. With no existing date it lands at local noon, which stays on the
// intended day in every zone.
export function shiftToDay(
  existing: Date | null,
  day: string,
  timeZone: string,
) {
  const wall = existing
    ? partsInZone(existing, timeZone)
    : { hour: 12, minute: 0, second: 0 };
  return instantOnDay(day, wall, timeZone);
}
