import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateTask } from "@/hooks/mutations/task/use-update-task";
import { markBoardCacheChanged } from "@/lib/board-cache-version";
import { toast } from "@/lib/toast";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import { setTaskDatesInBoard } from "./set-task-dates-in-board";
import type { TaskDates } from "./shift-task-dates";

/**
 * Saves new dates for a task moved or resized on the calendar: the board cache
 * changes first so the bar jumps at once, then the update is saved and rolled
 * back with a toast if it fails.
 */
export function useSaveCalendarTaskDates() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { mutateAsync: updateTask } = useUpdateTask();

  return useCallback(
    async (task: Task, next: TaskDates) => {
      const original: TaskDates = {
        startDate: task.startDate,
        dueDate: task.dueDate,
      };
      if (
        next.startDate === original.startDate &&
        next.dueDate === original.dueDate
      )
        return;

      // Rollups read children from their own board, keyed by the task's project.
      const queryKey = ["tasks", task.projectId];
      const writeDates = (dates: TaskDates) => {
        markBoardCacheChanged(queryClient, task.projectId, task.id);
        queryClient.setQueryData<ProjectWithTasks>(queryKey, (board) =>
          board ? setTaskDatesInBoard(board, task.id, dates) : board,
        );
      };

      writeDates(next);
      try {
        await updateTask({ ...task, ...next });
      } catch {
        writeDates(original);
        toast.error(t("tasks:calendar.updateDatesError"));
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient, t, updateTask],
  );
}
