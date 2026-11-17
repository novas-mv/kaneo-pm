import { describe, expect, it } from "vite-plus/test";
import { placeholderLane } from "./placeholder-lane";

describe("placeholderLane", () => {
  it("uses the first lane without a bar on that day", () => {
    const segments = [
      { lane: 0, columnStart: 1, columnEnd: 4 },
      { lane: 1, columnStart: 3, columnEnd: 5 },
    ];

    expect(placeholderLane(segments, 0, 3)).toBe(1);
    expect(placeholderLane(segments, 2, 3)).toBe(2);
    expect(placeholderLane(segments, 4, 3)).toBe(0);
  });

  it("falls back to the overflow row when every lane is taken", () => {
    const segments = [0, 1, 2].map((lane) => ({
      lane,
      columnStart: 1,
      columnEnd: 8,
    }));

    expect(placeholderLane(segments, 6, 3)).toBe(3);
  });
});
