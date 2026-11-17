// Features a workspace can switch on. Off by default, so a workspace only gets
// the extra tools it asked for. The API validates keys against this list, and
// the web app shows one switch per key.
export const WORKSPACE_FEATURE_KEYS = ["construction"] as const;

export type WorkspaceFeatureKey = (typeof WORKSPACE_FEATURE_KEYS)[number];

export type WorkspaceFeatures = Record<WorkspaceFeatureKey, boolean>;

export function isWorkspaceFeatureKey(
  value: unknown,
): value is WorkspaceFeatureKey {
  return (
    typeof value === "string" &&
    (WORKSPACE_FEATURE_KEYS as readonly string[]).includes(value)
  );
}

// Every known key with its stored value. Unknown stored keys are dropped and
// missing keys read as off.
export function resolveWorkspaceFeatures(stored: unknown): WorkspaceFeatures {
  const source =
    stored && typeof stored === "object" && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    WORKSPACE_FEATURE_KEYS.map((key) => [key, source[key] === true]),
  ) as WorkspaceFeatures;
}
