import { cn } from "@/lib/cn";
import { useRollup } from "./rollup-context";

/** Names a task's project when it is not the open project (rolled-up views). */
export function ProjectTag({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  const rollup = useRollup();
  if (!rollup || projectId === rollup.projectId) return null;
  const name = rollup.projects.get(projectId)?.name;
  if (!name) return null;
  return (
    <span
      data-project-tag={projectId}
      title={name}
      className={cn(
        "inline-flex max-w-32 shrink-0 items-center truncate rounded-sm bg-muted px-1 text-[10px] font-medium leading-4 text-muted-foreground",
        className,
      )}
    >
      {name}
    </span>
  );
}
