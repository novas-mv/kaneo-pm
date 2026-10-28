type TreeProject = { id: string; parentProjectId?: string | null };

export type ProjectTreeNode<T> = { project: T; children: T[] };

export const NEST_PREFIX = "nest:";

export const nestDropId = (projectId: string) => `${NEST_PREFIX}${projectId}`;

/**
 * Groups children under their parent, keeping the API order for both levels.
 * A child whose parent is missing, or whose parent is itself a child, is
 * shown top-level so nothing disappears from the sidebar.
 */
export function buildProjectTree<T extends TreeProject>(
  projects: T[],
): ProjectTreeNode<T>[] {
  const topLevelIds = new Set(
    projects.filter((project) => !project.parentProjectId).map((p) => p.id),
  );
  const nodes = new Map<string, ProjectTreeNode<T>>();
  const tree: ProjectTreeNode<T>[] = [];

  for (const project of projects) {
    if (project.parentProjectId && topLevelIds.has(project.parentProjectId)) {
      continue;
    }
    const node = { project, children: [] };
    nodes.set(project.id, node);
    tree.push(node);
  }

  for (const project of projects) {
    if (!project.parentProjectId) continue;
    nodes.get(project.parentProjectId)?.children.push(project);
  }

  return tree;
}

/** The parent a project is effectively shown under, or null when top-level. */
function shownParentId<T extends TreeProject>(projects: T[], project: T) {
  const parent = projects.find((p) => p.id === project.parentProjectId);
  return parent && !parent.parentProjectId ? parent.id : null;
}

export function hasChildren<T extends TreeProject>(
  projects: T[],
  projectId: string,
) {
  return projects.some(
    (project) =>
      project.parentProjectId === projectId &&
      shownParentId(projects, project) === projectId,
  );
}

export type ProjectDrop =
  | { type: "none" }
  | { type: "nest"; projectId: string; parentProjectId: string }
  | { type: "ungroup"; projectId: string; targetId: string }
  | { type: "reorder"; projectId: string; targetId: string };

/**
 * What a sidebar drop means. `overId` is either a project id (a reorder slot)
 * or a `nest:{projectId}` zone on a top-level row.
 */
export function resolveProjectDrop<T extends TreeProject>(
  projects: T[],
  activeId: string,
  overId: string,
): ProjectDrop {
  const none: ProjectDrop = { type: "none" };
  const active = projects.find((p) => p.id === activeId);
  if (!active) return none;
  const activeParent = shownParentId(projects, active);

  if (overId.startsWith(NEST_PREFIX)) {
    const target = projects.find(
      (p) => p.id === overId.slice(NEST_PREFIX.length),
    );
    if (
      !target ||
      target.id === active.id ||
      target.id === activeParent ||
      shownParentId(projects, target) ||
      hasChildren(projects, active.id)
    ) {
      return none;
    }
    return { type: "nest", projectId: active.id, parentProjectId: target.id };
  }

  const target = projects.find((p) => p.id === overId);
  if (!target || target.id === active.id) return none;
  const targetParent = shownParentId(projects, target);

  if (activeParent) {
    if (targetParent === activeParent) {
      return { type: "reorder", projectId: active.id, targetId: target.id };
    }
    if (targetParent) {
      return {
        type: "nest",
        projectId: active.id,
        parentProjectId: targetParent,
      };
    }
    return { type: "ungroup", projectId: active.id, targetId: target.id };
  }

  return {
    type: "reorder",
    projectId: active.id,
    targetId: targetParent ?? target.id,
  };
}
