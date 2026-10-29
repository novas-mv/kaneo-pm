import { type QueryClient, queryOptions } from "@tanstack/react-query";
import getTasks from "@/fetchers/task/get-tasks";
import { markBoardCacheChanged } from "@/lib/board-cache-version";

export type Board = Awaited<ReturnType<typeof getTasks>>;

/**
 * The one query for a project's board (`["tasks", projectId]`). `onProgress`
 * receives partial pages of a first load and `undefined` when it settles.
 */
export function boardQueryOptions(
  queryClient: QueryClient,
  projectId: string,
  onProgress?: (board: Board | undefined) => void,
) {
  return queryOptions({
    queryKey: ["tasks", projectId],
    queryFn: async ({ signal }) => {
      onProgress?.(undefined);
      markBoardCacheChanged(queryClient, projectId);
      const hasCachedBoard = !!queryClient.getQueryData(["tasks", projectId]);
      let invalidated = false;
      const unsubscribe = hasCachedBoard
        ? () => {}
        : queryClient.getQueryCache().subscribe((event) => {
            if (
              event.query.queryKey[0] !== "tasks" ||
              event.query.queryKey[1] !== projectId
            )
              return;
            if (event.type === "updated" && event.action.type === "invalidate")
              invalidated = true;
            if (
              event.type === "removed" ||
              (event.type === "updated" &&
                event.query.state.fetchStatus === "idle")
            ) {
              unsubscribe();
              if (
                invalidated &&
                !signal.aborted &&
                event.type === "updated" &&
                event.action.type === "success"
              ) {
                queueMicrotask(() => {
                  if (
                    signal.aborted ||
                    !queryClient.getQueryData(["tasks", projectId])
                  )
                    return;
                  void queryClient.invalidateQueries({
                    queryKey: ["tasks", projectId],
                  });
                });
              }
            }
          });
      try {
        return await getTasks(projectId, signal, (board) => {
          if (!hasCachedBoard) onProgress?.(board);
        });
      } catch (error) {
        unsubscribe();
        throw error;
      } finally {
        onProgress?.(undefined);
      }
    },
    enabled: !!projectId,
  });
}
