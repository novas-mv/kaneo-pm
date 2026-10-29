import { type CollisionDetection, closestCenter } from "@dnd-kit/core";
import { NEST_PREFIX } from "@/lib/project-tree";

type CollisionArgs = Parameters<CollisionDetection>[0];

// Share of a row's height, centred, that can nest. The outer parts keep
// reorder, so a flat list behaves as before unless a drop lands mid-row.
const NEST_BAND_FRACTION = 1 / 3;

const isNestZone = (id: string | number) => String(id).startsWith(NEST_PREFIX);

/** The nest zone whose middle band holds the pointer, if any. */
export function findNestBandHit(args: CollisionArgs): string | null {
  const pointer = args.pointerCoordinates;
  if (!pointer) return null;

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
      return String(container.id);
    }
  }

  return null;
}

/**
 * Nests only into `armedNestId` (a band the pointer has rested in, see
 * `nest-dwell.ts`) while the pointer is still in it. Otherwise nest zones
 * take no part and the nearest row is a reorder slot, as before nesting.
 */
export function projectDropCollision(
  args: CollisionArgs,
  armedNestId: string | null,
) {
  if (armedNestId && findNestBandHit(args) === armedNestId) {
    const container = args.droppableContainers.find(
      (candidate) => candidate.id === armedNestId,
    );
    if (container) {
      return [{ id: container.id, data: { droppableContainer: container } }];
    }
  }

  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => !isNestZone(container.id),
    ),
  });
}
