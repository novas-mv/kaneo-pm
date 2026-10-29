// How rolled-up data reaches the views without entering useProjectStore:
// the store and the ["tasks", projectId] cache keep the open project's OWN
// board (`ownData`), exactly as for any project, so drag, reorder rollback,
// create and delete keep writing one real board. Children are read through
// their own ["tasks", childId] queries and merged here, in render, into
// `data`. Routes render `data` and set the store from `ownData`. While
// `isRollup` is true the views are read-only (no drag, column actions or
// bulk selection) because the merged board is not a board of any one project;
// a task edit goes through the task's own projectId and invalidates that
// child's query, which re-merges.
import {
  type QueryObserverResult,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { useGroupScope } from "@/hooks/use-group-scope";
import { childProjectIds, mergeGroupBoards } from "@/lib/group-board";
import useGetProjects from "../project/use-get-projects";
import { type Board, boardQueryOptions } from "./board-query-options";
import { useGetTasks } from "./use-get-tasks";

// Stable so useQueries can keep the combined array between renders.
function loadedChildren(results: QueryObserverResult<Board>[]) {
  return results.flatMap((result) =>
    result.data && !result.isError ? [result.data] : [],
  );
}

export function useGetGroupTasks(projectId: string) {
  const queryClient = useQueryClient();
  const { workspaceId } = useParams({
    strict: false,
    select: (params: Record<string, unknown>) => ({
      workspaceId:
        typeof params.workspaceId === "string" ? params.workspaceId : "",
    }),
  });
  const own = useGetTasks(projectId);
  // Same query as the project header's crumb select and the sidebar, so it
  // adds no request of its own.
  const { data: projects } = useGetProjects({ workspaceId });
  const childIds = useMemo(
    () => childProjectIds(projects, projectId),
    [projects, projectId],
  );
  const [scope] = useGroupScope(projectId);
  const isRollup = scope === "everything" && childIds.length > 0;

  const children = useQueries({
    queries: (isRollup ? childIds : []).map((childId) => ({
      ...boardQueryOptions(queryClient, childId),
      refetchOnMount: true,
      // Child sockets carry live updates; N boards must not reload on focus.
      refetchOnWindowFocus: false,
    })),
    combine: loadedChildren,
  });

  const data = useMemo(
    () =>
      isRollup && own.data ? mergeGroupBoards(own.data, children) : own.data,
    [isRollup, own.data, children],
  );

  return {
    ...own,
    data,
    ownData: own.data,
    isRollup,
    childIds: isRollup ? childIds : [],
  };
}
