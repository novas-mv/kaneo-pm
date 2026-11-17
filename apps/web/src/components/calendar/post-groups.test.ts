import { describe, expect, it } from "vite-plus/test";
import { buildPostGroups, postColorIndex } from "./post-groups";

describe("buildPostGroups", () => {
  it("marks the parent as post and children as steps with the post title", () => {
    const groups = buildPostGroups([
      { id: "p", title: "BTS Video", parentTaskId: null },
      { id: "a", title: "Draft", parentTaskId: "p" },
      { id: "b", title: "Approval", parentTaskId: "p" },
      { id: "x", title: "Loose task", parentTaskId: null },
    ]);

    expect(groups.get("p")).toMatchObject({ role: "post", postId: "p" });
    expect(groups.get("a")).toMatchObject({
      role: "step",
      postId: "p",
      postTitle: "BTS Video",
    });
    expect(groups.get("b")?.colorIndex).toBe(groups.get("p")?.colorIndex);
    expect(groups.has("x")).toBe(false);
  });

  it("ignores a parent that is not in the list", () => {
    const groups = buildPostGroups([
      { id: "a", title: "Draft", parentTaskId: "missing" },
    ]);
    expect(groups.size).toBe(0);
  });

  it("keeps a nested step's own role as step", () => {
    const groups = buildPostGroups([
      { id: "p", title: "Post", parentTaskId: null },
      { id: "a", title: "Step", parentTaskId: "p" },
      { id: "c", title: "Sub-step", parentTaskId: "a" },
    ]);
    expect(groups.get("a")?.role).toBe("step");
    expect(groups.get("c")).toMatchObject({ role: "step", postId: "a" });
  });
});

describe("postColorIndex", () => {
  it("is stable for the same id", () => {
    expect(postColorIndex("abc")).toBe(postColorIndex("abc"));
  });
});
