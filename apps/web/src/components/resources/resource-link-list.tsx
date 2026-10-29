import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/components/project/error-message";
import { SortableList } from "@/components/project/sortable/sortable-list";
import { useSortableOrder } from "@/components/project/sortable/use-sortable-order";
import { ResourceLinkRow } from "@/components/resources/resource-link-row";
import type { ResourceLinkScope } from "@/components/resources/resource-link-scope";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { SettingsCard } from "@/components/settings/settings-card";
import type { ResourceLink } from "@/fetchers/resource-link";
import { useDeleteResourceLink } from "@/hooks/mutations/resource-link/use-delete-resource-link";
import { useReorderResourceLinks } from "@/hooks/mutations/resource-link/use-reorder-resource-links";
import { toast } from "@/lib/toast";

type ResourceLinkListProps = {
  scope: ResourceLinkScope;
  links: ResourceLink[];
  canManage: boolean;
  onEdit: (link: ResourceLink) => void;
};

export function ResourceLinkList({
  scope,
  links,
  canManage,
  onEdit,
}: ResourceLinkListProps) {
  const { t } = useTranslation();
  const { mutateAsync: reorder } = useReorderResourceLinks(scope);
  const { mutateAsync: remove, isPending: removing } =
    useDeleteResourceLink(scope);
  const [pendingDelete, setPendingDelete] = useState<ResourceLink | null>(null);

  const { ordered, move } = useSortableOrder(links, async (next) => {
    try {
      await reorder(next.map((link) => link.id));
    } catch (error) {
      toast.error(errorMessage(error, t("workspace:resources.reorderError")));
    }
  });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove(pendingDelete.id);
      setPendingDelete(null);
      toast.success(t("workspace:resources.deleteSuccess"), {
        icon: Trash2Icon,
      });
    } catch (error) {
      toast.error(errorMessage(error, t("workspace:resources.deleteError")));
    }
  };

  return (
    <>
      <SettingsCard>
        <SortableList ids={ordered.map((link) => link.id)} onMove={move}>
          {ordered.map((link) => (
            <ResourceLinkRow
              key={link.id}
              link={link}
              canManage={canManage}
              onEdit={() => onEdit(link)}
              onDelete={() => setPendingDelete(link)}
            />
          ))}
        </SortableList>
      </SettingsCard>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t("workspace:resources.deleteTitle", {
          name: pendingDelete?.title ?? "",
        })}
        description={t("workspace:resources.deleteDescription")}
        confirmLabel={t("workspace:resources.deleteConfirm")}
        pendingLabel={t("common:actions.deleting")}
        pending={removing}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
