import type { ProjectWithTasks } from "@/types/project";
import type { TaskDates } from "./shift-task-dates";

/** Writes new dates onto one task wherever it sits on the board. */
export function setTaskDatesInBoard(
  board: ProjectWithTasks,
  taskId: string,
  dates: TaskDates,
): ProjectWithTasks {
  const update = <TTask extends { id: string }>(tasks: TTask[]) =>
    tasks.map((task) => (task.id === taskId ? { ...task, ...dates } : task));

  return {
    ...board,
    columns: board.columns.map((column) => ({
      ...column,
      tasks: update(column.tasks),
    })),
    plannedTasks: update(board.plannedTasks),
  };
}
