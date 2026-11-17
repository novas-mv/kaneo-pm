/**
 * Groups a post (a task with sub-tasks) with its steps so the calendar can
 * show which post each step belongs to. Only same-project parents count: the
 * board payload's `parentTaskId` is null for anything else.
 */
export type PostGroup = {
  /** Id of the post task; steps of one post share it. */
  postId: string;
  postTitle: string;
  role: "post" | "step";
  colorIndex: number;
};

export const POST_COLOR_COUNT = 6;

type GroupableTask = {
  id: string;
  title: string;
  parentTaskId?: string | null;
};

// Stable per post, so a post keeps its color across renders and reloads.
export function postColorIndex(postId: string): number {
  let hash = 0;
  for (let index = 0; index < postId.length; index += 1) {
    hash = (hash * 31 + postId.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % POST_COLOR_COUNT;
}

export function buildPostGroups(
  tasks: GroupableTask[],
): Map<string, PostGroup> {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const groups = new Map<string, PostGroup>();

  for (const task of tasks) {
    const post = task.parentTaskId ? byId.get(task.parentTaskId) : undefined;
    if (!post) continue;
    const shared = {
      postId: post.id,
      postTitle: post.title,
      colorIndex: postColorIndex(post.id),
    };
    groups.set(task.id, { ...shared, role: "step" });
    // A step can itself have steps; it then shows as a step of its own post.
    if (!groups.has(post.id)) groups.set(post.id, { ...shared, role: "post" });
  }

  return groups;
}
