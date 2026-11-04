import { client } from "@kaneo/libs";

import { HttpError } from "@/lib/http-error";
import { personalLabel } from "@/lib/personal-label";
import { withPersonalSearchResult } from "@/lib/personal-project-name";

type SearchParams = {
  q: string;
  type?:
    | "all"
    | "tasks"
    | "projects"
    | "workspaces"
    | "comments"
    | "activities";
  workspaceId: string;
  projectId?: string;
  limit?: number;
};

async function globalSearch(params: SearchParams) {
  const queryParams = {
    ...params,
    limit: params.limit?.toString(),
  };

  const response = await client.search.$get({
    query: queryParams,
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  const data = await response.json();
  const label = personalLabel();

  return {
    ...data,
    results: data.results.map((result) =>
      withPersonalSearchResult(result, label),
    ),
  };
}

export default globalSearch;
