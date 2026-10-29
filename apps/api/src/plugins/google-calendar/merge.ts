import {
  type CalendarEvent,
  type CalendarTask,
  eventDays,
  taskDays,
  titleHash,
} from "./mapping";

export type GoogleEdits = { title?: string; start?: string; due?: string };

// Decides which fields to take from Google. A field counts as edited in Google
// when the event differs from the snapshot Kaneo last wrote, and a field edited
// in Kaneo since then always wins. Events without a snapshot predate sync and
// are left alone until Kaneo writes one.
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

  const wanted = eventDays(event);
  const current = taskDays(task, timeZone);
  if (!wanted || !current) return edits;

  if (wanted.start !== kaneoStart && current.start === kaneoStart) {
    edits.start = wanted.start;
  }
  if (wanted.due !== kaneoDue && current.due === kaneoDue) {
    edits.due = wanted.due;
  }

  const start = edits.start ?? current.start;
  const due = edits.due ?? current.due;
  if (!task.startDate) {
    // A single-date task only gets a start date once the event spans days.
    if (start === due) delete edits.start;
    else edits.start = start;
  }
  if (due < start) edits.due = start;

  return edits;
}
