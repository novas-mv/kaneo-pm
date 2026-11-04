import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { projectTable } from "../database/schema";
import { insertProject } from "./controllers/insert-project";
import { lockProjectOrdering } from "./controllers/project-placement";

export const PERSONAL_PROJECT_NAME = "Personal";

// Returns the caller's Personal project in a workspace, creating it on first
// use. Safe to call concurrently: the ordering lock serializes creators and a
// partial unique index on (workspace, owner) backs it up.
export async function ensurePersonalProject(
  workspaceId: string,
  userId: string,
) {
  return db.transaction(async (tx) => {
    await lockProjectOrdering(tx, workspaceId);

    const [existing] = await tx
      .select()
      .from(projectTable)
      .where(
        and(
          eq(projectTable.workspaceId, workspaceId),
          eq(projectTable.ownerUserId, userId),
        ),
      )
      .limit(1);
    if (existing) return existing;

    // The key is hidden from everyone else, so avoid a readable word that a
    // team might want for a real project.
    const created = await insertProject(tx, {
      workspaceId,
      name: PERSONAL_PROJECT_NAME,
      icon: "Lock",
      slug: `me-${randomBytes(3).toString("hex")}`,
      userId,
      ownerUserId: userId,
    });
    if (!created) {
      throw new HTTPException(500, {
        message: "Failed to create personal project",
      });
    }
    return created;
  });
}

// A Personal project stays private to its owner: it can't be published,
// nested, archived or moved to another workspace.
export async function assertNotPersonalProject(projectId: string) {
  const [project] = await db
    .select({ ownerUserId: projectTable.ownerUserId })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .limit(1);
  if (project?.ownerUserId) {
    throw new HTTPException(400, {
      message: "This isn't allowed for a personal project",
    });
  }
}
