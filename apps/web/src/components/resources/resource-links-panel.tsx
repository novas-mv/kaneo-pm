import { Plus, Pin } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResourceLinkDialog } from "@/components/resources/resource-link-dialog";
import { ResourceLinkList } from "@/components/resources/resource-link-list";
import type { ResourceLinkScope } from "@/components/resources/resource-link-scope";
import { ResourceLinksSkeleton } from "@/components/resources/resource-links-skeleton";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsEmpty } from "@/components/settings/settings-empty";
import { Button } from "@/components/ui/button";
import type { ResourceLink } from "@/fetchers/resource-link";
import { useResourceLinks } from "@/hooks/queries/resource-link/use-resource-links";

type ResourceLinksPanelProps = {
  scope: ResourceLinkScope;
  canManage: boolean;
  title: string;
  description: string;
};

type DialogState = {
  open: boolean;
  link: ResourceLink | null;
  key: number;
};

export function ResourceLinksPanel({
  scope,
  canManage,
  title,
  description,
}: ResourceLinksPanelProps) {
  const { t } = useTranslation();
  const { data: links, isPending, isError, refetch } = useResourceLinks(scope);
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    link: null,
    key: 0,
  });

  const openDialog = (link: ResourceLink | null) =>
    setDialog((current) => ({ open: true, link, key: current.key + 1 }));

  const addButton = canManage ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => openDialog(null)}
    >
      <Plus aria-hidden="true" />
      {t("workspace:resources.add")}
    </Button>
  ) : null;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {addButton}
      </header>

      {isPending ? (
        <ResourceLinksSkeleton />
      ) : isError && !links ? (
        <SettingsCard>
          <SettingsEmpty
            icon={<Pin />}
            title={t("workspace:resources.loadError")}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
              >
                {t("workspace:resources.retry")}
              </Button>
            }
          />
        </SettingsCard>
      ) : links.length === 0 ? (
        <SettingsCard>
          <SettingsEmpty
            icon={<Pin />}
            title={t("workspace:resources.emptyTitle")}
            description={t(
              canManage
                ? "workspace:resources.emptyDescription"
                : "workspace:resources.emptyDescriptionReadOnly",
            )}
            action={addButton}
          />
        </SettingsCard>
      ) : (
        <ResourceLinkList
          scope={scope}
          links={links}
          canManage={canManage}
          onEdit={openDialog}
        />
      )}

      {canManage ? (
        <ResourceLinkDialog
          key={dialog.key}
          scope={scope}
          link={dialog.link}
          open={dialog.open}
          onOpenChange={(open) =>
            setDialog((current) => ({ ...current, open }))
          }
        />
      ) : null}
    </section>
  );
}
