import { cleanup, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import type { AssignedTask } from "@/fetchers/task/get-assigned-tasks";
import { AssignedTaskRow } from "./assigned-task-row";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/i18n/domain", () => ({
  getStatusDisplayLabel: (status: string) => status,
}));
vi.mock("@/lib/column", () => ({ getColumnIcon: () => null }));
vi.mock("@/lib/priority", () => ({ getPriorityIcon: () => null }));
vi.mock("./due-date-text", () => ({ DueDateText: () => null }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: PropsWithChildren) => <a href="/task">{children}</a>,
}));

afterEach(cleanup);

const base = {
  id: "t1",
  projectId: "p1",
  number: 4,
  title: "Buy stamps",
  status: "to-do",
  statusName: "To Do",
  statusIcon: null,
  priority: "no-priority",
  dueDate: null,
  projectName: "Website",
  projectSlug: "web",
  projectIcon: null,
  isPersonal: false,
  labels: [],
} satisfies AssignedTask;

it("shows the project name on a work row", () => {
  render(<AssignedTaskRow task={base} workspaceId="w" />);
  expect(screen.getByText("Website")).toBeTruthy();
  expect(screen.queryByText("workspace:myWork.personalTag")).toBeNull();
});

it("tags a personal row instead of showing its hidden project key", () => {
  render(
    <AssignedTaskRow
      task={{ ...base, isPersonal: true, projectName: "Personal" }}
      workspaceId="w"
    />,
  );
  expect(screen.getByText("workspace:myWork.personalTag")).toBeTruthy();
  expect(screen.queryByText("web-4")).toBeNull();
});
