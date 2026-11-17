import { useMutation, useQueryClient } from "@tanstack/react-query";
import applyTaskTemplate, {
  type ApplyTaskTemplateInput,
} from "@/fetchers/task-template/apply-task-template";
import { invalidateMyWork } from "@/lib/invalidate-my-work";

/** Creates the post task and its step subtasks; refreshes what create-task does. */
export function useApplyTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      projectId: string;
      data: ApplyTaskTemplateInput;
    }) => applyTaskTemplate(templateId, data),
    onSuccess: (result, variables) => {
      invalidateMyWork(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["custom-field-values", variables.projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["task-relations", result.parent.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["task-relations", "project", variables.projectId],
      });
    },
  });
}
