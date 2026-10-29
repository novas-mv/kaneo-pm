import { useProjectWebSocket } from "@/hooks/use-project-websocket";

/** Live updates for one child rolled up into its parent's view. */
export function ChildProjectSocket({ projectId }: { projectId: string }) {
  useProjectWebSocket(projectId, { rollupChild: true });
  return null;
}
