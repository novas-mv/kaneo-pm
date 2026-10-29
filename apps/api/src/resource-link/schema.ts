import { z } from "../openapi";
import { isHttpUrl } from "../utils/is-http-url";

export const MAX_RESOURCE_LINKS_PER_LIST = 100;

export const workspaceParam = z.object({ workspaceId: z.string() });
export const projectParam = z.object({ projectId: z.string() });
export const workspaceLinkParam = workspaceParam.extend({ id: z.string() });
export const projectLinkParam = projectParam.extend({ id: z.string() });

function isPlainHttpUrl(value: string) {
  return (
    isHttpUrl(value) && !new URL(value).username && !new URL(value).password
  );
}

const title = z.string().trim().min(1).max(120).describe("Display title");
const url = z
  .string()
  .trim()
  .max(2048)
  .refine(
    isPlainHttpUrl,
    "URL must be a valid http or https URL without a username or password",
  )
  .describe(
    "An HTTP or HTTPS URL. Embedded credentials (user:pass@host) are rejected.",
  );
const description = z
  .string()
  .trim()
  .max(280)
  .transform((value) => value || null)
  .nullable()
  .describe("Short description; empty clears it");
const emoji = z
  .string()
  .trim()
  .max(32)
  .transform((value) => value || null)
  .nullable()
  .describe("Optional emoji shown before the title; empty clears it");

export const createResourceLinkBody = z.object({
  title,
  url,
  description: description.optional(),
  emoji: emoji.optional(),
});

export const updateResourceLinkBody = z
  .object({
    title: title.optional(),
    url: url.optional(),
    description: description.optional(),
    emoji: emoji.optional(),
  })
  .refine(
    (body) => Object.values(body).some((value) => value !== undefined),
    "Provide at least one field to update",
  );

export const reorderResourceLinksBody = z.object({
  ids: z
    .array(z.string())
    .max(MAX_RESOURCE_LINKS_PER_LIST)
    .describe("Link IDs from the list in their new order"),
});
