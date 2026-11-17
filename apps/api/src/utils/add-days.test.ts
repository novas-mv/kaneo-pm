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

  it("keeps local midnight on its day across a DST change in the time zone", () => {
    // 2 April 00:00 in Berlin (CEST); Berlin left CET on 29 March.
    const postDate = new Date("2026-04-01T22:00:00.000Z");
    expect(addDays(postDate, -7, "Europe/Berlin").toISOString()).toBe(
      "2026-03-25T23:00:00.000Z",
    );
    expect(addDays(postDate, -7).toISOString()).toBe(
      "2026-03-25T22:00:00.000Z",
    );
  });
});
