import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteGoogleCalendarIntegration from "@/fetchers/google-calendar-integration/delete-google-calendar-integration";
import saveGoogleCalendarIntegration, {
  type SaveGoogleCalendarIntegrationRequest,
} from "@/fetchers/google-calendar-integration/save-google-calendar-integration";

export function useSaveGoogleCalendarIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      json,
    }: {
      projectId: string;
      json: SaveGoogleCalendarIntegrationRequest;
    }) => saveGoogleCalendarIntegration(projectId, json),
    onSuccess: (_, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["google-calendar-integration", projectId],
      });
    },
  });
}

export function useDeleteGoogleCalendarIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) =>
      deleteGoogleCalendarIntegration(projectId),
    onSuccess: (_, projectId) => {
      void queryClient.invalidateQueries({
        queryKey: ["google-calendar-integration", projectId],
      });
    },
  });
}
