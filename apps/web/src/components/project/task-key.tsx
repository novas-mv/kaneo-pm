import { useTaskSlug } from "./rollup-context";

/** "SLUG-12" for a task, using its own project's slug on a rolled-up view. */
export function TaskKey({
  projectId,
  fallbackSlug,
  number,
}: {
  projectId: string;
  fallbackSlug: string | undefined;
  number: number | null;
}) {
  const slug = useTaskSlug(projectId, fallbackSlug);
  return (
    <>
      {slug}-{number}
    </>
  );
}
