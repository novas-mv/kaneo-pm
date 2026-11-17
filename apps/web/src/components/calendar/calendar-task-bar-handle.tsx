import { useDraggable } from "@dnd-kit/core";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { CalendarTask } from "./calendar-task-bar";
import type { CalendarResizeDragData } from "./calendar-drag-data";
import type { ResizeEdge } from "./shift-task-dates";

type CalendarTaskBarHandleProps = {
  id: string;
  task: CalendarTask;
  edge: ResizeEdge;
  /**
   * False where the bar runs on past the week edge. The handle stays mounted
   * so a resize that moves that edge keeps its drag alive.
   */
  visible: boolean;
};

/** Thin edge grip on a calendar bar, dragged to change one of its dates. */
export default function CalendarTaskBarHandle({
  id,
  task,
  edge,
  visible,
}: CalendarTaskBarHandleProps): JSX.Element {
  const { t } = useTranslation();
  const data: CalendarResizeDragData = { kind: "resize", task, edge };
  // Not disabled when hidden: that could cut off a resize already under way.
  const { setNodeRef, listeners, isDragging } = useDraggable({ id, data });

  return (
    <span
      ref={setNodeRef}
      {...listeners}
      aria-hidden
      title={t(
        edge === "start"
          ? "tasks:calendar.resizeStart"
          : "tasks:calendar.resizeDue",
      )}
      // A click on the grip must not also open the task.
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "absolute inset-y-0 z-10 w-1.5 cursor-ew-resize bg-foreground/25 opacity-0 transition-opacity group-hover:opacity-100",
        edge === "start" ? "left-0" : "right-0",
        isDragging && "opacity-100",
        !visible && "hidden",
      )}
    />
  );
}
