import { once } from "node:events";
import { eq } from "drizzle-orm";
import type { IncomingMessage } from "node:http";
import { createRequire } from "node:module";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { serve } from "../../apps/api/node_modules/@hono/node-server";
import type { NodeWebSocket } from "../../apps/api/node_modules/@hono/node-ws";
import { auth } from "../../apps/api/src/auth";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import {
  broadcastToProject,
  initializeWebSocketAdapter,
  shutdownWebSocketAdapter,
} from "../../apps/api/src/ws";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";
import { addWorkspaceMember } from "./helpers/project-access/add-workspace-member";

type Socket = NodeWebSocket["wss"]["clients"] extends Set<infer S> ? S : never;
const apiRequire = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const nodeWsRequire = createRequire(apiRequire.resolve("@hono/node-ws"));
const WebSocket: new (
  url: string,
  options: { headers: Record<string, string> },
) => Socket = nodeWsRequire("ws").WebSocket;

let server: ReturnType<typeof serve>;
let baseUrl: string;
const sockets: Socket[] = [];

async function connect(projectId: string, token: string) {
  const socket = new WebSocket(`${baseUrl}/api/ws/${projectId}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  sockets.push(socket);
  socket.on("error", () => {});
  const status = await new Promise<number>((resolve) => {
    socket.once("open", () => resolve(101));
    socket.once(
      "unexpected-response",
      (_request: unknown, response: IncomingMessage) => {
        response.resume();
        resolve(response.statusCode ?? 0);
        socket.terminate();
      },
    );
  });
  return { socket, status };
}

async function startServer(users: Record<string, { id: string }>) {
  const sessions = new Map<string, unknown>();
  for (const [token, user] of Object.entries(users)) {
    mockAuthenticatedSession(user as never);
    sessions.set(token, await auth.api.getSession({ headers: new Headers() }));
  }
  vi.spyOn(auth.api, "getSession").mockImplementation((async ({
    headers,
  }: {
    headers: Headers;
  }) => {
    const header = new Headers(headers).get("authorization") ?? "";
    return sessions.get(header.replace("Bearer ", "")) ?? null;
  }) as never);
  const created = createApp();
  server = serve({ fetch: created.app.fetch, hostname: "127.0.0.1", port: 0 });
  created.injectWebSocket(server);
  if (!server.listening) await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  baseUrl = `ws://127.0.0.1:${address.port}`;
}

beforeEach(async () => {
  await resetTestDatabase();
  vi.stubEnv("CORS_ORIGINS", "https://extra.example.test");
});

afterEach(async () => {
  await shutdownWebSocketAdapter();
  for (const socket of sockets.splice(0)) socket.terminate();
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  vi.unstubAllEnvs();
});

describe("personal project WebSocket", () => {
  it("delivers to the owner and refuses everyone else, including admins", async () => {
    const { user: workspaceOwner, workspace } = await createWorkspaceMember({
      role: "owner",
    });
    const owner = await addWorkspaceMember(workspace.id);
    const admin = await addWorkspaceMember(workspace.id, "admin");
    const [instanceAdmin] = await db
      .insert(schema.userTable)
      .values({
        id: "instance-admin",
        email: "instance-admin@example.com",
        emailVerified: true,
        name: "Instance admin",
        role: "user,admin",
      })
      .returning();
    const [personal] = await db
      .insert(schema.projectTable)
      .values({
        workspaceId: workspace.id,
        name: "Personal",
        slug: "me-test01",
        ownerUserId: owner.id,
      })
      .returning();

    await startServer({
      owner,
      workspaceOwner,
      admin,
      instanceAdmin,
    });
    await initializeWebSocketAdapter();

    for (const token of ["workspaceOwner", "admin", "instanceAdmin"]) {
      const { status } = await connect(personal.id, token);
      expect({ token, status }).toEqual({ token, status: 403 });
    }

    const mine = await connect(personal.id, "owner");
    expect(mine.status).toBe(101);
    const update = {
      type: "TASK_UPDATED",
      projectId: personal.id,
      taskId: "private-task",
    };
    const received = once(mine.socket, "message");
    broadcastToProject(personal.id, update);
    expect(JSON.parse((await received)[0].toString())).toEqual(update);
  });

  it("drops a connection whose access to the project is gone before delivery", async () => {
    const { user: workspaceOwner, workspace } = await createWorkspaceMember({
      role: "owner",
    });
    const owner = await addWorkspaceMember(workspace.id);
    const [project] = await db
      .insert(schema.projectTable)
      .values({ workspaceId: workspace.id, name: "Work", slug: "work01" })
      .returning();

    await startServer({ owner, workspaceOwner });
    await initializeWebSocketAdapter();

    // A teammate is subscribed to an ordinary project...
    const watcher = await connect(project.id, "workspaceOwner");
    expect(watcher.status).toBe(101);
    const leaked = vi.fn();
    watcher.socket.on("message", leaked);

    // ...which then becomes someone else's private project.
    await db
      .update(schema.projectTable)
      .set({ ownerUserId: owner.id })
      .where(eq(schema.projectTable.id, project.id));

    const closed = once(watcher.socket, "close");
    broadcastToProject(project.id, {
      type: "TASK_UPDATED",
      projectId: project.id,
      taskId: "private-task",
    });
    expect((await closed)[0]).toBe(1008);
    expect(leaked).not.toHaveBeenCalled();
  });
});
