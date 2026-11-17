import { client } from "@kaneo/libs";

import { HttpError } from "@/lib/http-error";

async function deleteTaskTemplate(templateId: string) {
  const response = await client["task-template"][":templateId"].$delete({
    param: { templateId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default deleteTaskTemplate;
