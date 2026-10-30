import { and, eq, gte } from "drizzle-orm";
import * as v from "valibot";
import db from "../../database";
import { integrationTable, taskTable } from "../../database/schema";
import { applyChange } from "./apply-change";
import { isGoogleCalendarConfigured } from "./auth";
import { calendarIdOf, sharedCalendarIds } from "./shared-calendars";
import { GoogleCalendarError, listChanges } from "./client";
import { googleCalendarConfigSchema } from "./config";
import {
  type CalendarTarget,
  datedTaskIdsInProject,
  syncTasksToCalendar,
} from "./sync-task";

type SavedState = {
  syncToken?: string | null;
  lastError?: string | null;
  // Set only by a run that finished, so a failed run is not skipped next time.
  syncedAt?: Date;
};

async function saveState(
  integrationId: string,
  calendarId: string,
  state: SavedState,
) {
  // Re-read the row so a settings change made during the run is not overwritten.
  const row = await db.query.integrationTable.findFirst({
    where: eq(integrationTable.id, integrationId),
  });
  if (!row) return;
  const config = JSON.parse(row.config) as Record<string, unknown>;
  // The calendar was switched while this run was going: its token is stale.
  if (config.calendarId !== calendarId) return;
  const next = {
    ...config,
    ...(state.syncToken === undefined
      ? {}
      : { syncToken: state.syncToken ?? undefined }),
    lastError: state.lastError ?? undefined,
    ...(state.syncedAt ? { lastSyncAt: state.syncedAt.toISOString() } : {}),
  };
  await db
    .update(integrationTable)
    .set({ config: JSON.stringify(next) })
    .where(eq(integrationTable.id, integrationId));
}

// Returns true when the run recorded an error.
async function syncIntegration(
  row: typeof integrationTable.$inferSelect,
  { canImport }: { canImport: boolean },
) {
  const parsed = v.safeParse(
    googleCalendarConfigSchema,
    JSON.parse(row.config),
  );
  if (!parsed.success) return false;
  const target: CalendarTarget = {
    integrationId: row.id,
    projectId: row.projectId,
    config: parsed.output,
  };
  const { calendarId, syncToken, lastSyncAt } = target.config;
  const startedAt = new Date();

  try {
    if (!syncToken) {
      // First run: Kaneo is the source of truth, so push every dated task first
      // and only then take the sync token, so those writes are not read back.
      const { failed, error } = await syncTasksToCalendar(
        await datedTaskIdsInProject(row.projectId),
        target,
      );
      if (failed > 0) {
        // No token yet, so the next run pushes everything again.
        await saveState(row.id, calendarId, { lastError: error });
        return true;
      }
      const { nextSyncToken } = await listChanges(calendarId);
      await saveState(row.id, calendarId, {
        syncToken: nextSyncToken ?? null,
        syncedAt: startedAt,
      });
      return false;
    }

    const since = lastSyncAt ? new Date(Date.parse(lastSyncAt) - 60_000) : null;
    const changes = await listChanges(calendarId, syncToken);
    for (const event of changes.items) {
      try {
        await applyChange(event, target, { canImport });
      } catch (error) {
        console.error(
          `Google Calendar pull failed for event ${event.id}:`,
          error,
        );
      }
    }

    // Catches Kaneo edits that publish no event of their own, such as start dates.
    const recent = since
      ? await db
          .select({ id: taskTable.id })
          .from(taskTable)
          .where(
            and(
              eq(taskTable.projectId, row.projectId),
              gte(taskTable.updatedAt, since),
            ),
          )
      : [];
    const { failed, error } = await syncTasksToCalendar(
      recent.map((task) => task.id),
      target,
    );

    await saveState(row.id, calendarId, {
      syncToken: changes.nextSyncToken ?? syncToken,
      lastError: error,
      // Moving the window forward only after a clean run keeps failed pushes in it.
      ...(failed ? {} : { syncedAt: startedAt }),
    });
    return failed > 0;
  } catch (error) {
    if (error instanceof GoogleCalendarError && error.status === 410) {
      // The sync token expired: drop it so the next run starts from Kaneo again.
      await saveState(row.id, calendarId, { syncToken: null, lastError: null });
      return false;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `Google Calendar sync failed for project ${row.projectId}:`,
      error,
    );
    await saveState(row.id, calendarId, { lastError: message.slice(0, 300) });
    return true;
  }
}

export async function syncGoogleCalendars() {
  // Without a key every call would fail, so skip quietly instead of logging a
  // wall of errors each minute.
  if (!isGoogleCalendarConfigured()) return { degraded: false };

  const rows = await db.query.integrationTable.findMany({
    where: and(
      eq(integrationTable.type, "google-calendar"),
      eq(integrationTable.isActive, true),
    ),
  });
  // A calendar connected to several projects cannot tell which one a new
  // event belongs to, so none of them imports from it.
  const shared = sharedCalendarIds(rows);
  let degraded = false;
  for (const row of rows) {
    const canImport = !shared.has(calendarIdOf(row.config) ?? "");
    if (await syncIntegration(row, { canImport })) degraded = true;
  }
  return { degraded };
}
