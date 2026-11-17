import { ListChecks, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RowActionsMenu } from "@/components/settings/row-actions-menu";
import { SettingsRow } from "@/components/settings/settings-row";
import type { TaskTemplate } from "@/fetchers/task-template/get-task-templates";

type TaskTemplateRowProps = {
  template: TaskTemplate;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function TaskTemplateRow({
  template,
  canEdit,
  onEdit,
  onDelete,
}: TaskTemplateRowProps) {
  const { t } = useTranslation();
  const steps = template.steps.map((step) => step.title).join(" → ");

  return (
    <SettingsRow
      icon={<ListChecks />}
      title={template.name}
      description={
        <span className="line-clamp-2">
          {steps || t("settings:taskTemplates.noSteps")}
        </span>
      }
    >
      {canEdit ? (
        <RowActionsMenu
          label={t("settings:taskTemplates.actionsAria", {
            name: template.name,
          })}
          actions={[
            {
              id: "edit",
              label: t("settings:taskTemplates.edit"),
              icon: Pencil,
              onSelect: onEdit,
            },
            {
              id: "delete",
              label: t("common:actions.delete"),
              icon: Trash2,
              onSelect: onDelete,
              destructive: true,
            },
          ]}
        />
      ) : null}
    </SettingsRow>
  );
}
