import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type ApplyTaskTemplateInput = InferRequestType<
  (typeof client)["task-template"][":templateId"]["apply"]["$post"]
>["json"];

async function applyTaskTemplate(
  templateId: string,
  data: ApplyTaskTemplateInput,
) {
  const response = await client["task-template"][":templateId"].apply.$post({
    param: { templateId },
    json: data,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default applyTaskTemplate;
