import { beforeEach, describe, expect, it } from "vite-plus/test";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";
import { restrictToProjects } from "./helpers/project-access/restrict-to-projects";

type User = Parameters<typeof mockAuthenticatedSession>[0];

async function call(user: User, method: string, path: string, body?: unknown) {
  mockAuthenticatedSession(user);
  const { app } = createApp();
  const response = await app.request(`/api/resource-link${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

const link = (title: string, url = "https://example.com") => ({ title, url });

beforeEach(async () => {
  await resetTestDatabase();
});

describe("workspace resource links", () => {
  it("lets managers curate the list and every member read it", async () => {
    const { user: owner, workspace } = await createWorkspaceMember({
      role: "owner",
    });
    const viewer = await addWorkspaceMember(workspace.id, "viewer");
    const base = `/workspace/${workspace.id}`;

    const first = await call(owner, "POST", base, {
      ...link("Brand", "https://drive.google.com/brand"),
      description: "Logos and fonts",
      emoji: "📁",
    });
    const second = await call(owner, "POST", base, link("Figma"));
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      projectId: null,
      position: 0,
      description: "Logos and fonts",
      emoji: "📁",
    });
    expect(second.body.position).toBe(1);

    const reordered = await call(owner, "PUT", `${base}/order`, {
      ids: [second.body.id, first.body.id],
    });
    expect(reordered.status).toBe(200);
    expect(reordered.body.map((item: { title: string }) => item.title)).toEqual(
      ["Figma", "Brand"],
    );

    const edited = await call(owner, "PATCH", `${base}/${first.body.id}`, {
      title: "Brand kit",
      description: null,
    });
    expect(edited.body).toMatchObject({
      title: "Brand kit",
      description: null,
    });

    const asViewer = await call(viewer, "GET", base);
    expect(asViewer.status).toBe(200);
    expect(asViewer.body.map((item: { title: string }) => item.title)).toEqual([
      "Figma",
      "Brand kit",
    ]);

    const removed = await call(owner, "DELETE", `${base}/${second.body.id}`);
    expect(removed.status).toBe(200);
    expect((await call(owner, "GET", base)).body).toHaveLength(1);
  });

  it("rejects non-http URLs and writes from members without manage_settings", async () => {
    const { user: owner, workspace } = await createWorkspaceMember({
      role: "owner",
    });
    const member = await addWorkspaceMember(workspace.id, "member");
    const base = `/workspace/${workspace.id}`;

    expect(
      (await call(owner, "POST", base, link("Bad", "javascript:alert(1)")))
        .status,
    ).toBe(400);

    const created = await call(owner, "POST", base, link("Docs"));
    expect((await call(member, "POST", base, link("Nope"))).status).toBe(403);
    expect(
      (
        await call(member, "PATCH", `${base}/${created.body.id}`, {
          title: "x",
        })
      ).status,
    ).toBe(403);
    expect(
      (await call(member, "DELETE", `${base}/${created.body.id}`)).status,
    ).toBe(403);
    expect(
      (await call(member, "PUT", `${base}/order`, { ids: [created.body.id] }))
        .status,
    ).toBe(403);
  });

  it("never exposes or changes links across workspaces", async () => {
    const mine = await createWorkspaceMember({ role: "owner" });
    const theirs = await createWorkspaceMember({ role: "owner" });
    const secret = await call(
      theirs.user,
      "POST",
      `/workspace/${theirs.workspace.id}`,
      link("Secret"),
    );

    const list = await call(
      mine.user,
      "GET",
      `/workspace/${theirs.workspace.id}`,
    );
    expect(list.status).toBeGreaterThanOrEqual(403);

    const viaOwnWorkspace = `/workspace/${mine.workspace.id}/${secret.body.id}`;
    expect(
      (await call(mine.user, "PATCH", viaOwnWorkspace, { title: "Pwned" }))
        .status,
    ).toBe(404);
    expect((await call(mine.user, "DELETE", viaOwnWorkspace)).status).toBe(404);
    expect(
      (
        await call(mine.user, "PUT", `/workspace/${mine.workspace.id}/order`, {
          ids: [secret.body.id],
        })
      ).status,
    ).toBe(404);
    expect(
      (await call(theirs.user, "GET", `/workspace/${theirs.workspace.id}`))
        .body[0].title,
    ).toBe("Secret");
  });
});

describe("project resource links", () => {
  it("keeps project lists apart from the workspace list and from each other", async () => {
    const { user: owner, workspace } = await createWorkspaceMember({
      role: "owner",
    });
    const alpha = (await createProjectFixture({ workspaceId: workspace.id }))
      .project;
    const beta = (await createProjectFixture({ workspaceId: workspace.id }))
      .project;

    await call(owner, "POST", `/workspace/${workspace.id}`, link("Company"));
    const alphaLink = await call(
      owner,
      "POST",
      `/project/${alpha.id}`,
      link("Alpha"),
    );
    await call(owner, "POST", `/project/${beta.id}`, link("Beta"));

    expect(alphaLink.body).toMatchObject({
      projectId: alpha.id,
      workspaceId: workspace.id,
      position: 0,
    });
    const titles = async (path: string) =>
      (await call(owner, "GET", path)).body.map(
        (item: { title: string }) => item.title,
      );
    expect(await titles(`/workspace/${workspace.id}`)).toEqual(["Company"]);
    expect(await titles(`/project/${alpha.id}`)).toEqual(["Alpha"]);
    expect(await titles(`/project/${beta.id}`)).toEqual(["Beta"]);

    expect(
      (await call(owner, "DELETE", `/project/${beta.id}/${alphaLink.body.id}`))
        .status,
    ).toBe(404);
  });

  it("hides lists of projects a limited member cannot open", async () => {
    const { user: owner, workspace } = await createWorkspaceMember({
      role: "owner",
    });
    const alpha = (await createProjectFixture({ workspaceId: workspace.id }))
      .project;
    const beta = (await createProjectFixture({ workspaceId: workspace.id }))
      .project;
    const contractor = await addWorkspaceMember(workspace.id, "member");
    await restrictToProjects(workspace.id, contractor.id, [alpha.id]);

    await call(owner, "POST", `/project/${alpha.id}`, link("Alpha"));
    await call(owner, "POST", `/project/${beta.id}`, link("Beta"));

    const visible = await call(contractor, "GET", `/project/${alpha.id}`);
    expect(visible.status).toBe(200);
    expect(visible.body).toHaveLength(1);
    expect((await call(contractor, "GET", `/project/${beta.id}`)).status).toBe(
      403,
    );
    expect(
      (await call(contractor, "POST", `/project/${alpha.id}`, link("Nope")))
        .status,
    ).toBe(403);
  });
});

describe("resource link list integrity", () => {
  it("keeps positions unique when a reorder lists only some links", async () => {
    const { user: owner, workspace } = await createWorkspaceMember({
      role: "owner",
    });
    const base = `/workspace/${workspace.id}`;
    const ids: string[] = [];
    for (const title of ["A", "B", "C"]) {
      ids.push((await call(owner, "POST", base, link(title))).body.id);
    }

    const reordered = await call(owner, "PUT", `${base}/order`, {
      ids: [ids[2]],
    });
    expect(reordered.status).toBe(200);
    expect(reordered.body.map((item: { title: string }) => item.title)).toEqual(
      ["C", "A", "B"],
    );
    expect(
      reordered.body.map((item: { position: number }) => item.position),
    ).toEqual([0, 1, 2]);
  });

  it("never exceeds the list cap or reuses a position under concurrent creates", async () => {
    const { user: owner, workspace } = await createWorkspaceMember({
      role: "owner",
    });
    const base = `/workspace/${workspace.id}`;

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        call(owner, "POST", base, link(`Link ${index}`)),
      ),
    );
    expect(results.every((result) => result.status === 201)).toBe(true);

    const list = await call(owner, "GET", base);
    expect(
      list.body.map((item: { position: number }) => item.position).sort(),
    ).toEqual([0, 1, 2, 3, 4]);
  });
});
