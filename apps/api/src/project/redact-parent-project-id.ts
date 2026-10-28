// A parent the viewer cannot see must not leak through the child's row.
export function redactParentProjectId<
  T extends { parentProjectId: string | null },
>(project: T, visibleProjectIds: ReadonlySet<string>): T {
  if (
    project.parentProjectId === null ||
    visibleProjectIds.has(project.parentProjectId)
  ) {
    return project;
  }
  return { ...project, parentProjectId: null };
}
