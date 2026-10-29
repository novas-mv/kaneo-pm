import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it } from "vite-plus/test";
import type { ProjectWithTasks } from "@/types/project";
import { useTaskSheetProjectId } from "./use-task-sheet-project-id";

afterEach(cleanup);

const board = (taskProjects: Record<string, string>) =>
  ({
    id: "parent",
    columns: [
      {
        id: "to-do",
        tasks: Object.entries(taskProjects).map(([id, projectId]) => ({
          id,
          projectId,
        })),
      },
    ],
    plannedTasks: [],
    archivedTasks: [],
  }) as unknown as ProjectWithTasks;

function setup(client = new QueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(
    ({ shown, taskId }: { shown: ProjectWithTasks; taskId?: string }) =>
      useTaskSheetProjectId(shown, taskId, "parent"),
    {
      wrapper,
      initialProps: {
        shown: board({ child: "migration", own: "parent" }),
        taskId: "child" as string | undefined,
      },
    },
  );
}

it("keeps an open child task on its project after switching to own scope", () => {
  const { result, rerender } = setup();
  expect(result.current).toBe("migration");
  rerender({ shown: board({ own: "parent" }), taskId: "child" });
  expect(result.current).toBe("migration");
  // While the sheet animates closed it stays on the same project.
  rerender({ shown: board({ own: "parent" }), taskId: undefined });
  expect(result.current).toBe("migration");
});

it("uses the cached task's project when the task is not on the board", () => {
  const client = new QueryClient();
  client.setQueryData(["task", "deep"], { id: "deep", projectId: "sales" });
  const { result, rerender } = setup(client);
  rerender({ shown: board({ own: "parent" }), taskId: "deep" });
  expect(result.current).toBe("sales");
});

it("falls back to the open project for a task it cannot place", () => {
  const { result, rerender } = setup();
  rerender({ shown: board({ own: "parent" }), taskId: "own" });
  expect(result.current).toBe("parent");
  rerender({ shown: board({ own: "parent" }), taskId: "unknown" });
  expect(result.current).toBe("parent");
});
