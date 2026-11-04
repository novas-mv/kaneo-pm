import { useTranslation } from "react-i18next";
import type { MyTasksScope } from "@/components/my-work/filter-assigned-tasks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type MyTasksScopeFilterProps = {
  value: MyTasksScope;
  onChange: (value: MyTasksScope) => void;
};

export function MyTasksScopeFilter({
  value,
  onChange,
}: MyTasksScopeFilterProps) {
  const { t } = useTranslation();
  const options: Array<{ value: MyTasksScope; label: string }> = [
    { value: "all", label: t("workspace:myTasks.filter.all") },
    { value: "work", label: t("workspace:myTasks.filter.work") },
    { value: "personal", label: t("workspace:myTasks.filter.personal") },
  ];

  return (
    <fieldset className="inline-flex items-center gap-0.5">
      <legend className="sr-only">{t("workspace:myTasks.filter.label")}</legend>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "secondary" : "ghost"}
          size="xs"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(value !== option.value && "text-muted-foreground")}
        >
          {option.label}
        </Button>
      ))}
    </fieldset>
  );
}
