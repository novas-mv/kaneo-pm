import { and, eq, isNull, sql } from "drizzle-orm";
import type db from "../database";
import { projectTable } from "../database/schema";

// The nesting rules look only at unarchived relations, the same ones the
// sidebar shows: a project whose parent is archived reads as top-level, and
// archived children do not count. `settleNestingAfterUnarchive` keeps that
// from ever producing two levels.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function hasShownParent(
  tx: Tx,
  project: { parentProjectId: string | null },
) {
  if (!project.parentProjectId) return false;
  const [parent] = await tx
    .select({ archivedAt: projectTable.archivedAt })
    .from(projectTable)
    .where(eq(projectTable.id, project.parentProjectId));
  return Boolean(parent && !parent.archivedAt);
}

export async function hasShownChildren(tx: Tx, projectId: string) {
  const [child] = await tx
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(
      and(
        eq(projectTable.parentProjectId, projectId),
        isNull(projectTable.archivedAt),
      ),
    )
    .limit(1);
  return Boolean(child);
}

/**
 * Called after `project` is unarchived. Its children that gained children of
 * their own leave the group, and so does the project itself when its parent
 * is now a child or it has children. Returns every id whose nesting changed.
 */
export async function settleNestingAfterUnarchive(
  tx: Tx,
  project: { id: string; parentProjectId: string | null },
) {
  const changed: string[] = [];

  const detachedChildren = await tx
    .update(projectTable)
    .set({ parentProjectId: null })
    .where(
      and(
        eq(projectTable.parentProjectId, project.id),
        isNull(projectTable.archivedAt),
        sql`EXISTS (
          SELECT 1 FROM ${projectTable} AS grandchild
          WHERE grandchild.parent_project_id = ${projectTable.id}
            AND grandchild.archived_at IS NULL
        )`,
      ),
    )
    .returning({ id: projectTable.id });
  changed.push(...detachedChildren.map((child) => child.id));

  if (project.parentProjectId) {
    const [parent] = await tx
      .select()
      .from(projectTable)
      .where(eq(projectTable.id, project.parentProjectId));
    if (
      parent &&
      !parent.archivedAt &&
      ((await hasShownParent(tx, parent)) ||
        (await hasShownChildren(tx, project.id)))
    ) {
      await tx
        .update(projectTable)
        .set({ parentProjectId: null })
        .where(eq(projectTable.id, project.id));
      changed.push(project.id, parent.id);
    }
  }

  return changed;
}
