import {
  resolveWorkspaceFeatures,
  type WorkspaceFeatureKey,
} from "@kaneo/permissions";
import { eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { workspaceTable } from "../../database/schema";

async function updateWorkspaceFeature(
  workspaceId: string,
  key: WorkspaceFeatureKey,
  enabled: boolean,
) {
  // Merge in SQL so two toggles of different features can't overwrite each
  // other.
  const [row] = await db
    .update(workspaceTable)
    .set({
      features: sql`${workspaceTable.features} || jsonb_build_object(${key}::text, ${enabled}::boolean)`,
    })
    .where(eq(workspaceTable.id, workspaceId))
    .returning({ features: workspaceTable.features });

  if (!row) {
    throw new HTTPException(404, { message: "Workspace not found" });
  }

  return resolveWorkspaceFeatures(row.features);
}

export default updateWorkspaceFeature;
