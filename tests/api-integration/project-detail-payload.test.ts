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

beforeEach(async () => {
  await resetTestDatabase();
});

describe("project detail payload", () => {
  it("returns only project metadata even when the project has large tasks", async () => {
    const member = await createWorkspaceMember();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    await db.insert(schema.taskTable).values({
      projectId: project.id,
      title: "Task",
      description: "x".repeat(100_000),
    });
    mockAuthenticatedSession(member.user);
    const response = await createApp().app.request(
      `/api/project/${project.id}`,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(project.id);
    expect(body).not.toHaveProperty("tasks");
    expect(JSON.stringify(body).length).toBeLessThan(2000);
  });

  it("GET /project/{id} returns parentProjectId null for a hidden parent", async () => {
    const ctx = await createRestrictedWorkspace();
    await db
      .update(schema.projectTable)
      .set({ parentProjectId: ctx.beta.id })
      .where(eq(schema.projectTable.id, ctx.alpha.id));
    mockAuthenticatedSession(ctx.restricted);
    const { app } = createApp();

    const hidden = await app.request(`/api/project/${ctx.alpha.id}`);
    expect(hidden.status).toBe(200);
    expect((await hidden.json()).parentProjectId).toBeNull();

    mockAuthenticatedSession(ctx.owner);
    const visible = await app.request(`/api/project/${ctx.alpha.id}`);
    expect((await visible.json()).parentProjectId).toBe(ctx.beta.id);
  });
});
