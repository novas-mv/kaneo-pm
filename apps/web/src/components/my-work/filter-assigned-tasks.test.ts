import { describe, expect, it } from "vite-plus/test";
import type { AssignedTask } from "@/fetchers/task/get-assigned-tasks";
import { filterAssignedTasks } from "./filter-assigned-tasks";

const task = (id: string, isPersonal: boolean) =>
  ({ id, isPersonal }) as AssignedTask;
const tasks = [task("a", false), task("b", true), task("c", false)];

describe("filterAssignedTasks", () => {
  it("keeps everything, in order, for all", () => {
    expect(filterAssignedTasks(tasks, "all")).toBe(tasks);
  });

  it("keeps only work tasks", () => {
    expect(filterAssignedTasks(tasks, "work").map((t) => t.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("keeps only personal tasks", () => {
    expect(filterAssignedTasks(tasks, "personal").map((t) => t.id)).toEqual([
      "b",
    ]);
  });
});
