import { describe, expect, it } from "vite-plus/test";
import {
  emptyStep,
  formFromTemplate,
  getTemplateFormIssue,
  moveStep,
  offsetOf,
  stepFromOffset,
  toTemplatePayload,
} from "./template-form";

describe("template form", () => {
  it("reads offsets as before, on or after the date", () => {
    expect(stepFromOffset({ title: "Draft", offsetDays: -2 })).toMatchObject({
      when: "before",
      days: "2",
    });
    expect(stepFromOffset({ title: "Post", offsetDays: 0 })).toMatchObject({
      when: "on",
    });
    expect(stepFromOffset({ title: "Report", offsetDays: 3 })).toMatchObject({
      when: "after",
      days: "3",
    });
  });

  it("round-trips a template through the payload", () => {
    const steps = [
      { title: "Draft", offsetDays: -2 },
      { title: "Post", offsetDays: 0 },
      { title: "Report", offsetDays: 3 },
    ];
    const form = formFromTemplate({ name: " Instagram post ", steps });
    expect(toTemplatePayload(form)).toEqual({ name: "Instagram post", steps });
  });

  it("treats the days field as unused on the date", () => {
    expect(offsetOf({ ...emptyStep(), when: "on", days: "" })).toBe(0);
  });

  it("reports the first problem", () => {
    const form = formFromTemplate(null);
    expect(getTemplateFormIssue(form)).toBe("nameRequired");
    expect(getTemplateFormIssue({ name: "Post", steps: [emptyStep()] })).toBe(
      "stepTitleRequired",
    );
    expect(
      getTemplateFormIssue({
        name: "Post",
        steps: [{ ...emptyStep(), title: "Draft", days: "1.5" }],
      }),
    ).toBe("daysOutOfRange");
    expect(
      getTemplateFormIssue({
        name: "Post",
        steps: [{ ...emptyStep(), title: "Draft", days: "366" }],
      }),
    ).toBe("daysOutOfRange");
    expect(
      getTemplateFormIssue({
        name: "Post",
        steps: Array.from({ length: 21 }, () => ({
          ...emptyStep(),
          title: "Step",
        })),
      }),
    ).toBe("tooManySteps");
    expect(
      getTemplateFormIssue({
        name: "Post",
        steps: [{ ...emptyStep(), title: "Draft" }],
      }),
    ).toBeNull();
  });

  it("moves steps up and down and ignores moves past the ends", () => {
    const [a, b, c] = [emptyStep(), emptyStep(), emptyStep()];
    expect(moveStep([a, b, c], 2, -1)).toEqual([a, c, b]);
    expect(moveStep([a, b, c], 0, 1)).toEqual([b, a, c]);
    const steps = [a, b];
    expect(moveStep(steps, 0, -1)).toBe(steps);
    expect(moveStep(steps, 1, 1)).toBe(steps);
  });
});
