import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";
import { personalLabel } from "@/lib/personal-label";
import { withPersonalProjectName } from "@/lib/personal-project-name";

export type GetProjectsRequest = InferRequestType<
  (typeof client)["project"]["$get"]
>["query"];

async function getProjects({
  workspaceId,
  includeArchived,
}: GetProjectsRequest) {
  if (!workspaceId) return;

  const response = await client.project.$get({
    query: includeArchived ? { workspaceId, includeArchived } : { workspaceId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  const data = await response.json();
  const label = personalLabel();

  return data.map((project) => withPersonalProjectName(project, label));
}

export default getProjects;
