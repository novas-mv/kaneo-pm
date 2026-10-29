import { and, eq, isNull, sql } from "drizzle-orm";
import { resourceLinkTable } from "../database/schema";

// A list belongs to a workspace (projectId null) or to one project of it.
export type ResourceLinkScope = {
  workspaceId: string;
  projectId: string | null;
};

export function scopeCondition({ workspaceId, projectId }: ResourceLinkScope) {
  return and(
    eq(resourceLinkTable.workspaceId, workspaceId),
    projectId === null
      ? isNull(resourceLinkTable.projectId)
      : eq(resourceLinkTable.projectId, projectId),
  );
}

// Serializes writers of one list so the size cap and positions stay exact.
export function lockScope(
  tx: { execute: (query: ReturnType<typeof sql>) => unknown },
  { workspaceId, projectId }: ResourceLinkScope,
) {
  return tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`resource-link:${workspaceId}:${projectId ?? ""}`}))`,
  );
}
