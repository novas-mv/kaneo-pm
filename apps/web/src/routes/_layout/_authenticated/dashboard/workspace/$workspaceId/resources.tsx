import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import { ResourceLinksPanel } from "@/components/resources/resource-links-panel";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/resources",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId } = Route.useParams();
  const { canManageSettings } = useWorkspacePermission();

  return (
    <>
      <PageTitle title={t("workspace:resources.pageTitle")} />
      <WorkspaceLayout title={t("workspace:resources.pageTitle")}>
        <div className="h-full overflow-y-auto">
          <ResourceLinksPanel
            scope={{ workspaceId }}
            canManage={canManageSettings()}
            title={t("workspace:resources.pageTitle")}
            description={t("workspace:resources.workspaceDescription")}
          />
        </div>
      </WorkspaceLayout>
    </>
  );
}
