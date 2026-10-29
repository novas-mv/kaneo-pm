import { cleanup, fireEvent, render } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { Sidebar, SidebarProvider, SidebarRail } from "./sidebar";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/lib/shortcuts/use-shortcut", () => ({ useShortcut: () => {} }));

function setup() {
  render(
    <SidebarProvider>
      <Sidebar>
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>,
  );
  const rail = document.querySelector<HTMLButtonElement>(
    "[data-slot=sidebar-rail]",
  ) as HTMLButtonElement;
  rail.setPointerCapture = vi.fn();
  const wrapper = document.querySelector<HTMLElement>(
    "[data-slot=sidebar-wrapper]",
  ) as HTMLElement;
  return { rail, wrapper };
}

describe("SidebarRail resize", () => {
  afterEach(cleanup);

  beforeEach(() => {
    localStorage.clear();
    Object.assign(globalThis, {
      cookieStore: { set: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("resizes on drag, clamps, and persists", () => {
    const { rail, wrapper } = setup();
    expect(wrapper.style.getPropertyValue("--sidebar-width")).toBe("240px");

    fireEvent.pointerDown(rail, { clientX: 240, pointerId: 1 });
    fireEvent.pointerMove(rail, { clientX: 300, pointerId: 1 });
    expect(wrapper.style.getPropertyValue("--sidebar-width")).toBe("300px");

    fireEvent.pointerMove(rail, { clientX: 2000, pointerId: 1 });
    expect(wrapper.style.getPropertyValue("--sidebar-width")).toBe("480px");
    fireEvent.pointerUp(rail, { pointerId: 1 });

    expect(localStorage.getItem("sidebar_width")).toBe("480");
  });

  it("double-click resets to default", () => {
    const { rail, wrapper } = setup();
    fireEvent.keyDown(rail, { key: "ArrowRight" });
    expect(wrapper.style.getPropertyValue("--sidebar-width")).toBe("256px");
    fireEvent.doubleClick(rail);
    expect(wrapper.style.getPropertyValue("--sidebar-width")).toBe("240px");
  });

  it("a drag does not toggle the sidebar", () => {
    const { rail } = setup();
    const container = document.querySelector(
      "[data-slot=sidebar]",
    ) as HTMLElement;
    fireEvent.pointerDown(rail, { clientX: 240, pointerId: 1 });
    fireEvent.pointerMove(rail, { clientX: 280, pointerId: 1 });
    fireEvent.pointerUp(rail, { pointerId: 1 });
    fireEvent.click(rail);
    expect(container.dataset.state).toBe("expanded");
  });
});
