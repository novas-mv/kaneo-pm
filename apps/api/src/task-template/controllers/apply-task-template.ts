import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskTemplateTable } from "../../database/schema";
import createTask from "../../task/controllers/create-task";
import createTaskRelation from "../../task-relation/controllers/create-task-relation";
import { stepDueDates } from "../step-due-dates";
import { defaultTemplateStatus } from "./default-template-status";

/**
 * Create the post task and one subtask per template step.
 *
 * Each task goes through the normal create path (numbering, assignees,
 * required custom fields, activity, task.created) and each link through the
 * normal relation path (task-relation.created), so boards, integrations and
 * WebSockets see exactly what they would for hand-made tasks. Those helpers
 * own their transactions, so the run is sequential, not atomic: a failure
 * part way leaves the tasks made so far. Every task uses the same project and
 * column, so the checks that could fail do so on the parent, before any step.
 */
async function applyTaskTemplate({
  templateId,
  title,
  postDate,
  status,
  userId,
  workspaceId,
}: {
  templateId: string;
  title: string;
  postDate: Date;
  status?: string;
  userId: string;
  workspaceId: string;
}) {
  const template = await db.query.taskTemplateTable.findFirst({
    where: eq(taskTemplateTable.id, templateId),
  });
  if (!template) {
    throw new HTTPException(404, { message: "Task template not found" });
  }

  const resolvedStatus =
    status || (await defaultTemplateStatus(template.projectId));

  const parent = await createTask({
    projectId: template.projectId,
    currentUserId: userId,
    title,
    status: resolvedStatus,
    dueDate: postDate,
  });

  const steps = [];
  for (const step of stepDueDates(postDate, template.steps)) {
    const task = await createTask({
      projectId: template.projectId,
      currentUserId: userId,
      title: step.title,
      status: resolvedStatus,
      dueDate: step.dueDate,
    });
    await createTaskRelation({
      sourceTaskId: parent.id,
      targetTaskId: task.id,
      relationType: "subtask",
      userId,
      workspaceId,
    });
    steps.push(task);
  }

  return { parent, steps };
}

export default applyTaskTemplate;
