import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { createNestDwell, NEST_DWELL_MS } from "./nest-dwell";

describe("createNestDwell", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("arms a zone after the pointer rests in it", () => {
    const onArm = vi.fn();
    const dwell = createNestDwell(onArm);

    expect(dwell.track("nest:a")).toBeNull();
    vi.advanceTimersByTime(NEST_DWELL_MS - 1);
    expect(dwell.track("nest:a")).toBeNull();
    expect(onArm).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onArm).toHaveBeenCalledTimes(1);
    expect(dwell.track("nest:a")).toBe("nest:a");
  });

  it("restarts the wait when the pointer moves to another row", () => {
    const onArm = vi.fn();
    const dwell = createNestDwell(onArm);

    dwell.track("nest:a");
    vi.advanceTimersByTime(NEST_DWELL_MS - 50);
    dwell.track("nest:b");
    vi.advanceTimersByTime(NEST_DWELL_MS - 50);
    expect(dwell.track("nest:b")).toBeNull();

    vi.advanceTimersByTime(50);
    expect(dwell.track("nest:b")).toBe("nest:b");
  });

  it("disarms when the pointer leaves the band", () => {
    const dwell = createNestDwell(vi.fn());

    dwell.track("nest:a");
    vi.advanceTimersByTime(NEST_DWELL_MS);
    expect(dwell.track(null)).toBeNull();
    expect(dwell.track("nest:a")).toBeNull();
  });

  it("forgets everything on reset", () => {
    const onArm = vi.fn();
    const dwell = createNestDwell(onArm);

    dwell.track("nest:a");
    dwell.reset();
    vi.advanceTimersByTime(NEST_DWELL_MS);
    expect(onArm).not.toHaveBeenCalled();
    expect(dwell.track("nest:a")).toBeNull();
  });
});
