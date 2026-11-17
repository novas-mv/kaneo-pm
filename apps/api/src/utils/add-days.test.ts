import { describe, expect, it } from "vite-plus/test";
import { addDays } from "./add-days";

describe("addDays", () => {
  it("moves forward and keeps the time of day", () => {
    expect(addDays(new Date("2026-03-10T09:30:00.000Z"), 2).toISOString()).toBe(
      "2026-03-12T09:30:00.000Z",
    );
  });

  it("moves backward across a month boundary", () => {
    expect(
      addDays(new Date("2026-03-01T18:00:00.000Z"), -2).toISOString(),
    ).toBe("2026-02-27T18:00:00.000Z");
  });

  it("returns an equal date for zero days", () => {
    const date = new Date("2026-03-10T09:30:00.000Z");
    expect(addDays(date, 0).getTime()).toBe(date.getTime());
  });
});
