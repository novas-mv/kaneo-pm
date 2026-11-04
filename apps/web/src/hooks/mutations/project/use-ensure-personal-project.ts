import { useMutation, useQueryClient } from "@tanstack/react-query";
import ensurePersonalProject from "@/fetchers/project/ensure-personal-project";

function useEnsurePersonalProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ensurePersonalProject,
    // The sidebar lists it under "Only you" once it exists.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export default useEnsurePersonalProject;
