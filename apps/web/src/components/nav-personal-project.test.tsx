import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { NavPersonalProject } from "./nav-personal-project";

const projects = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));
vi.mock("@/hooks/queries/workspace/use-active-workspace", () => ({
  default: () => ({ data: { id: "ws" } }),
}));
vi.mock("@/hooks/queries/project/use-get-projects", () => ({
  default: () => ({ data: projects.data }),
}));
vi.mock("@/components/ui/sidebar", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    SidebarGroup: Pass,
    SidebarGroupLabel: Pass,
    SidebarGroupContent: Pass,
    SidebarMenu: Pass,
    SidebarMenuItem: Pass,
    SidebarMenuButton: ({ children }: { children?: React.ReactNode }) => (
      <button type="button">{children}</button>
    ),
  };
});

afterEach(cleanup);

it("shows the Only you section only when the viewer has a personal project", () => {
  projects.data = [{ id: "team", name: "Website", ownerUserId: null }];
  const { rerender } = render(<NavPersonalProject />);
  expect(screen.queryByText("navigation:sidebar.onlyYou")).toBeNull();

  projects.data = [
    { id: "team", name: "Website", ownerUserId: null },
    { id: "mine", name: "Personal", ownerUserId: "me" },
  ];
  rerender(<NavPersonalProject />);
  expect(screen.getByText("navigation:sidebar.onlyYou")).toBeTruthy();
  expect(screen.getByText("navigation:sidebar.personal")).toBeTruthy();
});
