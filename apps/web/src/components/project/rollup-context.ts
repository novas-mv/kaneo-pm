import { createContext, useContext } from "react";

export type RollupProject = { name: string; slug: string };

/**
 * Present only while a parent's view shows its children's tasks ("Everything"
 * with at least one child). Views read it to stay read-only and to label tasks
 * that belong to another project.
 */
export type Rollup = {
  projectId: string;
  projects: ReadonlyMap<string, RollupProject>;
};

export const RollupContext = createContext<Rollup | null>(null);

export function useRollup() {
  return useContext(RollupContext);
}

/** The slug that prefixes a task's number, from its own project. */
export function slugFor(
  rollup: Rollup | null,
  projectId: string | undefined,
  fallback: string | undefined,
) {
  return (projectId && rollup?.projects.get(projectId)?.slug) || fallback;
}

export function useTaskSlug(projectId: string, fallback: string | undefined) {
  return slugFor(useRollup(), projectId, fallback);
}
