import { type CollisionDetection, closestCenter } from "@dnd-kit/core";
import { NEST_PREFIX } from "@/lib/project-tree";

// Pixels at the top and bottom of a row that stay reorder slots.
const REORDER_EDGE = 8;

const isNestZone = (id: string | number) => String(id).startsWith(NEST_PREFIX);

/**
 * A nest zone wins only while the pointer is in the middle of its row;
 * otherwise the nearest row is a reorder slot, as before nesting existed.
 */
export const projectDropCollision: CollisionDetection = (args) => {
  const pointer = args.pointerCoordinates;

  if (pointer) {
    for (const container of args.droppableContainers) {
      if (!isNestZone(container.id)) continue;
      const rect = args.droppableRects.get(container.id);
      if (
        rect &&
        pointer.x >= rect.left &&
        pointer.x <= rect.right &&
        pointer.y >= rect.top + REORDER_EDGE &&
        pointer.y <= rect.bottom - REORDER_EDGE
      ) {
        return [{ id: container.id, data: { droppableContainer: container } }];
      }
    }
  }

  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => !isNestZone(container.id),
    ),
  });
};
