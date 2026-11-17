import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

type Task = typeof schema.taskTable.$inferSelect;

function send(path: string, method: string, body?: unknown) {
  const { app } = createApp();
  return app.request(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function setup(role = "owner") {
  const member = await createWorkspaceMember({ role });
  mockAuthenticatedSession(member.user);
  const { project } = await createProjectFixture({
    workspaceId: member.workspace.id,
  });
  return { member, project };
}

describe("API integration: task templates", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("creates, lists, updates and deletes a template", async () => {
    const { project } = await setup();

    const created = await send(`/task-template/project/${project.id}`, "POST", {
      name: "Instagram post",
      steps: [{ title: "Draft", offsetDays: -2 }],
    });
    expect(created.status).toBe(200);
    const template = (await created.json()) as { id: string };

    const updated = await send(`/task-template/${template.id}`, "PATCH", {
      name: "Reel",
      steps: [
        { title: "Draft", offsetDays: -2 },
        { title: "Approve", offsetDays: -1 },
      ],
    });
    expect(updated.status).toBe(200);

    const list = await send(`/task-template/project/${project.id}`, "GET");
    expect(await list.json()).toMatchObject([
      { id: template.id, name: "Reel", steps: [{ title: "Draft" }, {}] },
    ]);

    const deleted = await send(`/task-template/${template.id}`, "DELETE");
    expect(deleted.status).toBe(200);
    const empty = await send(`/task-template/project/${project.id}`, "GET");
    expect(await empty.json()).toEqual([]);
  });

  it("rejects out-of-range offsets", async () => {
    const { project } = await setup();
    const response = await send(
      `/task-template/project/${project.id}`,
      "POST",
      { name: "Bad", steps: [{ title: "Too far", offsetDays: 400 }] },
    );
    expect(response.status).toBe(400);
  });

  it("does not let a member without project:update edit templates", async () => {
    const { project } = await setup("member");
    const response = await send(
      `/task-template/project/${project.id}`,
      "POST",
      { name: "Post", steps: [] },
    );
    expect(response.status).toBe(403);
  });

  it("applies a template as a parent with dated subtasks", async () => {
    const { project } = await setup();
    const [template] = await db
      .insert(schema.taskTemplateTable)
      .values({
        projectId: project.id,
        name: "Post",
        steps: [
          { title: "Draft", offsetDays: -2 },
          { title: "Send for approval", offsetDays: -1 },
        ],
      })
      .returning();

    const response = await send(`/task-template/${template.id}/apply`, "POST", {
      title: "Launch post",
      postDate: "2026-05-20T14:00:00.000Z",
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as {
      parent: Task;
      steps: Task[];
    };

    expect(result.parent).toMatchObject({
      title: "Launch post",
      status: "to-do",
      dueDate: "2026-05-20T14:00:00.000Z",
    });
    expect(result.steps.map((step) => [step.title, step.dueDate])).toEqual([
      ["Draft", "2026-05-18T14:00:00.000Z"],
      ["Send for approval", "2026-05-19T14:00:00.000Z"],
    ]);

    const relations = await db
      .select()
      .from(schema.taskRelationTable)
      .where(
        and(
          eq(schema.taskRelationTable.sourceTaskId, result.parent.id),
          eq(schema.taskRelationTable.relationType, "subtask"),
        ),
      );
    expect(relations.map((relation) => relation.targetTaskId).sort()).toEqual(
      result.steps.map((step) => step.id).sort(),
    );

    // The board names each step's parent.
    const board = await send(`/task/tasks/${project.id}`, "GET");
    const payload = (await board.json()) as {
      data: {
        columns: { tasks: { id: string; parentTaskId: string | null }[] }[];
      };
    };
    const tasks = payload.data.columns.flatMap((column) => column.tasks);
    expect(tasks.find((task) => task.id === result.parent.id)).toMatchObject({
      parentTaskId: null,
    });
    for (const step of result.steps) {
      expect(tasks.find((task) => task.id === step.id)).toMatchObject({
        parentTaskId: result.parent.id,
      });
    }
  });

  it("shifts a task and its subtasks by whole days", async () => {
    const { member, project } = await setup();
    const [parent, child, undated] = await db
      .insert(schema.taskTable)
      .values(
        [
          {
            title: "Post",
            startDate: new Date("2026-05-19T08:00:00.000Z"),
            dueDate: new Date("2026-05-20T14:00:00.000Z"),
          },
          { title: "Draft", dueDate: new Date("2026-05-18T14:00:00.000Z") },
          { title: "Undated" },
        ].map((task, index) => ({
          ...task,
          projectId: project.id,
          userId: member.user.id,
          status: "to-do",
          priority: "medium",
          number: index + 1,
          position: index + 1,
        })),
      )
      .returning();
    await db.insert(schema.taskRelationTable).values([
      {
        sourceTaskId: parent.id,
        targetTaskId: child.id,
        relationType: "subtask",
      },
      {
        sourceTaskId: parent.id,
        targetTaskId: undated.id,
        relationType: "subtask",
      },
    ]);

    const response = await send(`/task/${parent.id}/shift-dates`, "POST", {
      days: 3,
      includeSubtasks: true,
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as {
      task: Task;
      subtasks: Task[];
    };
    expect(result.task).toMatchObject({
      startDate: "2026-05-22T08:00:00.000Z",
      dueDate: "2026-05-23T14:00:00.000Z",
    });
    expect(result.subtasks.map((task) => [task.id, task.dueDate])).toEqual([
      [child.id, "2026-05-21T14:00:00.000Z"],
    ]);

    const [stillUndated] = await db
      .select()
      .from(schema.taskTable)
      .where(eq(schema.taskTable.id, undated.id));
    expect(stillUndated?.dueDate).toBeNull();
  });

  it("shifts only the task when subtasks are excluded", async () => {
    const { member, project } = await setup();
    const [parent, child] = await db
      .insert(schema.taskTable)
      .values(
        ["Post", "Draft"].map((title, index) => ({
          title,
          projectId: project.id,
          userId: member.user.id,
          status: "to-do",
          priority: "medium",
          number: index + 1,
          position: index + 1,
          dueDate: new Date("2026-05-20T14:00:00.000Z"),
        })),
      )
      .returning();
    await db.insert(schema.taskRelationTable).values({
      sourceTaskId: parent.id,
      targetTaskId: child.id,
      relationType: "subtask",
    });

    const response = await send(`/task/${parent.id}/shift-dates`, "POST", {
      days: -1,
      includeSubtasks: false,
    });
    const result = (await response.json()) as { subtasks: Task[] };
    expect(result.subtasks).toEqual([]);

    const [unchanged] = await db
      .select()
      .from(schema.taskTable)
      .where(eq(schema.taskTable.id, child.id));
    expect(unchanged?.dueDate?.toISOString()).toBe("2026-05-20T14:00:00.000Z");
  });
});
