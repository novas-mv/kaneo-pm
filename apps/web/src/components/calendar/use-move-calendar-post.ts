import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useShiftTaskDates } from "@/hooks/mutations/task/use-shift-task-dates";
import { toast } from "@/lib/toast";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import { setTaskDatesInBoard } from "./set-task-dates-in-board";
import { shiftTaskDates } from "./shift-task-dates";

/**
 * Moves a post and all its steps by whole days in one server call. The board
 * cache moves first so every bar jumps at once; a failure restores the board.
 */
export function useMoveCalendarPost() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { mutateAsync: shiftDates } = useShiftTaskDates();

  return useCallback(
    async (post: Task, steps: Task[], deltaDays: number) => {
      if (deltaDays === 0) return;
      const queryKey = ["tasks", post.projectId];
      const before = queryClient.getQueryData<ProjectWithTasks>(queryKey);

      queryClient.setQueryData<ProjectWithTasks>(queryKey, (board) =>
        board
          ? [post, ...steps].reduce(
              (next, task) =>
                setTaskDatesInBoard(
                  next,
                  task.id,
                  shiftTaskDates(task, deltaDays),
                ),
              board,
            )
          : board,
      );

      try {
        await shiftDates({
          taskId: post.id,
          projectId: post.projectId,
          days: deltaDays,
          includeSubtasks: true,
        });
      } catch {
        if (before) queryClient.setQueryData(queryKey, before);
        toast.error(t("tasks:calendar.updateDatesError"));
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient, shiftDates, t],
  );
}
