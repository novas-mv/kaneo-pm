import { and, asc, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  projectTable,
  taskRelationTable,
  taskTable,
} from "../../database/schema";
import { publishEvent } from "../../events";
import { projectAccessCondition } from "../../project-access/project-access-condition";
import { addDays } from "../../utils/add-days";
import {
  publishTaskMutation,
  recordTaskMutation,
} from "./task-mutation-effects";

/** Direct subtasks the caller can reach: same workspace, accessible project. */
async function subtaskIds(taskId: string, workspaceId: string, userId: string) {
  const rows = await db
    .select({ id: taskTable.id })
    .from(taskRelationTable)
    .innerJoin(taskTable, eq(taskRelationTable.targetTaskId, taskTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(
      and(
        eq(taskRelationTable.sourceTaskId, taskId),
        eq(taskRelationTable.relationType, "subtask"),
        eq(projectTable.workspaceId, workspaceId),
        projectAccessCondition(userId, projectTable.id),
      ),
    );
  return rows.map((row) => row.id).filter((id) => id !== taskId);
}

/**
 * Move a task's start and due dates by whole days, and optionally those of its
 * direct subtasks. Dates that are not set stay unset. Each changed task emits
 * the same events as a normal date edit.
 */
async function shiftTaskDates({
  taskId,
  days,
  includeSubtasks,
  userId,
  workspaceId,
}: {
  taskId: string;
  days: number;
  includeSubtasks: boolean;
  userId: string;
  workspaceId: string;
}) {
  const ids = [
    taskId,
    ...(includeSubtasks ? await subtaskIds(taskId, workspaceId, userId) : []),
  ];

  const { root, changes } = await db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(taskTable)
      .where(inArray(taskTable.id, ids))
      .orderBy(asc(taskTable.id))
      .for("update");
    const root = locked.find((task) => task.id === taskId);
    if (!root) throw new HTTPException(404, { message: "Task not found" });
    if (days === 0) return { root, changes: [] };

    const result = [];
    for (const before of locked) {
      if (!before.startDate && !before.dueDate) continue;
      const dueDate = before.dueDate ? addDays(before.dueDate, days) : null;
      const [after] = await tx
        .update(taskTable)
        .set({
          startDate: before.startDate ? addDays(before.startDate, days) : null,
          dueDate,
        })
        .where(eq(taskTable.id, before.id))
        .returning();
      if (!after) continue;
      await recordTaskMutation(tx, before, { dueDate }, userId);
      result.push({ before, after });
    }
    return { root, changes: result };
  });

  for (const { before, after } of changes) {
    await publishTaskMutation(before, after, userId, { fields: ["dueDate"] });
    // Start dates have no event of their own; this refreshes boards for them.
    await publishEvent("task.updated", {
      taskId: after.id,
      projectId: after.projectId,
      title: after.title,
      status: after.status,
      userId,
    });
  }

  return {
    task: changes.find(({ after }) => after.id === taskId)?.after ?? root,
    subtasks: changes
      .map(({ after }) => after)
      .filter((task) => task.id !== taskId),
  };
}

export default shiftTaskDates;
