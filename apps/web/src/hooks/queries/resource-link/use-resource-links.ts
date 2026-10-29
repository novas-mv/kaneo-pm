import { useQuery } from "@tanstack/react-query";
import {
  type ResourceLinkScope,
  resourceLinksQueryKey,
} from "@/components/resources/resource-link-scope";
import { listResourceLinks } from "@/fetchers/resource-link";

export function useResourceLinks(scope: ResourceLinkScope) {
  return useQuery({
    queryKey: resourceLinksQueryKey(scope),
    queryFn: () => listResourceLinks(scope),
    enabled: Boolean(scope.workspaceId),
  });
}
