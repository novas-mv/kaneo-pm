import {
  type CalendarEvent,
  type CalendarTask,
  eventSlots,
  taskSlots,
  titleHash,
} from "./mapping";
import { isInstant, sameSlot, slotBefore } from "./slot";

// Start and due are slots: a day for an all-day event, or an instant for a
// timed one. untimed is set when Google made a timed event all-day.
export type GoogleEdits = {
  title?: string;
  start?: string;
  due?: string;
  untimed?: boolean;
};

// Decides which fields to take from Google. A field counts as edited in Google
// when the event differs from the snapshot Kaneo last wrote, and a field edited
// in Kaneo since then always wins. Events without a snapshot predate sync and
// are left alone until Kaneo writes one. A timed event gives exact instants;
// the zone only decides the days of all-day events.
export function planGoogleEdits(
  event: CalendarEvent,
  task: CalendarTask,
  timeZone: string,
): GoogleEdits {
  const snapshot = event.extendedProperties?.private ?? {};
  const { kaneoTitleHash, kaneoStart, kaneoDue } = snapshot;
  if (!kaneoTitleHash || !kaneoStart || !kaneoDue) return {};

  const edits: GoogleEdits = {};

  const summary = event.summary?.trim();
  if (
    summary &&
    titleHash(summary) !== kaneoTitleHash &&
    titleHash(task.title) === kaneoTitleHash
  ) {
    edits.title = summary;
  }

  const wanted = eventSlots(event, timeZone);
  const current = taskSlots(task, timeZone);
  if (!wanted || !current) return edits;

  if (
    wanted.start !== kaneoStart &&
    sameSlot(current.start, kaneoStart, timeZone)
  ) {
    edits.start = wanted.start;
  }
  if (wanted.due !== kaneoDue && sameSlot(current.due, kaneoDue, timeZone)) {
    edits.due = wanted.due;
  }

  const start = edits.start ?? current.start;
  const due = edits.due ?? current.due;
  if (!task.startDate) {
    // A single-date task only gets a start date once the event spans time.
    if (start === due) delete edits.start;
    else edits.start = start;
  }
  if (slotBefore(due, start, timeZone)) edits.due = start;

  if ((edits.start || edits.due) && !wanted.timed && isInstant(kaneoDue)) {
    edits.untimed = true;
  }
  return edits;
}
