import { type CalendarEvent, eventSlots, taskIdFromEventId } from "./mapping";
import { slotToDate } from "./slot";

export const UNTITLED_EVENT = "(No title)";

// A Google-made event becomes a task when it is live, single and has never
// been linked to a Kaneo task. Recurring series and special types such as
// out-of-office do not fit one task.
export function isImportable(event: CalendarEvent) {
  if (!event.id || event.status === "cancelled") return false;
  if (event.recurrence?.length || event.recurringEventId) return false;
  if (event.eventType && event.eventType !== "default") return false;
  // Kaneo made it, in this project or another one sharing the calendar.
  if (taskIdFromEventId(event.id)) return false;
  // Kaneo wrote to it before: it belongs to another project, or its task was
  // deleted or moved away. Neither should come back as a new task.
  return !event.extendedProperties?.private?.kaneoIntegrationId;
}

// One day, or a zero-length timed event, gives a due date only. A longer span
// gives start and due dates, the same shape a task pushed to Google has. A
// timed event keeps its exact start and end; all-day dates land at local noon.
export function taskFieldsFromEvent(event: CalendarEvent, timeZone: string) {
  const slots = eventSlots(event, timeZone);
  if (!slots) return null;
  return {
    title: event.summary?.trim() || UNTITLED_EVENT,
    startDate:
      slots.start === slots.due
        ? null
        : slotToDate(slots.start, null, timeZone),
    dueDate: slotToDate(slots.due, null, timeZone),
  };
}
