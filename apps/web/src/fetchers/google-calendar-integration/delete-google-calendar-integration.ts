import { getApiUrl } from "@/fetchers/get-api-url";
import { HttpError } from "@/lib/http-error";

async function deleteGoogleCalendarIntegration(projectId: string) {
  const response = await fetch(
    getApiUrl(`/google-calendar-integration/project/${projectId}`),
    { method: "DELETE", credentials: "include" },
  );

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default deleteGoogleCalendarIntegration;
