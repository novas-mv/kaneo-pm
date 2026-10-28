import { getApiUrl } from "@/fetchers/get-api-url";
import { HttpError } from "@/lib/http-error";

export type SaveGoogleCalendarIntegrationRequest = {
  calendarId: string;
  timeZone?: string;
};

async function saveGoogleCalendarIntegration(
  projectId: string,
  json: SaveGoogleCalendarIntegrationRequest,
) {
  const response = await fetch(
    getApiUrl(`/google-calendar-integration/project/${projectId}`),
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    },
  );

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default saveGoogleCalendarIntegration;
