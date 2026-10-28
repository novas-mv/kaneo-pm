import { z } from "../openapi";

export const googleCalendarIntegrationSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  calendarId: z.string(),
  timeZone: z.string(),
  lastSyncAt: z.string().nullable(),
  lastError: z.string().nullable(),
  isActive: z.boolean().nullable(),
});

export const googleCalendarStatusSchema = z.object({
  configured: z.boolean().openapi({
    description:
      "Whether this Kaneo instance has a Google service account configured.",
  }),
  serviceAccountEmail: z.string().nullable().openapi({
    description: "The address the calendar must be shared with.",
  }),
  integration: googleCalendarIntegrationSchema.nullable(),
});
