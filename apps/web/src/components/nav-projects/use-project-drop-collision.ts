import type { CollisionDetection } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { createNestDwell } from "./nest-dwell";
import {
  findNestBandHit,
  projectDropCollision,
} from "./project-drop-collision";

/**
 * Collision detection for the sidebar with the nest dwell applied. Call
 * `resetNestDwell` when a drag ends or is cancelled.
 */
export function useProjectDropCollision() {
  // Re-renders on arming; the DndContext render that follows recomputes
  // collisions, which dnd-kit otherwise does only on pointer moves.
  const [, setArmings] = useState(0);
  const [dwell] = useState(() =>
    createNestDwell(() => setArmings((count) => count + 1)),
  );

  useEffect(() => dwell.reset, [dwell]);

  const collisionDetection: CollisionDetection = (args) =>
    projectDropCollision(args, dwell.track(findNestBandHit(args)));

  return { collisionDetection, resetNestDwell: dwell.reset };
}
