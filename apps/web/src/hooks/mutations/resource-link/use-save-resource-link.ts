import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type ResourceLinkScope,
  resourceLinksQueryKey,
} from "@/components/resources/resource-link-scope";
import {
  createResourceLink,
  type ResourceLinkFields,
  updateResourceLink,
} from "@/fetchers/resource-link";

export function useSaveResourceLink(scope: ResourceLinkScope) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id?: string;
      fields: ResourceLinkFields;
    }) =>
      id
        ? updateResourceLink(scope, id, fields)
        : createResourceLink(scope, fields),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: resourceLinksQueryKey(scope) }),
  });
}
