import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type ResourceLinkScope,
  resourceLinksQueryKey,
} from "@/components/resources/resource-link-scope";
import { reorderResourceLinks } from "@/fetchers/resource-link";

export function useReorderResourceLinks(scope: ResourceLinkScope) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => reorderResourceLinks(scope, ids),
    onSuccess: (links) =>
      queryClient.setQueryData(resourceLinksQueryKey(scope), links),
  });
}
