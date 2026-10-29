import { count, max } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { resourceLinkTable } from "../../database/schema";
import { lockScope, type ResourceLinkScope, scopeCondition } from "../scope";
import { MAX_RESOURCE_LINKS_PER_LIST } from "../schema";

type CreateResourceLinkInput = {
  title: string;
  url: string;
  description?: string | null;
  emoji?: string | null;
};

async function createResourceLink(
  scope: ResourceLinkScope,
  input: CreateResourceLinkInput,
) {
  return db.transaction(async (tx) => {
    await lockScope(tx, scope);

    const [stats] = await tx
      .select({
        total: count(),
        last: max(resourceLinkTable.position),
      })
      .from(resourceLinkTable)
      .where(scopeCondition(scope));

    if ((stats?.total ?? 0) >= MAX_RESOURCE_LINKS_PER_LIST) {
      throw new HTTPException(400, {
        message: `A list can hold at most ${MAX_RESOURCE_LINKS_PER_LIST} links`,
      });
    }

    const [link] = await tx
      .insert(resourceLinkTable)
      .values({
        workspaceId: scope.workspaceId,
        projectId: scope.projectId,
        title: input.title,
        url: input.url,
        description: input.description ?? null,
        emoji: input.emoji ?? null,
        position: (stats?.last ?? -1) + 1,
      })
      .returning();

    return link;
  });
}

export default createResourceLink;
