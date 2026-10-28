import { useQuery } from "@tanstack/react-query";
import getGoogleCalendarIntegration from "@/fetchers/google-calendar-integration/get-google-calendar-integration";

function useGetGoogleCalendarIntegration(
  projectId: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["google-calendar-integration", projectId],
    queryFn: () => getGoogleCalendarIntegration(projectId),
    enabled: enabled && Boolean(projectId),
    // The server syncs every minute, so keep the last-synced time fresh.
    refetchInterval: 60_000,
  });
}

export default useGetGoogleCalendarIntegration;
