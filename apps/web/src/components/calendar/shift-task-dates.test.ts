import { describe, expect, it } from "vite-plus/test";
import {
  grabbedDayOffset,
  resizeRange,
  resizeTaskDates,
  shiftTaskDates,
} from "./shift-task-dates";

function local(year: number, month: number, day: number, hours = 0) {
  return new Date(year, month - 1, day, hours, 30);
}

describe("shiftTaskDates", () => {
  it("moves both dates by the same number of days and keeps the time", () => {
    const start = local(2026, 3, 2, 9);
    const due = local(2026, 3, 4, 17);

    const shifted = shiftTaskDates(
      { startDate: start.toISOString(), dueDate: due.toISOString() },
      3,
    );

    expect(shifted).toEqual({
      startDate: local(2026, 3, 5, 9).toISOString(),
      dueDate: local(2026, 3, 7, 17).toISOString(),
    });
  });

  it("moves backwards across a month boundary", () => {
    const due = local(2026, 5, 1, 0);

    expect(
      shiftTaskDates({ startDate: null, dueDate: due.toISOString() }, -2),
    ).toEqual({
      startDate: null,
      dueDate: local(2026, 4, 29, 0).toISOString(),
    });
  });

  it("leaves a missing date missing", () => {
    const start = local(2026, 1, 10, 12);

    expect(
      shiftTaskDates({ startDate: start.toISOString(), dueDate: null }, 1),
    ).toEqual({
      startDate: local(2026, 1, 11, 12).toISOString(),
      dueDate: null,
    });
  });

  it("returns the dates unchanged for a zero delta or an unparsable value", () => {
    expect(shiftTaskDates({ startDate: "nope", dueDate: null }, 0)).toEqual({
      startDate: "nope",
      dueDate: null,
    });
    expect(shiftTaskDates({ startDate: "nope", dueDate: null }, 4)).toEqual({
      startDate: "nope",
      dueDate: null,
    });
  });
});

describe("grabbedDayOffset", () => {
  it("is zero for a single-day bar", () => {
    expect(grabbedDayOffset(150, 100, 100, 1)).toBe(0);
  });

  it("finds the grabbed day within a multi-day bar", () => {
    expect(grabbedDayOffset(105, 100, 300, 3)).toBe(0);
    expect(grabbedDayOffset(250, 100, 300, 3)).toBe(1);
    expect(grabbedDayOffset(399, 100, 300, 3)).toBe(2);
  });

  it("clamps a pointer just outside the bar", () => {
    expect(grabbedDayOffset(90, 100, 300, 3)).toBe(0);
    expect(grabbedDayOffset(420, 100, 300, 3)).toBe(2);
  });
});

describe("resizeTaskDates", () => {
  const start = local(2026, 3, 2, 9);
  const due = local(2026, 3, 4, 17);
  const range = { startDate: start.toISOString(), dueDate: due.toISOString() };

  it("moves the due date to the target day and keeps its time", () => {
    expect(resizeTaskDates(range, "due", local(2026, 3, 10))).toEqual({
      startDate: range.startDate,
      dueDate: local(2026, 3, 10, 17).toISOString(),
    });
  });

  it("moves the start date to the target day and keeps its time", () => {
    expect(resizeTaskDates(range, "start", local(2026, 2, 27))).toEqual({
      startDate: local(2026, 2, 27, 9).toISOString(),
      dueDate: range.dueDate,
    });
  });

  it("stops an end on the other end's day instead of passing it", () => {
    expect(resizeTaskDates(range, "due", local(2026, 2, 20))).toEqual({
      startDate: range.startDate,
      dueDate: local(2026, 3, 2, 17).toISOString(),
    });
    expect(resizeTaskDates(range, "start", local(2026, 3, 20))).toEqual({
      startDate: local(2026, 3, 4, 9).toISOString(),
      dueDate: range.dueDate,
    });
  });

  it("never leaves the start after the due time on a one-day range", () => {
    const evening = {
      startDate: local(2026, 3, 2, 18).toISOString(),
      dueDate: local(2026, 3, 4, 8).toISOString(),
    };

    expect(resizeTaskDates(evening, "due", local(2026, 3, 2))).toEqual({
      startDate: evening.startDate,
      dueDate: evening.startDate,
    });
  });

  it("turns a due-only task into a range from its due day", () => {
    const dueOnly = { startDate: null, dueDate: due.toISOString() };

    expect(resizeTaskDates(dueOnly, "due", local(2026, 3, 6))).toEqual({
      startDate: due.toISOString(),
      dueDate: local(2026, 3, 6, 17).toISOString(),
    });
    expect(resizeTaskDates(dueOnly, "start", local(2026, 3, 1))).toEqual({
      startDate: local(2026, 3, 1, 17).toISOString(),
      dueDate: due.toISOString(),
    });
  });

  it("changes nothing when an end lands on its own day or cannot move", () => {
    expect(resizeTaskDates(range, "due", local(2026, 3, 4))).toEqual(range);
    const dueOnly = { startDate: null, dueDate: due.toISOString() };
    expect(resizeTaskDates(dueOnly, "due", local(2026, 3, 1))).toEqual(dueOnly);
    expect(
      resizeTaskDates({ startDate: null, dueDate: null }, "due", due),
    ).toEqual({ startDate: null, dueDate: null });
  });
});

describe("resizeRange", () => {
  it("previews the span on schedule dates", () => {
    const next = resizeRange(
      local(2026, 3, 2),
      local(2026, 3, 4),
      "due",
      local(2026, 3, 8),
    );

    expect(next).toEqual({ start: local(2026, 3, 2), due: local(2026, 3, 8) });
  });
});
