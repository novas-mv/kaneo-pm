import { and, asc, eq } from "drizzle-orm";
import db from "../../database";
import {
  columnTable,
  externalLinkTable,
  integrationTable,
  taskTable,
} from "../../database/schema";
import { publishEvent } from "../../events";
import { claimTaskNumber } from "../../task/controllers/claim-task-numbers";
import { nextTaskPosition } from "../../task/controllers/next-task-position";
import { CALENDAR_EVENT_LINK, linkedTaskId } from "./event-link";
import { isImportable, taskFieldsFromEvent } from "./import-event";
import type { CalendarEvent } from "./mapping";
import type { CalendarTarget } from "./sync-task";

// The event's own htmlLink names the calendar, which public boards would show.
const CALENDAR_URL = "https://calendar.google.com/calendar/";

// Creates the task and its link in one transaction, so the push that follows
// task.created finds the link and updates the Google event instead of adding
// a second one. Returns the new task id, or null when nothing was created.
export async function importEvent(
  event: CalendarEvent,
  target: CalendarTarget,
) {
  const eventId = event.id;
  const fields = taskFieldsFromEvent(event, target.config.timeZone);
  if (!eventId || !fields || !isImportable(event)) {
    return null;
  }
  const { projectId } = target;

  const task = await db.transaction(async (tx) => {
    // Serialises imports across API instances, and stops when the project was
    // disconnected or switched to another calendar during the run.
    const [binding] = await tx
      .select({ config: integrationTable.config })
      .from(integrationTable)
      .where(
        and(
          eq(integrationTable.id, target.integrationId),
          eq(integrationTable.projectId, projectId),
          eq(integrationTable.isActive, true),
        ),
      )
      .for("update");
    if (!binding) return null;
    const config = JSON.parse(binding.config) as { calendarId?: string };
    if (config.calendarId !== target.config.calendarId) return null;
    if (await linkedTaskId(target.integrationId, eventId, tx)) return null;

    // The project's first open column, as on a new board.
    const column = await tx.query.columnTable.findFirst({
      where: and(
        eq(columnTable.projectId, projectId),
        eq(columnTable.isFinal, false),
      ),
      orderBy: [asc(columnTable.position), asc(columnTable.id)],
    });
    const status = column?.slug ?? "to-do";
    const number = await claimTaskNumber(projectId, tx);
    const position = await nextTaskPosition(
      tx,
      projectId,
      status,
      column?.id ?? null,
    );
    const [created] = await tx
      .insert(taskTable)
      .values({
        projectId,
        title: fields.title,
        description: "",
        status,
        columnId: column?.id ?? null,
        startDate: fields.startDate,
        dueDate: fields.dueDate,
        number,
        position,
      })
      .returning();
    if (!created) throw new Error("Failed to create task from calendar event");
    await tx.insert(externalLinkTable).values({
      taskId: created.id,
      integrationId: target.integrationId,
      resourceType: CALENDAR_EVENT_LINK,
      externalId: eventId,
      url: CALENDAR_URL,
      title: "Google Calendar event",
    });
    return created;
  });
  if (!task) return null;

  await publishEvent("task.created", {
    ...task,
    taskId: task.id,
    userId: "",
    type: "created",
    content: null,
    source: "google-calendar",
  });
  return task.id;
}
