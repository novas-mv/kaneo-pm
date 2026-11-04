// The API stores the Personal project's name once, in English. Show the
// viewer's language wherever the name comes from a project or assigned task.
export function withPersonalProjectName<
  T extends { ownerUserId?: string | null; name: string },
>(project: T, label: string): T {
  return project.ownerUserId ? { ...project, name: label } : project;
}

export function withPersonalTaskProjectName<
  T extends { isPersonal?: boolean; projectName: string },
>(task: T, label: string): T {
  return task.isPersonal ? { ...task, projectName: label } : task;
}

export function withPersonalSearchResult<
  T extends {
    type: string;
    isPersonal?: boolean;
    title: string;
    projectName?: string;
  },
>(result: T, label: string): T {
  if (!result.isPersonal) return result;
  return result.type === "project"
    ? { ...result, title: label }
    : { ...result, projectName: label };
}
