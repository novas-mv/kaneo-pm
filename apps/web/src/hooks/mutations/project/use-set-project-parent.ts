import {
  type MutateOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import type getProjects from "@/fetchers/project/get-projects";
import setProjectParent from "@/fetchers/project/set-project-parent";

type ProjectList = NonNullable<Awaited<ReturnType<typeof getProjects>>>;

type SetProjectParentVariables = {
  workspaceId: string;
  projectId: string;
  parentProjectId: string | null;
  previousProjects?: ProjectList;
};

function useSetProjectParent() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ projectId, parentProjectId }: SetProjectParentVariables) =>
      setProjectParent(projectId, parentProjectId),
    onError: (_error, { workspaceId, previousProjects }) => {
      if (previousProjects) {
        queryClient.setQueryData(["projects", workspaceId], previousProjects);
      }
    },
    onSettled: (_data, _error, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
    },
  });

  // Cache written synchronously, as in `useReorderProjects`, so the row lands
  // in its group in the same render dnd-kit clears its drag state.
  const setParent = useCallback(
    (
      workspaceId: string,
      projectId: string,
      parentProjectId: string | null,
      options?: MutateOptions<unknown, Error, SetProjectParentVariables>,
    ) => {
      const queryKey = ["projects", workspaceId];
      const previousProjects = queryClient.getQueryData<ProjectList>(queryKey);

      queryClient.setQueryData<ProjectList>(queryKey, (projects) =>
        projects?.map((project) =>
          project.id === projectId ? { ...project, parentProjectId } : project,
        ),
      );

      queryClient.cancelQueries({ queryKey });

      mutation.mutate(
        { workspaceId, projectId, parentProjectId, previousProjects },
        options,
      );
    },
    [queryClient, mutation],
  );

  return { setParent };
}

export default useSetProjectParent;
