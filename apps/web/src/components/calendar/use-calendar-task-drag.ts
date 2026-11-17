import {
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { addDays, differenceInCalendarDays } from "date-fns";
import { useCallback, useState } from "react";
import type { CalendarTask } from "./calendar-task-bar";
import type {
  CalendarDayDropData,
  CalendarDragData,
} from "./calendar-drag-data";
import { grabbedDayOffset, type ResizeEdge } from "./shift-task-dates";

// A plain click on a bar must still open the task.
const ACTIVATION_DISTANCE_PX = 5;

type ActiveDrag<TTask extends CalendarTask> =
  | {
      kind: "move";
      task: TTask;
      /** The day under the pointer when the bar was picked up. */
      grabbedDay: Date;
    }
  | {
      kind: "resize";
      task: TTask;
      edge: ResizeEdge;
      /** The day under the pointer right now, for the live preview. */
      overDay: Date | null;
    };

export type CalendarResizePreview<TTask extends CalendarTask> = {
  task: TTask;
  edge: ResizeEdge;
  day: Date;
};

type CalendarDragHandlers<TTask extends CalendarTask> = {
  onMoveTask?: (task: TTask, deltaDays: number) => void;
  onResizeTask?: (task: TTask, edge: ResizeEdge, targetDay: Date) => void;
};

function dayOf(over: DragOverEvent["over"]): Date | null {
  return (over?.data.current as CalendarDayDropData | undefined)?.day ?? null;
}

/**
 * Drag state for the month grid. Everything the drop needs is kept here at
 * drag start, so it survives the dragged bar re-rendering in a new week.
 */
export function useCalendarTaskDrag<TTask extends CalendarTask>({
  onMoveTask,
  onResizeTask,
}: CalendarDragHandlers<TTask>) {
  const [activeDrag, setActiveDrag] = useState<ActiveDrag<TTask> | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: ACTIVATION_DISTANCE_PX },
    }),
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as
      | CalendarDragData<TTask>
      | undefined;
    if (!data) return;
    if (data.kind === "resize") {
      setActiveDrag({
        kind: "resize",
        task: data.task,
        edge: data.edge,
        overDay: null,
      });
      return;
    }
    const rect = event.active.rect.current.initial;
    const pointerX =
      "clientX" in event.activatorEvent
        ? (event.activatorEvent as PointerEvent).clientX
        : undefined;
    const offset =
      rect && pointerX !== undefined
        ? grabbedDayOffset(pointerX, rect.left, rect.width, data.daySpan)
        : 0;
    setActiveDrag({
      kind: "move",
      task: data.task,
      grabbedDay: addDays(data.firstDay, offset),
    });
  }, []);

  const onDragOver = useCallback((event: DragOverEvent) => {
    const day = dayOf(event.over);
    setActiveDrag((current) =>
      current?.kind === "resize" && day
        ? { ...current, overDay: day }
        : current,
    );
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const drag = activeDrag;
      setActiveDrag(null);
      const day = dayOf(event.over);
      if (!drag || !day) return;
      if (drag.kind === "resize") {
        onResizeTask?.(drag.task, drag.edge, day);
        return;
      }
      const deltaDays = differenceInCalendarDays(day, drag.grabbedDay);
      if (deltaDays !== 0) onMoveTask?.(drag.task, deltaDays);
    },
    [activeDrag, onMoveTask, onResizeTask],
  );

  const onDragCancel = useCallback(() => setActiveDrag(null), []);

  const resizePreview: CalendarResizePreview<TTask> | null =
    activeDrag?.kind === "resize" && activeDrag.overDay
      ? {
          task: activeDrag.task,
          edge: activeDrag.edge,
          day: activeDrag.overDay,
        }
      : null;

  return {
    sensors,
    movingTask: activeDrag?.kind === "move" ? activeDrag.task : null,
    resizePreview,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
  };
}
