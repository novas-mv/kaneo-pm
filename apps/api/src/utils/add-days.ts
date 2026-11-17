const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Move a date by whole days, keeping its UTC time of day. The server does not
 * know the viewer's time zone, so a span crossing a DST change keeps the UTC
 * clock time rather than the local one.
 */
export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}
