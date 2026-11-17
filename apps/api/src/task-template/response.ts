import { responseTimestamp, z } from "../openapi";
import { taskSchema } from "../task/response";

export const taskTemplateSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    name: z.string(),
    steps: z
      .array(
        z.object({
          title: z.string(),
          offsetDays: z.number().int().openapi({
            description:
              "Days from the post date: negative is before, 0 is the same day, positive is after.",
          }),
        }),
      )
      .openapi({ description: "Steps in creation order." }),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("TaskTemplate");

export const taskTemplateListSchema = z.array(taskTemplateSchema);

export const appliedTaskTemplateSchema = z
  .object({
    parent: taskSchema.openapi({
      description: "The task for the post, due on the post date.",
    }),
    steps: z.array(taskSchema).openapi({
      description:
        "One task per template step, in template order, each linked as a subtask of the parent.",
    }),
  })
  .openapi("AppliedTaskTemplate");
