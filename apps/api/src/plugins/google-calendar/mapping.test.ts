import { describe, expect, it } from "vite-plus/test";
import {
  buildEvent,
  eventDays,
  eventIdForTask,
  eventMatches,
  eventSlots,
  taskDays,
  taskIdFromEventId,
  taskSlots,
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
    eventDays(
      { start: { date: "2026-11-01" }, end: { date: "2026-11-08" } },
      zone,
    ),
  ).toEqual({ start: "2026-11-01", due: "2026-11-07" });
});

it("reads a timed event as the local days it covers", () => {
  // 20:00 UTC on 1 Nov is 01:00 on 2 Nov in the Maldives (UTC+5).
  expect(
    eventDays(
      {
        start: { dateTime: "2026-11-01T20:00:00Z" },
        end: { dateTime: "2026-11-01T21:00:00Z" },
      },
      zone,
    ),
  ).toEqual({ start: "2026-11-02", due: "2026-11-02" });
  // Ending at local midnight does not reach the next day.
  expect(
    eventDays(
      {
        start: { dateTime: "2026-11-02T10:00:00+05:00" },
        end: { dateTime: "2026-11-04T00:00:00+05:00" },
      },
      zone,
    ),
  ).toEqual({ start: "2026-11-02", due: "2026-11-03" });
  expect(eventDays({ start: { dateTime: "nope" } }, zone)).toBeNull();
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

describe("timed tasks", () => {
  // 15:00 in the Maldives.
  const at15 = new Date("2026-11-02T10:00:00Z");

  it("builds a timed event at the exact instant", () => {
    const event = buildEvent(
      { ...base, startDate: null, dueDate: at15 },
      options,
    );
    expect(event?.start).toEqual({ dateTime: "2026-11-02T10:00:00.000Z" });
    expect(event?.end).toEqual({ dateTime: "2026-11-02T10:00:00.000Z" });
    expect(event?.extendedProperties?.private).toMatchObject({
      kaneoStart: "2026-11-02T10:00:00.000Z",
      kaneoDue: "2026-11-02T10:00:00.000Z",
    });
  });

  it("spans start to due, and a time on one end makes both exact", () => {
    const startDate = new Date("2026-11-01T19:00:00Z"); // local midnight
    expect(taskSlots({ ...base, startDate, dueDate: at15 }, zone)).toEqual({
      start: "2026-11-01T19:00:00.000Z",
      due: "2026-11-02T10:00:00.000Z",
      timed: true,
    });
  });

  it("does not let the project zone shift a timed event", () => {
    const event = buildEvent(
      { ...base, startDate: null, dueDate: at15 },
      { ...options, timeZone: "America/Los_Angeles" },
    );
    expect(event?.start?.dateTime).toBe("2026-11-02T10:00:00.000Z");
  });

  it("keeps date-only tasks all-day", () => {
    for (const dueDate of [
      new Date("2026-11-01T19:00:00Z"), // local midnight
      new Date("2026-11-02T07:00:00Z"), // local noon
      new Date("2026-11-02T00:00:00Z"), // a plain date sent to the API
    ]) {
      expect(
        taskSlots({ ...base, startDate: null, dueDate }, zone)?.timed,
      ).toBe(false);
    }
  });

  it("reads a timed Google event as exact instants", () => {
    expect(
      eventSlots(
        {
          start: { dateTime: "2026-11-02T15:00:00+05:00" },
          end: { dateTime: "2026-11-02T16:00:00+05:00" },
        },
        zone,
      ),
    ).toEqual({
      start: "2026-11-02T10:00:00.000Z",
      due: "2026-11-02T11:00:00.000Z",
      timed: true,
    });
    expect(
      eventSlots(
        { start: { date: "2026-11-02" }, end: { date: "2026-11-03" } },
        zone,
      ),
    ).toEqual({ start: "2026-11-02", due: "2026-11-02", timed: false });
  });

  it("matches a timed event Google returns in another offset", () => {
    const desired = buildEvent(
      { ...base, startDate: null, dueDate: at15 },
      options,
    );
    if (!desired) throw new Error("expected an event");
    const fromGoogle = {
      ...desired,
      start: { dateTime: "2026-11-02T15:00:00+05:00", timeZone: zone },
      end: { dateTime: "2026-11-02T15:00:00+05:00", timeZone: zone },
    };
    expect(eventMatches(fromGoogle, desired)).toBe(true);
    expect(
      eventMatches(
        { ...fromGoogle, end: { dateTime: "2026-11-02T16:00:00+05:00" } },
        desired,
      ),
    ).toBe(false);
  });
});

describe("Asia/Kuala_Lumpur payloads", () => {
  const kl = { ...options, timeZone: "Asia/Kuala_Lumpur" };

  it("sends a day picked in a KL browser as an all-day date pair", () => {
    // The web date picker stores local midnight: 3 Nov 00:00 +08:00.
    const event = buildEvent(
      { ...base, startDate: null, dueDate: new Date("2026-11-02T16:00:00Z") },
      kl,
    );
    expect(event?.start).toEqual({ date: "2026-11-03" });
    expect(event?.end).toEqual({ date: "2026-11-04" });
  });

  it("sends a timed task as RFC 3339 instants, end not before start", () => {
    const event = buildEvent(
      {
        ...base,
        startDate: new Date("2026-11-03T09:00:00+08:00"),
        dueDate: new Date("2026-11-03T10:30:00+08:00"),
      },
      kl,
    );
    const rfc3339 =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
    expect(event?.start?.dateTime).toMatch(rfc3339);
    expect(event?.end?.dateTime).toMatch(rfc3339);
    expect(event?.start?.date).toBeUndefined();
    expect(Date.parse(event?.start?.dateTime ?? "")).toBe(
      Date.parse("2026-11-03T01:00:00Z"),
    );
    expect(Date.parse(event?.end?.dateTime ?? "")).toBeGreaterThan(
      Date.parse(event?.start?.dateTime ?? ""),
    );
  });
});
