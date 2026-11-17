import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  emptyStep,
  MAX_TEMPLATE_STEPS,
  moveStep,
  type TemplateStepForm,
  updateStep,
} from "@/components/project/task-templates/template-form";
import { TemplateStepRow } from "@/components/project/task-templates/template-step-row";
import { Button } from "@/components/ui/button";

type TemplateStepsEditorProps = {
  steps: TemplateStepForm[];
  labelledBy: string;
  onChange: (steps: TemplateStepForm[]) => void;
};

export function TemplateStepsEditor({
  steps,
  labelledBy,
  onChange,
}: TemplateStepsEditorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {steps.length > 0 ? (
        <ol
          aria-labelledby={labelledBy}
          className="divide-y divide-border rounded-lg border border-border"
        >
          {steps.map((step, index) => (
            <TemplateStepRow
              key={step.key}
              step={step}
              number={index + 1}
              isFirst={index === 0}
              isLast={index === steps.length - 1}
              onChange={(changes) =>
                onChange(updateStep(steps, step.key, changes))
              }
              onMove={(direction) =>
                onChange(moveStep(steps, index, direction))
              }
              onRemove={() =>
                onChange(steps.filter((other) => other.key !== step.key))
              }
            />
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground text-xs">
          {t("settings:taskTemplates.stepsEmpty")}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={steps.length >= MAX_TEMPLATE_STEPS}
        onClick={() => onChange([...steps, emptyStep()])}
      >
        <Plus aria-hidden="true" />
        {t("settings:taskTemplates.addStep")}
      </Button>
    </div>
  );
}
