import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskTemplateTable } from "../../database/schema";
import type { TaskTemplateStep } from "../template-step";

async function createTaskTemplate({
  projectId,
  name,
  steps,
}: {
  projectId: string;
  name: string;
  steps: TaskTemplateStep[];
}) {
  const [created] = await db
    .insert(taskTemplateTable)
    .values({ projectId, name, steps })
    .returning();

  if (!created) {
    throw new HTTPException(500, { message: "Failed to create task template" });
  }

  return created;
}

export default createTaskTemplate;
