import { z } from "../openapi";

export const projectIdParam = z.object({ projectId: z.string() });

export const templateIdParam = z.object({ templateId: z.string() });

const templateName = z.string().trim().min(1).max(100).openapi({
  description: "Shown when picking a template, e.g. `Instagram post`.",
});

const templateStep = z
  .object({
    title: z.string().trim().min(1).max(200).openapi({
      description: "Title of the task created for this step.",
    }),
    offsetDays: z.number().int().min(-365).max(365).openapi({
      description:
        "Days from the post date to the step's due date. Negative is before the post date, 0 is the same day, positive is after.",
    }),
  })
  .openapi("TaskTemplateStepInput");

const templateSteps = z.array(templateStep).max(20).openapi({
  description: "Up to 20 steps, in the order they are created.",
});

export const createTaskTemplateBody = z.object({
  name: templateName,
  steps: templateSteps,
});

export const updateTaskTemplateBody = z.object({
  name: templateName.optional(),
  steps: templateSteps.optional(),
});

export const applyTaskTemplateBody = z.object({
  title: z.string().trim().min(1).max(200).openapi({
    description: "Title of the parent task, e.g. the post's name.",
  }),
  postDate: z.iso.datetime({ offset: true }).openapi({
    description:
      "The post date as an ISO 8601 date-time. It becomes the parent task's due date; each step is due this many days before or after, at the same time of day.",
  }),
  status: z.string().optional().openapi({
    description:
      "Column slug for the parent and step tasks. Defaults to the project's first column.",
  }),
});
