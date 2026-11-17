import { WORKSPACE_FEATURE_KEYS } from "@kaneo/permissions";
import { PROJECT_ACCESS_MODES } from "../project-access/project-access-mode";
import { z } from "../openapi";

export const workspaceIdParam = z.object({ workspaceId: z.string() });

export const workspaceMemberParam = z.object({
  workspaceId: z.string(),
  userId: z.string(),
});

export const workspaceMembersQuery = z.object({
  projectId: z.string().optional().openapi({
    description:
      "Only return members who can access this project, for example to fill an assignee picker.",
  }),
});

export const updateMemberProjectAccessBody = z.object({
  projectAccess: z.enum(PROJECT_ACCESS_MODES).openapi({
    description:
      '"all" gives access to every project in the workspace, including future ones. "selected" limits the member to projectIds.',
  }),
  projectIds: z.array(z.string()).default([]).openapi({
    description:
      'Projects the member can access when projectAccess is "selected".',
  }),
});

export const workspaceFeatureParam = z.object({
  workspaceId: z.string(),
  key: z.enum(WORKSPACE_FEATURE_KEYS).openapi({
    description: "The feature to turn on or off.",
  }),
});

export const updateWorkspaceFeatureBody = z.object({
  enabled: z.boolean().openapi({
    description: "true turns the feature on, false turns it off.",
  }),
});
