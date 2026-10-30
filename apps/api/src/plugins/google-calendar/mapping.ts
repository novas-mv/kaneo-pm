import { createHash } from "node:crypto";
import { isDayOnly } from "./slot";
import { dayInZone } from "./zone";

export type CalendarTask = {
  id: string;
  title: string;
  description: string | null;
  startDate: Date | null;
  dueDate: Date | null;
};

// Null clears a field in a PATCH, which switches an event between all-day and
// timed.
export type EventTime = {
  date?: string | null;
  dateTime?: string | null;
  timeZone?: string | null;
};

export type CalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: EventTime;
  end?: EventTime;
  updated?: string;
  eventType?: string;
  recurrence?: string[];
  recurringEventId?: string;
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

export type TaskSlots = { start: string; due: string; timed: boolean };

// The task's span as Google holds it. Date-only values give days. A time of day
// on either value makes both ends exact instants, since an event is all-day or
// timed as a whole.
export function taskSlots(
  task: CalendarTask,
  timeZone: string,
): TaskSlots | null {
  const scheduled = task.startDate ?? task.dueDate;
  if (!scheduled) return null;
  const due = task.dueDate ?? scheduled;
  if (isDayOnly(scheduled, timeZone) && isDayOnly(due, timeZone)) {
    const days = taskDays(task, timeZone);
    return days && { ...days, timed: false };
  }
  const end = due < scheduled ? scheduled : due;
  return {
    start: scheduled.toISOString(),
    due: end.toISOString(),
    timed: true,
  };
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
  const slots = taskSlots(task, options.timeZone);
  if (!slots) return null;
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
    // A timed event holds exact instants, so Google shows each viewer their
    // own local time. A task with one timed value is a zero-length event.
    ...(slots.timed
      ? { start: { dateTime: slots.start }, end: { dateTime: slots.due } }
      : // Google's all-day end date is exclusive.
        { start: { date: slots.start }, end: { date: addDays(slots.due, 1) } }),
    // What Kaneo last wrote. Comparing the event against it later shows which
    // fields someone changed in Google, as opposed to fields that are merely old.
    extendedProperties: {
      private: {
        kaneoTaskId: task.id,
        kaneoIntegrationId: options.integrationId,
        kaneoTitleHash: titleHash(task.title),
        kaneoStart: slots.start,
        kaneoDue: slots.due,
      },
    },
  };
}

const SNAPSHOT_KEYS = ["kaneoTitleHash", "kaneoStart", "kaneoDue"] as const;

function instantOf(dateTime: string | null | undefined) {
  return dateTime ? Date.parse(dateTime) : null;
}

// Google answers with the calendar's offset, so instants compare by value.
function sameTime(a: EventTime | undefined, b: EventTime | undefined) {
  return (
    (a?.date ?? null) === (b?.date ?? null) &&
    instantOf(a?.dateTime) === instantOf(b?.dateTime)
  );
}

export function eventMatches(existing: CalendarEvent, desired: CalendarEvent) {
  return (
    existing.status !== "cancelled" &&
    existing.summary === desired.summary &&
    existing.description === desired.description &&
    sameTime(existing.start, desired.start) &&
    sameTime(existing.end, desired.end) &&
    SNAPSHOT_KEYS.every(
      (key) =>
        existing.extendedProperties?.private?.[key] ===
        desired.extendedProperties?.private?.[key],
    )
  );
}

// Inclusive first and last day of an event. A timed event covers the days it
// touches in the zone; one that ends at midnight does not reach the next day.
export function eventDays(event: CalendarEvent, timeZone: string) {
  const startDay = event.start?.date;
  const endDay = event.end?.date;
  if (startDay && endDay) {
    const due = addDays(endDay, -1);
    return { start: startDay, due: due < startDay ? startDay : due };
  }
  const startAt = Date.parse(event.start?.dateTime ?? "");
  const endAt = Date.parse(event.end?.dateTime ?? "");
  if (Number.isNaN(startAt) || Number.isNaN(endAt)) return null;
  const start = dayInZone(new Date(startAt), timeZone);
  const due = dayInZone(new Date(Math.max(startAt, endAt - 1)), timeZone);
  return { start, due: due < start ? start : due };
}

// The event's span in the same shape as taskSlots: days for an all-day event,
// exact instants for a timed one.
export function eventSlots(
  event: CalendarEvent,
  timeZone: string,
): TaskSlots | null {
  if (event.start?.date && event.end?.date) {
    const days = eventDays(event, timeZone);
    return days && { ...days, timed: false };
  }
  const startAt = Date.parse(event.start?.dateTime ?? "");
  const endAt = Date.parse(event.end?.dateTime ?? "");
  if (Number.isNaN(startAt) || Number.isNaN(endAt)) return null;
  return {
    start: new Date(startAt).toISOString(),
    due: new Date(Math.max(startAt, endAt)).toISOString(),
    timed: true,
  };
}
