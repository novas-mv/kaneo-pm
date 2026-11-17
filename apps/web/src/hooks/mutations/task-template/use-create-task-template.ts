import { useMutation, useQueryClient } from "@tanstack/react-query";
import createTaskTemplate, {
  type TaskTemplateInput,
} from "@/fetchers/task-template/create-task-template";
import { taskTemplatesQueryKey } from "@/hooks/queries/task-template/use-get-task-templates";

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: TaskTemplateInput;
    }) => createTaskTemplate(projectId, data),
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: taskTemplatesQueryKey(variables.projectId),
      }),
  });
}
