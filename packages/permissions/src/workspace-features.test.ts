import { describe, expect, it } from "vite-plus/test";
import {
  isWorkspaceFeatureKey,
  resolveWorkspaceFeatures,
} from "./workspace-features";

describe("resolveWorkspaceFeatures", () => {
  it("reads missing, malformed and unknown values as off", () => {
    expect(resolveWorkspaceFeatures(null)).toEqual({ construction: false });
    expect(resolveWorkspaceFeatures([])).toEqual({ construction: false });
    expect(
      resolveWorkspaceFeatures({ construction: "yes", old: true }),
    ).toEqual({ construction: false });
  });

  it("keeps known keys that are on", () => {
    expect(resolveWorkspaceFeatures({ construction: true })).toEqual({
      construction: true,
    });
  });
});

describe("isWorkspaceFeatureKey", () => {
  it("accepts only known keys", () => {
    expect(isWorkspaceFeatureKey("construction")).toBe(true);
    expect(isWorkspaceFeatureKey("Construction")).toBe(false);
    expect(isWorkspaceFeatureKey(undefined)).toBe(false);
  });
});
