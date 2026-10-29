import { and, inArray, isNull } from "drizzle-orm";
import db from "../database";
import { projectTable } from "../database/schema";
import { projectAccessCondition } from "../project-access/project-access-condition";
import { redactParentProjectId } from "./redact-parent-project-id";

// For responses that are not the project list: keep a parent id only when the
// viewer can access that parent and it is not archived.
export async function redactHiddenParents<
  T extends { parentProjectId: string | null },
>(projects: readonly T[], userId: string): Promise<T[]> {
  const parentIds = [
    ...new Set(
      projects
        .map((project) => project.parentProjectId)
        .filter((id): id is string => id !== null),
    ),
  ];
  if (parentIds.length === 0) return [...projects];

  const rows = await db
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(
      and(
        inArray(projectTable.id, parentIds),
        isNull(projectTable.archivedAt),
        projectAccessCondition(userId, projectTable.id),
      ),
    );
  const visible = new Set(rows.map((row) => row.id));
  return projects.map((project) => redactParentProjectId(project, visible));
}

export async function redactHiddenParent<
  T extends { parentProjectId: string | null },
>(project: T, userId: string): Promise<T> {
  return (await redactHiddenParents([project], userId))[0] as T;
}
