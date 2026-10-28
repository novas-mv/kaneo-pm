import { type CollisionDetection, closestCenter } from "@dnd-kit/core";
import { NEST_PREFIX } from "@/lib/project-tree";

// Share of a row's height, centred, that nests. The outer parts keep reorder,
// so a flat list behaves as before unless a drop lands squarely mid-row.
const NEST_BAND_FRACTION = 1 / 3;

const isNestZone = (id: string | number) => String(id).startsWith(NEST_PREFIX);

/**
 * A nest zone wins only while the pointer is in the middle third of its row;
 * otherwise the nearest row is a reorder slot, as before nesting existed.
 */
export const projectDropCollision: CollisionDetection = (args) => {
  const pointer = args.pointerCoordinates;

  if (pointer) {
    for (const container of args.droppableContainers) {
      if (!isNestZone(container.id)) continue;
      const rect = args.droppableRects.get(container.id);
      if (!rect) continue;
      const edge = (rect.height * (1 - NEST_BAND_FRACTION)) / 2;
      if (
        pointer.x >= rect.left &&
        pointer.x <= rect.right &&
        pointer.y >= rect.top + edge &&
        pointer.y <= rect.bottom - edge
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
