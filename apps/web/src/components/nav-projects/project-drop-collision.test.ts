import type { ClientRect, DroppableContainer } from "@dnd-kit/core";
import { describe, expect, it } from "vite-plus/test";
import { nestDropId } from "@/lib/project-tree";
import { projectDropCollision } from "./project-drop-collision";

type Args = Parameters<typeof projectDropCollision>[0];

const rect = (top: number, height = 30): ClientRect => ({
  top,
  bottom: top + height,
  left: 0,
  right: 200,
  width: 200,
  height,
});

// Two top-level rows: "a" at 0-30 and "b" at 30-60, each with a nest zone.
const rows: Array<[string, ClientRect]> = [
  ["a", rect(0)],
  ["b", rect(30)],
  [nestDropId("a"), rect(0)],
  [nestDropId("b"), rect(30)],
];

function argsAt(y: number): Args {
  const droppableRects = new Map(rows);
  const droppableContainers = rows.map(
    ([id]) => ({ id, rect: { current: droppableRects.get(id) } }) as unknown,
  ) as DroppableContainer[];

  return {
    active: { id: "dragged" },
    // The dragged row's overlay sits on the pointer.
    collisionRect: rect(y - 15),
    droppableRects,
    droppableContainers,
    pointerCoordinates: { x: 50, y },
  } as unknown as Args;
}

const firstHit = (y: number) => projectDropCollision(argsAt(y))[0]?.id;

describe("projectDropCollision", () => {
  it("nests in the middle third of a row", () => {
    expect(firstHit(15)).toBe(nestDropId("a"));
    expect(firstHit(11)).toBe(nestDropId("a"));
    expect(firstHit(19)).toBe(nestDropId("a"));
  });

  it("reorders in the outer thirds of a row", () => {
    expect(firstHit(5)).toBe("a");
    expect(firstHit(9)).toBe("a");
    expect(firstHit(21)).toBe("a");
    expect(firstHit(25)).toBe("a");
    expect(firstHit(35)).toBe("b");
  });

  it("never offers a nest zone as a reorder slot", () => {
    const ids = projectDropCollision(argsAt(5)).map((hit) => hit.id);
    expect(ids.some((id) => String(id).startsWith("nest:"))).toBe(false);
  });

  it("falls back to reorder without pointer coordinates", () => {
    const args = { ...argsAt(15), pointerCoordinates: null };
    expect(projectDropCollision(args)[0]?.id).toBe("a");
  });
});
