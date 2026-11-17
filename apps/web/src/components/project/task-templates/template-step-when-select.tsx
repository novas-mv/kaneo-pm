import { useTranslation } from "react-i18next";
import type { StepWhen } from "@/components/project/task-templates/template-form";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WHEN_KEYS: Record<StepWhen, string> = {
  before: "settings:taskTemplates.whenBefore",
  on: "settings:taskTemplates.whenOn",
  after: "settings:taskTemplates.whenAfter",
};

type TemplateStepWhenSelectProps = {
  value: StepWhen;
  label: string;
  onChange: (value: StepWhen) => void;
};

export function TemplateStepWhenSelect({
  value,
  label,
  onChange,
}: TemplateStepWhenSelectProps) {
  const { t } = useTranslation();
  const items = (Object.keys(WHEN_KEYS) as StepWhen[]).map((when) => ({
    value: when,
    label: t(WHEN_KEYS[when]),
  }));

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as StepWhen);
      }}
    >
      <SelectTrigger aria-label={label} size="sm" className="w-36 shrink-0">
        <SelectValue>{t(WHEN_KEYS[value])}</SelectValue>
      </SelectTrigger>
      <SelectPopup>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
