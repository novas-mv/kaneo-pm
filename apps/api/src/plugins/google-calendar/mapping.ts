import { createHash } from "node:crypto";
import { dayInZone } from "./zone";

export type CalendarTask = {
  id: string;
  title: string;
  description: string | null;
  startDate: Date | null;
  dueDate: Date | null;
};

export type CalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  updated?: string;
  extendedProperties?: { private?: Record<string, string> };
};

const EVENT_ID_PREFIX = "kaneo";

// Google event ids only allow a-v and 0-9, so the task id is hex-encoded. The
// same task always maps to the same event, which makes pushes idempotent.
export function eventIdForTask(taskId: string) {
  return EVENT_ID_PREFIX + Buffer.from(taskId, "utf8").toString("hex");
}

export function titleHash(title: string) {
  return createHash("sha256").update(title.trim()).digest("hex").slice(0, 16);
}

export function taskIdFromEventId(eventId: string) {
  if (!eventId.startsWith(EVENT_ID_PREFIX)) return null;
  const hex = eventId.slice(EVENT_ID_PREFIX.length);
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) return null;
  return Buffer.from(hex, "hex").toString("utf8");
}

function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      86_400_000,
  );
}

// Inclusive first and last day, matching the iCal feed: a task with only one
// date is a one-day event, and a due date before the start date collapses to it.
export function taskDays(task: CalendarTask, timeZone: string) {
  const scheduled = task.startDate ?? task.dueDate;
  if (!scheduled) return null;
  const start = dayInZone(scheduled, timeZone);
  const due = dayInZone(task.dueDate ?? scheduled, timeZone);
  return { start, due: due < start ? start : due };
}

export function buildEvent(
  task: CalendarTask,
  options: {
    timeZone: string;
    integrationId: string;
    projectName: string;
    statusName: string | null;
    taskUrl: string;
  },
): CalendarEvent | null {
  const days = taskDays(task, options.timeZone);
  if (!days) return null;
  const description = [
    `Project: ${options.projectName}`,
    options.statusName ? `Status: ${options.statusName}` : null,
    options.taskUrl,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    id: eventIdForTask(task.id),
    summary: task.title,
    description,
    start: { date: days.start },
    // Google's all-day end date is exclusive.
    end: { date: addDays(days.due, 1) },
    // What Kaneo last wrote. Comparing the event against it later shows which
    // fields someone changed in Google, as opposed to fields that are merely old.
    extendedProperties: {
      private: {
        kaneoTaskId: task.id,
        kaneoIntegrationId: options.integrationId,
        kaneoTitleHash: titleHash(task.title),
        kaneoStart: days.start,
        kaneoDue: days.due,
      },
    },
  };
}

const SNAPSHOT_KEYS = ["kaneoTitleHash", "kaneoStart", "kaneoDue"] as const;

export function eventMatches(existing: CalendarEvent, desired: CalendarEvent) {
  return (
    existing.status !== "cancelled" &&
    existing.summary === desired.summary &&
    existing.description === desired.description &&
    existing.start?.date === desired.start?.date &&
    existing.end?.date === desired.end?.date &&
    SNAPSHOT_KEYS.every(
      (key) =>
        existing.extendedProperties?.private?.[key] ===
        desired.extendedProperties?.private?.[key],
    )
  );
}

// Inclusive first and last day of an all-day event, or null for timed events
// and anything else Kaneo cannot represent as a task date range.
export function eventDays(event: CalendarEvent) {
  const start = event.start?.date;
  const end = event.end?.date;
  if (!start || !end) return null;
  const due = addDays(end, -1);
  return { start, due: due < start ? start : due };
}
