import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { WorkspaceFeaturesSection } from "./workspace-features-section";

const m = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  mutate: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/queries/workspace/use-workspace-features", () => ({
  default: () => m.query,
}));
vi.mock("@/hooks/mutations/workspace/use-update-workspace-feature", () => ({
  default: () => ({ mutate: m.mutate, isPending: false }),
}));
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn() } }));

const label = "settings:workspaceFeatures.construction.label";

describe("WorkspaceFeaturesSection", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    m.query = {
      isPending: false,
      isError: false,
      data: { construction: false },
      refetch: m.refetch,
    };
  });

  it("turns a feature on for people who can manage settings", () => {
    render(<WorkspaceFeaturesSection workspaceId="w1" canEdit />);

    fireEvent.click(screen.getByRole("switch", { name: label }));

    expect(m.mutate).toHaveBeenCalledWith(
      { workspaceId: "w1", key: "construction", enabled: true },
      expect.anything(),
    );
    expect(
      screen.queryByText("settings:workspaceFeatures.readOnlyNote"),
    ).toBeNull();
  });

  it("shows the state read-only, with a note, to everyone else", () => {
    m.query.data = { construction: true };
    render(<WorkspaceFeaturesSection workspaceId="w1" canEdit={false} />);

    const toggle = screen.getByRole("switch", { name: label });
    expect(toggle).toBeChecked();
    expect(toggle).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText("settings:workspaceFeatures.readOnlyNote"),
    ).toBeTruthy();
  });

  it("offers a retry when the features fail to load", () => {
    m.query = { isPending: false, isError: true, refetch: m.refetch };
    render(<WorkspaceFeaturesSection workspaceId="w1" canEdit />);

    expect(screen.getByRole("alert").textContent).toBe(
      "settings:workspaceFeatures.loadError",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "settings:workspaceFeatures.retry" }),
    );
    expect(m.refetch).toHaveBeenCalled();
  });
});
