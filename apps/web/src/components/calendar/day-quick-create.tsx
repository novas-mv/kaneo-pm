import { addDays } from "date-fns";
import { CalendarIcon, LayoutTemplate } from "lucide-react";
import { type CSSProperties, type JSX, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getInitialTaskColumn } from "@/components/shared/modals/initial-task-column";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useCreateTask from "@/hooks/mutations/task/use-create-task";
import { useApplyTaskTemplate } from "@/hooks/mutations/task-template/use-apply-task-template";
import { useGetTaskTemplates } from "@/hooks/queries/task-template/use-get-task-templates";
import { useGetColumns } from "@/hooks/queries/column/use-get-columns";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";

const NO_TEMPLATE = "__none__";

type DayQuickCreateProps = {
  /** Local midnight of the clicked day, as the month grid builds it. */
  day: Date;
  projectId: string;
  /** Grid placement of the "(No title)" draft bar. */
  style: CSSProperties;
  onClose: () => void;
  onMoreOptions: (title: string, day: Date) => void;
};

/**
 * Google-Calendar-style draft: a dashed "(No title)" bar on the clicked day
 * with a small form anchored to it. Mounted only while a draft is open.
 */
export default function DayQuickCreate({
  day,
  projectId,
  style,
  onClose,
  onMoreOptions,
}: DayQuickCreateProps): JSX.Element {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const { mutateAsync: createTask } = useCreateTask();
  const { refetch: refetchColumns } = useGetColumns(projectId);
  const { mutateAsync: applyTemplate } = useApplyTaskTemplate();
  const { data: templates } = useGetTaskTemplates(projectId);
  const [templateId, setTemplateId] = useState(NO_TEMPLATE);
  const template = templates?.find((item) => item.id === templateId);
  const templateItems = [
    { value: NO_TEMPLATE, label: t("tasks:calendar.quickCreate.noTemplate") },
    ...(templates ?? []).map((item) => ({ value: item.id, label: item.name })),
  ];

  const dayLabel = formatDate(day, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (template) {
        // The server picks the first open column for the post and its steps.
        await applyTemplate({
          templateId: template.id,
          projectId,
          data: { title: trimmed, postDate: day.toISOString() },
        });
        onClose();
        return;
      }
      // Same rule as the create dialog: read the workflow fresh so a stale
      // cache cannot send the task to a column that was removed.
      const workflow = await refetchColumns();
      if (workflow.isError || !workflow.data)
        throw new Error("Columns unavailable");
      await createTask({
        title: trimmed,
        description: "",
        projectId,
        priority: "no-priority",
        status: getInitialTaskColumn(workflow.data)?.slug ?? "planned",
        // Local midnight, like the date pickers, so the task lands on the
        // clicked day in the viewer's timezone.
        dueDate: day.toISOString(),
      });
      onClose();
    } catch {
      toast.error(t("tasks:calendar.quickCreate.createError"));
      inputRef.current?.focus();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Popover
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <PopoverTrigger
        style={style}
        aria-label={t("tasks:calendar.quickCreate.dialogLabel", {
          date: dayLabel,
        })}
        className="z-20 mx-1 mb-0.5 flex h-6 min-w-0 items-center overflow-hidden rounded-md border border-dashed border-primary/60 bg-primary/10 px-1.5 text-left text-[11px] font-medium leading-none text-muted-foreground sm:h-5"
      >
        <span className="truncate">
          {title.trim() || t("tasks:calendar.noTitle")}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-3"
        initialFocus={inputRef}
        aria-label={t("tasks:calendar.quickCreate.dialogLabel", {
          date: dayLabel,
        })}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label={t("tasks:calendar.quickCreate.titleLabel")}
            placeholder={t("tasks:calendar.quickCreate.titlePlaceholder")}
            className="w-full border-b border-border bg-transparent pb-1.5 text-base font-medium text-foreground outline-none placeholder:text-muted-foreground/72 focus:border-primary"
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarIcon aria-hidden className="size-3.5" />
            {dayLabel}
          </p>
          {templates && templates.length > 0 && (
            <div className="space-y-1.5">
              <Select
                items={templateItems}
                value={templateId}
                onValueChange={(next) => {
                  if (typeof next === "string" && next) setTemplateId(next);
                }}
              >
                <SelectTrigger
                  size="sm"
                  aria-label={t("tasks:calendar.quickCreate.template")}
                >
                  <LayoutTemplate aria-hidden className="size-3.5" />
                  <SelectValue>
                    {
                      templateItems.find((item) => item.value === templateId)
                        ?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {templateItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              {template && template.steps.length > 0 && (
                <ul
                  aria-label={t("tasks:calendar.quickCreate.stepsLabel", {
                    template: template.name,
                  })}
                  className="space-y-0.5 pl-1 text-xs text-muted-foreground"
                >
                  {template.steps.map((step) => (
                    <li
                      // Steps have no id; a repeat of both is harmless here.
                      key={`${step.offsetDays}-${step.title}`}
                      className="flex justify-between gap-2"
                    >
                      <span className="truncate">{step.title}</span>
                      <span className="shrink-0">
                        {formatDate(addDays(day, step.offsetDays), {
                          weekday: "short",
                          day: "numeric",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMoreOptions(title.trim(), day)}
            >
              {t("tasks:calendar.quickCreate.moreOptions")}
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {t("tasks:calendar.quickCreate.save")}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
