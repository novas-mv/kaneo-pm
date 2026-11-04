import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";
import { projectAccessApi } from "./helpers/project-access/project-access-api";

type Viewer = typeof schema.userTable.$inferSelect;

async function setup() {
  const { user: workspaceOwner, workspace } = await createWorkspaceMember({
    role: "owner",
  });
  const owner = await addWorkspaceMember(workspace.id);
  const teammate = await addWorkspaceMember(workspace.id);
  const workspaceAdmin = await addWorkspaceMember(workspace.id, "admin");
  const [instanceAdmin] = await db
    .insert(schema.userTable)
    .values({
      id: `user-${randomUUID()}`,
      email: `${randomUUID()}@example.com`,
      emailVerified: true,
      name: "Instance admin",
      role: "user,admin",
    })
    .returning();
  const work = await createProjectFixture({
    workspaceId: workspace.id,
    name: "Work",
  });

  const as = (viewer: Viewer) => {
    mockAuthenticatedSession(viewer);
    return projectAccessApi();
  };

  mockAuthenticatedSession(owner);
  const request = projectAccessApi();
  const created = await request("/project/personal", {
    method: "POST",
    body: { workspaceId: workspace.id },
  });
  const personal = (await created.json()) as { id: string; slug: string };
  const taskResponse = await request(`/task/${personal.id}`, {
    method: "POST",
    body: {
      title: "Secret errand",
      description: "private note",
      priority: "high",
      status: "to-do",
    },
  });
  const task = (await taskResponse.json()) as { id: string };

  return {
    workspace,
    owner,
    teammate,
    workspaceOwner,
    workspaceAdmin,
    instanceAdmin,
    work,
    personal,
    task,
    as,
  };
}

beforeEach(resetTestDatabase);

