import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { type ProjectView, TASK_LAYOUTS } from "./project-views";

type LayoutTabsProps = {
  currentView: ProjectView;
  onSelect: (view: ProjectView) => void;
};

// The same layouts as the Display menu, one click away on the bar.
export function LayoutTabs({ currentView, onSelect }: LayoutTabsProps) {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("tasks:display.layout")}
      className="flex h-7 shrink-0 items-center gap-0.5 rounded-lg border border-border/80 bg-background p-0.5 dark:bg-input/32"
    >
      {TASK_LAYOUTS.map((layout) => {
        const Icon = layout.icon;
        const active = layout.id === currentView;
        const label = t(layout.labelKey);
        return (
          <button
            key={layout.id}
            type="button"
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => onSelect(layout.id)}
            className={cn(
              "inline-flex h-6 items-center gap-1.5 rounded-[calc(var(--radius-lg)-3px)] px-2 font-medium text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent text-foreground shadow-xs/5"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            <span className="hidden xl:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
