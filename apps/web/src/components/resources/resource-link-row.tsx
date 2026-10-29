import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { linkHost } from "@/components/external-links/link-host";
import { DragHandle } from "@/components/project/sortable/drag-handle";
import { useSortableRow } from "@/components/project/sortable/use-sortable-row";
import { ResourceLinkGlyph } from "@/components/resources/resource-link-glyph";
import { RowActionsMenu } from "@/components/settings/row-actions-menu";
import type { ResourceLink } from "@/fetchers/resource-link";
import { cn } from "@/lib/cn";

type ResourceLinkRowProps = {
  link: ResourceLink;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function ResourceLinkRow({
  link,
  canManage,
  onEdit,
  onDelete,
}: ResourceLinkRowProps) {
  const { t } = useTranslation();
  const { rowRef, rowStyle, isDragging, handleProps } = useSortableRow(
    link.id,
    !canManage,
  );

  return (
    <div
      ref={rowRef}
      style={rowStyle}
      className={cn(
        "group/row flex items-center gap-3 bg-card px-4 py-3",
        isDragging && "relative z-10 shadow-sm",
      )}
    >
      {canManage ? (
        <DragHandle
          label={t("workspace:resources.dragAria", { name: link.title })}
          handleProps={handleProps}
        />
      ) : null}
      <ResourceLinkGlyph emoji={link.emoji} />
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group/link flex min-w-0 flex-1 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="block truncate text-sm font-medium group-hover/link:underline">
            {link.title}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {linkHost(link.url)}
            {link.description ? ` · ${link.description}` : null}
          </span>
        </span>
        <ExternalLink
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground"
        />
        <span className="sr-only">
          {t("workspace:resources.opensInNewTab")}
        </span>
      </a>
      {canManage ? (
        <RowActionsMenu
          label={t("workspace:resources.actionsAria", { name: link.title })}
          actions={[
            {
              id: "edit",
              label: t("workspace:resources.edit"),
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
    </div>
  );
}
