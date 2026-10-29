import { responseTimestamp, z } from "../openapi";

export const resourceLinkSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    projectId: z.string().nullable(),
    title: z.string(),
    url: z.string(),
    description: z.string().nullable(),
    emoji: z.string().nullable(),
    position: z.number().int(),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("ResourceLink");

export const resourceLinkListSchema = z.array(resourceLinkSchema);
