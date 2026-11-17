import { useDroppable } from "@dnd-kit/core";
import { isWeekend } from "date-fns";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { CalendarDayDropData } from "./calendar-drag-data";

type MonthDayCellProps = {
  day: Date;
  dayIndex: number;
  /** Clicking empty space in the cell starts a new task on this day. */
  onCreate?: (day: Date) => void;
};

/**
 * The background of one day: drop target for moved bars and, when creation is
 * allowed, the click target for a new task. Bars and the overflow hint sit
 * above it, so only empty space reaches it.
 */
export default function MonthDayCell({
  day,
  dayIndex,
  onCreate,
}: MonthDayCellProps): JSX.Element {
  const { t } = useTranslation();
  const data: CalendarDayDropData = { day };
  const { setNodeRef, isOver } = useDroppable({
    id: `calendar-day-${day.toISOString()}`,
    data,
  });

  const className = cn(
    "min-w-0 border-r border-border/60 transition-colors",
    isWeekend(day) && "bg-muted/25",
    isOver && "bg-primary/10 ring-2 ring-inset ring-primary/40",
  );
  const style = { gridColumn: dayIndex + 1, gridRow: "1 / -1" };

  if (!onCreate) {
    return <div ref={setNodeRef} style={style} className={className} />;
  }

  return (
    // Out of the tab order: 35 extra stops would bury the bars, and the
    // project's own "new task" control stays the keyboard path.
    <button
      ref={setNodeRef}
      type="button"
      tabIndex={-1}
      aria-label={t("tasks:calendar.createOnDayAriaLabel", {
        date: formatDate(day, {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
      })}
      onClick={() => onCreate(day)}
      style={style}
      className={cn(className, "cursor-default")}
    />
  );
}
