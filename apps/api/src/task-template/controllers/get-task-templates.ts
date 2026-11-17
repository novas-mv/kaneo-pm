import { asc, eq } from "drizzle-orm";
import db from "../../database";
import { taskTemplateTable } from "../../database/schema";

async function getTaskTemplates(projectId: string) {
  return db
    .select()
    .from(taskTemplateTable)
    .where(eq(taskTemplateTable.projectId, projectId))
    .orderBy(asc(taskTemplateTable.name), asc(taskTemplateTable.id));
}

export default getTaskTemplates;
