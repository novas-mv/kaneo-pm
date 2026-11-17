import type { WorkspaceFeatureKey } from "@kaneo/permissions";

// Static keys, one entry per feature, so a new feature can't ship without copy.
export const WORKSPACE_FEATURE_COPY: Record<
  WorkspaceFeatureKey,
  { labelKey: string; descriptionKey: string }
> = {
  construction: {
    labelKey: "settings:workspaceFeatures.construction.label",
    descriptionKey: "settings:workspaceFeatures.construction.description",
  },
};
