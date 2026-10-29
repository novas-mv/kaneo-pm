import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { createRestrictedWorkspace } from "./helpers/project-access/create-restricted-workspace";

type ProjectListEntry = typeof schema.projectTable.$inferSelect & {
  statistics: {
    completionPercentage: number;
    totalTasks: number;
    dueDate: string | null;
  };
  tasks?: unknown;
};

async function seedTasks(
  projectId: string,
  tasks: { title: string; status: string; dueDate?: Date; number: number }[],
) {
  for (const task of tasks) {
    await db.insert(schema.taskTable).values({
      projectId,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate ?? null,
      number: task.number,
    });
  }
}

describe("API integration: project list payload", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("does not embed task rows in the project list response", async () => {
    const member = await createWorkspaceMember();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    await seedTasks(project.id, [
      { title: "First", status: "to-do", number: 1 },
      { title: "Second", status: "done", number: 2 },
      { title: "Third", status: "archived", number: 3 },
    ]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as ProjectListEntry[];
    expect(payload).toHaveLength(1);

    // The list endpoint is a summary view. Task rows must not ride along:
    // the payload grows without bound as a project fills up.
    expect(payload[0].tasks).toBeUndefined();
  });

  it("still reports accurate task statistics without embedding tasks", async () => {
    const member = await createWorkspaceMember();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const earliest = new Date("2026-01-10T00:00:00.000Z");
    const later = new Date("2026-03-01T00:00:00.000Z");

    await seedTasks(project.id, [
      { title: "Open", status: "to-do", dueDate: later, number: 1 },
      { title: "Closed", status: "done", dueDate: earliest, number: 2 },
      { title: "Filed", status: "archived", number: 3 },
      { title: "Doing", status: "in-progress", number: 4 },
    ]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );
    const payload = (await response.json()) as ProjectListEntry[];

    // done + archived count as completed: 2 of 4 => 50%
    expect(payload[0].statistics).toMatchObject({
      totalTasks: 4,
      completionPercentage: 50,
    });
    expect(new Date(payload[0].statistics.dueDate as string)).toEqual(earliest);
  });

  it("reports zeroed statistics for a project with no tasks", async () => {
    const member = await createWorkspaceMember();
    await createProjectFixture({ workspaceId: member.workspace.id });

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );
    const payload = (await response.json()) as ProjectListEntry[];

    expect(payload[0].statistics).toMatchObject({
      totalTasks: 0,
      completionPercentage: 0,
      dueDate: null,
    });
    expect(payload[0].tasks).toBeUndefined();
  });

  it("keeps statistics isolated per project", async () => {
    const member = await createWorkspaceMember();
    const { project: alpha } = await createProjectFixture({
      workspaceId: member.workspace.id,
      name: "Alpha",
      slug: "alpha",
    });
    const { project: beta } = await createProjectFixture({
      workspaceId: member.workspace.id,
      name: "Beta",
      slug: "beta",
    });

    await seedTasks(alpha.id, [
      { title: "A1", status: "done", number: 1 },
      { title: "A2", status: "to-do", number: 2 },
    ]);
    await seedTasks(beta.id, [{ title: "B1", status: "done", number: 1 }]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );
    const payload = (await response.json()) as ProjectListEntry[];

    const byName = new Map(payload.map((p) => [p.name, p]));
    expect(byName.get("Alpha")?.statistics).toMatchObject({
      totalTasks: 2,
      completionPercentage: 50,
    });
    expect(byName.get("Beta")?.statistics).toMatchObject({
      totalTasks: 1,
      completionPercentage: 100,
    });
  });
  describe("parentProjectId visibility", () => {
    async function nest(childId: string, parentId: string) {
      await db
        .update(schema.projectTable)
        .set({ parentProjectId: parentId })
        .where(eq(schema.projectTable.id, childId));
    }

    it("child of an inaccessible parent comes back with parentProjectId null", async () => {
      const ctx = await createRestrictedWorkspace();
      await nest(ctx.alpha.id, ctx.beta.id);
      mockAuthenticatedSession(ctx.restricted);

      const response = await createApp().app.request(
        `/api/project?workspaceId=${ctx.workspace.id}`,
      );

      const payload = (await response.json()) as ProjectListEntry[];
      expect(payload.map((p) => p.id)).toEqual([ctx.alpha.id]);
      expect(payload[0].parentProjectId).toBeNull();
    });

    it("child of an archived parent comes back with parentProjectId null when archived are excluded", async () => {
      const member = await createWorkspaceMember();
      const parent = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const child = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      await nest(child.project.id, parent.project.id);
      await db
        .update(schema.projectTable)
        .set({ archivedAt: new Date() })
        .where(eq(schema.projectTable.id, parent.project.id));
      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const excluded = (await (
        await app.request(`/api/project?workspaceId=${member.workspace.id}`)
      ).json()) as ProjectListEntry[];
      expect(excluded).toHaveLength(1);
      expect(excluded[0].parentProjectId).toBeNull();

      const included = (await (
        await app.request(
          `/api/project?workspaceId=${member.workspace.id}&includeArchived=true`,
        )
      ).json()) as ProjectListEntry[];
      expect(
        included.find((p) => p.id === child.project.id)?.parentProjectId,
      ).toBe(parent.project.id);
    });

    it("child keeps parentProjectId when parent is listed", async () => {
      const member = await createWorkspaceMember();
      const parent = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const child = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      await nest(child.project.id, parent.project.id);
      mockAuthenticatedSession(member.user);

      const payload = (await (
        await createApp().app.request(
          `/api/project?workspaceId=${member.workspace.id}`,
        )
      ).json()) as ProjectListEntry[];

      expect(
        payload.find((p) => p.id === child.project.id)?.parentProjectId,
      ).toBe(parent.project.id);
    });
  });
});
