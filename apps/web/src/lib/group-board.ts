import { buildProjectTree } from "@/lib/project-tree";
import type { ProjectWithTasks } from "@/types/project";

type Column = ProjectWithTasks["columns"][number];

/**
 * A parent's rolled-up board: the parent's columns first, child columns with
 * the same name merged into them, and unmatched child columns appended. Every
 * task keeps its own projectId. The result is for display only.
 */
export function mergeGroupBoards(
  parent: ProjectWithTasks,
  children: ProjectWithTasks[],
): ProjectWithTasks {
  if (children.length === 0) return parent;

  const columns: Column[] = parent.columns.map((column) => ({
    ...column,
    tasks: [...column.tasks],
  }));
  const ids = new Set(columns.map((column) => column.id));

  for (const child of children) {
    for (const column of child.columns) {
      const match = columns.find((candidate) => candidate.name === column.name);
      if (match) {
        match.tasks.push(...column.tasks);
        continue;
      }
      // Two projects can use one slug for differently named columns; the
      // appended column still needs a distinct key and droppable id.
      const id = ids.has(column.id) ? `${child.id}:${column.id}` : column.id;
      ids.add(id);
      columns.push({ ...column, id, tasks: [...column.tasks] });
    }
  }

  return {
    ...parent,
    columns,
    plannedTasks: [
      ...(parent.plannedTasks ?? []),
      ...children.flatMap((child) => child.plannedTasks ?? []),
    ],
    archivedTasks: [
      ...(parent.archivedTasks ?? []),
      ...children.flatMap((child) => child.archivedTasks ?? []),
    ],
  };
}

/** Ids of the children shown under a top-level project, in sidebar order. */
export function childProjectIds(
  projects: Array<{ id: string; parentProjectId?: string | null }> | undefined,
  projectId: string,
): string[] {
  if (!projects) return [];
  const node = buildProjectTree(projects).find(
    (candidate) => candidate.project.id === projectId,
  );
  return node?.children.map((child) => child.id) ?? [];
}

/** The project a task on a (possibly merged) board belongs to. */
export function findTaskProjectId(
  board: ProjectWithTasks | null | undefined,
  taskId: string | undefined,
): string | undefined {
  if (!board || !taskId) return undefined;
  const task = [
    ...board.columns.flatMap((column) => column.tasks),
    ...(board.plannedTasks ?? []),
    ...(board.archivedTasks ?? []),
  ].find((candidate) => candidate.id === taskId);
  return task?.projectId;
}
