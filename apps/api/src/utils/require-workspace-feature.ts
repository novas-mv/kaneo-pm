import type { WorkspaceFeatureKey } from "@kaneo/permissions";
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import db, { schema } from "../database";

export async function isWorkspaceFeatureEnabled(
  workspaceId: string,
  key: WorkspaceFeatureKey,
) {
  const [row] = await db
    .select({ features: schema.workspaceTable.features })
    .from(schema.workspaceTable)
    .where(eq(schema.workspaceTable.id, workspaceId))
    .limit(1);
  return row?.features?.[key] === true;
}

// Place after `workspaceAccess.*`, like `requireWorkspacePermission`: it reads
// the workspace the access middleware resolved from the raw request. A feature
// that is off answers 404, so its routes look like they don't exist.
export function requireWorkspaceFeature(key: WorkspaceFeatureKey) {
  return async (c: Context, next: Next) => {
    const workspaceId = c.get("workspaceId");
    if (!workspaceId) {
      throw new HTTPException(500, {
        message: "workspaceId not set in context",
      });
    }

    if (!(await isWorkspaceFeatureEnabled(workspaceId, key))) {
      throw new HTTPException(404, { message: "Not found" });
    }

    return next();
  };
}
