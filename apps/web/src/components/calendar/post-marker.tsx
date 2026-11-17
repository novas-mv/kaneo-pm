import type { JSX } from "react";
import { cn } from "@/lib/cn";
import type { PostGroup } from "./post-groups";

// One color per post; indexes come from postColorIndex (POST_COLOR_COUNT).
const POST_COLORS = [
  "bg-violet-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-sky-500",
  "bg-lime-600",
];

/** Colored dot (step) or diamond (post), plus the post name before a step. */
export default function PostMarker({ post }: { post: PostGroup }): JSX.Element {
  const color = POST_COLORS[post.colorIndex] ?? POST_COLORS[0];

  return (
    <>
      <span
        aria-hidden
        className={cn(
          "mr-1 shrink-0",
          color,
          post.role === "post"
            ? "size-2 rotate-45 rounded-[1px]"
            : "size-1.5 rounded-full",
        )}
      />
      {post.role === "step" && (
        <span className="mr-1 max-w-24 shrink-0 truncate text-muted-foreground">
          {post.postTitle} ›
        </span>
      )}
    </>
  );
}
