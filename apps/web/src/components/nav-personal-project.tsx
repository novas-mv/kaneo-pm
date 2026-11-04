import { useNavigate, useParams } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";

// The API only returns this project to its owner, so no one else sees the group.
export function NavPersonalProject() {
  const { t } = useTranslation();
  const { data: workspace } = useActiveWorkspace();
  const { data: projects } = useGetProjects({
    workspaceId: workspace?.id || "",
  });
  const navigate = useNavigate();
  const { projectId: currentProjectId } = useParams({ strict: false });

  const personal = projects?.find((project) => project.ownerUserId);
  if (!workspace || !personal) return null;

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden gap-1 p-2 pt-1">
      <SidebarGroupLabel className="h-7 gap-1 px-0 text-sidebar-accent-foreground">
        <Lock aria-hidden="true" className="size-3" />
        <span>{t("navigation:sidebar.onlyYou")}</span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentProjectId === personal.id}
              className="h-8 text-sm"
              onClick={() =>
                navigate({
                  to: "/dashboard/workspace/$workspaceId/project/$projectId/board",
                  params: { workspaceId: workspace.id, projectId: personal.id },
                })
              }
            >
              <Lock aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                {t("navigation:sidebar.personal")}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
