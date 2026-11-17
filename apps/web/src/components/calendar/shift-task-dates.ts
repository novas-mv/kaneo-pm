import { addDays, differenceInCalendarDays, parseISO } from "date-fns";

export type ResizeEdge = "start" | "due";

export type TaskDates = {
  startDate: string | null;
  dueDate: string | null;
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `day`'s calendar date with `time`'s local time of day. */
function onDay(time: Date, day: Date): Date {
  const next = new Date(time);
  next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return next;
}

/**
 * Drags one end of a range to `targetDay`, keeping that end's time of day.
 * The end cannot pass the other end: dragged past it, it stops on the other
 * end's day (and never before its time), which leaves a one-day range.
 */
export function resizeRange(
  start: Date,
  due: Date,
  edge: ResizeEdge,
  targetDay: Date,
): { start: Date; due: Date } {
  if (edge === "due") {
    const day =
      differenceInCalendarDays(targetDay, start) < 0 ? start : targetDay;
    const next = onDay(due, day);
    return { start, due: next < start ? new Date(start) : next };
  }
  const day = differenceInCalendarDays(targetDay, due) > 0 ? due : targetDay;
  const next = onDay(start, day);
  return { start: next > due ? new Date(due) : next, due };
}

/**
 * The dates a task gets when one end of its bar is dragged to `targetDay`. A
 * task with only one date becomes a range from (or to) that date's day. A drop
 * that leaves both ends on their days changes nothing.
 */
export function resizeTaskDates(
  task: TaskDates,
  edge: ResizeEdge,
  targetDay: Date,
): TaskDates {
  const unchanged = { startDate: task.startDate, dueDate: task.dueDate };
  const parsedStart = parseDate(task.startDate);
  const parsedDue = parseDate(task.dueDate);
  const first = parsedStart ?? parsedDue;
  const last = parsedDue ?? parsedStart;
  if (!first || !last) return unchanged;
  // Reversed ranges render swapped (see toScheduledTask), so resize them that way.
  const reversed = first > last;
  const start = reversed ? last : first;
  const due = reversed ? first : last;

  const next = resizeRange(start, due, edge, targetDay);
  if (
    differenceInCalendarDays(next.start, start) === 0 &&
    differenceInCalendarDays(next.due, due) === 0
  )
    return unchanged;

  const keepStart = edge === "due" && parsedStart && !reversed;
  const keepDue = edge === "start" && parsedDue && !reversed;
  return {
    startDate: keepStart ? task.startDate : next.start.toISOString(),
    dueDate: keepDue ? task.dueDate : next.due.toISOString(),
  };
}

function shiftDate(value: string | null, deltaDays: number): string | null {
  if (!value) return value;
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return value;
  // addDays works on the local calendar, so the wall-clock time survives a DST
  // change between the two days.
  return addDays(parsed, deltaDays).toISOString();
}

/**
 * Moves whichever dates the task has by the same number of calendar days,
 * keeping each date's time of day. A missing date stays missing.
 */
export function shiftTaskDates(task: TaskDates, deltaDays: number): TaskDates {
  if (deltaDays === 0) {
    return { startDate: task.startDate, dueDate: task.dueDate };
  }
  return {
    startDate: shiftDate(task.startDate, deltaDays),
    dueDate: shiftDate(task.dueDate, deltaDays),
  };
}

/**
 * Which day of a bar the pointer grabbed, as an offset from the bar's first
 * visible day, so a multi-day bar moves relative to the grabbed day.
 */
export function grabbedDayOffset(
  pointerX: number,
  barLeft: number,
  barWidth: number,
  daySpan: number,
): number {
  if (daySpan <= 1 || barWidth <= 0) return 0;
  const offset = Math.floor(((pointerX - barLeft) / barWidth) * daySpan);
  return Math.min(Math.max(offset, 0), daySpan - 1);
}
