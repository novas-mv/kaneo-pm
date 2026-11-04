import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { MyTasksQuickAdd } from "./my-tasks-quick-add";

const mocks = vi.hoisted(() => ({
  ensure: vi.fn(),
  create: vi.fn(),
  error: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/toast", () => ({ toast: { error: mocks.error } }));
vi.mock("@/hooks/queries/project/use-get-projects", () => ({
  default: () => ({
    data: [
      { id: "team", name: "Website", ownerUserId: null },
      { id: "mine", name: "Personal", ownerUserId: "me" },
    ],
  }),
}));
vi.mock("@/hooks/mutations/project/use-ensure-personal-project", () => ({
  default: () => ({ mutateAsync: mocks.ensure, isPending: false }),
}));
vi.mock("@/hooks/mutations/task/use-create-task", () => ({
  default: () => ({ mutateAsync: mocks.create, isPending: false }),
}));

beforeEach(() => {
  mocks.ensure.mockResolvedValue({ id: "mine" });
  mocks.create.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function submit(title: string) {
  fireEvent.change(screen.getByLabelText("workspace:myTasks.quickAdd.label"), {
    target: { value: title },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "workspace:myTasks.quickAdd.add" }),
  );
}

it("creates the personal project, then the task in it, assigned to the user", async () => {
  render(<MyTasksQuickAdd workspaceId="ws" currentUserId="me" />);
  submit("  Renew passport ");

  await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
  expect(mocks.ensure).toHaveBeenCalledWith("ws");
  expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({
    projectId: "mine",
    title: "Renew passport",
    userId: "me",
  });
});

it("does not add a blank title", () => {
  render(<MyTasksQuickAdd workspaceId="ws" currentUserId="me" />);
  const add = screen.getByRole("button", {
    name: "workspace:myTasks.quickAdd.add",
  }) as HTMLButtonElement;
  expect(add.disabled).toBe(true);
  expect(mocks.create).not.toHaveBeenCalled();
});

it("reports a failure and keeps the typed title", async () => {
  mocks.create.mockRejectedValue(new Error("nope"));
  render(<MyTasksQuickAdd workspaceId="ws" currentUserId="me" />);
  submit("Renew passport");

  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith(
      "workspace:myTasks.quickAdd.error",
    ),
  );
  expect(
    (
      screen.getByLabelText(
        "workspace:myTasks.quickAdd.label",
      ) as HTMLInputElement
    ).value,
  ).toBe("Renew passport");
});
