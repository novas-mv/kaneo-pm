import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import getTask from "@/fetchers/task/get-task";
import { findTaskProjectId } from "@/lib/group-board";
import type { ProjectWithTasks } from "@/types/project";

/**
 * The project an open task sheet works in: the task's own project, never the
 * open (parent) project for a child's task. It holds that project while the
 * task drops out of the shown board (a switch to "Own only") and while the
 * sheet closes.
 */
export function useTaskSheetProjectId(
  shown: ProjectWithTasks | null | undefined,
  taskId: string | undefined,
  openProjectId: string,
) {
  // Reads the sheet's own task query without fetching it a second time.
  const { data: task } = useQuery({
    queryKey: ["task", taskId ?? ""],
    queryFn: () => getTask(taskId ?? ""),
    enabled: false,
  });
  const known =
    findTaskProjectId(shown, taskId) ??
    (task?.id === taskId ? task?.projectId : undefined);
  const [remembered, setRemembered] = useState<{
    taskId: string;
    projectId: string;
  }>();
  if (
    taskId &&
    known &&
    (remembered?.taskId !== taskId || remembered.projectId !== known)
  )
    setRemembered({ taskId, projectId: known });

  if (!taskId) return remembered?.projectId ?? openProjectId;
  if (known) return known;
  return remembered?.taskId === taskId ? remembered.projectId : openProjectId;
}
