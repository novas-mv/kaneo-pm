import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import {
  type Rollup,
  RollupContext,
} from "@/components/project/rollup-context";
import useBulkSelectionStore from "@/store/bulk-selection";
import type Task from "@/types/task";
import TaskCardContent from "./task-card/task-card-content";

const menu = vi.hoisted(() => ({ props: [] as unknown[] }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en-US" },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));
vi.mock("@/store/project", () => ({
  default: () => ({
    project: {
      id: "parent",
      slug: "PAR",
      columns: [{ id: "to-do", slug: "to-do", isFinal: false }],
    },
  }),
}));
vi.mock("@/store/user-preferences", () => ({
  useUserPreferencesStore: () => ({ showTaskNumbers: true }),
}));
vi.mock("@/hooks/mutations/task/use-delete-task", () => ({
  useDeleteTask: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/queries/workspace/use-active-workspace", () => ({
  default: () => ({ data: { id: "ws", slug: "ws" } }),
}));
vi.mock(
  "@/hooks/queries/workspace-users/use-get-active-workspace-users",
  () => ({ useGetActiveWorkspaceUsers: () => ({}) }),
);
vi.mock("@/components/custom-fields/use-task-card-fields", () => ({
  useTaskCardFields: () => [],
}));
vi.mock("@/components/task/task-pull-requests", () => ({
  TaskPullRequests: () => null,
}));
vi.mock("@/components/task-chips/subtasks-chip", () => ({
  SubtasksChip: () => null,
}));
vi.mock("./task-card-context-menu/task-card-context-menu-content", () => ({
  default: (props: unknown) => {
    menu.props.push(props);
    return null;
  },
}));

afterEach(() => {
  cleanup();
  menu.props = [];
  useBulkSelectionStore.getState().clearSelection();
});

const rollup: Rollup = {
  projectId: "parent",
  projects: new Map([
    ["parent", { name: "DiveOS", slug: "PAR" }],
    ["child", { name: "Migration", slug: "MIG" }],
  ]),
};

const childTask = {
  id: "child-task",
  title: "Move the data",
  status: "to-do",
  projectId: "child",
  number: 7,
  description: null,
  priority: null,
  startDate: null,
  dueDate: null,
  position: 0,
  createdAt: "2026-10-01T00:00:00Z",
  userId: null,
  assigneeId: null,
  assigneeName: null,
} as Task;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <RollupContext.Provider value={rollup}>{children}</RollupContext.Provider>
    </QueryClientProvider>
  );
}

it("task card actions use the task's own projectId", () => {
  render(
    <TaskCardContent task={childTask} disableDragDrop isDragging={false} />,
    { wrapper },
  );
  fireEvent.contextMenu(screen.getByText("Move the data"));
  expect(menu.props.at(-1)).toMatchObject({
    taskCardContext: { projectId: "child", worskpaceId: "ws" },
  });
});

it("tags a child task with its project and its own task key", () => {
  render(
    <TaskCardContent task={childTask} disableDragDrop isDragging={false} />,
    { wrapper },
  );
  expect(screen.getByText("Migration")).toBeDefined();
  expect(screen.getByText("MIG-7")).toBeDefined();
});

it("does not tag the open project's own task", () => {
  render(
    <TaskCardContent
      task={{ ...childTask, projectId: "parent" }}
      disableDragDrop
      isDragging={false}
    />,
    { wrapper },
  );
  expect(screen.queryByText("DiveOS")).toBeNull();
  expect(screen.getByText("PAR-7")).toBeDefined();
});

it("does not bulk-select on a rolled-up board", () => {
  render(
    <TaskCardContent task={childTask} disableDragDrop isDragging={false} />,
    { wrapper },
  );
  fireEvent.click(screen.getByText("Move the data"), { metaKey: true });
  fireEvent.click(screen.getByText("Move the data"), { shiftKey: true });
  expect(useBulkSelectionStore.getState().selectedTaskIds.size).toBe(0);
});
