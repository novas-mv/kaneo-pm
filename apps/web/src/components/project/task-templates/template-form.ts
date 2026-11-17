export const MAX_TEMPLATE_STEPS = 20;
const MAX_NAME_LENGTH = 100;
const MAX_STEP_TITLE_LENGTH = 200;
const MAX_OFFSET_DAYS = 365;

export type StepWhen = "before" | "on" | "after";

export type TemplateStepForm = {
  /** Local id so React keeps inputs stable while steps move. */
  key: string;
  title: string;
  when: StepWhen;
  days: string;
};

export type TemplateForm = { name: string; steps: TemplateStepForm[] };

export type TemplateStep = { title: string; offsetDays: number };

export type TemplateFormIssue =
  | "nameRequired"
  | "nameTooLong"
  | "tooManySteps"
  | "stepTitleRequired"
  | "stepTitleTooLong"
  | "daysOutOfRange";

let nextKey = 0;
const newKey = () => `step-${++nextKey}`;

export function stepFromOffset(step: TemplateStep): TemplateStepForm {
  const when: StepWhen =
    step.offsetDays < 0 ? "before" : step.offsetDays > 0 ? "after" : "on";
  return {
    key: newKey(),
    title: step.title,
    when,
    days: when === "on" ? "1" : String(Math.abs(step.offsetDays)),
  };
}

export function formFromTemplate(
  template: { name: string; steps: TemplateStep[] } | null,
): TemplateForm {
  return {
    name: template?.name ?? "",
    steps: (template?.steps ?? []).map(stepFromOffset),
  };
}

export function emptyStep(): TemplateStepForm {
  return { key: newKey(), title: "", when: "before", days: "1" };
}

/** Signed day offset: before is negative, on the date is 0. */
export function offsetOf(step: TemplateStepForm) {
  if (step.when === "on") return 0;
  const days = Number(step.days);
  return step.when === "before" ? -days : days;
}

function daysValid(step: TemplateStepForm) {
  if (step.when === "on") return true;
  const days = Number(step.days);
  return (
    step.days.trim() !== "" &&
    Number.isInteger(days) &&
    days >= 1 &&
    days <= MAX_OFFSET_DAYS
  );
}

export function getTemplateFormIssue(
  form: TemplateForm,
): TemplateFormIssue | null {
  const name = form.name.trim();
  if (!name) return "nameRequired";
  if (name.length > MAX_NAME_LENGTH) return "nameTooLong";
  if (form.steps.length > MAX_TEMPLATE_STEPS) return "tooManySteps";
  for (const step of form.steps) {
    const title = step.title.trim();
    if (!title) return "stepTitleRequired";
    if (title.length > MAX_STEP_TITLE_LENGTH) return "stepTitleTooLong";
    if (!daysValid(step)) return "daysOutOfRange";
  }
  return null;
}

export function toTemplatePayload(form: TemplateForm) {
  return {
    name: form.name.trim(),
    steps: form.steps.map((step) => ({
      title: step.title.trim(),
      offsetDays: offsetOf(step),
    })),
  };
}

export function moveStep(
  steps: TemplateStepForm[],
  index: number,
  direction: -1 | 1,
) {
  const target = index + direction;
  if (target < 0 || target >= steps.length) return steps;
  const next = [...steps];
  const [moved] = next.splice(index, 1);
  if (moved) next.splice(target, 0, moved);
  return next;
}

export function updateStep(
  steps: TemplateStepForm[],
  key: string,
  changes: Partial<Omit<TemplateStepForm, "key">>,
) {
  return steps.map((step) =>
    step.key === key ? { ...step, ...changes } : step,
  );
}
