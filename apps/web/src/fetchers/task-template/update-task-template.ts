import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type TaskTemplateChanges = InferRequestType<
  (typeof client)["task-template"][":templateId"]["$patch"]
>["json"];

async function updateTaskTemplate(
  templateId: string,
  data: TaskTemplateChanges,
) {
  const response = await client["task-template"][":templateId"].$patch({
    param: { templateId },
    json: data,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default updateTaskTemplate;
