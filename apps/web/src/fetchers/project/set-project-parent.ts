import { client } from "@kaneo/libs";

import { HttpError } from "@/lib/http-error";

async function setProjectParent(
  projectId: string,
  parentProjectId: string | null,
) {
  const response = await client.project[":id"].parent.$put({
    param: { id: projectId },
    json: { parentProjectId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default setProjectParent;
