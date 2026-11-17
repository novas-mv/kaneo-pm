import { useQuery } from "@tanstack/react-query";
import getTaskTemplates from "@/fetchers/task-template/get-task-templates";

export function taskTemplatesQueryKey(projectId: string) {
  return ["task-templates", projectId] as const;
}

export function useGetTaskTemplates(projectId: string) {
  return useQuery({
    queryKey: taskTemplatesQueryKey(projectId),
    queryFn: () => getTaskTemplates(projectId),
    enabled: !!projectId,
  });
}
