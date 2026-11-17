import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskTemplateTable } from "../../database/schema";
import type { TaskTemplateStep } from "../template-step";

async function updateTaskTemplate(
  id: string,
  changes: { name?: string; steps?: TaskTemplateStep[] },
) {
  const [updated] = await db
    .update(taskTemplateTable)
    .set({
      ...(changes.name !== undefined ? { name: changes.name } : {}),
      ...(changes.steps !== undefined ? { steps: changes.steps } : {}),
      updatedAt: new Date(),
    })
    .where(eq(taskTemplateTable.id, id))
    .returning();

  if (!updated) {
    throw new HTTPException(404, { message: "Task template not found" });
  }

  return updated;
}

export default updateTaskTemplate;
