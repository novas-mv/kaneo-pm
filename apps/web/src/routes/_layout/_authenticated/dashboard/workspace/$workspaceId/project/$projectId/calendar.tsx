import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { addMonths, startOfMonth, subMonths } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CalendarToolbar from "@/components/calendar/calendar-toolbar";
import MonthAgenda from "@/components/calendar/month-agenda";
import MonthGrid, {
  type MonthGridQuickCreate,
} from "@/components/calendar/month-grid";
import {
  type ResizeEdge,
  resizeTaskDates,
  shiftTaskDates,
} from "@/components/calendar/shift-task-dates";
import { buildPostGroups } from "@/components/calendar/post-groups";
import { useMoveCalendarPost } from "@/components/calendar/use-move-calendar-post";
import { useSaveCalendarTaskDates } from "@/components/calendar/use-save-calendar-task-dates";
import { buildMonthWeeks } from "@/components/calendar/month-grid-model";
import ProjectLayout from "@/components/common/project-layout";
import PageTitle from "@/components/page-title";
import { RollupScope } from "@/components/project/rollup-scope";
import { DisplaySection } from "@/components/project/display/display-section";
import { WeekStartControl } from "@/components/project/display/week-start-control";
import { ActiveFiltersBar } from "@/components/project/task-filters/active-filters-bar";
import { ProjectToolbar } from "@/components/project/toolbar/project-toolbar";
import { TaskCount } from "@/components/project/toolbar/task-count";
import { useProjectTaskView } from "@/components/project/toolbar/use-project-task-view";
import { LayoutSwitch } from "@/components/project/views/layout-switch";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import TaskDetailsSheet from "@/components/task/task-details-sheet";
import { useGetGroupTasks } from "@/hooks/queries/task/use-get-group-tasks";
import { useTaskSheetProjectId } from "@/hooks/use-task-sheet-project-id";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { type Scheduled, toScheduledTasks } from "@/lib/task-schedule";
import type Task from "@/types/task";
import { useUserPreferencesStore } from "@/store/user-preferences";

type CalendarSearchParams = {
  taskId?: string;
};

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/calendar",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): CalendarSearchParams => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
  }),
});

// Lanes are capped so a busy week cannot push a row taller than the viewport;
// anything past the cap surfaces as a per-day overflow hint. Phones use the
// agenda list instead of the grid.
const MAX_LANES_DESKTOP = 3;

