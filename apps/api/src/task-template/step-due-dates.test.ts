import { describe, expect, it } from "vite-plus/test";
import { stepDueDates } from "./step-due-dates";

describe("stepDueDates", () => {
  it("dates each step relative to the post date, in order", () => {
    const postDate = new Date("2026-05-20T14:00:00.000Z");
    const result = stepDueDates(postDate, [
      { title: "Draft", offsetDays: -2 },
      { title: "Client approval", offsetDays: -1 },
      { title: "Publish check", offsetDays: 0 },
      { title: "Report", offsetDays: 3 },
    ]);

    expect(
      result.map((step) => [step.title, step.dueDate.toISOString()]),
    ).toEqual([
      ["Draft", "2026-05-18T14:00:00.000Z"],
      ["Client approval", "2026-05-19T14:00:00.000Z"],
      ["Publish check", "2026-05-20T14:00:00.000Z"],
      ["Report", "2026-05-23T14:00:00.000Z"],
    ]);
  });

  it("returns nothing for a template without steps", () => {
    expect(stepDueDates(new Date(), [])).toEqual([]);
  });
});
