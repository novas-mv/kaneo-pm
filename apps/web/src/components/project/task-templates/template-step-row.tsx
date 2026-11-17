import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TemplateStepForm } from "@/components/project/task-templates/template-form";
import { TemplateStepWhenSelect } from "@/components/project/task-templates/template-step-when-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TemplateStepRowProps = {
  step: TemplateStepForm;
  number: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (changes: Partial<Omit<TemplateStepForm, "key">>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
};

export function TemplateStepRow({
  step,
  number,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: TemplateStepRowProps) {
  const { t } = useTranslation();

  return (
    <li className="flex flex-wrap items-center gap-2 px-2.5 py-2 sm:flex-nowrap">
      <div className="flex shrink-0 flex-col">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={t("settings:taskTemplates.moveUpAria", { number })}
          disabled={isFirst}
          onClick={() => onMove(-1)}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={t("settings:taskTemplates.moveDownAria", { number })}
          disabled={isLast}
          onClick={() => onMove(1)}
        >
          <ArrowDown aria-hidden="true" />
        </Button>
      </div>
      <Input
        size="sm"
        className="min-w-40 flex-1"
        value={step.title}
        autoComplete="off"
        maxLength={200}
        aria-label={t("settings:taskTemplates.stepTitleAria", { number })}
        placeholder={t("settings:taskTemplates.stepTitlePlaceholder")}
        onChange={(event) => onChange({ title: event.target.value })}
      />
      {step.when !== "on" ? (
        <Input
          size="sm"
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          step={1}
          className="w-18 shrink-0"
          value={step.days}
          aria-label={t("settings:taskTemplates.stepDaysAria", { number })}
          onChange={(event) => onChange({ days: event.target.value })}
        />
      ) : null}
      <TemplateStepWhenSelect
        value={step.when}
        label={t("settings:taskTemplates.stepWhenAria", { number })}
        onChange={(when) => onChange({ when })}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground"
        aria-label={t("settings:taskTemplates.removeStepAria", { number })}
        onClick={onRemove}
      >
        <X aria-hidden="true" />
      </Button>
    </li>
  );
}
