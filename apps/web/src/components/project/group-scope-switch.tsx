import { useTranslation } from "react-i18next";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { type GroupScope, useGroupScope } from "@/hooks/use-group-scope";
import { cn } from "@/lib/cn";
import { childProjectIds } from "@/lib/group-board";

type GroupScopeSwitchProps = {
  projectId: string;
  workspaceId: string;
};

const SCOPES: GroupScope[] = ["own", "everything"];

/** "Own only" / "Everything", shown only on a project with children. */
export function GroupScopeSwitch({
  projectId,
  workspaceId,
}: GroupScopeSwitchProps) {
  const { t } = useTranslation();
  const { data: projects } = useGetProjects({ workspaceId });
  const [scope, setScope] = useGroupScope(projectId);
  if (childProjectIds(projects, projectId).length === 0) return null;

  return (
    <div
      role="group"
      aria-label={t("tasks:groupScope.label")}
      className="flex h-7 shrink-0 items-center gap-0.5 rounded-lg border border-border/80 bg-background p-0.5 dark:bg-input/32"
    >
      {SCOPES.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={scope === value}
          onClick={() => setScope(value)}
          className={cn(
            "inline-flex h-6 items-center whitespace-nowrap rounded-[calc(var(--radius-lg)-3px)] px-2.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            scope === value
              ? "bg-accent text-foreground shadow-xs/5"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`tasks:groupScope.${value}`)}
        </button>
      ))}
    </div>
  );
}
