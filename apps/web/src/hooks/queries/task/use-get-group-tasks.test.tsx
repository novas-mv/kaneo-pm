import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import queryClient from "@/query-client";
import useGetPublicProject from "../project/use-get-public-project";
import { useGetGroupTasks } from "./use-get-group-tasks";

const getTasks = vi.hoisted(() => vi.fn());
const getPublicProject = vi.hoisted(() => vi.fn());
vi.mock("@/fetchers/task/get-tasks", () => ({ default: getTasks }));
vi.mock("@/fetchers/project/get-public-project", () => ({
  default: getPublicProject,
}));
vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ workspaceId: "ws" }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const board = (id: string, taskIds: string[]) => ({
  id,
  name: id,
  slug: id,
  columns: [
    {
      id: "to-do",
      slug: "to-do",
      name: "To Do",
      isFinal: false,
      tasks: taskIds.map((taskId) => ({ id: taskId, projectId: id })),
    },
  ],
  plannedTasks: [],
  archivedTasks: [],
});

const boards: Record<string, ReturnType<typeof board>> = {
  parent: board("parent", ["p1"]),
  c1: board("c1", ["c1-task"]),
  c2: board("c2", ["c2-task"]),
  lonely: board("lonely", ["l1"]),
};

function seedProjects() {
  queryClient.setQueryData(
    ["projects", "ws"],
    [
      { id: "parent", parentProjectId: null },
      { id: "c1", parentProjectId: "parent" },
      { id: "c2", parentProjectId: "parent" },
      { id: "lonely", parentProjectId: null },
    ],
  );
}

const taskIds = (
  data: { columns: Array<{ tasks: Array<{ id: string }> }> } | undefined,
) => data?.columns.flatMap((column) => column.tasks.map((task) => task.id));
const fetchedIds = () => getTasks.mock.calls.map(([id]) => id);

beforeEach(() => {
  window.localStorage.clear();
  getTasks.mockImplementation(async (id: string) => boards[id]);
  seedProjects();
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  getTasks.mockReset();
  getPublicProject.mockReset();
  focusManager.setFocused(undefined);
});

describe("useGetGroupTasks", () => {
  it("scope own returns only the parent board", async () => {
    window.localStorage.setItem("kaneo:group-scope:parent", "own");
    const { result } = renderHook(() => useGetGroupTasks("parent"), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.data).toEqual(boards.parent));
    expect(result.current.isRollup).toBe(false);
    expect(fetchedIds()).toEqual(["parent"]);
  });

  it("everything merges children boards", async () => {
    const { result } = renderHook(() => useGetGroupTasks("parent"), {
      wrapper: Wrapper,
    });
    await waitFor(() =>
      expect(taskIds(result.current.data)).toEqual([
        "p1",
        "c1-task",
        "c2-task",
      ]),
    );
    expect(result.current.isRollup).toBe(true);
    expect(result.current.ownData).toEqual(boards.parent);
    // The merged board never enters the parent's own cache entry.
    expect(queryClient.getQueryData(["tasks", "parent"])).toEqual(
      boards.parent,
    );
  });

  it("a child query error drops that child and the parent board still renders", async () => {
    queryClient.setQueryDefaults(["tasks", "c1"], { retry: false });
    getTasks.mockImplementation(async (id: string) => {
      if (id === "c1") throw new Error("forbidden");
      return boards[id];
    });
    const { result } = renderHook(() => useGetGroupTasks("parent"), {
      wrapper: Wrapper,
    });
    await waitFor(() =>
      expect(taskIds(result.current.data)).toEqual(["p1", "c2-task"]),
    );
    expect(result.current.isError).toBe(false);
  });

  it("project without children issues exactly one board query", async () => {
    const { result } = renderHook(() => useGetGroupTasks("lonely"), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.data).toEqual(boards.lonely));
    expect(result.current.isRollup).toBe(false);
    expect(fetchedIds()).toEqual(["lonely"]);
  });

  it("child queries do not refetch on window focus", async () => {
    const { result } = renderHook(() => useGetGroupTasks("parent"), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(taskIds(result.current.data)).toHaveLength(3));
    expect(fetchedIds().sort()).toEqual(["c1", "c2", "parent"]);
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await waitFor(() =>
      expect(fetchedIds().filter((id) => id === "parent")).toHaveLength(2),
    );
    expect(fetchedIds().filter((id) => id !== "parent")).toEqual(["c1", "c2"]);
  });
});

it("public project view issues no child queries", async () => {
  getPublicProject.mockResolvedValue(boards.parent);
  const { result } = renderHook(() => useGetPublicProject("parent"), {
    wrapper: Wrapper,
  });
  await waitFor(() => expect(result.current.data).toEqual(boards.parent));
  expect(getTasks).not.toHaveBeenCalled();
  expect(
    queryClient.getQueryCache().findAll({ queryKey: ["tasks"] }),
  ).toHaveLength(0);
});