function RouteComponent() {
  const { t } = useTranslation();
  const { projectId, workspaceId } = Route.useParams();
  const { taskId } = Route.useSearch();
  const navigate = useNavigate();
  const {
    data: project,
    isLoading,
    isError,
    childIds,
  } = useGetGroupTasks(projectId);
  const weekStartsOn = useUserPreferencesStore((state) => state.weekStartsOn);
  const isMobile = useIsMobile();
  const sheetProjectId = useTaskSheetProjectId(project, taskId, projectId);
  const view = useProjectTaskView({
    project,
    projectId,
    workspaceId,
    scope: "schedule",
  });
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const { canCreateTasks, canUpdateTasks } = useWorkspacePermission();
  const saveTaskDates = useSaveCalendarTaskDates();
  const movePost = useMoveCalendarPost();
  const [createDraft, setCreateDraft] = useState<{
    title: string;
    day: Date;
  } | null>(null);

  const allScheduledTasks = useMemo(() => toScheduledTasks(project), [project]);
  // Unfiltered, so a step still names its post when a filter hides the post.
  const boardTasks = useMemo(
    () => [
      ...(project?.columns.flatMap((column) => column.tasks) ?? []),
      ...(project?.plannedTasks ?? []),
    ],
    [project],
  );
  const postGroups = useMemo(() => buildPostGroups(boardTasks), [boardTasks]);
  const scheduledTasks = useMemo(
    () =>
      toScheduledTasks(view.filters.filteredProject).map((task) => {
        const post = postGroups.get(task.id);
        return post ? { ...task, post } : task;
      }),
    [view.filters.filteredProject, postGroups],
  );

  const weeks = useMemo(
    () => buildMonthWeeks(visibleMonth, weekStartsOn),
    [visibleMonth, weekStartsOn],
  );

  const handlePreviousMonth = useCallback(() => {
    setVisibleMonth((current) => subMonths(current, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setVisibleMonth((current) => addMonths(current, 1));
  }, []);

  const handleToday = useCallback(() => {
    setVisibleMonth(startOfMonth(new Date()));
  }, []);

  const handleOpenTask = useCallback(
    (nextTaskId: string) => {
      navigate({ to: ".", search: { taskId: nextTaskId }, replace: true });
    },
    [navigate],
  );

  const handleCloseTaskSheet = useCallback(() => {
    navigate({ to: ".", search: {}, replace: true });
  }, [navigate]);

  // A post moves together with its steps; any other task moves alone.
  const handleMoveTask = useCallback(
    (task: Scheduled<Task>, deltaDays: number) => {
      const steps = boardTasks.filter(
        (other) => other.parentTaskId === task.id,
      );
      if (steps.length > 0) {
        void movePost(task, steps, deltaDays);
        return;
      }
      void saveTaskDates(task, shiftTaskDates(task, deltaDays));
    },
    [boardTasks, movePost, saveTaskDates],
  );

  const handleResizeTask = useCallback(
    (task: Scheduled<Task>, edge: ResizeEdge, targetDay: Date) => {
      void saveTaskDates(task, resizeTaskDates(task, edge, targetDay));
    },
    [saveTaskDates],
  );

  const quickCreate = useMemo<MonthGridQuickCreate | undefined>(
    () =>
      canCreateTasks()
        ? {
            projectId,
            onMoreOptions: (title, day) => setCreateDraft({ title, day }),
          }
        : undefined,
    [canCreateTasks, projectId],
  );

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="calendar"
      toolbar={
        <ProjectToolbar
          view={view}
          display={
            <>
              <DisplaySection>
                <LayoutSwitch
                  workspaceId={workspaceId}
                  projectId={projectId}
                  currentRoute="calendar"
                  currentView="calendar"
                />
              </DisplaySection>
              <DisplaySection>
                <WeekStartControl />
              </DisplaySection>
            </>
          }
        />
      }
      summary={
        <TaskCount
          shown={scheduledTasks.length}
          total={allScheduledTasks.length}
        />
      }
      filterBar={
        <ActiveFiltersBar
          subjects={view.subjects}
          onClear={view.filters.clearFilters}
          customFieldValues={view.filters.customFieldValues}
        />
      }
    >
      <PageTitle
        title={
          project
            ? t("tasks:calendar.pageTitle", { name: project.name })
            : undefined
        }
      />
      <RollupScope
        projectId={projectId}
        workspaceId={workspaceId}
        childIds={childIds}
      >
        <div className="flex h-full min-h-0 flex-col bg-background">
          <CalendarToolbar
            visibleMonth={visibleMonth}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
          />

          {isLoading ? (
            <div className="border-b border-border/80 px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">
                {t("common:empty.loading")}
              </p>
            </div>
          ) : isError ? (
            <div className="border-b border-border/80 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-destructive">
                {t("tasks:calendar.loadError")}
              </p>
            </div>
          ) : allScheduledTasks.length === 0 ? (
            <div className="border-b border-border/80 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-foreground">
                {t("tasks:calendar.noTasks")}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("tasks:calendar.noTasksSubtitle")}
              </p>
            </div>
          ) : scheduledTasks.length === 0 ? (
            <div className="border-b border-border/80 px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">
                {t("tasks:filterBar.noMatches")}
              </p>
            </div>
          ) : null}

          {isMobile ? (
            scheduledTasks.length > 0 && (
              <MonthAgenda
                tasks={scheduledTasks}
                visibleMonth={visibleMonth}
                projectSlug={project?.slug}
                onOpenTask={handleOpenTask}
              />
            )
          ) : (
            <MonthGrid
              weeks={weeks}
              tasks={scheduledTasks}
              visibleMonth={visibleMonth}
              maxLanes={MAX_LANES_DESKTOP}
              projectSlug={project?.slug}
              onOpenTask={handleOpenTask}
              onMoveTask={canUpdateTasks() ? handleMoveTask : undefined}
              onResizeTask={canUpdateTasks() ? handleResizeTask : undefined}
              quickCreate={quickCreate}
            />
          )}

          <CreateTaskModal
            open={createDraft !== null}
            onClose={() => setCreateDraft(null)}
            projectId={projectId}
            initialTitle={createDraft?.title}
            initialDueDate={createDraft?.day}
          />

          <TaskDetailsSheet
            taskId={taskId}
            projectId={sheetProjectId}
            workspaceId={workspaceId}
            onClose={handleCloseTaskSheet}
          />
        </div>
      </RollupScope>
    </ProjectLayout>
  );
}
