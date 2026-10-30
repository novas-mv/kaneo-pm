import { type CalendarEvent, eventDays, eventSlots } from "./mapping";

// Shapes the event Kaneo wants to write so it keeps what people set in Google.
// A timed task always writes its own times. For a date-only task, a timed event
// keeps its times while it still covers the task's days, and the snapshot then
// records those times so the next pull sees nothing new; when the days change
// it becomes all-day. An imported event keeps its own description.
export function fitToExisting(
  desired: CalendarEvent,
  existing: CalendarEvent | null,
  options: { timeZone: string; imported: boolean },
): CalendarEvent {
  if (!existing) return desired;
  const fitted = { ...desired };
  if (options.imported) fitted.description = existing.description;

  if (desired.start?.dateTime) {
    // A PATCH merges fields, so the all-day date must be cleared explicitly.
    if (existing.start?.date) {
      fitted.start = { ...desired.start, date: null };
      fitted.end = { ...desired.end, date: null };
    }
    return fitted;
  }

  const timed = Boolean(existing.start?.dateTime);
  if (!timed) return fitted;
  const current = eventDays(existing, options.timeZone);
  const wanted = eventDays(desired, options.timeZone);
  if (
    current &&
    wanted &&
    current.start === wanted.start &&
    current.due === wanted.due
  ) {
    fitted.start = existing.start;
    fitted.end = existing.end;
    const kept = eventSlots(existing, options.timeZone);
    const snapshot = desired.extendedProperties?.private;
    if (kept && snapshot) {
      fitted.extendedProperties = {
        ...desired.extendedProperties,
        private: { ...snapshot, kaneoStart: kept.start, kaneoDue: kept.due },
      };
    }
    return fitted;
  }
  fitted.start = { ...desired.start, dateTime: null, timeZone: null };
  fitted.end = { ...desired.end, dateTime: null, timeZone: null };
  return fitted;
}
