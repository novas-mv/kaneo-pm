import { and, eq, isNull } from "drizzle-orm";
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
