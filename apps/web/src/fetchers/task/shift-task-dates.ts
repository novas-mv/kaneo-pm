import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

async function shiftTaskDates(
  taskId: string,
  data: { days: number; includeSubtasks: boolean },
) {
  const response = await client.task[":id"]["shift-dates"].$post({
    param: { id: taskId },
    // The viewer's zone keeps local times of day across a DST change.
    json: {
      ...data,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
    },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default shiftTaskDates;
