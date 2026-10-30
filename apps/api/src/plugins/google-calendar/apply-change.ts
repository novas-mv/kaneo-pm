import { and, eq } from "drizzle-orm";
import db from "../../database";
import { taskTable } from "../../database/schema";
import { publishEvent } from "../../events";
import {
  publishTaskMutation,
  recordTaskMutation,
} from "../../task/controllers/task-mutation-effects";
import { linkedTaskId } from "./event-link";
import { importEvent } from "./import-task";
import { type CalendarEvent, eventIdForTask } from "./mapping";
import { planGoogleEdits } from "./merge";
import { type CalendarTarget, syncTaskToCalendar } from "./sync-task";
import { slotToDate } from "./slot";

type Task = typeof taskTable.$inferSelect;

function taskIdOf(event: CalendarEvent, integrationId: string) {
  const owner = event.extendedProperties?.private?.kaneoIntegrationId;
  const taskId = event.extendedProperties?.private?.kaneoTaskId;
  // Only the event Kaneo created for the task counts. Copies and recurring
  // exceptions inherit the properties but not the id.
  if (!taskId || owner !== integrationId) return null;
  return event.id === eventIdForTask(taskId) ? taskId : null;
}

async function applyEventToTask(
  event: CalendarEvent,
  task: Task,
  target: CalendarTarget,
) {
  const { timeZone } = target.config;
  const edits = planGoogleEdits(event, task, timeZone);
  const changes: Partial<Pick<Task, "title" | "startDate" | "dueDate">> = {};
  if (edits.title) changes.title = edits.title;
  const dropTime = Boolean(edits.untimed);
  if (edits.start) {
    changes.startDate = slotToDate(edits.start, task.startDate, timeZone, {
      dropTime,
    });
  }
  if (edits.due) {
    changes.dueDate = slotToDate(
      edits.due,
      task.dueDate ?? task.startDate,
      timeZone,
      { dropTime },
    );
  }
  if (Object.keys(changes).length === 0) return;

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(taskTable)
      .set(changes)
      .where(eq(taskTable.id, task.id))
      .returning();
    if (row) {
      await recordTaskMutation(tx, task, {
        title: changes.title,
        dueDate: changes.dueDate,
      });
    }
    return row;
  });
  if (!updated) return;

  await publishTaskMutation(task, updated, undefined, {
    fields: ["title", "dueDate"],
    sourceIntegrationId: target.integrationId,
  });
  await publishEvent("task.updated", {
    taskId: updated.id,
    projectId: updated.projectId,
    title: updated.title,
    status: updated.status,
    userId: null,
  });
}

// Applies one Google change. A Kaneo-made or imported event updates its task,
// and any other new event becomes a task when the calendar allows imports.
// Deletions in Google never touch tasks.
export async function applyChange(
  event: CalendarEvent,
  target: CalendarTarget,
  { canImport }: { canImport: boolean },
) {
  if (!event.id || event.status === "cancelled") return;
  const taskId =
    taskIdOf(event, target.integrationId) ??
    (await linkedTaskId(target.integrationId, event.id));
  if (!taskId) {
    if (!canImport) return;
    const created = await importEvent(event, target);
    // Writes the snapshot that later pulls compare edits against.
    if (created) await syncTaskToCalendar(created, target);
    return;
  }

  const task = await db.query.taskTable.findFirst({
    where: and(
      eq(taskTable.id, taskId),
      eq(taskTable.projectId, target.projectId),
    ),
  });
  if (!task) return;

  await applyEventToTask(event, task, target);
  // Writes only when the event differs from the task, which also refreshes the
  // snapshot and restores fields Google cannot hold, such as the description.
  await syncTaskToCalendar(taskId, target);
}
