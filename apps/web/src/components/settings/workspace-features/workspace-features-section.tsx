import {
  WORKSPACE_FEATURE_KEYS,
  type WorkspaceFeatureKey,
} from "@kaneo/permissions";
import { useTranslation } from "react-i18next";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsNote } from "@/components/settings/settings-note";
import { SettingsRowsSkeleton } from "@/components/settings/settings-rows-skeleton";
import { SettingsSection } from "@/components/settings/settings-section";
import { WorkspaceFeatureRow } from "@/components/settings/workspace-features/workspace-feature-row";
import { WORKSPACE_FEATURE_COPY } from "@/components/settings/workspace-features/workspace-feature-copy";
import { Button } from "@/components/ui/button";
import useUpdateWorkspaceFeature from "@/hooks/mutations/workspace/use-update-workspace-feature";
import useWorkspaceFeatures from "@/hooks/queries/workspace/use-workspace-features";
import { toast } from "@/lib/toast";

type WorkspaceFeaturesSectionProps = {
  workspaceId: string | undefined;
  canEdit: boolean;
};

export function WorkspaceFeaturesSection({
  workspaceId,
  canEdit,
}: WorkspaceFeaturesSectionProps) {
  const { t } = useTranslation();
  const featuresQuery = useWorkspaceFeatures(workspaceId);
  const updateFeature = useUpdateWorkspaceFeature();

  const toggle = (key: WorkspaceFeatureKey, enabled: boolean) => {
    if (!workspaceId) return;
    updateFeature.mutate(
      { workspaceId, key, enabled },
      {
        onError: () =>
          toast.error(
            t("settings:workspaceFeatures.toastUpdateError", {
              feature: t(WORKSPACE_FEATURE_COPY[key].labelKey),
            }),
          ),
      },
    );
  };

  const renderRows = () => {
    if (featuresQuery.isPending) {
      return (
        <SettingsRowsSkeleton
          rows={WORKSPACE_FEATURE_KEYS.length}
          withDescription
        />
      );
    }
    if (featuresQuery.isError) {
      return (
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <p role="alert" className="text-destructive-foreground text-sm">
            {t("settings:workspaceFeatures.loadError")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => featuresQuery.refetch()}
          >
            {t("settings:workspaceFeatures.retry")}
          </Button>
        </div>
      );
    }
    return WORKSPACE_FEATURE_KEYS.map((key) => {
      const pending =
        updateFeature.isPending && updateFeature.variables?.key === key;
      return (
        <WorkspaceFeatureRow
          key={key}
          title={t(WORKSPACE_FEATURE_COPY[key].labelKey)}
          description={t(WORKSPACE_FEATURE_COPY[key].descriptionKey)}
          checked={
            pending ? updateFeature.variables.enabled : featuresQuery.data[key]
          }
          disabled={!canEdit || pending}
          onCheckedChange={(enabled) => toggle(key, enabled)}
        />
      );
    });
  };

  return (
    <SettingsSection
      title={t("settings:workspaceFeatures.title")}
      description={t("settings:workspaceFeatures.subtitle")}
    >
      <SettingsCard>{renderRows()}</SettingsCard>
      {canEdit ? null : (
        <SettingsNote>
          {t("settings:workspaceFeatures.readOnlyNote")}
        </SettingsNote>
      )}
    </SettingsSection>
  );
}
