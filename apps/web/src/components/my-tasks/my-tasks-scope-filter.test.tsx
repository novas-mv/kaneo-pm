import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { MyTasksScopeFilter } from "./my-tasks-scope-filter";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

it("marks the current scope and reports a change", () => {
  const onChange = vi.fn();
  render(<MyTasksScopeFilter value="work" onChange={onChange} />);

  expect(
    screen
      .getByRole("button", { name: "workspace:myTasks.filter.work" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  fireEvent.click(
    screen.getByRole("button", { name: "workspace:myTasks.filter.personal" }),
  );
  expect(onChange).toHaveBeenCalledWith("personal");
});
