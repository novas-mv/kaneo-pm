import { expect, it } from "vite-plus/test";
import { dayInZone, shiftToDay } from "./zone";

it("keeps the local time of day when moving to another day", () => {
  const existing = new Date("2026-11-02T07:00:00Z");
  expect(
    shiftToDay(existing, "2026-11-05", "Indian/Maldives").toISOString(),
  ).toBe("2026-11-05T07:00:00.000Z");
});

it("lands on the right day across a DST change", () => {
  // Local midnight on 5 Apr in Berlin (CEST), moved to 21 Mar (CET).
  const moved = shiftToDay(
    new Date("2026-04-04T22:00:00Z"),
    "2026-03-21",
    "Europe/Berlin",
  );
  expect(moved.toISOString()).toBe("2026-03-20T23:00:00.000Z");
  expect(dayInZone(moved, "Europe/Berlin")).toBe("2026-03-21");
});

it("uses local noon when there is no existing date, in any zone", () => {
  for (const zone of [
    "Pacific/Auckland",
    "America/Los_Angeles",
    "Indian/Maldives",
  ]) {
    expect(dayInZone(shiftToDay(null, "2026-11-05", zone), zone)).toBe(
      "2026-11-05",
    );
  }
});
