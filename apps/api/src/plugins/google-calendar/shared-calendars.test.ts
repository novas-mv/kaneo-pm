import { expect, it } from "vite-plus/test";
import { calendarIdOf, sharedCalendarIds } from "./shared-calendars";

const row = (calendarId: string) => ({
  config: JSON.stringify({ calendarId }),
});

it("finds calendars connected to more than one project", () => {
  const shared = sharedCalendarIds([
    row("team@group.calendar.google.com"),
    row(" Team@group.calendar.google.com"),
    row("other@group.calendar.google.com"),
  ]);
  expect([...shared]).toEqual(["team@group.calendar.google.com"]);
});

it("ignores rows without a readable calendar id", () => {
  expect(calendarIdOf("not json")).toBeNull();
  expect(calendarIdOf("{}")).toBeNull();
  expect(sharedCalendarIds([{ config: "{}" }, { config: "{}" }]).size).toBe(0);
});
