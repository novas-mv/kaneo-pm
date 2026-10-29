import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import type { ResourceLinkScope } from "@/components/resources/resource-link-scope";
import { HttpError } from "@/lib/http-error";

const workspaceLinks = client["resource-link"].workspace[":workspaceId"];
const projectLinks = client["resource-link"].project[":projectId"];

// The one place that decides whether a scope is a project list or the workspace list.
function endpoints(scope: ResourceLinkScope) {
  if (scope.projectId) {
    const param = { projectId: scope.projectId };
    return {
      list: () => projectLinks.$get({ param }),
      create: (json: ResourceLinkFields) => projectLinks.$post({ param, json }),
      update: (id: string, json: ResourceLinkFields) =>
        projectLinks[":id"].$patch({ param: { ...param, id }, json }),
      remove: (id: string) =>
        projectLinks[":id"].$delete({ param: { ...param, id } }),
      reorder: (ids: string[]) =>
        projectLinks.order.$put({ param, json: { ids } }),
    };
  }
  const param = { workspaceId: scope.workspaceId };
  return {
    list: () => workspaceLinks.$get({ param }),
    create: (json: ResourceLinkFields) => workspaceLinks.$post({ param, json }),
    update: (id: string, json: ResourceLinkFields) =>
      workspaceLinks[":id"].$patch({ param: { ...param, id }, json }),
    remove: (id: string) =>
      workspaceLinks[":id"].$delete({ param: { ...param, id } }),
    reorder: (ids: string[]) =>
      workspaceLinks.order.$put({ param, json: { ids } }),
  };
}

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
  const response = await endpoints(scope).list();
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export async function createResourceLink(
  scope: ResourceLinkScope,
  json: ResourceLinkFields,
) {
  const response = await endpoints(scope).create(json);
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export async function updateResourceLink(
  scope: ResourceLinkScope,
  id: string,
  json: ResourceLinkFields,
) {
  const response = await endpoints(scope).update(id, json);
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export async function deleteResourceLink(scope: ResourceLinkScope, id: string) {
  const response = await endpoints(scope).remove(id);
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}

export async function reorderResourceLinks(
  scope: ResourceLinkScope,
  ids: string[],
) {
  const response = await endpoints(scope).reorder(ids);
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
