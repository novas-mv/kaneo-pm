import type { AssignedTask } from "@/fetchers/task/get-assigned-tasks";

export type MyTasksScope = "all" | "work" | "personal";

export function filterAssignedTasks(
  tasks: AssignedTask[],
  scope: MyTasksScope,
): AssignedTask[] {
  if (scope === "all") return tasks;
  return tasks.filter((task) => task.isPersonal === (scope === "personal"));
}
