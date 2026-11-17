import type { WorkspaceFeatureKey } from "@kaneo/permissions";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import useWorkspaceFeatures from "@/hooks/queries/workspace/use-workspace-features";

// Whether a feature is on in the current workspace. Reads false while loading
// or on error, so gated UI stays hidden rather than flashing in. The API
// enforces the same switch with `requireWorkspaceFeature`.
export function useWorkspaceFeature(key: WorkspaceFeatureKey): boolean {
  const { data: workspace } = useActiveWorkspace();
  const { data: features } = useWorkspaceFeatures(workspace?.id);
  return features?.[key] === true;
}
