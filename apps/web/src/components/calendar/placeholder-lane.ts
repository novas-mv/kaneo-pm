type LaneSegment = {
  lane: number;
  /** 1-based CSS grid line where the bar starts. */
  columnStart: number;
  /** Exclusive CSS grid line where the bar ends. */
  columnEnd: number;
};

/**
 * First lane with no bar on the given weekday, so the "(No title)" draft sits
 * where the new task will appear. A full day returns `maxLanes`, the overflow
 * row.
 */
export function placeholderLane(
  segments: LaneSegment[],
  dayIndex: number,
  maxLanes: number,
): number {
  const column = dayIndex + 1;
  const taken = new Set(
    segments
      .filter(
        (segment) =>
          segment.columnStart <= column && column < segment.columnEnd,
      )
      .map((segment) => segment.lane),
  );
  for (let lane = 0; lane < maxLanes; lane += 1) {
    if (!taken.has(lane)) return lane;
  }
  return maxLanes;
}
