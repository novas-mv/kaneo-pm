import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import type { ResourceLinkScope } from "@/components/resources/resource-link-scope";
import { HttpError } from "@/lib/http-error";

const workspaceLinks = client["resource-link"].workspace[":workspaceId"];
const projectLinks = client["resource-link"].project[":projectId"];

export type ResourceLink = InferResponseType<
  typeof workspaceLinks.$get,
  200
>[number];

export type ResourceLinkFields = {
  title: string;
  url: string;
  description: string | null;
  emoji: string | null;
};

export async function listResourceLinks(scope: ResourceLinkScope) {
  const response = scope.projectId
    ? await projectLinks.$get({ param: { projectId: scope.projectId } })
    : await workspaceLinks.$get({ param: { workspaceId: scope.workspaceId } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export async function createResourceLink(
  scope: ResourceLinkScope,
  json: ResourceLinkFields,
) {
  const response = scope.projectId
    ? await projectLinks.$post({
        param: { projectId: scope.projectId },
        json,
      })
    : await workspaceLinks.$post({
        param: { workspaceId: scope.workspaceId },
        json,
      });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export async function updateResourceLink(
  scope: ResourceLinkScope,
  id: string,
  json: ResourceLinkFields,
) {
  const response = scope.projectId
    ? await projectLinks[":id"].$patch({
        param: { projectId: scope.projectId, id },
        json,
      })
    : await workspaceLinks[":id"].$patch({
        param: { workspaceId: scope.workspaceId, id },
        json,
      });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export async function deleteResourceLink(scope: ResourceLinkScope, id: string) {
  const response = scope.projectId
    ? await projectLinks[":id"].$delete({
        param: { projectId: scope.projectId, id },
      })
    : await workspaceLinks[":id"].$delete({
        param: { workspaceId: scope.workspaceId, id },
      });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export async function reorderResourceLinks(
  scope: ResourceLinkScope,
  ids: string[],
) {
  const response = scope.projectId
    ? await projectLinks.order.$put({
        param: { projectId: scope.projectId },
        json: { ids },
      })
    : await workspaceLinks.order.$put({
        param: { workspaceId: scope.workspaceId },
        json: { ids },
      });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
