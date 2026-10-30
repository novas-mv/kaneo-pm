import { expect, it } from "vite-plus/test";
import { fitToExisting } from "./fit-event";
import { type CalendarEvent, eventMatches } from "./mapping";

const zone = "Indian/Maldives";
const desired: CalendarEvent = {
  id: "abc",
  summary: "Launch",
  description: "Project: VARA",
  start: { date: "2026-11-02" },
  end: { date: "2026-11-03" },
};
const timed: CalendarEvent = {
  ...desired,
  description: "Agenda from Google",
  start: { dateTime: "2026-11-02T10:00:00+05:00", timeZone: zone },
  end: { dateTime: "2026-11-02T11:00:00+05:00", timeZone: zone },
};

it("writes the desired event when none exists", () => {
  expect(fitToExisting(desired, null, { timeZone: zone, imported: true })).toBe(
    desired,
  );
});

it("keeps a timed event's times while its day matches the task", () => {
  const fitted = fitToExisting(desired, timed, {
    timeZone: zone,
    imported: true,
  });
  expect(fitted.start).toEqual(timed.start);
  expect(fitted.description).toBe("Agenda from Google");
  // Nothing to write, so the pull does not bounce the event back.
  expect(eventMatches(timed, fitted)).toBe(true);
});

it("makes a timed event all-day once the task moves to another day", () => {
  const moved = {
    ...desired,
    start: { date: "2026-11-05" },
    end: { date: "2026-11-06" },
  };
  const fitted = fitToExisting(moved, timed, {
    timeZone: zone,
    imported: true,
  });
  expect(fitted.start).toEqual({
    date: "2026-11-05",
    dateTime: null,
    timeZone: null,
  });
  expect(fitted.end).toEqual({
    date: "2026-11-06",
    dateTime: null,
    timeZone: null,
  });
});

it("keeps Kaneo's description on events Kaneo made", () => {
  const existing = { ...desired, description: "Edited in Google" };
  expect(
    fitToExisting(desired, existing, { timeZone: zone, imported: false })
      .description,
  ).toBe("Project: VARA");
});

it("writes a timed task's own times and clears the all-day date", () => {
  const timedDesired: CalendarEvent = {
    ...desired,
    start: { dateTime: "2026-11-02T10:00:00.000Z" },
    end: { dateTime: "2026-11-02T10:00:00.000Z" },
  };
  const fitted = fitToExisting(timedDesired, desired, {
    timeZone: zone,
    imported: false,
  });
  expect(fitted.start).toEqual({
    dateTime: "2026-11-02T10:00:00.000Z",
    date: null,
  });
  expect(fitted.end).toEqual({
    dateTime: "2026-11-02T10:00:00.000Z",
    date: null,
  });
  // A timed event is never kept in place of the task's times.
  expect(
    fitToExisting(timedDesired, timed, { timeZone: zone, imported: false })
      .start,
  ).toEqual(timedDesired.start);
});

it("records the kept times in the snapshot", () => {
  const withSnapshot: CalendarEvent = {
    ...desired,
    extendedProperties: {
      private: {
        kaneoTitleHash: "h",
        kaneoStart: "2026-11-02",
        kaneoDue: "2026-11-02",
      },
    },
  };
  const fitted = fitToExisting(withSnapshot, timed, {
    timeZone: zone,
    imported: true,
  });
  expect(fitted.extendedProperties?.private).toEqual({
    kaneoTitleHash: "h",
    kaneoStart: "2026-11-02T05:00:00.000Z",
    kaneoDue: "2026-11-02T06:00:00.000Z",
  });
});
