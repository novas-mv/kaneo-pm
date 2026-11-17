import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateWorkspaceFeature from "@/fetchers/workspace/update-workspace-feature";
import { workspaceFeaturesQueryKey } from "@/hooks/queries/workspace/use-workspace-features";

function useUpdateWorkspaceFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWorkspaceFeature,
    onSuccess: (features, { workspaceId }) => {
      queryClient.setQueryData(
        workspaceFeaturesQueryKey(workspaceId),
        features,
      );
    },
  });
}

export default useUpdateWorkspaceFeature;
