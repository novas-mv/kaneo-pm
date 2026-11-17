import { ListChecks, Plus, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/components/project/error-message";
import { TaskTemplateRow } from "@/components/project/task-templates/task-template-row";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsEmpty } from "@/components/settings/settings-empty";
import { SettingsRowsSkeleton } from "@/components/settings/settings-rows-skeleton";
import { Button } from "@/components/ui/button";
import type { TaskTemplate } from "@/fetchers/task-template/get-task-templates";
import { useDeleteTaskTemplate } from "@/hooks/mutations/task-template/use-delete-task-template";
import { useGetTaskTemplates } from "@/hooks/queries/task-template/use-get-task-templates";
import { toast } from "@/lib/toast";

type TaskTemplateListProps = {
  projectId: string;
  canEdit: boolean;
  onCreate: () => void;
  onEdit: (template: TaskTemplate) => void;
};

export function TaskTemplateList({
  projectId,
  canEdit,
  onCreate,
  onEdit,
}: TaskTemplateListProps) {
  const { t } = useTranslation();
  const {
    data: templates,
    isPending,
    isError,
  } = useGetTaskTemplates(projectId);
  const remove = useDeleteTaskTemplate();
  const [pendingDelete, setPendingDelete] = useState<TaskTemplate | null>(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync({ templateId: pendingDelete.id, projectId });
      setPendingDelete(null);
      toast.success(t("settings:taskTemplates.deleteSuccess"), {
        icon: Trash2Icon,
      });
    } catch (error) {
      toast.error(errorMessage(error, t("settings:taskTemplates.deleteError")));
    }
  };

  if (isPending) {
    return (
      <SettingsCard>
        <SettingsRowsSkeleton rows={2} withDescription />
      </SettingsCard>
    );
  }

  if (isError) {
    return (
      <SettingsCard>
        <p
          role="alert"
          className="px-4 py-3.5 text-destructive-foreground text-sm"
        >
          {t("settings:taskTemplates.loadError")}
        </p>
      </SettingsCard>
    );
  }

  if (templates.length === 0) {
    return (
      <SettingsCard>
        <SettingsEmpty
          icon={<ListChecks />}
          title={t("settings:taskTemplates.emptyTitle")}
          description={t("settings:taskTemplates.emptyDescription")}
          action={
            canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCreate}
              >
                <Plus aria-hidden="true" />
                {t("settings:taskTemplates.newTemplate")}
              </Button>
            ) : undefined
          }
        />
      </SettingsCard>
    );
  }

  return (
    <>
      <SettingsCard>
        {templates.map((template) => (
          <TaskTemplateRow
            key={template.id}
            template={template}
            canEdit={canEdit}
            onEdit={() => onEdit(template)}
            onDelete={() => setPendingDelete(template)}
          />
        ))}
      </SettingsCard>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t("settings:taskTemplates.deleteTitle", {
          name: pendingDelete?.name ?? "",
        })}
        description={t("settings:taskTemplates.deleteDescription")}
        confirmLabel={t("settings:taskTemplates.deleteConfirm")}
        pendingLabel={t("common:actions.deleting")}
        pending={remove.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
