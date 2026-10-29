import { Link2 } from "lucide-react";
import { cn } from "@/lib/cn";

type ResourceLinkGlyphProps = {
  emoji: string | null;
  className?: string;
};

export function ResourceLinkGlyph({
  emoji,
  className,
}: ResourceLinkGlyphProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-base text-muted-foreground",
        className,
      )}
    >
      {emoji ? emoji : <Link2 className="size-4" />}
    </span>
  );
}
