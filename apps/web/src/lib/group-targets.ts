import { buildProjectTree } from "./project-tree";

type TreeProject = { id: string; parentProjectId?: string | null };

/**
 * The projects a top-level project can be moved into from its row menu: the
 * same targets a sidebar drop would nest it into (every other top-level row).
 * Children and projects with children get none; moving between groups is
 * left to drag and drop.
 */
export function groupTargets<T extends TreeProject>(
  projects: T[],
  projectId: string,
): T[] {
  const tree = buildProjectTree(projects);
  const node = tree.find((entry) => entry.project.id === projectId);
  if (!node || node.children.length > 0) return [];

  return tree
    .map((entry) => entry.project)
    .filter((target) => target.id !== projectId);
}
