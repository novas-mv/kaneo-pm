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

const NESTING_REJECTED = "This project can't be nested here";

async function expectNestingRejected(response: Response) {
  expect(response.status).toBe(400);
  expect((await response.json()).message).toBe(NESTING_REJECTED);
}

async function addRestrictedMember(
  workspaceId: string,
  projectIds: string[],
  // Admin has project:update; the selected-projects rule is what limits them.
  role = "admin",
) {
  const restricted = await createWorkspaceMember({ role: "member" });
  await db.insert(schema.workspaceUserTable).values({
    workspaceId,
    userId: restricted.user.id,
    role,
    joinedAt: new Date(),
  });
  await db.insert(schema.workspaceMemberAccessTable).values({
    workspaceId,
    userId: restricted.user.id,
    projectAccess: "selected",
  });
  if (projectIds.length > 0) {
    await db.insert(schema.workspaceMemberProjectTable).values(
      projectIds.map((projectId) => ({
        workspaceId,
        userId: restricted.user.id,
        projectId,
      })),
    );
  }
  return restricted;
}

async function setParentDirect(projectId: string, parentProjectId: string) {
  await db
    .update(schema.projectTable)
    .set({ parentProjectId })
    .where(eq(schema.projectTable.id, projectId));
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

    await expectNestingRejected(response);
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

    await expectNestingRejected(response);
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

    await expectNestingRejected(response);
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

  it("treats an inaccessible parent like a nonexistent one (404)", async () => {
    const { owner, a, b } = await setup();
    const restricted = await addRestrictedMember(owner.workspace.id, [a.id]);
    mockAuthenticatedSession(restricted.user);
    const { app } = createApp();

    const hidden = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(b.id),
    );
    const missing = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(`missing-${randomUUID()}`),
    );

    expect(hidden.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await hidden.json()).toEqual(await missing.json());
    expect(await parentOf(a.id)).toBeNull();
  });

  it("rejects when user lacks access to the project itself (403)", async () => {
    const { owner, a, b } = await setup();
    const restricted = await addRestrictedMember(owner.workspace.id, [b.id]);
    mockAuthenticatedSession(restricted.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(b.id),
    );

    expect(response.status).toBe(403);
    expect(await parentOf(a.id)).toBeNull();
  });

  it("does not reveal a hidden parent of the target", async () => {
    const { owner, a, b } = await setup();
    const { project: hiddenParent } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    // b is a child of a parent the restricted member cannot see, so b looks
    // top-level to them.
    await setParentDirect(b.id, hiddenParent.id);
    const restricted = await addRestrictedMember(owner.workspace.id, [
      a.id,
      b.id,
    ]);
    mockAuthenticatedSession(restricted.user);
    const { app } = createApp();

    const probe = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(b.id),
    );
    const self = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(a.id),
    );

    expect(probe.status).toBe(400);
    expect(await probe.json()).toEqual(await self.json());
    expect(await parentOf(a.id)).toBeNull();
  });

  it("does not reveal hidden children of the project", async () => {
    const { owner, a, b } = await setup();
    const { project: hiddenChild } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    await setParentDirect(hiddenChild.id, a.id);
    const restricted = await addRestrictedMember(owner.workspace.id, [
      a.id,
      b.id,
    ]);
    mockAuthenticatedSession(restricted.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(b.id),
    );

    await expectNestingRejected(response);
    expect(await parentOf(a.id)).toBeNull();
  });

  it("rejects an archived parent (400)", async () => {
    const { a, b, app } = await setup();
    await db
      .update(schema.projectTable)
      .set({ archivedAt: new Date() })
      .where(eq(schema.projectTable.id, b.id));

    const response = await app.request(
      `/api/project/${a.id}/parent`,
      setParentRequest(b.id),
    );

    await expectNestingRejected(response);
    expect(await parentOf(a.id)).toBeNull();
  });

  it("reorder returns null parentProjectId for a hidden parent", async () => {
    const { owner, a, b } = await setup();
    const { project: hiddenParent } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    await setParentDirect(a.id, hiddenParent.id);
    const restricted = await addRestrictedMember(owner.workspace.id, [
      a.id,
      b.id,
    ]);
    mockAuthenticatedSession(restricted.user);
    const { app } = createApp();

    const reorder = await app.request(
      `/api/project/reorder?workspaceId=${owner.workspace.id}`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projects: [
            { id: a.id, position: 0 },
            { id: b.id, position: 1 },
          ],
        }),
      },
    );
    expect(reorder.status).toBe(200);
    const reordered = (await reorder.json()) as {
      id: string;
      parentProjectId: string | null;
    }[];
    expect(reordered.find((row) => row.id === a.id)?.parentProjectId).toBe(
      null,
    );
    expect(await parentOf(a.id)).toBe(hiddenParent.id);
  });

  it("update and unarchive responses return null parentProjectId for a hidden parent", async () => {
    const { owner, a } = await setup();
    const { project: hiddenParent } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    await setParentDirect(a.id, hiddenParent.id);
    const restricted = await addRestrictedMember(owner.workspace.id, [a.id]);
    mockAuthenticatedSession(restricted.user);
    const { app } = createApp();

    const updated = await app.request(`/api/project/${a.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Renamed",
        icon: a.icon,
        slug: a.slug,
        description: a.description ?? "",
        isPublic: false,
      }),
    });
    expect(updated.status).toBe(200);
    expect((await updated.json()).parentProjectId).toBeNull();

    await app.request(`/api/project/${a.id}/archive`, { method: "PUT" });
    const unarchived = await app.request(`/api/project/${a.id}/unarchive`, {
      method: "PUT",
    });
    expect(unarchived.status).toBe(200);
    expect((await unarchived.json()).parentProjectId).toBeNull();
    expect(await parentOf(a.id)).toBe(hiddenParent.id);
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
