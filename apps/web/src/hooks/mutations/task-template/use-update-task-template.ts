import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateTaskTemplate, {
  type TaskTemplateChanges,
} from "@/fetchers/task-template/update-task-template";
import { taskTemplatesQueryKey } from "@/hooks/queries/task-template/use-get-task-templates";

export function useUpdateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      projectId: string;
      data: TaskTemplateChanges;
    }) => updateTaskTemplate(templateId, data),
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: taskTemplatesQueryKey(variables.projectId),
      }),
  });
}
