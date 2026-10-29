import { Link } from "@tanstack/react-router";
import { Pin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ResourceLinkTile } from "@/components/resources/resource-link-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceLinks } from "@/hooks/queries/resource-link/use-resource-links";
import { SectionHeader } from "./section-header";

type HomeResourcesProps = {
  workspaceId: string;
  canManage: boolean;
};

const VISIBLE_LINKS = 6;

export function HomeResources({ workspaceId, canManage }: HomeResourcesProps) {
  const { t } = useTranslation();
  const { data: links, isPending, isError } = useResourceLinks({ workspaceId });

  // Nothing to show members until something is pinned, or when the list fails
  // to load: Home works without it.
  if (isError && !links) return null;
  if (!isPending && links?.length === 0 && !canManage) return null;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={t("workspace:resources.homeTitle")}
        action={
          <Link
            to="/dashboard/workspace/$workspaceId/resources"
            params={{ workspaceId }}
            className="shrink-0 font-medium text-[13px] text-muted-foreground hover:text-foreground"
          >
            {t(
              canManage
                ? "workspace:resources.manage"
                : "workspace:resources.viewAll",
            )}
          </Link>
        }
      />
      {isPending ? (
        <div
          aria-busy="true"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[1, 2, 3].map((tile) => (
            <Skeleton key={tile} className="h-[58px] w-full" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <Link
          to="/dashboard/workspace/$workspaceId/resources"
          params={{ workspaceId }}
          className="flex items-center gap-3 rounded-lg border border-border border-dashed p-3.5 text-muted-foreground text-sm outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pin aria-hidden="true" className="size-4 shrink-0" />
          {t("workspace:resources.homeEmpty")}
        </Link>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.slice(0, VISIBLE_LINKS).map((link) => (
            <ResourceLinkTile key={link.id} link={link} />
          ))}
        </div>
      )}
    </section>
  );
}
