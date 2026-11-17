import type { WorkspaceFeatureKey } from "@kaneo/permissions";
import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export type UpdateWorkspaceFeatureRequest = {
  workspaceId: string;
  key: WorkspaceFeatureKey;
  enabled: boolean;
};

async function updateWorkspaceFeature({
  workspaceId,
  key,
  enabled,
}: UpdateWorkspaceFeatureRequest) {
  const response = await client.workspace[":workspaceId"].features[":key"].$put(
    {
      param: { workspaceId, key },
      json: { enabled },
    },
  );

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}

export default updateWorkspaceFeature;
