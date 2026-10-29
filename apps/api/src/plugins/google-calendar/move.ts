import { and, eq } from "drizzle-orm";
import * as v from "valibot";
import db from "../../database";
import { integrationTable } from "../../database/schema";
import type { TaskMovedEvent } from "../types";
import { deleteEvent } from "./client";
import { googleCalendarConfigSchema } from "./config";
import { eventIdForTask } from "./mapping";

// A move is only broadcast to the destination project's integrations, so the
// source project's calendar has to be cleaned up here.
export async function removeFromSourceCalendar(event: TaskMovedEvent) {
  if (event.fromProjectId === event.toProjectId) return;
  const row = await db.query.integrationTable.findFirst({
    where: and(
      eq(integrationTable.projectId, event.fromProjectId),
      eq(integrationTable.type, "google-calendar"),
      eq(integrationTable.isActive, true),
    ),
  });
  if (!row) return;
  const config = v.safeParse(
    googleCalendarConfigSchema,
    JSON.parse(row.config),
  );
  if (!config.success) return;
  await deleteEvent(config.output.calendarId, eventIdForTask(event.taskId));
}
