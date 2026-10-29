import { getApiUrl } from "@/fetchers/get-api-url";
import { HttpError } from "@/lib/http-error";

export type GoogleCalendarIntegration = {
  configured: boolean;
  serviceAccountEmail: string | null;
  integration: {
    id: string;
    projectId: string;
    calendarId: string;
    timeZone: string;
    lastSyncAt: string | null;
    lastError: string | null;
    isActive: boolean | null;
  } | null;
};

async function getGoogleCalendarIntegration(
  projectId: string,
): Promise<GoogleCalendarIntegration> {
  const response = await fetch(
    getApiUrl(`/google-calendar-integration/project/${projectId}`),
    { credentials: "include" },
  );

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return (await response.json()) as GoogleCalendarIntegration;
}

export default getGoogleCalendarIntegration;
