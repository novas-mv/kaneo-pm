import type { Context, Next } from "hono";
import { assertNotPersonalProject } from "../project/personal-project";

const MESSAGE =
  "Integrations, webhooks and calendar feeds aren't available for a personal project";

// Data sent to outside services would leave the owner's private space, so these
// stay off for personal projects. Reads the id from the path, like the
// workspace access middleware it follows.
export function rejectPersonalProject(idKey = "projectId") {
  return async (c: Context, next: Next) => {
    const projectId = c.req.param(idKey);
    if (projectId) await assertNotPersonalProject(projectId, MESSAGE);
    return next();
  };
}

export async function rejectPersonalProjectId(projectId: string) {
  await assertNotPersonalProject(projectId, MESSAGE);
}
