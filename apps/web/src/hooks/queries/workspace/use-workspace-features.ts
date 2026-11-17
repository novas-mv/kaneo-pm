import type { WorkspaceFeatures } from "@kaneo/permissions";
import { useQuery } from "@tanstack/react-query";
import getWorkspace from "@/fetchers/workspace/get-workspace";

export const workspaceFeaturesQueryKey = (workspaceId: string | undefined) =>
  ["workspace-features", workspaceId] as const;

function useWorkspaceFeatures(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceFeaturesQueryKey(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<WorkspaceFeatures> =>
      (await getWorkspace(workspaceId as string)).features,
  });
}

export default useWorkspaceFeatures;
