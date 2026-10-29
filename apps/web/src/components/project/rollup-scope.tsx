import { type ReactNode, useMemo } from "react";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { ChildProjectSocket } from "./child-project-socket";
import { type Rollup, RollupContext } from "./rollup-context";

type RollupScopeProps = {
  projectId: string;
  workspaceId: string;
  childIds: string[];
  children: ReactNode;
};

/**
 * Wraps a parent's view while it is rolled up: one socket per child and the
 * rollup context. With no children it renders its children untouched.
 */
export function RollupScope({
  projectId,
  workspaceId,
  childIds,
  children,
}: RollupScopeProps) {
  const { data: projects } = useGetProjects({ workspaceId });
  const rollup = useMemo<Rollup | null>(() => {
    if (childIds.length === 0) return null;
    const shown = new Set([projectId, ...childIds]);
    return {
      projectId,
      projects: new Map(
        (projects ?? [])
          .filter((project) => shown.has(project.id))
          .map((project) => [
            project.id,
            { name: project.name, slug: project.slug },
          ]),
      ),
    };
  }, [projectId, childIds, projects]);

  if (!rollup) return children;
  return (
    <RollupContext.Provider value={rollup}>
      {childIds.map((childId) => (
        <ChildProjectSocket key={childId} projectId={childId} />
      ))}
      {children}
    </RollupContext.Provider>
  );
}
