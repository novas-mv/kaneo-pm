import type { AssignedTask } from "@/fetchers/task/get-assigned-tasks";
import { DUE_BUCKETS, type DueBucket, getDueBucket } from "./due-bucket";

export type AssignedTaskGroup = {
  id: string;
  // Set for due-date groups; project groups are labelled by `title`.
  bucket?: DueBucket;
  title?: string;
  // The private Personal project's stored name isn't translated, so the list
  // swaps in the localized label for it.
  isPersonal?: boolean;
  tasks: AssignedTask[];
};

export function groupAssignedTasksByDueDate(
  tasks: AssignedTask[],
  now = new Date(),
): AssignedTaskGroup[] {
  const byBucket = new Map<DueBucket, AssignedTask[]>();

  for (const task of tasks) {
    const bucket = getDueBucket(task.dueDate, now);
    const group = byBucket.get(bucket) ?? [];
    group.push(task);
    byBucket.set(bucket, group);
  }

  return DUE_BUCKETS.flatMap((bucket) => {
    const group = byBucket.get(bucket);
    return group ? [{ id: bucket, bucket, tasks: group }] : [];
  });
}

// Groups appear in the order their first task does, which keeps the project
// with the most pressing work on top.
export function groupAssignedTasksByProject(
  tasks: AssignedTask[],
): AssignedTaskGroup[] {
  const byProject = new Map<string, AssignedTaskGroup>();

  for (const task of tasks) {
    const group = byProject.get(task.projectId) ?? {
      id: task.projectId,
      title: task.projectName,
      isPersonal: task.isPersonal,
      tasks: [],
    };
    group.tasks.push(task);
    byProject.set(task.projectId, group);
  }

  return [...byProject.values()];
}
