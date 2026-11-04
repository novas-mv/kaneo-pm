import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type AssignedTasks = InferResponseType<
  (typeof client)["task"]["assigned"]["$get"],
  200
>;

export type AssignedTask = AssignedTasks["tasks"][number];

export type AssignedTasksScope = "all" | "work" | "personal";

async function getAssignedTasks(
  workspaceId: string,
  countOnly = false,
  scope: AssignedTasksScope = "all",
) {
  const response = await client.task.assigned.$get({
    query: { workspaceId, countOnly: countOnly ? "true" : "false", scope },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default getAssignedTasks;
