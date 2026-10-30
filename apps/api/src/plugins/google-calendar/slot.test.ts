import { expect, it } from "vite-plus/test";
import { isDayOnly, sameSlot, slotBefore, slotToDate } from "./slot";

const zone = "Indian/Maldives";

it("treats local midnight, local noon and UTC midnight as date-only", () => {
  expect(isDayOnly(new Date("2026-11-01T19:00:00Z"), zone)).toBe(true);
  expect(isDayOnly(new Date("2026-11-02T07:00:00Z"), zone)).toBe(true);
  expect(isDayOnly(new Date("2026-11-02T00:00:00Z"), zone)).toBe(true);
  expect(isDayOnly(new Date("2026-11-02T10:00:00Z"), zone)).toBe(false);
  expect(isDayOnly(new Date("2026-11-02T07:00:00.500Z"), zone)).toBe(false);
});

it("compares a day and an instant by the day", () => {
  expect(sameSlot("2026-11-02", "2026-11-02T10:00:00.000Z", zone)).toBe(true);
  expect(sameSlot("2026-11-03", "2026-11-02T10:00:00.000Z", zone)).toBe(false);
  expect(
    sameSlot("2026-11-02T11:00:00.000Z", "2026-11-02T10:00:00.000Z", zone),
  ).toBe(false);
  expect(
    slotBefore("2026-11-02T09:00:00.000Z", "2026-11-02T10:00:00.000Z", zone),
  ).toBe(true);
  expect(slotBefore("2026-11-02", "2026-11-02T10:00:00.000Z", zone)).toBe(
    false,
  );
});

it("stores an instant as is and moves a day keeping the local time", () => {
  expect(slotToDate("2026-11-02T10:00:00.000Z", null, zone).toISOString()).toBe(
    "2026-11-02T10:00:00.000Z",
  );
  const at15 = new Date("2026-11-02T10:00:00Z");
  expect(slotToDate("2026-11-04", at15, zone).toISOString()).toBe(
    "2026-11-04T10:00:00.000Z",
  );
  // Google made the event all-day: the time goes, the date lands at noon.
  expect(
    slotToDate("2026-11-04", at15, zone, { dropTime: true }).toISOString(),
  ).toBe("2026-11-04T07:00:00.000Z");
});
