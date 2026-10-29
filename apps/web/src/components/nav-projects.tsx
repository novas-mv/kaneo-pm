import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ChevronRight, Plus, Trash2Icon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import useDeleteProject from "@/hooks/mutations/project/use-delete-project";
import useReorderProjects from "@/hooks/mutations/project/use-reorder-projects";
import useSetProjectParent from "@/hooks/mutations/project/use-set-project-parent";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { groupTargets } from "@/lib/group-targets";
import { HttpError } from "@/lib/http-error";
import {
  buildProjectTree,
  moveProject,
  nestDropId,
  resolveProjectDrop,
  ungroupOrder,
} from "@/lib/project-tree";
import { toast } from "@/lib/toast";
import { ProjectRow } from "./nav-projects/project-row";
import { SortableProjectItem } from "./nav-projects/sortable-project-item";
import { useProjectDropCollision } from "./nav-projects/use-project-drop-collision";
import CreateProjectModal from "./shared/modals/create-project-modal";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

export function NavProjects() {
  const { t } = useTranslation();
  const { data: workspace } = useActiveWorkspace();
  const { data: projects } = useGetProjects(
    {
      workspaceId: workspace?.id || "",
    },
    true,
  );
  const queryClient = useQueryClient();
  const { mutateAsync: deleteProject } = useDeleteProject();
  const reorderProjects = useReorderProjects();
  const { setParent } = useSetProjectParent();
  const { collisionDetection, resetNestDwell } = useProjectDropCollision();
  const { canCreateProjects, canDeleteProjects, canUpdateProjects } =
    useWorkspacePermission();
  const canCreate = canCreateProjects();
  const canDeleteProject = canDeleteProjects();
  // Matches the API, which gates /project/reorder on `project: ["update"]`
  // alone — not the create+update+delete bundle.
  const canReorder = canUpdateProjects();
  const navigate = useNavigate();
  const { workspaceId: currentWorkspaceId, projectId: currentProjectId } =
    useParams({
      strict: false,
    });

  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] =
    useState(false);
  const [projectToDeleteId, setProjectToDeleteID] = useState<string | null>(
    null,
  );
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(
    null,
  );

  const draggingProject = projects?.find(
    (project) => project.id === draggingProjectId,
  );

  const tree = useMemo(() => buildProjectTree(projects ?? []), [projects]);
  // Visual order: what the sortable list and a reorder both work from.
  const orderedProjects = useMemo(
    () => tree.flatMap((node) => [node.project, ...node.children]),
    [tree],
  );
  // Same rules as the drop itself, so the highlight never promises a nest
  // the drop would refuse.
  const canNestInto = (projectId: string) =>
    !!draggingProjectId &&
    resolveProjectDrop(projects ?? [], draggingProjectId, nestDropId(projectId))
      .type === "nest";

  const isCurrentProject = (projectId: string) => {
    return (
      currentProjectId === projectId && currentWorkspaceId === workspace?.id
    );
  };

  const handleProjectClick = (projectId: string) => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/board",
      params: {
        workspaceId: workspace?.id || "",
        projectId,
      },
    });
  };

  // Built once per list, not per row render.
  const groupTargetsById = useMemo(() => {
    const list = projects ?? [];
    return new Map(
      list.map((project) => [project.id, groupTargets(list, project.id)]),
    );
  }, [projects]);

  const onGroupError = (error: Error) => {
    // The API answers every nesting-rule failure with one 400.
    toast.error(
      error instanceof HttpError && error.status === 400
        ? t("workspace:projects.groupNotAllowed")
        : t("workspace:projects.groupError"),
    );
  };

  const moveIntoGroup = (projectId: string, parentProjectId: string) => {
    if (!workspace) return;
    setParent(workspace.id, projectId, parentProjectId, {
      onError: onGroupError,
    });
  };

  const removeFromGroup = (projectId: string) => {
    if (!workspace) return;
    setParent(workspace.id, projectId, null, { onError: onGroupError });
  };

  // Below these thresholds the row is still a link and the sidebar still
  // scrolls; above them the gesture becomes a drag.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    document.body.classList.add("kaneo-dragging");
    setDraggingProjectId(String(event.active.id));
  };

  const endDrag = () => {
    resetNestDwell();
    document.body.classList.remove("kaneo-dragging");
    setDraggingProjectId(null);
  };

  const saveOrder = (list: typeof orderedProjects | null) => {
    if (!workspace || !list) return;
    reorderProjects(workspace.id, list, {
      onError: () => {
        toast.error(t("workspace:projects.reorderError"));
      },
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    endDrag();

    if (!over || !projects || !workspace) return;

    const drop = resolveProjectDrop(
      projects,
      String(active.id),
      String(over.id),
    );

    if (drop.type === "nest") {
      setParent(workspace.id, drop.projectId, drop.parentProjectId, {
        onError: onGroupError,
      });
    } else if (drop.type === "ungroup") {
      // Built now, saved only once the server accepts the ungroup.
      const order = ungroupOrder(
        orderedProjects,
        drop.projectId,
        drop.targetId,
      );
      setParent(workspace.id, drop.projectId, null, {
        onError: onGroupError,
        onSuccess: () => saveOrder(order),
      });
    } else if (drop.type === "reorder") {
      saveOrder(moveProject(orderedProjects, drop.projectId, drop.targetId));
    }
  };

  const renderRow = (
    project: (typeof orderedProjects)[number],
    isChild: boolean,
  ) => (
    <ProjectRow
      project={project}
      workspaceId={workspace?.id || ""}
      isActive={isCurrentProject(project.id)}
      canDelete={canDeleteProject}
      onOpen={() => handleProjectClick(project.id)}
      onDelete={() => {
        setProjectToDeleteID(project.id);
        setIsDeleteProjectModalOpen(true);
      }}
      onRemoveFromGroup={
        isChild && canReorder ? () => removeFromGroup(project.id) : undefined
      }
      groupTargets={groupTargetsById.get(project.id)}
      onMoveIntoGroup={
        !isChild && canReorder
          ? (parentProjectId) => moveIntoGroup(project.id, parentProjectId)
          : undefined
      }
    />
  );

  if (!workspace) return null;

  return (
    <>
      <Collapsible defaultOpen className="group/collapsible">
        <SidebarGroup className="group-data-[collapsible=icon]:hidden gap-1 p-2 pt-1">
          <CollapsibleTrigger
            className="data-panel-open:[&_svg]:rotate-90"
            render={
              <SidebarGroupLabel className="h-7 cursor-pointer justify-start gap-1 px-0 text-sidebar-accent-foreground" />
            }
          >
            <span>{t("navigation:sidebar.projects")}</span>
            <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/60 transition-transform duration-200" />
          </CollapsibleTrigger>
          {canCreate && (
            <SidebarGroupAction
              className="top-2 right-2 text-sidebar-foreground/70"
              title={t("navigation:projectList.addProject")}
              onClick={() => setIsCreateProjectModalOpen(true)}
            >
              <Plus />
              <span className="sr-only">
                {t("navigation:projectList.addProject")}
              </span>
            </SidebarGroupAction>
          )}
          <CollapsiblePanel>
            <SidebarGroupContent>
              <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                modifiers={[
                  restrictToVerticalAxis,
                  restrictToFirstScrollableAncestor,
                ]}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={endDrag}
              >
                <SidebarMenu className="gap-0.5">
                  <SortableContext
                    items={orderedProjects.map((project) => project.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {tree.map(({ project, children }) => {
                      return (
                        <Fragment key={project.id}>
                          <SortableProjectItem
                            id={project.id}
                            canReorder={canReorder}
                            canNestInto={canNestInto(project.id)}
                          >
                            {renderRow(project, false)}
                          </SortableProjectItem>
                          {children.length > 0 && (
                            <li>
                              <SidebarMenuSub className="me-0 gap-0.5 pe-0 ps-1.5">
                                {children.map((child) => (
                                  <SortableProjectItem
                                    key={child.id}
                                    id={child.id}
                                    canReorder={canReorder}
                                  >
                                    {renderRow(child, true)}
                                  </SortableProjectItem>
                                ))}
                              </SidebarMenuSub>
                            </li>
                          )}
                        </Fragment>
                      );
                    })}
                  </SortableContext>
                </SidebarMenu>

                {/* Portalled: `SidebarContent` is `overflow-auto` and clips it. */}
                {createPortal(
                  <DragOverlay dropAnimation={null}>
                    {draggingProject ? (
                      <div className="flex h-8 w-(--sidebar-width) max-w-64 items-center rounded-lg border bg-sidebar not-dark:bg-clip-padding px-2 text-sm text-sidebar-accent-foreground shadow-lg/5">
                        <span className="truncate">{draggingProject.name}</span>
                      </div>
                    ) : null}
                  </DragOverlay>,
                  document.body,
                )}
              </DndContext>
            </SidebarGroupContent>
          </CollapsiblePanel>
        </SidebarGroup>
      </Collapsible>

      <CreateProjectModal
        open={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
      />

      <AlertDialog
        open={isDeleteProjectModalOpen}
        onOpenChange={setIsDeleteProjectModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("navigation:projectList.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("navigation:projectList.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" size="sm" />}>
              {t("common:actions.cancel")}
            </AlertDialogClose>
            <AlertDialogClose
              render={
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await deleteProject({
                      id: projectToDeleteId || "",
                    });
                    toast.success(t("navigation:projectList.deletedToast"), {
                      icon: Trash2Icon,
                    });
                    queryClient.invalidateQueries({
                      queryKey: ["projects"],
                    });
                    navigate({
                      to: "/dashboard/workspace/$workspaceId",
                      params: {
                        workspaceId: workspace?.id || "",
                      },
                    });
                  }}
                />
              }
            >
              {t("navigation:projectList.deleteProject")}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
