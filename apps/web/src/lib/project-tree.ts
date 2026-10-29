import { arrayMove } from "@dnd-kit/sortable";

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
    if (project.parentProjectId && topLevelIds.has(project.parentProjectId)) {
      nodes.get(project.parentProjectId)?.children.push(project);
    }
  }

  return tree;
}

/** The parent a project is effectively shown under, or null when top-level. */
function shownParentId<T extends TreeProject>(projects: T[], project: T) {
  const parent = projects.find((p) => p.id === project.parentProjectId);
  return parent && !parent.parentProjectId ? parent.id : null;
}

export type ProjectDrop =
  | { type: "none" }
  | { type: "nest"; projectId: string; parentProjectId: string }
  | { type: "ungroup"; projectId: string; targetId: string }
  | { type: "reorder"; projectId: string; targetId: string };

/**
 * Every project `activeId` may be nested into: the other top-level rows,
 * except its own parent; none when it has children. One tree pass, so a drag
 * can ask once instead of once per row.
 */
export function nestTargetIds<T extends TreeProject>(
  projects: T[],
  activeId: string,
): Set<string> {
  const tree = buildProjectTree(projects);
  let activeParent: string | undefined;
  for (const node of tree) {
    if (node.project.id === activeId && node.children.length > 0) {
      return new Set();
    }
    if (node.children.some((child) => child.id === activeId)) {
      activeParent = node.project.id;
    }
  }
  if (!projects.some((project) => project.id === activeId)) return new Set();

  return new Set(
    tree
      .map((node) => node.project.id)
      .filter((id) => id !== activeId && id !== activeParent),
  );
}

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
    const targetId = overId.slice(NEST_PREFIX.length);
    if (!nestTargetIds(projects, active.id).has(targetId)) return none;
    return { type: "nest", projectId: active.id, parentProjectId: targetId };
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

/** `list` with `projectId` moved into `targetId`'s slot, or null if either is missing. */
export function moveProject<T extends { id: string }>(
  list: T[],
  projectId: string,
  targetId: string,
): T[] | null {
  const oldIndex = list.findIndex((project) => project.id === projectId);
  const newIndex = list.findIndex((project) => project.id === targetId);
  if (oldIndex === -1 || newIndex === -1) return null;
  return arrayMove(list, oldIndex, newIndex);
}

/** The order after ungrouping `projectId` by dropping it on `targetId`. */
export function ungroupOrder<T extends TreeProject>(
  list: T[],
  projectId: string,
  targetId: string,
): T[] | null {
  return moveProject(
    list.map((project) =>
      project.id === projectId
        ? { ...project, parentProjectId: null }
        : project,
    ),
    projectId,
    targetId,
  );
}
