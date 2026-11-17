import type { CalendarTask } from "./calendar-task-bar";
import type { ResizeEdge } from "./shift-task-dates";

/** Carried by a bar picked up to move it to another day. */
export type CalendarMoveDragData<TTask extends CalendarTask = CalendarTask> = {
  kind: "move";
  task: TTask;
  /** The bar's first visible day in this week. */
  firstDay: Date;
  daySpan: number;
};

/** Carried by a bar's edge handle picked up to resize it. */
export type CalendarResizeDragData<TTask extends CalendarTask = CalendarTask> =
  {
    kind: "resize";
    task: TTask;
    edge: ResizeEdge;
  };

export type CalendarDragData<TTask extends CalendarTask = CalendarTask> =
  | CalendarMoveDragData<TTask>
  | CalendarResizeDragData<TTask>;

/** Drop data each day cell carries, read back while dragging. */
export type CalendarDayDropData = { day: Date };
