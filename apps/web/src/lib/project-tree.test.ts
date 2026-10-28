import { describe, expect, it } from "vite-plus/test";
import { buildProjectTree, resolveProjectDrop } from "./project-tree";

const p = (id: string, parentProjectId: string | null = null) => ({
  id,
  parentProjectId,
});

const shape = (tree: ReturnType<typeof buildProjectTree<{ id: string }>>) =>
  tree.map((node) => [node.project.id, node.children.map((c) => c.id)]);

describe("buildProjectTree", () => {
  it("nests children under their parent in list order", () => {
    const tree = buildProjectTree([
      p("sales", "dive"),
      p("dive"),
      p("prospects"),
      p("migration", "dive"),
    ]);

    expect(shape(tree)).toEqual([
      ["dive", ["sales", "migration"]],
      ["prospects", []],
    ]);
  });

  it("orphaned child is top-level", () => {
    const tree = buildProjectTree([p("a"), p("child", "hidden"), p("b")]);

    expect(shape(tree)).toEqual([
      ["a", []],
      ["child", []],
      ["b", []],
    ]);
  });

  it("ignores grandchildren links defensively (rendered top-level)", () => {
    const tree = buildProjectTree([
      p("root"),
      p("mid", "root"),
      p("leaf", "mid"),
    ]);

    expect(shape(tree)).toEqual([
      ["root", ["mid"]],
      ["leaf", []],
    ]);
  });
});

describe("resolveProjectDrop", () => {
  const projects = [p("dive"), p("sales", "dive"), p("prospects")];

  it("nests when dropped on a nest zone", () => {
    expect(resolveProjectDrop(projects, "prospects", "nest:dive")).toEqual({
      type: "nest",
      projectId: "prospects",
      parentProjectId: "dive",
    });
  });

  it("ignores a nest zone on itself or its current parent", () => {
    expect(resolveProjectDrop(projects, "dive", "nest:dive")).toEqual({
      type: "none",
    });
    expect(resolveProjectDrop(projects, "sales", "nest:dive")).toEqual({
      type: "none",
    });
  });

  it("refuses nesting a project that has children", () => {
    expect(resolveProjectDrop(projects, "dive", "nest:prospects")).toEqual({
      type: "none",
    });
  });

  it("ungroups a child dropped on a top-level row", () => {
    expect(resolveProjectDrop(projects, "sales", "prospects")).toEqual({
      type: "ungroup",
      projectId: "sales",
      targetId: "prospects",
    });
  });

  it("reorders siblings and top-level rows", () => {
    expect(resolveProjectDrop(projects, "prospects", "dive")).toEqual({
      type: "reorder",
      projectId: "prospects",
      targetId: "dive",
    });
    const withTwoChildren = [...projects, p("migration", "dive")];
    expect(resolveProjectDrop(withTwoChildren, "sales", "migration")).toEqual({
      type: "reorder",
      projectId: "sales",
      targetId: "migration",
    });
  });

  it("moves a child into another group when dropped on that group's child", () => {
    const twoGroups = [...projects, p("lead", "prospects")];
    expect(resolveProjectDrop(twoGroups, "sales", "lead")).toEqual({
      type: "nest",
      projectId: "sales",
      parentProjectId: "prospects",
    });
  });

  it("reorders a top-level project next to the group when dropped on a child", () => {
    expect(resolveProjectDrop(projects, "prospects", "sales")).toEqual({
      type: "reorder",
      projectId: "prospects",
      targetId: "dive",
    });
  });

  it("does nothing on itself or an unknown target", () => {
    expect(resolveProjectDrop(projects, "dive", "dive")).toEqual({
      type: "none",
    });
    expect(resolveProjectDrop(projects, "dive", "gone")).toEqual({
      type: "none",
    });
  });
});
