import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { Route } from "./board";
const m = vi.hoisted(() => ({
  project: {
    id: "p",
    name: "Project",
    columns: [],
    plannedTasks: [],
    archivedTasks: [],
  } as unknown,
  retry: vi.fn(),
  board: {} as Record<string, unknown>,
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as object),
    useParams: () => ({ projectId: "p", workspaceId: "w" }),
    useSearch: () => ({}),
  }),
  useNavigate: () => vi.fn(),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/queries/task/use-get-group-tasks", () => ({
  useGetGroupTasks: () => ({
    data: m.project,
    ownData: m.project,
    isRollup: false,
    childIds: [],
    isError: true,
    isFetching: false,
    refetch: m.retry,
    ...m.board,
  }),
}));
vi.mock("@/components/project/rollup-scope", () => ({
  RollupScope: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/store/project", () => ({
  default: () => ({ project: m.project, setProject: vi.fn() }),
}));
vi.mock("@/store/user-preferences", () => ({
  useUserPreferencesStore: (
    selector: (state: { viewMode: "board" | "list" }) => unknown,
  ) => selector({ viewMode: "board" }),
}));
vi.mock("@/store/background", () => ({
  useBackgroundStore: () => ({ background: null }),
}));
vi.mock("@/hooks/use-board-sort", () => ({
  useBoardSort: () => ({ sort: { field: "position" }, setSort: vi.fn() }),
}));
vi.mock("@/components/project/toolbar/use-project-task-view", () => ({
  useProjectTaskView: () => ({
    search: "",
    setSearch: vi.fn(),
    descriptionSearch: { isLoading: false, isError: false, retry: vi.fn() },
    filters: { filteredProject: m.project, clearFilters: vi.fn() },
    subjects: [],
  }),
}));
vi.mock("@/components/common/project-layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/kanban-board", () => ({
  default: ({
    disableDragDrop,
    disableCollectionActions,
  }: {
    disableDragDrop: boolean;
    disableCollectionActions: boolean;
  }) => (
    <div
      aria-label="Cached board"
      data-drag-disabled={disableDragDrop}
      data-actions-disabled={disableCollectionActions}
    >
      Cached task
    </div>
  ),
}));
vi.mock("@/components/list-view", () => ({ default: () => null }));
vi.mock("@/components/page-title", () => ({ default: () => null }));
vi.mock("@/components/shared/modals/create-task-modal", () => ({
  default: () => null,
}));
vi.mock("@/components/task/task-details-sheet", () => ({
  default: () => null,
}));
afterEach(() => {
  cleanup();
  m.board = {};
});
it("keeps cached tasks readable and disables reordering when a refresh fails", () => {
  const Component = (Route as unknown as { component: ComponentType })
    .component;
  render(<Component />);
  expect(screen.getByText("Cached task")).toBeDefined();
  expect(
    screen.getByLabelText("Cached board").getAttribute("data-drag-disabled"),
  ).toBe("true");
  fireEvent.click(
    screen.getByRole("button", { name: "tasks:descriptionRetry" }),
  );
  expect(m.retry).toHaveBeenCalledOnce();
});

it("drag is disabled on a rolled-up board", () => {
  m.board = { isError: false, isSuccess: true, isRollup: true };
  const Component = (Route as unknown as { component: ComponentType })
    .component;
  render(<Component />);
  const board = screen.getByLabelText("Cached board");
  expect(board.getAttribute("data-drag-disabled")).toBe("true");
  expect(board.getAttribute("data-actions-disabled")).toBe("true");
});

it("keeps drag on the parent's own board", () => {
  m.board = { isError: false, isSuccess: true, isRollup: false };
  const Component = (Route as unknown as { component: ComponentType })
    .component;
  render(<Component />);
  expect(
    screen.getByLabelText("Cached board").getAttribute("data-drag-disabled"),
  ).toBe("false");
});
