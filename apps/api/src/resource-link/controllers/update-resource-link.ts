import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { resourceLinkTable } from "../../database/schema";
import { type ResourceLinkScope, scopeCondition } from "../scope";

type UpdateResourceLinkInput = {
  title?: string;
  url?: string;
  description?: string | null;
  emoji?: string | null;
};

async function updateResourceLink(
  scope: ResourceLinkScope,
  id: string,
  input: UpdateResourceLinkInput,
) {
  const [link] = await db
    .update(resourceLinkTable)
    .set(input)
    .where(and(eq(resourceLinkTable.id, id), scopeCondition(scope)))
    .returning();

  if (!link) {
    throw new HTTPException(404, { message: "Resource link not found" });
  }

  return link;
}

export default updateResourceLink;
