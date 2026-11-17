/** One step of a task template, stored in order in `task_template.steps`. */
export type TaskTemplateStep = {
  title: string;
  /** Days from the post date: negative is before, 0 is the same day. */
  offsetDays: number;
};
