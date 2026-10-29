import { PinIcon } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/components/project/error-message";
import {
  formFromLink,
  getFormIssue,
  toFields,
} from "@/components/resources/resource-link-form";
import type { ResourceLinkScope } from "@/components/resources/resource-link-scope";
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
import type { ResourceLink } from "@/fetchers/resource-link";
import { useSaveResourceLink } from "@/hooks/mutations/resource-link/use-save-resource-link";
import { toast } from "@/lib/toast";

type ResourceLinkDialogProps = {
  scope: ResourceLinkScope;
  link: ResourceLink | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ResourceLinkDialog({
  scope,
  link,
  open,
  onOpenChange,
}: ResourceLinkDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => formFromLink(link));
  const { mutateAsync: save, isPending } = useSaveResourceLink(scope);
  const titleId = useId();
  const urlId = useId();
  const descriptionId = useId();
  const emojiId = useId();
  const editing = link !== null;
  const issue = getFormIssue(form);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (issue || isPending) return;

    try {
      await save({ id: link?.id, fields: toFields(form) });
      toast.success(
        t(
          editing
            ? "workspace:resources.updateSuccess"
            : "workspace:resources.createSuccess",
        ),
        editing ? undefined : { icon: PinIcon },
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        errorMessage(
          error,
          t(
            editing
              ? "workspace:resources.updateError"
              : "workspace:resources.createError",
          ),
        ),
      );
    }
  };

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-md">
        <form className="contents" noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {t(
                editing
                  ? "workspace:resources.editTitle"
                  : "workspace:resources.newTitle",
              )}
            </DialogTitle>
            <DialogDescription>
              {t("workspace:resources.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={titleId}>
                {t("workspace:resources.titleLabel")}
              </Label>
              <Input
                id={titleId}
                value={form.title}
                maxLength={120}
                autoFocus
                placeholder={t("workspace:resources.titlePlaceholder")}
                onChange={(event) => set("title")(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={urlId}>{t("workspace:resources.urlLabel")}</Label>
              <Input
                id={urlId}
                type="url"
                inputMode="url"
                value={form.url}
                maxLength={2048}
                placeholder={t("workspace:resources.urlPlaceholder")}
                aria-invalid={issue === "url" && form.url !== ""}
                onChange={(event) => set("url")(event.target.value)}
              />
              {issue === "url" && form.url !== "" ? (
                <p role="alert" className="text-destructive-foreground text-xs">
                  {t("workspace:resources.urlInvalid")}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor={descriptionId}>
                {t("workspace:resources.descriptionLabel")}
              </Label>
              <Input
                id={descriptionId}
                value={form.description}
                maxLength={280}
                placeholder={t("workspace:resources.descriptionPlaceholder")}
                onChange={(event) => set("description")(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={emojiId}>
                {t("workspace:resources.emojiLabel")}
              </Label>
              <Input
                id={emojiId}
                value={form.emoji}
                maxLength={32}
                className="w-24"
                placeholder="📁"
                onChange={(event) => set("emoji")(event.target.value)}
              />
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" disabled={issue !== null || isPending}>
              {t(
                isPending
                  ? "workspace:resources.saving"
                  : editing
                    ? "workspace:resources.save"
                    : "workspace:resources.create",
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
