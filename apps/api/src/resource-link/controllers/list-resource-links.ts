import { asc } from "drizzle-orm";
import db from "../../database";
import { resourceLinkTable } from "../../database/schema";
import { type ResourceLinkScope, scopeCondition } from "../scope";

function listResourceLinks(scope: ResourceLinkScope) {
  return db
    .select()
    .from(resourceLinkTable)
    .where(scopeCondition(scope))
    .orderBy(
      asc(resourceLinkTable.position),
      asc(resourceLinkTable.createdAt),
      asc(resourceLinkTable.id),
    );
}

export default listResourceLinks;
