import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import ProjectLayout from "@/components/common/project-layout";
import PageTitle from "@/components/page-title";
import { ResourceLinksPanel } from "@/components/resources/resource-links-panel";
import useGetProject from "@/hooks/queries/project/use-get-project";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/resources",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId, projectId } = Route.useParams();
  const { data: project } = useGetProject({ id: projectId, workspaceId });
  const { canUpdateProjects } = useWorkspacePermission();

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="resources"
    >
      <PageTitle
        title={
          project
            ? t("workspace:resources.projectPageTitle", { name: project.name })
            : undefined
        }
      />
      <div className="h-full overflow-y-auto">
        <ResourceLinksPanel
          scope={{ workspaceId, projectId }}
          canManage={canUpdateProjects()}
          title={t("workspace:resources.pageTitle")}
          description={t("workspace:resources.projectDescription")}
        />
      </div>
    </ProjectLayout>
  );
}
