import { ListChecks } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/components/project/error-message";
import {
  formFromTemplate,
  getTemplateFormIssue,
  toTemplatePayload,
} from "@/components/project/task-templates/template-form";
import { TemplateStepsEditor } from "@/components/project/task-templates/template-steps-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TaskTemplate } from "@/fetchers/task-template/get-task-templates";
import { useCreateTaskTemplate } from "@/hooks/mutations/task-template/use-create-task-template";
import { useUpdateTaskTemplate } from "@/hooks/mutations/task-template/use-update-task-template";
import { toast } from "@/lib/toast";

type TaskTemplateDialogProps = {
  projectId: string;
  template: TaskTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function submitLabelKey(editing: boolean, pending: boolean) {
  if (editing) {
    return pending
      ? "settings:taskTemplates.saving"
      : "settings:taskTemplates.save";
  }
  return pending
    ? "settings:taskTemplates.creating"
    : "settings:taskTemplates.create";
}

export function TaskTemplateDialog({
  projectId,
  template,
  open,
  onOpenChange,
}: TaskTemplateDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => formFromTemplate(template));
  const create = useCreateTaskTemplate();
  const update = useUpdateTaskTemplate();
  const nameId = useId();
  const stepsLabelId = useId();
  const editing = template !== null;
  const pending = create.isPending || update.isPending;
  const issue = getTemplateFormIssue(form);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (issue || pending) return;
    const data = toTemplatePayload(form);

    try {
      if (template) {
        await update.mutateAsync({
          templateId: template.id,
          projectId,
          data,
        });
        toast.success(t("settings:taskTemplates.updateSuccess"));
      } else {
        await create.mutateAsync({ projectId, data });
        toast.success(t("settings:taskTemplates.createSuccess"), {
          icon: ListChecks,
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        errorMessage(
          error,
          t(
            template
              ? "settings:taskTemplates.updateError"
              : "settings:taskTemplates.createError",
          ),
        ),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-140">
        <form className="contents" noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {t(
                editing
                  ? "settings:taskTemplates.editTitle"
                  : "settings:taskTemplates.newTitle",
              )}
            </DialogTitle>
            <DialogDescription>
              {t("settings:taskTemplates.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor={nameId}>
                {t("settings:taskTemplates.nameLabel")}
              </Label>
              <Input
                id={nameId}
                value={form.name}
                autoComplete="off"
                maxLength={100}
                placeholder={t("settings:taskTemplates.namePlaceholder")}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <p id={stepsLabelId} className="text-sm font-medium">
                {t("settings:taskTemplates.stepsLabel")}
              </p>
              <TemplateStepsEditor
                steps={form.steps}
                labelledBy={stepsLabelId}
                onChange={(steps) =>
                  setForm((current) => ({ ...current, steps }))
                }
              />
            </div>
            {issue && issue !== "nameRequired" ? (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {t(`settings:taskTemplates.issues.${issue}`)}
              </p>
            ) : null}
          </DialogPanel>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" disabled={issue !== null || pending}>
              {t(submitLabelKey(editing, pending))}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
