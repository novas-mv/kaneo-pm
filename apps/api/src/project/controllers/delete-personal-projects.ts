import { eq } from "drizzle-orm";
import db from "../../database";
import { projectTable } from "../../database/schema";
import deleteProject from "./delete-project";

// A deleted user's Personal projects have no one left to reach them. Delete
// them the normal way so uploaded files are queued for storage cleanup instead
// of being orphaned by the foreign-key cascade.
export async function deletePersonalProjects(userId: string) {
  const owned = await db
    .select({ id: projectTable.id, workspaceId: projectTable.workspaceId })
    .from(projectTable)
    .where(eq(projectTable.ownerUserId, userId));

  for (const project of owned) {
    await deleteProject(project.id, project.workspaceId);
  }
}
