import { addDays } from "../utils/add-days";
import type { TaskTemplateStep } from "./template-step";

/** Each step's due date: the post date moved by the step's offset. */
export function stepDueDates(postDate: Date, steps: TaskTemplateStep[]) {
  return steps.map((step) => ({
    title: step.title,
    dueDate: addDays(postDate, step.offsetDays),
  }));
}
