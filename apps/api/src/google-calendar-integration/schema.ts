import { z } from "../openapi";

export const saveGoogleCalendarBody = z.object({
  calendarId: z.string().min(1).openapi({
    description:
      "The calendar's ID from its Google Calendar settings, such as an address ending in group.calendar.google.com.",
  }),
  timeZone: z.string().optional().openapi({
    description:
      "IANA time zone used to decide which day a task date falls on. Defaults to Indian/Maldives.",
  }),
});
