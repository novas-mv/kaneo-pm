import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { useGroupScope } from "@/hooks/use-group-scope";
import { GroupScopeSwitch } from "./group-scope-switch";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

let client: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  window.localStorage.clear();
  client = new QueryClient();
  client.setQueryData(
    ["projects", "ws"],
    [
      { id: "parent", parentProjectId: null },
      { id: "child", parentProjectId: "parent" },
      { id: "solo", parentProjectId: null },
    ],
  );
});
afterEach(cleanup);

it("is hidden on a project without children", () => {
  render(<GroupScopeSwitch projectId="solo" workspaceId="ws" />, {
    wrapper: Wrapper,
  });
  expect(screen.queryByRole("group")).toBeNull();
});

it("defaults to everything and shares the choice with every view", () => {
  render(<GroupScopeSwitch projectId="parent" workspaceId="ws" />, {
    wrapper: Wrapper,
  });
  const view = renderHook(() => useGroupScope("parent"));
  const everything = screen.getByRole("button", {
    name: "tasks:groupScope.everything",
  });
  expect(everything.getAttribute("aria-pressed")).toBe("true");
  expect(view.result.current[0]).toBe("everything");

  fireEvent.click(screen.getByRole("button", { name: "tasks:groupScope.own" }));
  expect(view.result.current[0]).toBe("own");
  expect(window.localStorage.getItem("kaneo:group-scope:parent")).toBe("own");
  expect(everything.getAttribute("aria-pressed")).toBe("false");
  // Another parent keeps its own default.
  expect(renderHook(() => useGroupScope("other")).result.current[0]).toBe(
    "everything",
  );
});
