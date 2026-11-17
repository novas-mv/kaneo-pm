import { TZDate } from "@date-fns/tz";
import { addDays as addCalendarDays } from "date-fns";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Move a date by whole days. With the viewer's IANA `timeZone`, the local
 * wall-clock time is kept, so a date at local midnight stays on its day across
 * a DST change. Without one, the UTC time of day is kept.
 */
export function addDays(date: Date, days: number, timeZone?: string) {
  if (!timeZone) return new Date(date.getTime() + days * DAY_MS);
  return new Date(
    addCalendarDays(new TZDate(date.getTime(), timeZone), days).getTime(),
  );
}
