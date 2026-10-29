import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type ResourceLinkScope,
  resourceLinksQueryKey,
} from "@/components/resources/resource-link-scope";
import { deleteResourceLink } from "@/fetchers/resource-link";

export function useDeleteResourceLink(scope: ResourceLinkScope) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteResourceLink(scope, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: resourceLinksQueryKey(scope) }),
  });
}
