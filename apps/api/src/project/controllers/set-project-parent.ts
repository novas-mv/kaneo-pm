import { eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { assertProjectAccess } from "../../project-access/assert-project-access";
import { findInaccessibleProjectIds } from "../../project-access/find-inaccessible-project-ids";

// One message for every nesting-rule failure. Distinct messages would tell a
// viewer about a parent or children they cannot see.
const NESTING_REJECTED = "This project can't be nested here";

function nestingRejected() {
  return new HTTPException(400, { message: NESTING_REJECTED });
}

function parentNotFound() {
  return new HTTPException(404, { message: "Parent project not found" });
}

async function setProjectParent(
  projectId: string,
  parentProjectId: string | null,
  userId: string,
) {
  if (parentProjectId === projectId) {
    throw nestingRejected();
  }

  await assertProjectAccess(userId, projectId);

  // An inaccessible parent answers exactly like a missing one, so the
  // response is not an existence oracle.
  if (
    parentProjectId &&
    (await findInaccessibleProjectIds(userId, [parentProjectId])).length > 0
  ) {
    throw parentNotFound();
  }

  const [located] = await db
    .select({ workspaceId: projectTable.workspaceId })
    .from(projectTable)
    .where(eq(projectTable.id, projectId));

  if (!located) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const result = await db.transaction(async (tx) => {
    // Same per-workspace lock as reorder and create, so the one-level checks
    // below cannot race another nesting change in the workspace.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(1524, hashtext(${located.workspaceId}))`,
    );

    const [current] = await tx
      .select()
      .from(projectTable)
      .where(eq(projectTable.id, projectId));

    if (!current || current.workspaceId !== located.workspaceId) {
      throw new HTTPException(404, { message: "Project not found" });
    }

    if (parentProjectId) {
      const [parent] = await tx
        .select()
        .from(projectTable)
        .where(eq(projectTable.id, parentProjectId));

      if (!parent) {
        throw parentNotFound();
      }
      if (parent.workspaceId !== current.workspaceId) {
        throw new HTTPException(400, {
          message: "A parent must be in the same workspace",
        });
      }
      if (current.parentProjectId === parentProjectId) {
        return { project: current, changed: false as const };
      }
      if (parent.parentProjectId || parent.archivedAt) {
        throw nestingRejected();
      }

      const [child] = await tx
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(eq(projectTable.parentProjectId, projectId))
        .limit(1);

      if (child) {
        throw nestingRejected();
      }
    } else if (current.parentProjectId === null) {
      return { project: current, changed: false as const };
    }

    const [updated] = await tx
      .update(projectTable)
      .set({ parentProjectId })
      .where(eq(projectTable.id, projectId))
      .returning();

    return {
      project: updated,
      changed: true as const,
      previousParentId: current.parentProjectId,
    };
  });

  if (!result.changed) {
    return result.project;
  }

  const affected = new Set(
    [projectId, parentProjectId, result.previousParentId].filter(
      (id): id is string => Boolean(id),
    ),
  );
  for (const id of affected) {
    await publishEvent("project.updated", { projectId: id });
  }

  return result.project;
}

export default setProjectParent;
