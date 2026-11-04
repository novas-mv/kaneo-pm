import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function ensurePersonalProject(workspaceId: string) {
  const response = await client.project.personal.$post({
    json: { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default ensurePersonalProject;
