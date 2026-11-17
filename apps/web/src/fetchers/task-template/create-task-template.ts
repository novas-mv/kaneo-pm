import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type TaskTemplateInput = InferRequestType<
  (typeof client)["task-template"]["project"][":projectId"]["$post"]
>["json"];

async function createTaskTemplate(projectId: string, data: TaskTemplateInput) {
  const response = await client["task-template"].project[":projectId"].$post({
    param: { projectId },
    json: data,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default createTaskTemplate;
