import { expect, it } from "vite-plus/test";
import {
  isImportable,
  taskFieldsFromEvent,
  UNTITLED_EVENT,
} from "./import-event";
import { eventIdForTask } from "./mapping";
import { dayInZone } from "./zone";

const zone = "Indian/Maldives";
const event = {
  id: "abc123google",
  status: "confirmed",
  summary: "  Launch  ",
  start: { date: "2026-11-02" },
  end: { date: "2026-11-03" },
};

it("imports a live Google-made event", () => {
  expect(isImportable(event)).toBe(true);
  expect(
    isImportable({
      ...event,
      start: { dateTime: "2026-11-02T10:00:00+05:00" },
      end: { dateTime: "2026-11-02T11:00:00+05:00" },
    }),
  ).toBe(true);
});

it("skips cancelled, recurring and special events", () => {
  expect(isImportable({ ...event, status: "cancelled" })).toBe(false);
  expect(isImportable({ ...event, recurrence: ["RRULE:FREQ=DAILY"] })).toBe(
    false,
  );
  expect(isImportable({ ...event, recurringEventId: "series" })).toBe(false);
  expect(isImportable({ ...event, eventType: "outOfOffice" })).toBe(false);
  expect(isImportable({ ...event, id: undefined })).toBe(false);
});

it("skips events Kaneo made or wrote to before", () => {
  expect(isImportable({ ...event, id: eventIdForTask("task-1") })).toBe(false);
  const linked = {
    ...event,
    extendedProperties: { private: { kaneoIntegrationId: "other" } },
  };
  expect(isImportable(linked)).toBe(false);
});

it("maps a one-day event to a due date at local noon", () => {
  const fields = taskFieldsFromEvent(event, zone);
  expect(fields?.title).toBe("Launch");
  expect(fields?.startDate).toBeNull();
  expect(fields?.dueDate?.toISOString()).toBe("2026-11-02T07:00:00.000Z");
});

it("maps a multi-day event to start and due dates", () => {
  const fields = taskFieldsFromEvent(
    { ...event, end: { date: "2026-11-05" } },
    zone,
  );
  expect(fields?.startDate && dayInZone(fields.startDate, zone)).toBe(
    "2026-11-02",
  );
  expect(fields?.dueDate && dayInZone(fields.dueDate, zone)).toBe("2026-11-04");
});

it("falls back for an empty title and needs dates", () => {
  expect(taskFieldsFromEvent({ ...event, summary: " " }, zone)?.title).toBe(
    UNTITLED_EVENT,
  );
  expect(
    taskFieldsFromEvent({ id: "x", summary: "No dates" }, zone),
  ).toBeNull();
});

it("keeps a timed event's exact start and end", () => {
  const fields = taskFieldsFromEvent(
    {
      ...event,
      start: { dateTime: "2026-11-02T15:00:00+05:00" },
      end: { dateTime: "2026-11-02T16:00:00+05:00" },
    },
    zone,
  );
  expect(fields?.startDate?.toISOString()).toBe("2026-11-02T10:00:00.000Z");
  expect(fields?.dueDate?.toISOString()).toBe("2026-11-02T11:00:00.000Z");
});

it("maps a zero-length timed event to a due time only", () => {
  const at = { dateTime: "2026-11-02T15:00:00+05:00" };
  const fields = taskFieldsFromEvent({ ...event, start: at, end: at }, zone);
  expect(fields?.startDate).toBeNull();
  expect(fields?.dueDate?.toISOString()).toBe("2026-11-02T10:00:00.000Z");
});
