import { useDraggable } from "@dnd-kit/core";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";
import { ContactTag } from "@/components/contacts/contact-tag";
import { ProjectTag } from "@/components/project/project-tag";
import {
  otherProjectName,
  useRollup,
  useTaskSlug,
} from "@/components/project/rollup-context";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/format";
import type { CalendarMoveDragData } from "./calendar-drag-data";
import CalendarTaskBarHandle from "./calendar-task-bar-handle";
import type { PackableTask, WeekSegment } from "./month-grid-model";
import type { PostGroup } from "./post-groups";
import PostMarker from "./post-marker";

export type CalendarTask = PackableTask & {
  title: string;
  number: number | null;
  status: string;
  projectId?: string;
  contactId?: string | null;
  /** Set when the task is a post with steps, or a step of one. */
  post?: PostGroup;
};

const STATUS_CLASSES: Record<string, string> = {
  "to-do":
    "border-slate-500/35 bg-slate-500/15 hover:border-slate-500/50 hover:bg-slate-500/20",
  "in-progress":
    "border-blue-500/35 bg-blue-500/15 hover:border-blue-500/50 hover:bg-blue-500/20",
  "in-review":
    "border-amber-500/40 bg-amber-500/15 hover:border-amber-500/55 hover:bg-amber-500/20",
  done: "border-emerald-500/35 bg-emerald-500/15 hover:border-emerald-500/50 hover:bg-emerald-500/20",
};

export function getCalendarTaskStatusClass(status: string): string {
  return (
    STATUS_CLASSES[status] ??
    "border-primary/25 bg-primary/12 hover:border-primary/40 hover:bg-primary/18"
  );
}

type CalendarTaskBarProps = {
  segment: WeekSegment<CalendarTask>;
  projectSlug?: string;
  onOpenTask: (taskId: string) => void;
  /**
   * Makes the bar draggable, and with `resizable` adds edge handles; `id`
   * must be unique across the month.
   */
  drag?: { id: string; firstDay: Date; resizable?: boolean };
};

export default function CalendarTaskBar({
  segment,
  projectSlug,
  onOpenTask,
  drag,
}: CalendarTaskBarProps): JSX.Element {
  const { t } = useTranslation();
  const {
    task,
    lane,
    columnStart,
    columnEnd,
    continuesBefore,
    continuesAfter,
  } = segment;

  const dragData: CalendarMoveDragData | undefined = drag && {
    kind: "move",
    task,
    firstDay: drag.firstDay,
    daySpan: columnEnd - columnStart,
  };
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: drag?.id ?? `calendar-bar-${task.id}`,
    data: dragData,
    disabled: !drag,
  });

  const slug = useTaskSlug(task.projectId ?? "", projectSlug);
  const projectName = otherProjectName(useRollup(), task.projectId);
  const taskKey =
    slug && task.number != null ? `${slug}-${task.number}` : undefined;

  const range = `${formatDateShort(task.scheduleStart)} – ${formatDateShort(
    task.scheduleEnd,
  )}`;

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(drag ? listeners : undefined)}
      style={{
        gridColumn: `${columnStart} / ${columnEnd}`,
        // Row 1 holds the date numbers, so lanes start at row 2.
        gridRow: lane + 2,
      }}
      title={
        taskKey
          ? `${taskKey} · ${task.title} · ${range}`
          : `${task.title} · ${range}`
      }
      aria-label={
        projectName
          ? t("tasks:calendar.taskInProjectAriaLabel", {
              title: task.title,
              project: projectName,
              range,
            })
          : t("tasks:calendar.taskAriaLabel", { title: task.title, range })
      }
      data-task-status={task.status}
      onClick={() => onOpenTask(task.id)}
      className={cn(
        "group relative z-10 mb-0.5 flex h-6 min-w-0 items-center overflow-hidden border px-1.5 text-left text-[11px] font-medium leading-none text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-5",
        getCalendarTaskStatusClass(task.status),
        drag && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        // Bars that run past a week edge lose their cap there so the two halves
        // read as one continuous span across rows.
        continuesBefore ? "rounded-l-none border-l-0" : "ml-1 rounded-l-md",
        continuesAfter ? "rounded-r-none border-r-0" : "mr-1 rounded-r-md",
      )}
    >
      {task.projectId && (
        <ProjectTag projectId={task.projectId} className="mr-1 max-w-20" />
      )}
      <ContactTag contactId={task.contactId} className="mr-1 max-w-20" />
      {task.post && <PostMarker post={task.post} />}
      <span className="truncate">{task.title}</span>
      {drag?.resizable ? (
        <>
          <CalendarTaskBarHandle
            id={`${drag.id}:start`}
            task={task}
            edge="start"
            visible={!continuesBefore}
          />
          <CalendarTaskBarHandle
            id={`${drag.id}:due`}
            task={task}
            edge="due"
            visible={!continuesAfter}
          />
        </>
      ) : null}
    </button>
  );
}
