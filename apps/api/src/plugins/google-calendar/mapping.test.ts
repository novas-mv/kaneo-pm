import { expect, it } from "vite-plus/test";
import {
  buildEvent,
  eventDays,
  eventIdForTask,
  eventMatches,
  taskDays,
  taskIdFromEventId,
} from "./mapping";

const zone = "Indian/Maldives";
const base = { id: "t1", title: "Post", description: null };
const options = {
  timeZone: zone,
  integrationId: "i1",
  projectName: "VARA",
  statusName: "Idea",
  taskUrl: "https://kaneo.test/t1",
};

it("round-trips task ids through event ids using only allowed characters", () => {
  const id = eventIdForTask("clx9Zq0abc");
  expect(id).toMatch(/^[0-9a-v]+$/);
  expect(taskIdFromEventId(id)).toBe("clx9Zq0abc");
  expect(taskIdFromEventId("someoneelses")).toBeNull();
  expect(taskIdFromEventId("kaneoxyz")).toBeNull();
});

it("uses the local day, not the UTC day", () => {
  // 19:00 UTC on 1 Nov is already 2 Nov in the Maldives (UTC+5).
  const dueDate = new Date("2026-11-01T19:00:00Z");
  expect(taskDays({ ...base, startDate: null, dueDate }, zone)).toEqual({
    start: "2026-11-02",
    due: "2026-11-02",
  });
});

it("has no event without any date", () => {
  expect(
    taskDays({ ...base, startDate: null, dueDate: null }, zone),
  ).toBeNull();
  expect(
    buildEvent({ ...base, startDate: null, dueDate: null }, options),
  ).toBeNull();
});

it("builds an all-day event with an exclusive end", () => {
  const event = buildEvent(
    {
      ...base,
      startDate: new Date("2026-11-01T07:00:00Z"),
      dueDate: new Date("2026-11-07T07:00:00Z"),
    },
    options,
  );
  expect(event?.start).toEqual({ date: "2026-11-01" });
  expect(event?.end).toEqual({ date: "2026-11-08" });
  expect(event?.extendedProperties?.private?.kaneoTaskId).toBe("t1");
});

it("treats a due date before the start date as a one-day event", () => {
  expect(
    taskDays(
      {
        ...base,
        startDate: new Date("2026-11-05T07:00:00Z"),
        dueDate: new Date("2026-11-02T07:00:00Z"),
      },
      zone,
    ),
  ).toEqual({ start: "2026-11-05", due: "2026-11-05" });
});

it("reads event days back as an inclusive range", () => {
  expect(
    eventDays({ start: { date: "2026-11-01" }, end: { date: "2026-11-08" } }),
  ).toEqual({ start: "2026-11-01", due: "2026-11-07" });
  expect(
    eventDays({
      start: { dateTime: "2026-11-01T10:00:00Z" },
      end: { dateTime: "2026-11-01T11:00:00Z" },
    }),
  ).toBeNull();
});

it("only treats an unchanged live event as matching", () => {
  const desired = buildEvent(
    { ...base, startDate: null, dueDate: new Date("2026-11-02T07:00:00Z") },
    options,
  );
  if (!desired) throw new Error("expected an event");
  expect(eventMatches({ ...desired }, desired)).toBe(true);
  expect(eventMatches({ ...desired, summary: "Renamed" }, desired)).toBe(false);
  expect(eventMatches({ ...desired, status: "cancelled" }, desired)).toBe(
    false,
  );
});
