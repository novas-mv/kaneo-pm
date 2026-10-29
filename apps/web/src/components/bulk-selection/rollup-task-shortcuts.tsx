import type { TaskSelectionStore } from "@/components/project/task-view-keys/task-selection";
import { useTaskActionShortcuts } from "@/components/project/task-view-keys/use-task-action-shortcuts";
import type { ProjectWithTasks } from "@/types/project";

/**
 * Task shortcuts for a rolled-up view, which has no bulk toolbar: copy and
 * single-task actions on the focused task, looked up on the merged board.
 */
export function RollupTaskShortcuts({
  selection,
  board,
}: {
  selection: TaskSelectionStore;
  board: ProjectWithTasks | undefined;
}) {
  useTaskActionShortcuts(selection, { board, pickers: false });
  return null;
}
