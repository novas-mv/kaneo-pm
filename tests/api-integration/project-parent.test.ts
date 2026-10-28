import { randomUUID } from "node:crypto";
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

function setParentRequest(parentProjectId: string | null) {
  return {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ parentProjectId }),
  };
}

async function parentOf(projectId: string) {
  const [row] = await db
    .select({ parentProjectId: schema.projectTable.parentProjectId })
    .from(schema.projectTable)
    .where(eq(schema.projectTable.id, projectId));
  return row.parentProjectId;
}

async function setup() {
  const owner = await createWorkspaceMember({ role: "owner" });
  const a = await createProjectFixture({ workspaceId: owner.workspace.id });
  const b = await createProjectFixture({ workspaceId: owner.workspace.id });
  mockAuthenticatedSession(owner.user);
  const { app } = createApp();
  return { owner, a: a.project, b: b.project, app };
}

describe("API integration: setting a project's parent", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("sets a parent", async () => {
    const { a, b, app } = await setup();

    const response = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(b.id),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).parentProjectId).toBe(b.id);
    expect(await parentOf(a.id)).toBe(b.id);
  });

  it("clears a parent with null", async () => {
    const { a, b, app } = await setup();
    await app.request(`/api/project/${a.id}/parent`, setParentRequest(b.id));

    const response = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(null),
    );

    expect(response.status).toBe(200);
    expect(await parentOf(a.id)).toBeNull();
  });

  it("rejects itself as parent (400)", async () => {
    const { a, app } = await setup();

    const response = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(a.id),
    );

    expect(response.status).toBe(400);
    expect(await parentOf(a.id)).toBeNull();
  });

  it("rejects a parent that is already a child (400)", async () => {
    const { owner, a, b, app } = await setup();
    const { project: c } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    await app.request(`/api/project/${b.id}/parent`, setParentRequest(c.id));

    const response = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(b.id),
    );

    expect(response.status).toBe(400);
    expect(await parentOf(a.id)).toBeNull();
  });

  it("rejects nesting a project that has children (400)", async () => {
    const { owner, a, b, app } = await setup();
    const { project: c } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    await app.request(`/api/project/${c.id}/parent`, setParentRequest(a.id));

    const response = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(b.id),
    );

    expect(response.status).toBe(400);
    expect(await parentOf(a.id)).toBeNull();
  });

  it("rejects a parent in another workspace (400)", async () => {
    const { owner, a, app } = await setup();
    const other = await createWorkspaceMember({ role: "owner" });
    const { project: foreign } = await createProjectFixture({
      workspaceId: other.workspace.id,
    });
    // Same user belongs to both workspaces so access passes and the
    // workspace rule is what rejects.
    await db.insert(schema.workspaceUserTable).values({
      workspaceId: other.workspace.id,
      userId: owner.user.id,
      role: "owner",
      joinedAt: new Date(),
    });

    const response = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(foreign.id),
    );

    expect(response.status).toBe(400);
    expect(await parentOf(a.id)).toBeNull();
  });

  it("returns 404 for a nonexistent parent", async () => {
    const { a, app } = await setup();

    const response = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(`missing-${randomUUID()}`),
    );

    expect(response.status).toBe(404);
  });

  it("rejects when user lacks access to either project (403)", async () => {
    const { owner, a, b, app } = await setup();
    const restricted = await createWorkspaceMember({ role: "member" });
    await db.insert(schema.workspaceUserTable).values({
      workspaceId: owner.workspace.id,
      userId: restricted.user.id,
      role: "member",
      joinedAt: new Date(),
    });
    // Restricted membership limited to project a only: no access to b.
    await db.insert(schema.workspaceMemberAccessTable).values({
      workspaceId: owner.workspace.id,
      userId: restricted.user.id,
      projectAccess: "selected",
    });
    await db.insert(schema.workspaceMemberProjectTable).values({
      workspaceId: owner.workspace.id,
      userId: restricted.user.id,
      projectId: a.id,
    });
    void app;
    mockAuthenticatedSession(restricted.user);
    const { app: restrictedApp } = createApp();

    const response = await restrictedApp.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(b.id),
    );

    expect(response.status).toBe(403);
    expect(await parentOf(a.id)).toBeNull();
  });

  it("viewer without project:update gets 403 on PUT /project/{id}/parent", async () => {
    const { owner, a, b } = await setup();
    const viewer = await createWorkspaceMember({ role: "member" });
    await db.insert(schema.workspaceUserTable).values({
      workspaceId: owner.workspace.id,
      userId: viewer.user.id,
      role: "viewer",
      joinedAt: new Date(),
    });
    mockAuthenticatedSession(viewer.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(b.id),
    );

    expect(response.status).toBe(403);
    expect(await parentOf(a.id)).toBeNull();
  });
});
