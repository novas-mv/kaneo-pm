import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { integrationTable } from "../database/schema";
import { deletedSchema, projectIdParam } from "../integrations/schema";
import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import {
  isGoogleCalendarConfigured,
  serviceAccountEmail,
} from "../plugins/google-calendar/auth";
import {
  assertCalendarAccess,
  GoogleCalendarError,
} from "../plugins/google-calendar/client";
import { dropCalendarLinks } from "../plugins/google-calendar/event-link";
import { calendarIdOf } from "../plugins/google-calendar/shared-calendars";
import {
  DEFAULT_TIME_ZONE,
  type GoogleCalendarConfig,
  validateGoogleCalendarConfig,
} from "../plugins/google-calendar/config";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { googleCalendarStatusSchema } from "./response";
import { saveGoogleCalendarBody } from "./schema";

const TYPE = "google-calendar";

async function findIntegration(projectId: string) {
  return db.query.integrationTable.findFirst({
    where: and(
      eq(integrationTable.projectId, projectId),
      eq(integrationTable.type, TYPE),
    ),
  });
}

async function getStatus(projectId: string) {
  const row = await findIntegration(projectId);
  const config = row ? (JSON.parse(row.config) as GoogleCalendarConfig) : null;
  return {
    configured: isGoogleCalendarConfigured(),
    serviceAccountEmail: serviceAccountEmail(),
    integration:
      row && config
        ? {
            id: row.id,
            projectId: row.projectId,
            calendarId: config.calendarId,
            timeZone: config.timeZone,
            lastSyncAt: config.lastSyncAt ?? null,
            lastError: config.lastError ?? null,
            isActive: row.isActive,
          }
        : null,
  };
}

const manageAccess = [
  workspaceAccess.fromProject("projectId"),
  requireWorkspacePermission({ workspace: ["manage_settings"] }),
];

const getRoute = createRoute({
  method: "get",
  operationId: "getGoogleCalendarIntegration",
  path: "/project/{projectId}",
  tags: ["Google Calendar"],
  summary: "Get Google Calendar integration",
  description:
    "Get the Google Calendar sync settings for a project, plus whether this instance has a Google service account and which address to share the calendar with.",
  middleware: [
    workspaceAccess.fromProject("projectId"),
    requireWorkspacePermission({ project: ["read"] }),
  ] as const,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse(
      "Sync settings and instance status",
      googleCalendarStatusSchema,
    ),
    403: errorResponse(
      "No access to the project, or missing project:read permission",
    ),
    404: errorResponse("Project not found"),
  },
});

const saveRoute = createRoute({
  method: "put",
  operationId: "saveGoogleCalendarIntegration",
  path: "/project/{projectId}",
  tags: ["Google Calendar"],
  summary: "Connect a Google Calendar",
  description:
    "Start two-way sync between the project's dated tasks and a shared Google Calendar. The calendar must be shared with the instance's service account with permission to make changes to events. Replaces any calendar already connected.",
  middleware: manageAccess,
  request: {
    params: projectIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: saveGoogleCalendarBody } },
    },
  },
  responses: {
    200: jsonResponse(
      "Sync settings and instance status",
      googleCalendarStatusSchema,
    ),
    400: errorResponse(
      "The calendar is invalid or not shared with the service account",
    ),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project not found"),
  },
});

const deleteRoute = createRoute({
  method: "delete",
  operationId: "deleteGoogleCalendarIntegration",
  path: "/project/{projectId}",
  tags: ["Google Calendar"],
  summary: "Disconnect the Google Calendar",
  description:
    "Stop syncing. Events already on the calendar are left in place and are no longer updated.",
  middleware: manageAccess,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse("The integration was removed", deletedSchema),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project or Google Calendar integration not found"),
  },
});

const googleCalendarIntegration = apiRouter<
  BaseVariables & { workspaceId: string }
>()
  .openapi(getRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    return c.json(await getStatus(projectId), 200);
  })
  .openapi(saveRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    const body = c.req.valid("json");

    if (!isGoogleCalendarConfigured()) {
      throw new HTTPException(400, {
        message:
          "Google Calendar is not set up on this instance. Add GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON.",
      });
    }

    const config: GoogleCalendarConfig = {
      calendarId: body.calendarId.trim(),
      timeZone: body.timeZone?.trim() || DEFAULT_TIME_ZONE,
    };
    const validation = await validateGoogleCalendarConfig(config);
    if (!validation.valid) {
      throw new HTTPException(400, {
        message: validation.errors?.join(", ") ?? "Invalid config",
      });
    }

    if (config.calendarId.toLowerCase() === "primary") {
      throw new HTTPException(400, {
        message:
          "Use a shared team calendar's ID, not the service account's own primary calendar.",
      });
    }

    try {
      await assertCalendarAccess(config.calendarId);
    } catch (error) {
      if (
        error instanceof GoogleCalendarError &&
        [403, 404].includes(error.status)
      ) {
        throw new HTTPException(400, {
          message: `Kaneo cannot open that calendar. Share it with ${serviceAccountEmail()} and allow "Make changes to events".`,
        });
      }
      throw new HTTPException(400, {
        message:
          "Could not reach Google Calendar. Check the service account key and try again.",
      });
    }

    // A new config has no sync token, so the next run pushes every dated task.
    const existing = await findIntegration(projectId);
    if (existing) {
      if (
        calendarIdOf(existing.config) !== calendarIdOf(JSON.stringify(config))
      ) {
        // Imported tasks pointed at events in the old calendar. Without the
        // links they are pushed to the new calendar like any other task.
        await dropCalendarLinks(existing.id);
      }
      await db
        .update(integrationTable)
        .set({ config: JSON.stringify(config), isActive: true })
        .where(eq(integrationTable.id, existing.id));
    } else {
      await db.insert(integrationTable).values({
        projectId,
        type: TYPE,
        config: JSON.stringify(config),
        isActive: true,
      });
    }

    return c.json(await getStatus(projectId), 200);
  })
  .openapi(deleteRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    const existing = await findIntegration(projectId);
    if (!existing) {
      throw new HTTPException(404, {
        message: "Google Calendar integration not found",
      });
    }
    await db
      .delete(integrationTable)
      .where(eq(integrationTable.id, existing.id));
    return c.json({ success: true }, 200);
  });

export default googleCalendarIntegration;
