import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { LayoutTabs } from "./layout-tabs";

afterEach(cleanup);

describe("LayoutTabs", () => {
  it("offers the four task layouts and marks the current one", () => {
    render(<LayoutTabs currentView="calendar" onSelect={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(
      screen
        .getByRole("button", { name: "tasks:calendar.title" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "tasks:view.board" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("switches layout in one click", () => {
    const onSelect = vi.fn();
    render(<LayoutTabs currentView="board" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "tasks:view.gantt" }));
    expect(onSelect).toHaveBeenCalledWith("gantt");
  });
});
