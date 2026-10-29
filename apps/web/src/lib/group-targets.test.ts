import { describe, expect, it } from "vite-plus/test";
import { groupTargets } from "./group-targets";
import { nestDropId, resolveProjectDrop } from "./project-tree";

const project = (id: string, parentProjectId: string | null = null) => ({
  id,
  parentProjectId,
});

describe("groupTargets", () => {
  it("lists every other top-level project, in order", () => {
    const projects = [project("a"), project("b"), project("c")];

    expect(groupTargets(projects, "b").map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("skips projects that are themselves children", () => {
    const projects = [project("a"), project("b"), project("child", "a")];

    expect(groupTargets(projects, "b").map((p) => p.id)).toEqual(["a"]);
  });

  it("is empty for a project that has children", () => {
    const projects = [project("a"), project("b"), project("child", "a")];

    expect(groupTargets(projects, "a")).toEqual([]);
  });

  it("is empty for a project shown as a child", () => {
    const projects = [project("a"), project("b"), project("child", "a")];

    expect(groupTargets(projects, "child")).toEqual([]);
  });

  it("treats an orphan as top-level", () => {
    const projects = [project("a"), project("orphan", "gone")];

    expect(groupTargets(projects, "a").map((p) => p.id)).toEqual(["orphan"]);
    expect(groupTargets(projects, "orphan").map((p) => p.id)).toEqual(["a"]);
  });

  it("matches the projects a sidebar drop would nest into", () => {
    const projects = [
      project("a"),
      project("b"),
      project("child", "a"),
      project("grandchild", "child"),
      project("orphan", "gone"),
    ];

    for (const { id } of projects) {
      const dropTargets = projects.filter(
        (target) =>
          resolveProjectDrop(projects, id, nestDropId(target.id)).type ===
          "nest",
      );
      const isTopLevel = !["child"].includes(id);
      expect(groupTargets(projects, id)).toEqual(isTopLevel ? dropTargets : []);
    }
  });
});
