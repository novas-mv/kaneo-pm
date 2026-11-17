import { LockIcon, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TaskTemplateDialog } from "@/components/project/task-templates/task-template-dialog";
import { TaskTemplateList } from "@/components/project/task-templates/task-template-list";
import { SettingsNote } from "@/components/settings/settings-note";
import { SettingsPage } from "@/components/settings/settings-page";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import type { TaskTemplate } from "@/fetchers/task-template/get-task-templates";
import useGetProject from "@/hooks/queries/project/use-get-project";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";

type DialogState = {
  open: boolean;
  template: TaskTemplate | null;
  // A new key remounts the dialog so its form starts from the chosen template.
  key: number;
};

export function TaskTemplatesPage({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const { data: workspace } = useActiveWorkspace();
  const { data: project } = useGetProject({
    id: projectId,
    workspaceId: workspace?.id ?? "",
  });
  const { canUpdateProjects, isCheckingPermissions } = useWorkspacePermission();
  const canEdit = canUpdateProjects();
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    template: null,
    key: 0,
  });

  const openDialog = (template: TaskTemplate | null) =>
    setDialog((current) => ({ open: true, template, key: current.key + 1 }));

  return (
    <SettingsPage
      title={t("settings:taskTemplates.title")}
      description={
        project?.name
          ? t("settings:taskTemplates.subtitle", { project: project.name })
          : t("settings:taskTemplates.subtitleFallback")
      }
      actions={
        canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openDialog(null)}
          >
            <Plus aria-hidden="true" />
            {t("settings:taskTemplates.newTemplate")}
          </Button>
        ) : undefined
      }
    >
      <SettingsSection
        title={t("settings:taskTemplates.listTitle")}
        description={t("settings:taskTemplates.listDescription")}
      >
        <TaskTemplateList
          projectId={projectId}
          canEdit={canEdit}
          onCreate={() => openDialog(null)}
          onEdit={openDialog}
        />
        {!canEdit && !isCheckingPermissions ? (
          <SettingsNote icon={LockIcon}>
            {t("settings:taskTemplates.readOnlyNote")}
          </SettingsNote>
        ) : null}
      </SettingsSection>
      <TaskTemplateDialog
        key={dialog.key}
        projectId={projectId}
        template={dialog.template}
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
      />
    </SettingsPage>
  );
}
