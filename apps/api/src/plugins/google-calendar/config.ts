import * as v from "valibot";

export const googleCalendarConfigSchema = v.object({
  calendarId: v.pipe(v.string(), v.trim(), v.minLength(1)),
  timeZone: v.pipe(
    v.string(),
    v.check((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Unknown time zone"),
  ),
  syncToken: v.optional(v.string()),
  lastSyncAt: v.optional(v.string()),
  lastError: v.optional(v.string()),
});

export type GoogleCalendarConfig = v.InferOutput<
  typeof googleCalendarConfigSchema
>;

export const DEFAULT_TIME_ZONE = "Indian/Maldives";

export async function validateGoogleCalendarConfig(
  config: unknown,
): Promise<{ valid: boolean; errors?: string[] }> {
  const result = v.safeParse(googleCalendarConfigSchema, config);
  if (result.success) return { valid: true };
  return { valid: false, errors: result.issues.map((issue) => issue.message) };
}
