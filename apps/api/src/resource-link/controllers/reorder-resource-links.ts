import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { resourceLinkTable } from "../../database/schema";
import { type ResourceLinkScope, scopeCondition } from "../scope";
import listResourceLinks from "./list-resource-links";

async function reorderResourceLinks(scope: ResourceLinkScope, ids: string[]) {
  if (new Set(ids).size !== ids.length) {
    throw new HTTPException(400, { message: "Link IDs must be unique" });
  }

  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      const [moved] = await tx
        .update(resourceLinkTable)
        .set({ position })
        .where(and(eq(resourceLinkTable.id, id), scopeCondition(scope)))
        .returning({ id: resourceLinkTable.id });

      if (!moved) {
        throw new HTTPException(404, { message: "Resource link not found" });
      }
    }
  });

  return listResourceLinks(scope);
}

export default reorderResourceLinks;
