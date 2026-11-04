import { and, eq, inArray, isNull } from "drizzle-orm";
import db, { schema } from "../database";
import type { DbOrTx } from "./db-or-tx";

export async function findWorkspaceProjectIds(
  workspaceId: string,
  projectIds: readonly string[],
  database: DbOrTx = db,
  { includePersonal = true }: { includePersonal?: boolean } = {},
): Promise<string[]> {
  const ids = [...new Set(projectIds)];
  if (ids.length === 0) return [];

  const rows = await database
    .select({ id: schema.projectTable.id })
    .from(schema.projectTable)
    .where(
      and(
        eq(schema.projectTable.workspaceId, workspaceId),
        includePersonal ? undefined : isNull(schema.projectTable.ownerUserId),
        inArray(schema.projectTable.id, ids),
      ),
    );

  return rows.map((row) => row.id);
}
