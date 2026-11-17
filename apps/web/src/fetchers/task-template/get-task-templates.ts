import { client } from "@kaneo/libs";

import { HttpError } from "@/lib/http-error";

async function getTaskTemplates(projectId: string) {
  const response = await client["task-template"].project[":projectId"].$get({
    param: { projectId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export type TaskTemplate = Awaited<ReturnType<typeof getTaskTemplates>>[number];

export default getTaskTemplates;
