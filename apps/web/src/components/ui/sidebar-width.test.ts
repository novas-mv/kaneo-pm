import { beforeEach, describe, expect, it } from "vite-plus/test";
import {
  clampSidebarWidth,
  readSidebarWidth,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  writeSidebarWidth,
} from "./sidebar-width";

describe("sidebar width", () => {
  beforeEach(() => localStorage.clear());

  it("clamps to the allowed range", () => {
    expect(clampSidebarWidth(10)).toBe(SIDEBAR_MIN_WIDTH);
    expect(clampSidebarWidth(9999)).toBe(SIDEBAR_MAX_WIDTH);
    expect(clampSidebarWidth(300)).toBe(300);
  });

  it("falls back to the default when nothing valid is stored", () => {
    expect(readSidebarWidth()).toBe(SIDEBAR_DEFAULT_WIDTH);
    localStorage.setItem("sidebar_width", "abc");
    expect(readSidebarWidth()).toBe(SIDEBAR_DEFAULT_WIDTH);
  });

  it("round-trips a stored width", () => {
    writeSidebarWidth(320);
    expect(readSidebarWidth()).toBe(320);
  });
});