describe("personal project", () => {
  it("creates one project per user and is idempotent", async () => {
    const ctx = await setup();
    const request = ctx.as(ctx.owner);

    const again = await Promise.all(
      [1, 2, 3].map(() =>
        request("/project/personal", {
          method: "POST",
          body: { workspaceId: ctx.workspace.id },
        }),
      ),
    );
    for (const response of again) {
      expect(response.status).toBe(200);
      expect(((await response.json()) as { id: string }).id).toBe(
        ctx.personal.id,
      );
    }

    const rows = await db
      .select()
      .from(schema.projectTable)
      .where(eq(schema.projectTable.ownerUserId, ctx.owner.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ownerUserId).toBe(ctx.owner.id);
  });

  it("auto-assigns personal tasks to the owner and lists them in My tasks", async () => {
    const ctx = await setup();
    const response = await ctx.as(ctx.owner)(
      `/task/assigned?workspaceId=${ctx.workspace.id}`,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      tasks: { id: string; isPersonal: boolean }[];
    };
    expect(body.tasks).toEqual([
      expect.objectContaining({ id: ctx.task.id, isPersonal: true }),
    ]);
  });

  it("rejects assigning someone else to a personal task", async () => {
    const ctx = await setup();
    const response = await ctx.as(ctx.owner)(`/task/assignee/${ctx.task.id}`, {
      method: "PUT",
      body: { userId: ctx.teammate.id },
    });
    expect(response.ok).toBe(false);
  });

  for (const [label, pick] of [
    ["teammate", (c: Awaited<ReturnType<typeof setup>>) => c.teammate],
    [
      "workspace owner",
      (c: Awaited<ReturnType<typeof setup>>) => c.workspaceOwner,
    ],
    [
      "workspace admin",
      (c: Awaited<ReturnType<typeof setup>>) => c.workspaceAdmin,
    ],
    [
      "instance admin",
      (c: Awaited<ReturnType<typeof setup>>) => c.instanceAdmin,
    ],
  ] as const) {
    describe(`as ${label}`, () => {
      it("cannot list, read or search the personal project", async () => {
        const ctx = await setup();
        const request = ctx.as(pick(ctx));

        const list = await request(`/project?workspaceId=${ctx.workspace.id}`);
        expect(list.status).toBe(200);
        const projects = (await list.json()) as { id: string }[];
        expect(projects.map((p) => p.id)).toEqual([ctx.work.project.id]);

        const hidden = [
          `/project/${ctx.personal.id}`,
          `/task/tasks/${ctx.personal.id}`,
          `/task/${ctx.task.id}`,
          `/task/${ctx.task.id}/description`,
          `/task/export/${ctx.personal.id}`,
          `/column/${ctx.personal.id}`,
          `/activity/${ctx.task.id}`,
          `/comment/${ctx.task.id}`,
          `/label/task/${ctx.task.id}`,
          `/calendar-feed/project/${ctx.personal.id}`,
        ];
        for (const path of hidden) {
          const status = (await request(path)).status;
          expect({ path, status }).toEqual({ path, status: 403 });
        }

        const search = await request(
          `/search?workspaceId=${ctx.workspace.id}&q=Secret&type=all`,
        );
        expect(
          ((await search.json()) as { results: unknown[] }).results,
        ).toEqual([]);

        const assigned = await request(
          `/task/assigned?workspaceId=${ctx.workspace.id}`,
        );
        expect(JSON.stringify(await assigned.json())).not.toContain("Secret");

        const activity = await request(
          `/activity/workspace/${ctx.workspace.id}`,
        );
        expect(JSON.stringify(await activity.json())).not.toContain("Secret");
      });

      it("cannot change or create tasks in the personal project", async () => {
        const ctx = await setup();
        const request = ctx.as(pick(ctx));

        const writes: [string, string, unknown][] = [
          ["PUT", `/task/title/${ctx.task.id}`, { title: "Hacked" }],
          ["DELETE", `/task/${ctx.task.id}`, undefined],
          [
            "POST",
            `/task/${ctx.personal.id}`,
            {
              title: "Planted",
              description: "",
              priority: "low",
              status: "to-do",
            },
          ],
          [
            "PUT",
            `/project/${ctx.personal.id}`,
            {
              name: "x",
              icon: "x",
              slug: "x",
              description: "",
              isPublic: true,
            },
          ],
          ["DELETE", `/project/${ctx.personal.id}`, undefined],
        ];
        for (const [method, path, body] of writes) {
          const status = (await request(path, { method, body })).status;
          expect({ method, path, status }).toEqual({
            method,
            path,
            status: 403,
          });
        }

        const [row] = await db
          .select()
          .from(schema.taskTable)
          .where(eq(schema.taskTable.id, ctx.task.id));
        expect(row?.title).toBe("Secret errand");
      });
    });
  }

  it("cannot be made public, nested or archived by its owner", async () => {
    const ctx = await setup();
    await db
      .update(schema.workspaceUserTable)
      .set({ role: "admin" })
      .where(eq(schema.workspaceUserTable.userId, ctx.owner.id));
    const request = ctx.as(ctx.owner);

    const publish = await request(`/project/${ctx.personal.id}`, {
      method: "PUT",
      body: {
        name: "Personal",
        icon: "Lock",
        slug: ctx.personal.slug,
        description: "",
        isPublic: true,
      },
    });
    expect(publish.status).toBe(400);

    const nest = await request(`/project/${ctx.personal.id}/parent`, {
      method: "PUT",
      body: { parentProjectId: ctx.work.project.id },
    });
    expect(nest.status).toBe(400);

    const archive = await request(`/project/${ctx.personal.id}/archive`, {
      method: "PUT",
    });
    expect(archive.status).toBe(400);
  });

  it("lets the owner see and edit their own project", async () => {
    const ctx = await setup();
    const request = ctx.as(ctx.owner);
    const search = await request(
      `/search?workspaceId=${ctx.workspace.id}&q=Secret&type=tasks`,
    );
    expect(
      ((await search.json()) as { results: unknown[] }).results,
    ).toHaveLength(1);
    const list = await request(`/project?workspaceId=${ctx.workspace.id}`);
    const projects = (await list.json()) as {
      id: string;
      ownerUserId: string | null;
    }[];
    expect(projects.find((p) => p.id === ctx.personal.id)?.ownerUserId).toBe(
      ctx.owner.id,
    );
    expect((await request(`/task/${ctx.task.id}`)).status).toBe(200);
    expect(
      (
        await request(`/task/title/${ctx.task.id}`, {
          method: "PUT",
          body: { title: "Renamed" },
        })
      ).status,
    ).toBe(200);
  });
});
