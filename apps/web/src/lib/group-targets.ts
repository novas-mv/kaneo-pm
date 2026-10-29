import {
  buildProjectTree,
  nestDropId,
  resolveProjectDrop,
} from "./project-tree";

type TreeProject = { id: string; parentProjectId?: string | null };

/**
 * The projects a top-level project can be moved into from its row menu: the
 * same targets a sidebar drop would nest it into. Children get none; moving
 * between groups is left to drag and drop.
 */
export function groupTargets<T extends TreeProject>(
  projects: T[],
  projectId: string,
): T[] {
  const isTopLevel = buildProjectTree(projects).some(
    (node) => node.project.id === projectId,
  );
  if (!isTopLevel) return [];

  return projects.filter(
    (target) =>
      resolveProjectDrop(projects, projectId, nestDropId(target.id)).type ===
      "nest",
  );
}
