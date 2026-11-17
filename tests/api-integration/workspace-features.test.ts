import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db from "../../apps/api/src/database";
import * as schema from "../../apps/api/src/database/schema";
import { createApp } from "../../apps/api/src/index";
import { requireWorkspaceFeature } from "../../apps/api/src/utils/require-workspace-feature";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";

type User = Parameters<typeof mockAuthenticatedSession>[0];

async function call(user: User, method: string, path: string, body?: unknown) {
  mockAuthenticatedSession(user);
  const { app } = createApp();
  const response = await app.request(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

beforeEach(resetTestDatabase);

describe("workspace features: toggle", () => {
  it("starts off, turns on and off, and shows on the workspace", async () => {
    const { user: owner, workspace } = await createWorkspaceMember({
      role: "owner",
    });

    const before = await call(owner, "GET", `/workspace/${workspace.id}`);
    expect(before.status).toBe(200);
    expect(before.body.features).toEqual({ construction: false });

    const on = await call(
      owner,
      "PUT",
      `/workspace/${workspace.id}/features/construction`,
      { enabled: true },
    );
    expect(on.status).toBe(200);
    expect(on.body).toEqual({ construction: true });

    const list = await call(owner, "GET", "/workspace");
    expect(list.body[0].features).toEqual({ construction: true });

    const off = await call(
      owner,
      "PUT",
      `/workspace/${workspace.id}/features/construction`,
      { enabled: false },
    );
    expect(off.body).toEqual({ construction: false });
  });

  it("keeps other stored keys when one feature changes", async () => {
    const { user: owner, workspace } = await createWorkspaceMember({
      role: "owner",
    });
    await db
      .update(schema.workspaceTable)
      .set({ features: { retired: true } })
      .where(eq(schema.workspaceTable.id, workspace.id));

    await call(
      owner,
      "PUT",
      `/workspace/${workspace.id}/features/construction`,
      {
        enabled: true,
      },
    );

    const [row] = await db
      .select({ features: schema.workspaceTable.features })
      .from(schema.workspaceTable)
      .where(eq(schema.workspaceTable.id, workspace.id));
    expect(row?.features).toEqual({ retired: true, construction: true });
  });

  it("rejects unknown keys and a missing body", async () => {
    const { user: owner, workspace } = await createWorkspaceMember({
      role: "owner",
    });
    const unknown = await call(
      owner,
      "PUT",
      `/workspace/${workspace.id}/features/retail`,
      { enabled: true },
    );
    expect(unknown.status).toBe(400);

    const noBody = await call(
      owner,
      "PUT",
      `/workspace/${workspace.id}/features/construction`,
      {},
    );
    expect(noBody.status).toBe(400);
  });

  it("needs workspace:manage_settings", async () => {
    const { workspace } = await createWorkspaceMember({ role: "owner" });
    const member = await addWorkspaceMember(workspace.id, "member");

    const response = await call(
      member,
      "PUT",
      `/workspace/${workspace.id}/features/construction`,
      { enabled: true },
    );
    expect(response.status).toBe(403);
  });

  it("hides workspaces the caller isn't in", async () => {
    const { workspace } = await createWorkspaceMember({ role: "owner" });
    const { user: outsider } = await createWorkspaceMember({ role: "owner" });

    const response = await call(
      outsider,
      "PUT",
      `/workspace/${workspace.id}/features/construction`,
      { enabled: true },
    );
    expect(response.status).toBe(404);
  });
});

describe("requireWorkspaceFeature", () => {
  function gatedApp(workspaceId: string | undefined) {
    const app = new Hono<{ Variables: { workspaceId?: string } }>();
    app.onError((error, c) =>
      error instanceof HTTPException
        ? c.json({ message: error.message }, error.status)
        : c.json({ message: "error" }, 500),
    );
    app.use(async (c, next) => {
      if (workspaceId) c.set("workspaceId", workspaceId);
      await next();
    });
    app.get("/gated", requireWorkspaceFeature("construction"), (c) =>
      c.json({ ok: true }),
    );
    return app;
  }

  it("answers 404 while the feature is off and passes once it is on", async () => {
    const { workspace } = await createWorkspaceMember({ role: "owner" });

    const off = await gatedApp(workspace.id).request("/gated");
    expect(off.status).toBe(404);

    await db
      .update(schema.workspaceTable)
      .set({ features: { construction: true } })
      .where(eq(schema.workspaceTable.id, workspace.id));

    const on = await gatedApp(workspace.id).request("/gated");
    expect(on.status).toBe(200);
  });

  it("answers 404 for a workspace that doesn't exist", async () => {
    const response = await gatedApp("missing").request("/gated");
    expect(response.status).toBe(404);
  });

  it("fails loudly when no workspace access middleware ran", async () => {
    const response = await gatedApp(undefined).request("/gated");
    expect(response.status).toBe(500);
  });
});
