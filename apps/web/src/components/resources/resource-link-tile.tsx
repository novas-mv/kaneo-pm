import { linkHost } from "@/components/external-links/link-host";
import { ResourceLinkGlyph } from "@/components/resources/resource-link-glyph";
import type { ResourceLink } from "@/fetchers/resource-link";

export function ResourceLinkTile({ link }: { link: ResourceLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.description ?? undefined}
      className="flex min-w-0 items-center gap-3 rounded-lg border border-border p-3 outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ResourceLinkGlyph emoji={link.emoji} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground text-sm">
          {link.title}
        </span>
        <span className="block truncate text-muted-foreground text-xs">
          {linkHost(link.url)}
        </span>
      </span>
    </a>
  );
}
