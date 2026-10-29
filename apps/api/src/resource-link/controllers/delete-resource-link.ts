import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { resourceLinkTable } from "../../database/schema";
import { type ResourceLinkScope, scopeCondition } from "../scope";

async function deleteResourceLink(scope: ResourceLinkScope, id: string) {
  const [link] = await db
    .delete(resourceLinkTable)
    .where(and(eq(resourceLinkTable.id, id), scopeCondition(scope)))
    .returning({ id: resourceLinkTable.id });

  if (!link) {
    throw new HTTPException(404, { message: "Resource link not found" });
  }

  return link;
}

export default deleteResourceLink;
