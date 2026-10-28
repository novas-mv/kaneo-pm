import { eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { assertProjectAccess } from "../../project-access/assert-project-access";

async function setProjectParent(
  projectId: string,
  parentProjectId: string | null,
  userId: string,
) {
  if (parentProjectId === projectId) {
    throw new HTTPException(400, {
      message: "A project cannot be its own parent",
    });
  }

  await assertProjectAccess(
    userId,
    parentProjectId ? [projectId, parentProjectId] : projectId,
  );

  const [located] = await db
    .select({ workspaceId: projectTable.workspaceId })
    .from(projectTable)
    .where(eq(projectTable.id, projectId));

  if (!located) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const { project, previousParentId } = await db.transaction(async (tx) => {
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
        throw new HTTPException(404, { message: "Parent project not found" });
      }
      if (parent.workspaceId !== current.workspaceId) {
        throw new HTTPException(400, {
          message: "A parent must be in the same workspace",
        });
      }
      if (parent.parentProjectId) {
        throw new HTTPException(400, {
          message: "A parent cannot itself be a child project",
        });
      }

      const [child] = await tx
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(eq(projectTable.parentProjectId, projectId))
        .limit(1);

      if (child) {
        throw new HTTPException(400, {
          message: "A project with children cannot become a child",
        });
      }
    }

    const [updated] = await tx
      .update(projectTable)
      .set({ parentProjectId })
      .where(eq(projectTable.id, projectId))
      .returning();

    return { project: updated, previousParentId: current.parentProjectId };
  });

  const affected = new Set(
    [projectId, parentProjectId, previousParentId].filter((id): id is string =>
      Boolean(id),
    ),
  );
  for (const id of affected) {
    await publishEvent("project.updated", { projectId: id });
  }

  return project;
}

export default setProjectParent;
