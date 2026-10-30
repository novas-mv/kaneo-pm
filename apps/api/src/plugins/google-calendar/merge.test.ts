import { describe, expect, it } from "vite-plus/test";
import { planGoogleEdits } from "./merge";
import { buildEvent, type CalendarTask } from "./mapping";

const zone = "Indian/Maldives";
const options = {
  timeZone: zone,
  integrationId: "i1",
  projectName: "VARA",
  statusName: null,
  taskUrl: "https://kaneo.test/t1",
};
const task = (patch: Partial<CalendarTask> = {}): CalendarTask => ({
  id: "t1",
  title: "Post",
  description: null,
  startDate: null,
  dueDate: new Date("2026-11-02T07:00:00Z"),
  ...patch,
});
const pushed = (t: CalendarTask) => {
  const event = buildEvent(t, options);
  if (!event) throw new Error("expected an event");
  return event;
};

it("takes nothing when the event is exactly what Kaneo pushed", () => {
  expect(planGoogleEdits(pushed(task()), task(), zone)).toEqual({});
});

it("takes a title edited in Google", () => {
  const event = { ...pushed(task()), summary: "Renamed" };
  expect(planGoogleEdits(event, task(), zone)).toEqual({ title: "Renamed" });
});

it("keeps a title edited in Kaneo over the stale one in Google", () => {
  const event = pushed(task());
  expect(planGoogleEdits(event, task({ title: "New in Kaneo" }), zone)).toEqual(
    {},
  );
});

it("does not revert a Kaneo date edit when only the title changed in Google", () => {
  const event = { ...pushed(task()), summary: "Renamed" };
  const edited = task({ dueDate: new Date("2026-11-09T07:00:00Z") });
  expect(planGoogleEdits(event, edited, zone)).toEqual({ title: "Renamed" });
});

it("moves a single-date task when the whole event moves", () => {
  const event = {
    ...pushed(task()),
    start: { date: "2026-11-05" },
    end: { date: "2026-11-06" },
  };
  expect(planGoogleEdits(event, task(), zone)).toEqual({ due: "2026-11-05" });
});

it("gives a single-date task a start date when the event is stretched", () => {
  const event = {
    ...pushed(task()),
    end: { date: "2026-11-05" },
  };
  expect(planGoogleEdits(event, task(), zone)).toEqual({
    start: "2026-11-02",
    due: "2026-11-04",
  });
});

it("takes both dates for a task that already has a range", () => {
  const ranged = task({ startDate: new Date("2026-11-01T07:00:00Z") });
  const event = {
    ...pushed(ranged),
    start: { date: "2026-11-03" },
    end: { date: "2026-11-04" },
  };
  expect(planGoogleEdits(event, ranged, zone)).toEqual({
    start: "2026-11-03",
    due: "2026-11-03",
  });
});

it("ignores events with no snapshot", () => {
  const plain = { ...pushed(task()), extendedProperties: undefined };
  expect(planGoogleEdits({ ...plain, summary: "X" }, task(), zone)).toEqual({});
});

it("takes the exact times when Google makes an all-day event timed", () => {
  const event = {
    ...pushed(task()),
    start: { dateTime: "2026-11-02T10:00:00+05:00" },
    end: { dateTime: "2026-11-02T11:00:00+05:00" },
  };
  expect(planGoogleEdits(event, task(), zone)).toEqual({
    start: "2026-11-02T05:00:00.000Z",
    due: "2026-11-02T06:00:00.000Z",
  });
});

describe("timed tasks", () => {
  // 15:00 in the Maldives.
  const timedTask = task({ dueDate: new Date("2026-11-02T10:00:00Z") });

  it("takes nothing when the timed event is what Kaneo pushed", () => {
    const event = {
      ...pushed(timedTask),
      // Google answers in the calendar's offset.
      start: { dateTime: "2026-11-02T15:00:00+05:00", timeZone: zone },
      end: { dateTime: "2026-11-02T15:00:00+05:00", timeZone: zone },
    };
    expect(planGoogleEdits(event, timedTask, zone)).toEqual({});
  });

  it("moves a timed single-date task to the new time", () => {
    const event = {
      ...pushed(timedTask),
      start: { dateTime: "2026-11-03T17:30:00+05:00" },
      end: { dateTime: "2026-11-03T17:30:00+05:00" },
    };
    expect(planGoogleEdits(event, timedTask, zone)).toEqual({
      due: "2026-11-03T12:30:00.000Z",
    });
  });

  it("gives a start time when the event is stretched", () => {
    const event = {
      ...pushed(timedTask),
      end: { dateTime: "2026-11-02T16:00:00+05:00" },
    };
    expect(planGoogleEdits(event, timedTask, zone)).toEqual({
      start: "2026-11-02T10:00:00.000Z",
      due: "2026-11-02T11:00:00.000Z",
    });
  });

  it("drops the time when Google makes the event all-day", () => {
    const event = {
      ...pushed(timedTask),
      start: { date: "2026-11-04" },
      end: { date: "2026-11-05" },
    };
    expect(planGoogleEdits(event, timedTask, zone)).toEqual({
      due: "2026-11-04",
      untimed: true,
    });
  });

  it("keeps a time added in Kaneo over the stale all-day event", () => {
    const event = pushed(task());
    expect(planGoogleEdits(event, timedTask, zone)).toEqual({});
  });

  it("keeps a Kaneo time edit when Google only renamed the event", () => {
    const event = { ...pushed(timedTask), summary: "Renamed" };
    const edited = task({ dueDate: new Date("2026-11-02T11:00:00Z") });
    expect(planGoogleEdits(event, edited, zone)).toEqual({ title: "Renamed" });
  });
});

it("reads an old all-day snapshot against a task that has a time", () => {
  // Kaneo pushed all-day events before timed sync, even for timed tasks.
  const timedTask = task({ dueDate: new Date("2026-11-02T10:00:00Z") });
  const event = {
    ...pushed(task()),
    start: { date: "2026-11-05" },
    end: { date: "2026-11-06" },
  };
  expect(planGoogleEdits(event, timedTask, zone)).toEqual({
    due: "2026-11-05",
  });
});
