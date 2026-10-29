import { and, eq, isNotNull, or } from "drizzle-orm";
import * as v from "valibot";
import db from "../../database";
import { columnTable, projectTable, taskTable } from "../../database/schema";
import { deleteEvent, getEvent, upsertEvent } from "./client";
import {
  type GoogleCalendarConfig,
  googleCalendarConfigSchema,
} from "./config";
import { buildEvent, eventIdForTask, eventMatches } from "./mapping";

export type CalendarTarget = {
  integrationId: string;
  projectId: string;
  config: GoogleCalendarConfig;
};

export function targetFromContext(context: {
  integrationId: string;
  projectId: string;
  config: Record<string, unknown>;
}): CalendarTarget {
  return {
    integrationId: context.integrationId,
    projectId: context.projectId,
    config: v.parse(googleCalendarConfigSchema, context.config),
  };
}

function taskUrl(workspaceId: string, projectId: string, taskId: string) {
  const base = (process.env.KANEO_CLIENT_URL ?? "").replace(/\/$/, "");
  return `${base}/dashboard/workspace/${workspaceId}/project/${projectId}/task/${taskId}`;
}

// Makes the calendar match the task. It reads the event first and only writes
// when something differs, so applying a change that came from Google does not
// bounce back as another write.
export async function syncTaskToCalendar(
  taskId: string,
  target: CalendarTarget,
  // Undated tasks have no event, so a DELETE is only worth sending when the
  // task may just have lost its dates, was deleted, or moved away.
  { removeWhenUndated = true }: { removeWhenUndated?: boolean } = {},
) {
  const { calendarId, timeZone } = target.config;
  const eventId = eventIdForTask(taskId);

  const [row] = await db
    .select({
      task: taskTable,
      projectName: projectTable.name,
      workspaceId: projectTable.workspaceId,
      statusName: columnTable.name,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .leftJoin(columnTable, eq(columnTable.id, taskTable.columnId))
    .where(eq(taskTable.id, taskId));

  // A task that was deleted or moved to another project leaves this calendar.
  if (!row || row.task.projectId !== target.projectId) {
    await deleteEvent(calendarId, eventId);
    return;
  }

  const desired = buildEvent(row.task, {
    timeZone,
    integrationId: target.integrationId,
    projectName: row.projectName,
    statusName: row.statusName,
    taskUrl: taskUrl(row.workspaceId, row.task.projectId, row.task.id),
  });

  if (!desired) {
    if (removeWhenUndated) await deleteEvent(calendarId, eventId);
    return;
  }

  const existing = await getEvent(calendarId, eventId);
  if (existing && eventMatches(existing, desired)) return;
  await upsertEvent(calendarId, desired);
}

export async function syncTasksToCalendar(
  taskIds: string[],
  target: CalendarTarget,
) {
  let failed = 0;
  for (const taskId of taskIds) {
    try {
      await syncTaskToCalendar(taskId, target, { removeWhenUndated: false });
    } catch (error) {
      failed += 1;
      console.error(`Google Calendar sync failed for task ${taskId}:`, error);
    }
  }
  return { failed };
}

export async function datedTaskIdsInProject(projectId: string) {
  const rows = await db
    .select({ id: taskTable.id })
    .from(taskTable)
    .where(
      and(
        eq(taskTable.projectId, projectId),
        or(isNotNull(taskTable.startDate), isNotNull(taskTable.dueDate)),
      ),
    );
  return rows.map((row) => row.id);
}
