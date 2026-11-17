import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function shiftTaskDates(
  taskId: string,
  data: { days: number; includeSubtasks: boolean },
) {
  const response = await client.task[":id"]["shift-dates"].$post({
    param: { id: taskId },
    json: data,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default shiftTaskDates;
