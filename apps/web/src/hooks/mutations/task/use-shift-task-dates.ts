import { useMutation, useQueryClient } from "@tanstack/react-query";
import shiftTaskDates from "@/fetchers/task/shift-task-dates";
import { markBoardCacheChanged } from "@/lib/board-cache-version";
import { invalidateMyWork } from "@/lib/invalidate-my-work";

/** Moves a task's dates, and optionally its subtasks', by whole days. */
export function useShiftTaskDates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      days,
      includeSubtasks,
    }: {
      taskId: string;
      projectId: string;
      days: number;
      includeSubtasks: boolean;
    }) => shiftTaskDates(taskId, { days, includeSubtasks }),
    onMutate: ({ projectId, taskId }) => {
      markBoardCacheChanged(queryClient, projectId, taskId);
    },
    onSuccess: (result, variables) => {
      invalidateMyWork(queryClient);
      const moved = [result.task, ...result.subtasks];
      const projectIds = new Set([
        variables.projectId,
        ...moved.map((task) => task.projectId),
      ]);
      for (const projectId of projectIds) {
        void queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      }
      for (const task of moved) {
        void queryClient.invalidateQueries({ queryKey: ["task", task.id] });
        void queryClient.invalidateQueries({
          queryKey: ["activities", task.id],
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
