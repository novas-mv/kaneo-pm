import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Board, boardQueryOptions } from "./board-query-options";

export function useGetTasks(
  projectId: string,
  { refetchOnMount = true }: { refetchOnMount?: boolean } = {},
) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<Board>();
  const query = useQuery({
    ...boardQueryOptions(queryClient, projectId, setProgress),
    refetchOnMount,
    refetchOnWindowFocus: true,
  });
  return {
    ...query,
    data: query.data ?? (query.isFetching ? progress : undefined),
  };
}
