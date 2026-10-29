import { and, asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { resourceLinkTable } from "../../database/schema";
import { lockScope, type ResourceLinkScope, scopeCondition } from "../scope";
import listResourceLinks from "./list-resource-links";

// Listed links come first in the given order; links not listed follow in their
// current order, so positions always end up unique and contiguous.
async function reorderResourceLinks(scope: ResourceLinkScope, ids: string[]) {
  if (new Set(ids).size !== ids.length) {
    throw new HTTPException(400, { message: "Link IDs must be unique" });
  }

  await db.transaction(async (tx) => {
    await lockScope(tx, scope);

    const existing = await tx
      .select({ id: resourceLinkTable.id })
      .from(resourceLinkTable)
      .where(scopeCondition(scope))
      .orderBy(
        asc(resourceLinkTable.position),
        asc(resourceLinkTable.createdAt),
        asc(resourceLinkTable.id),
      );
    const known = new Set(existing.map((link) => link.id));
    if (ids.some((id) => !known.has(id))) {
      throw new HTTPException(404, { message: "Resource link not found" });
    }

    const listed = new Set(ids);
    const order = [
      ...ids,
      ...existing.map((link) => link.id).filter((id) => !listed.has(id)),
    ];

    for (const [position, id] of order.entries()) {
      await tx
        .update(resourceLinkTable)
        .set({ position })
        .where(and(eq(resourceLinkTable.id, id), scopeCondition(scope)));
    }
  });

  return listResourceLinks(scope);
}

export default reorderResourceLinks;
