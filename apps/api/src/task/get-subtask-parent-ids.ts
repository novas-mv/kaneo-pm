import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { taskRelationTable, taskTable } from "../database/schema";
import type { TaskReadDatabase } from "./bounded-read";

/**
 * Map each task on the page to the parent it is a subtask of, in one query.
 *
 * Only parents in the same project are returned: a board can name a parent it
 * already shows, and an id from another project could point at a task the
 * caller cannot open. A task with several parents gets the oldest link.
 */
export async function getSubtaskParentIds(
  db: TaskReadDatabase,
  taskIds: string[],
  projectId: string,
) {
  if (taskIds.length === 0) return new Map<string, string>();

  const parent = alias(taskTable, "subtask_parent");
  const rows = await db
    .selectDistinctOn([taskRelationTable.targetTaskId], {
      taskId: taskRelationTable.targetTaskId,
      parentTaskId: taskRelationTable.sourceTaskId,
    })
    .from(taskRelationTable)
    .innerJoin(parent, eq(taskRelationTable.sourceTaskId, parent.id))
    .where(
      and(
        inArray(taskRelationTable.targetTaskId, taskIds),
        eq(taskRelationTable.relationType, "subtask"),
        eq(parent.projectId, projectId),
      ),
    )
    .orderBy(
      asc(taskRelationTable.targetTaskId),
      asc(taskRelationTable.createdAt),
      asc(taskRelationTable.id),
    );

  return new Map(rows.map((row) => [row.taskId, row.parentTaskId]));
}
