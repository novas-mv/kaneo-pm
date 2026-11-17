import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { type JSX, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import CalendarTaskBar, { type CalendarTask } from "./calendar-task-bar";
import CalendarTaskBarGhost from "./calendar-task-bar-ghost";
import DayOverflowPopover from "./day-overflow-popover";
import DayQuickCreate from "./day-quick-create";
import MonthDayCell from "./month-day-cell";
import { packWeekLanes } from "./month-grid-model";
import { placeholderLane } from "./placeholder-lane";
import { type ResizeEdge, resizeRange } from "./shift-task-dates";
import { useCalendarTaskDrag } from "./use-calendar-task-drag";

export type MonthGridQuickCreate = {
  projectId: string;
  onMoreOptions: (title: string, day: Date) => void;
};

type MonthGridProps<TTask extends CalendarTask> = {
  weeks: Date[][];
  tasks: TTask[];
  visibleMonth: Date;
  maxLanes: number;
  projectSlug?: string;
  onOpenTask: (taskId: string) => void;
  /** Enables dragging bars to another day; omit to keep the grid read-only. */
  onMoveTask?: (task: TTask, deltaDays: number) => void;
  /** Enables the bars' edge handles, which drag one date to another day. */
  onResizeTask?: (task: TTask, edge: ResizeEdge, targetDay: Date) => void;
  /** Enables click-an-empty-day to create a task. */
  quickCreate?: MonthGridQuickCreate;
};

export default function MonthGrid<TTask extends CalendarTask>({
  weeks,
  tasks,
  visibleMonth,
  maxLanes,
  projectSlug,
  onOpenTask,
  onMoveTask,
  onResizeTask,
  quickCreate,
}: MonthGridProps<TTask>): JSX.Element {
  const weekdayTemplate = weeks[0] ?? [];
  const [draftDay, setDraftDay] = useState<Date | null>(null);
  const drag = useCalendarTaskDrag({ onMoveTask, onResizeTask });
  const { resizePreview } = drag;

  // While an edge is dragged, the bar is laid out with its would-be span.
  const shownTasks = useMemo(() => {
    if (!resizePreview) return tasks;
    return tasks.map((task) => {
      if (task.id !== resizePreview.task.id) return task;
      const next = resizeRange(
        task.scheduleStart,
        task.scheduleEnd,
        resizePreview.edge,
        resizePreview.day,
      );
      return { ...task, scheduleStart: next.start, scheduleEnd: next.due };
    });
  }, [tasks, resizePreview]);

  const layouts = useMemo(
    () => weeks.map((week) => packWeekLanes(week, shownTasks, maxLanes)),
    [weeks, shownTasks, maxLanes],
  );

  return (
    <DndContext
      sensors={drag.sensors}
      collisionDetection={pointerWithin}
      onDragStart={drag.onDragStart}
      onDragOver={drag.onDragOver}
      onDragEnd={drag.onDragEnd}
      onDragCancel={drag.onDragCancel}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-auto overscroll-x-contain">
        <div className="sticky top-0 z-30 grid grid-cols-7 border-b border-border bg-background/95 backdrop-blur">
          {weekdayTemplate.map((day) => (
            <div
              key={`weekday-${day.toISOString()}`}
              className="border-r border-border/60 px-1 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {formatDate(day, { weekday: "short" })}
            </div>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {weeks.map((week, weekIndex) => {
            const { segments, hiddenCountByDay, tasksByDay } =
              layouts[weekIndex];
            const draftIndex = draftDay
              ? week.findIndex((day) => isSameDay(day, draftDay))
              : -1;

            return (
              <div
                key={`week-${week[0].toISOString()}`}
                className="relative grid min-h-24 flex-1 grid-cols-7 border-b border-border/70 sm:min-h-28"
                style={{
                  // Row 1 carries the date numbers, then one row per lane, then a
                  // trailing row for the per-day overflow hint.
                  gridTemplateRows: `auto repeat(${maxLanes}, min-content) auto`,
                }}
              >
                {week.map((day, dayIndex) => (
                  <MonthDayCell
                    key={`cell-${day.toISOString()}`}
                    day={day}
                    dayIndex={dayIndex}
                    onCreate={quickCreate ? setDraftDay : undefined}
                  />
                ))}

                {week.map((day, dayIndex) => (
                  <div
                    key={`number-${day.toISOString()}`}
                    style={{ gridColumn: dayIndex + 1, gridRow: 1 }}
                    // Lets a click on the date reach the cell beneath it.
                    className="pointer-events-none z-10 flex justify-end px-1 py-1"
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full text-[11px] font-medium",
                        !isSameMonth(day, visibleMonth) &&
                          "text-muted-foreground/60",
                        isToday(day) && "bg-primary text-primary-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                ))}

                {segments.map((segment) => (
                  <CalendarTaskBar
                    key={`bar-${segment.task.id}`}
                    segment={segment}
                    projectSlug={projectSlug}
                    onOpenTask={onOpenTask}
                    drag={
                      onMoveTask || onResizeTask
                        ? {
                            // A task spanning weeks has one bar per week.
                            id: `${segment.task.id}@${week[0].toISOString()}`,
                            firstDay: week[segment.columnStart - 1],
                            resizable: Boolean(onResizeTask),
                          }
                        : undefined
                    }
                  />
                ))}

                {week.map((day, dayIndex) =>
                  hiddenCountByDay[dayIndex] > 0 ? (
                    <div
                      key={`overflow-${day.toISOString()}`}
                      style={{
                        gridColumn: dayIndex + 1,
                        gridRow: maxLanes + 2,
                      }}
                      className="z-10 min-w-0"
                    >
                      <DayOverflowPopover
                        day={day}
                        tasks={tasksByDay[dayIndex]}
                        hiddenCount={hiddenCountByDay[dayIndex]}
                        projectSlug={projectSlug}
                        onOpenTask={onOpenTask}
                      />
                    </div>
                  ) : null,
                )}

                {quickCreate && draftDay && draftIndex >= 0 ? (
                  <DayQuickCreate
                    key={draftDay.toISOString()}
                    day={draftDay}
                    projectId={quickCreate.projectId}
                    style={{
                      gridColumn: draftIndex + 1,
                      gridRow:
                        placeholderLane(segments, draftIndex, maxLanes) + 2,
                    }}
                    onClose={() => setDraftDay(null)}
                    onMoreOptions={(title, day) => {
                      setDraftDay(null);
                      quickCreate.onMoreOptions(title, day);
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {drag.movingTask ? (
          <CalendarTaskBarGhost task={drag.movingTask} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
