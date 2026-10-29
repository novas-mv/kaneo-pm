import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { settleNestingAfterUnarchive } from "../nesting";
import { findProjectKeyConflict } from "../project-key";

async function unarchiveProject(id: string, workspaceId: string) {
  const { project, regrouped } = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(1524, hashtext(${workspaceId}))`,
    );

    const [existingProject] = await tx
      .select()
      .from(projectTable)
      .where(
        and(eq(projectTable.id, id), eq(projectTable.workspaceId, workspaceId)),
      )
      .for("update");

    if (!existingProject) {
      throw new HTTPException(404, {
        message:
          "Project doesn't exist or doesn't belong to the specified workspace",
      });
    }

    const keyConflict = await findProjectKeyConflict(
      tx,
      workspaceId,
      existingProject.slug,
      { excludeProjectId: id },
    );
    if (keyConflict) {
      throw new HTTPException(409, {
        message: `This workspace already has a project using the key "${existingProject.slug}" (${keyConflict.name}). Change one of the keys before unarchiving this project.`,
      });
    }

    const [unarchivedProject] = await tx
      .update(projectTable)
      .set({ archivedAt: null })
      .where(eq(projectTable.id, id))
      .returning();

    if (!unarchivedProject) {
      throw new HTTPException(500, {
        message: "Failed to unarchive project",
      });
    }

    const regrouped = await settleNestingAfterUnarchive(tx, unarchivedProject);
    return {
      project: regrouped.includes(id)
        ? { ...unarchivedProject, parentProjectId: null }
        : unarchivedProject,
      regrouped,
    };
  });

  for (const projectId of new Set(regrouped)) {
    await publishEvent("project.updated", { projectId });
  }

  return project;
}

export default unarchiveProject;
