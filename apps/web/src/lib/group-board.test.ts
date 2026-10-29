import { describe, expect, it } from "vite-plus/test";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import {
  childProjectIds,
  findTaskProjectId,
  mergeGroupBoards,
} from "./group-board";

const task = (id: string, projectId: string, status = "to-do") =>
  ({ id, projectId, status }) as Task;

function board(
  id: string,
  columns: Array<[string, string, Task[]]>,
  extra: Partial<ProjectWithTasks> = {},
) {
  return {
    id,
    name: id,
    slug: id.toUpperCase(),
    columns: columns.map(([slug, name, tasks]) => ({
      id: slug,
      slug,
      name,
      isFinal: false,
      tasks,
    })),
    plannedTasks: [],
    archivedTasks: [],
    ...extra,
  } as unknown as ProjectWithTasks;
}

describe("mergeGroupBoards", () => {
  it("merges same-named columns and keeps task order parent-first", () => {
    const parent = board("p", [["to-do", "To Do", [task("p1", "p")]]]);
    const child = board("c", [
      ["to-do", "To Do", [task("c1", "c"), task("c2", "c")]],
    ]);
    const merged = mergeGroupBoards(parent, [child]);
    expect(merged.id).toBe("p");
    expect(merged.columns).toHaveLength(1);
    expect(merged.columns[0].tasks.map((t) => t.id)).toEqual([
      "p1",
      "c1",
      "c2",
    ]);
    expect(merged.columns[0].tasks[1].projectId).toBe("c");
    expect(parent.columns[0].tasks).toHaveLength(1);
  });

  it("appends a child column with no match", () => {
    const parent = board("p", [["to-do", "To Do", []]]);
    const child = board("c", [
      ["to-do", "To Do", []],
      ["qa", "QA", [task("c1", "c", "qa")]],
    ]);
    const merged = mergeGroupBoards(parent, [child]);
    expect(merged.columns.map((column) => column.name)).toEqual([
      "To Do",
      "QA",
    ]);
    expect(merged.columns[1].tasks.map((t) => t.id)).toEqual(["c1"]);
  });

  it("gives an appended column a unique id when its slug is taken", () => {
    const parent = board("p", [["to-do", "Backlog", []]]);
    const child = board("c", [["to-do", "To Do", [task("c1", "c")]]]);
    const merged = mergeGroupBoards(parent, [child]);
    expect(new Set(merged.columns.map((column) => column.id)).size).toBe(2);
  });

  it("concatenates planned and archived tasks", () => {
    const parent = board("p", [], {
      plannedTasks: [task("p1", "p", "planned")],
      archivedTasks: [task("p2", "p", "archived")],
    });
    const child = board("c", [], {
      plannedTasks: [task("c1", "c", "planned")],
      archivedTasks: [task("c2", "c", "archived")],
    });
    const merged = mergeGroupBoards(parent, [child]);
    expect(merged.plannedTasks.map((t) => t.id)).toEqual(["p1", "c1"]);
    expect(merged.archivedTasks.map((t) => t.id)).toEqual(["p2", "c2"]);
  });

  it("with no children returns the parent board unchanged", () => {
    const parent = board("p", [["to-do", "To Do", [task("p1", "p")]]]);
    expect(mergeGroupBoards(parent, [])).toBe(parent);
  });
});

describe("childProjectIds", () => {
  it("returns the shown children of a top-level project", () => {
    const projects = [
      { id: "p", parentProjectId: null },
      { id: "c1", parentProjectId: "p" },
      { id: "other", parentProjectId: null },
      { id: "c2", parentProjectId: "p" },
    ];
    expect(childProjectIds(projects, "p")).toEqual(["c1", "c2"]);
    expect(childProjectIds(projects, "c1")).toEqual([]);
    expect(childProjectIds(undefined, "p")).toEqual([]);
  });
});

describe("findTaskProjectId", () => {
  it("finds a task's own project in any section", () => {
    const merged = board("p", [["to-do", "To Do", [task("c1", "c")]]], {
      archivedTasks: [task("c2", "c2", "archived")],
    });
    expect(findTaskProjectId(merged, "c1")).toBe("c");
    expect(findTaskProjectId(merged, "c2")).toBe("c2");
    expect(findTaskProjectId(merged, "missing")).toBeUndefined();
  });
});
