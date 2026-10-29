import { expect, it } from "vite-plus/test";
import {
  isTaskView,
  resolveProjectView,
  routeForView,
  tasksViewFor,
} from "./project-views";

it("serves board and list from the board route", () => {
  expect(routeForView("list")).toBe("board");
  expect(routeForView("gantt")).toBe("gantt");
  expect(resolveProjectView("board", "list")).toBe("list");
  expect(resolveProjectView("calendar", "list")).toBe("calendar");
  expect(routeForView("resources")).toBe("resources");
  expect(resolveProjectView("resources", "board")).toBe("resources");
});

it("treats backlog and resources as non-task views", () => {
  expect(isTaskView("board")).toBe(true);
  expect(isTaskView("list")).toBe(true);
  expect(isTaskView("calendar")).toBe(true);
  expect(isTaskView("gantt")).toBe(true);
  expect(isTaskView("backlog")).toBe(false);
  expect(isTaskView("resources")).toBe(false);
});

it("returns to the last task layout, falling back to board or list", () => {
  expect(tasksViewFor("calendar", "list")).toBe("calendar");
  expect(tasksViewFor("gantt", "board")).toBe("gantt");
  expect(tasksViewFor("board", "list")).toBe("list");
});
