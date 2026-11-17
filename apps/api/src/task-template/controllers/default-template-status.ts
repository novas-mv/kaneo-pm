import { asc, eq } from "drizzle-orm";
import db from "../../database";
import { columnTable } from "../../database/schema";

/** The project's first open column, so applied tasks start as work to do. */
export async function defaultTemplateStatus(projectId: string) {
  const columns = await db
    .select({ slug: columnTable.slug, isFinal: columnTable.isFinal })
    .from(columnTable)
    .where(eq(columnTable.projectId, projectId))
    .orderBy(asc(columnTable.position), asc(columnTable.id));

  return (
    columns.find((column) => !column.isFinal)?.slug ??
    columns[0]?.slug ??
    "to-do"
  );
}
