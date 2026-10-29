import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/cn";
import { EASE_OUT_CSS } from "@/lib/motion";
import { nestDropId } from "@/lib/project-tree";

export function SortableProjectItem({
  id,
  canReorder,
  canNestInto = false,
  children,
}: {
  id: string;
  canReorder: boolean;
  /** Whether the dragged project may be nested under this row right now. */
  canNestInto?: boolean;
  children: ReactNode;
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      disabled: !canReorder,
      // The reorder already moves the row; animating the index change too
      // replays the same move from a stale offset.
      animateLayoutChanges: () => false,
      // dnd-kit defaults to `ease`; this is the app's curve.
      transition: { duration: 200, easing: EASE_OUT_CSS },
    });
  // Registered on the row itself so its rect ignores the sortable transform;
  // `projectDropCollision` narrows it to the middle of the row.
  const nest = useDroppable({
    id: nestDropId(id),
    disabled: !canReorder || !canNestInto,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    // `listeners` without `attributes`: the latter puts role="button" and a tab
    // stop on the row, wrapping the link and the dropdown inside it.
    <SidebarMenuItem
      ref={(node) => {
        setNodeRef(node);
        nest.setNodeRef(node);
      }}
      style={style}
      data-kaneo-sortable=""
      className={cn(
        isDragging && "opacity-0",
        nest.isOver && "rounded-lg bg-sidebar-accent ring-2 ring-sidebar-ring",
      )}
      {...(canReorder ? listeners : {})}
    >
      {children}
    </SidebarMenuItem>
  );
}
