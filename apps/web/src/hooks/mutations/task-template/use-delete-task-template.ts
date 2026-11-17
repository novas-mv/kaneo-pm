import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteTaskTemplate from "@/fetchers/task-template/delete-task-template";
import { taskTemplatesQueryKey } from "@/hooks/queries/task-template/use-get-task-templates";

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId }: { templateId: string; projectId: string }) =>
      deleteTaskTemplate(templateId),
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: taskTemplatesQueryKey(variables.projectId),
      }),
  });
}
