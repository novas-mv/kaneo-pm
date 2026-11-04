import { useQuery } from "@tanstack/react-query";
import getAssignedTasks, {
  type AssignedTasksScope,
} from "@/fetchers/task/get-assigned-tasks";

function useGetAssignedTasks(
  workspaceId: string | undefined,
  countOnly = false,
  scope: AssignedTasksScope = "all",
) {
  return useQuery({
    queryKey: ["assigned-tasks", workspaceId, { countOnly, scope }],
    queryFn: () => getAssignedTasks(workspaceId ?? "", countOnly, scope),
    // Switching the filter keeps the old rows on screen until the new ones
    // arrive, but never carries them across workspaces.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === workspaceId ? previous : undefined,
    enabled: Boolean(workspaceId),
    // The app default skips refetching on mount; these lists go stale while
    // the user works elsewhere.
    refetchOnMount: "always",
    // Workspace pages have no project socket; refresh remote edits and activity
    // even when they do not produce a notification. Poll only while visible.
    refetchInterval: 30_000,
    refetchOnWindowFocus: "always",
  });
}

export default useGetAssignedTasks;
