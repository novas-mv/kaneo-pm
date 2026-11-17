import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import PageTitle from "@/components/page-title";
import { TaskTemplatesPage } from "@/components/project/task-templates/task-templates-page";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/settings/projects/$projectId/templates",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { projectId } = Route.useParams();

  return (
    <>
      <PageTitle title={t("settings:taskTemplates.pageTitle")} />
      <TaskTemplatesPage key={projectId} projectId={projectId} />
    </>
  );
}
