// A list belongs to a workspace, or to one of its projects when projectId is set.
export type ResourceLinkScope = {
  workspaceId: string;
  projectId?: string;
};

export function resourceLinksQueryKey(scope: ResourceLinkScope) {
  return ["resource-links", scope.workspaceId, scope.projectId ?? "workspace"];
}
