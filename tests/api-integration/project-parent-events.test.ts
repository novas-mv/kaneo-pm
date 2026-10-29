import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import moveProject from "../../apps/api/src/project/controllers/move-project";
import setProjectParent from "../../apps/api/src/project/controllers/set-project-parent";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

const publish = vi.hoisted(() => vi.fn(async () => {}));
vi.mock(import("../../apps/api/src/events"), async (importOriginal) => ({
  ...(await importOriginal()),
  publishEvent: publish,
}));

function updatedIds() {
  return publish.mock.calls
    .filter(([name]) => name === "project.updated")
    .map(([, payload]) => (payload as { projectId: string }).projectId);
}

async function setParentDirect(projectId: string, parentProjectId: string) {
  await db
    .update(schema.projectTable)
    .set({ parentProjectId })
    .where(eq(schema.projectTable.id, projectId));
}

describe("API integration: project parent events", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    publish.mockReset();
  });

  it("set-parent with the current parent publishes nothing", async () => {
    const owner = await createWorkspaceMember({ role: "owner" });
    const { project: parent } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    const { project: child } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    await setParentDirect(child.id, parent.id);

    const sameParent = await setProjectParent(
      child.id,
      parent.id,
      owner.user.id,
    );
    expect(sameParent.parentProjectId).toBe(parent.id);

    const topLevel = await setProjectParent(parent.id, null, owner.user.id);
    expect(topLevel.parentProjectId).toBeNull();

    expect(publish).not.toHaveBeenCalled();
  });

  it("move publishes project.updated for detached children and the old parent", async () => {
    const owner = await createWorkspaceMember({ role: "owner" });
    const [target] = await db
      .insert(schema.workspaceTable)
      .values({
        id: `workspace-${randomUUID()}`,
        createdAt: new Date(),
        name: "Target Workspace",
        slug: `workspace-${randomUUID()}`,
      })
      .returning();
    await db.insert(schema.workspaceUserTable).values({
      workspaceId: target.id,
      userId: owner.user.id,
      role: "owner",
      joinedAt: new Date(),
    });
    const fixture = () =>
      createProjectFixture({ workspaceId: owner.workspace.id });
    const { project: oldParent } = await fixture();
    const { project: moved } = await fixture();
    const { project: firstChild } = await fixture();
    const { project: secondChild } = await fixture();
    const { project: bystander } = await fixture();
    // A moved project cannot be both a child and a parent; set the links
    // directly to cover both detachments in one move.
    await setParentDirect(moved.id, oldParent.id);
    await setParentDirect(firstChild.id, moved.id);
    await setParentDirect(secondChild.id, moved.id);

    await moveProject(moved.id, owner.workspace.id, target.id, owner.user.id);

    const ids = updatedIds();
    expect(new Set(ids)).toEqual(
      new Set([moved.id, oldParent.id, firstChild.id, secondChild.id]),
    );
    expect(ids).toHaveLength(new Set(ids).size);
    expect(ids).not.toContain(bystander.id);
  });
});
