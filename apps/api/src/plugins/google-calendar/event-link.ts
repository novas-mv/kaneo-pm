import { and, eq } from "drizzle-orm";
import db from "../../database";
import { externalLinkTable } from "../../database/schema";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// Links a task to a Google-made event it was imported from. Kaneo-made events
// need no link because their id is derived from the task id.
export const CALENDAR_EVENT_LINK = "google_calendar_event";

export async function linkedTaskId(
  integrationId: string,
  eventId: string,
  database: DbOrTx = db,
) {
  const link = await database.query.externalLinkTable.findFirst({
    columns: { taskId: true },
    where: and(
      eq(externalLinkTable.integrationId, integrationId),
      eq(externalLinkTable.resourceType, CALENDAR_EVENT_LINK),
      eq(externalLinkTable.externalId, eventId),
    ),
  });
  return link?.taskId ?? null;
}

export async function linkedEventId(taskId: string, integrationId: string) {
  const link = await db.query.externalLinkTable.findFirst({
    columns: { externalId: true },
    where: and(
      eq(externalLinkTable.taskId, taskId),
      eq(externalLinkTable.integrationId, integrationId),
      eq(externalLinkTable.resourceType, CALENDAR_EVENT_LINK),
    ),
  });
  return link?.externalId ?? null;
}

// Event ids only mean something in their own calendar.
export async function dropCalendarLinks(integrationId: string) {
  await db
    .delete(externalLinkTable)
    .where(
      and(
        eq(externalLinkTable.integrationId, integrationId),
        eq(externalLinkTable.resourceType, CALENDAR_EVENT_LINK),
      ),
    );
}
