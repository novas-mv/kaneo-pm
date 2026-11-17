import type { JSX } from "react";
import { cn } from "@/lib/cn";
import {
  type CalendarTask,
  getCalendarTaskStatusClass,
} from "./calendar-task-bar";
import PostMarker from "./post-marker";

/** The bar that follows the pointer while a task is dragged to another day. */
export default function CalendarTaskBarGhost({
  task,
}: {
  task: CalendarTask;
}): JSX.Element {
  return (
    // The status tints are translucent; the opaque backing keeps the ghost
    // readable over the bars it passes.
    <div className="h-full w-full cursor-grabbing rounded-md bg-background shadow-md ring-2 ring-ring/35">
      <div
        className={cn(
          "flex h-full min-w-0 items-center overflow-hidden rounded-md border px-1.5 text-[11px] font-medium leading-none text-foreground",
          getCalendarTaskStatusClass(task.status),
        )}
      >
        {task.post && <PostMarker post={task.post} />}
        <span className="truncate">{task.title}</span>
      </div>
    </div>
  );
}
