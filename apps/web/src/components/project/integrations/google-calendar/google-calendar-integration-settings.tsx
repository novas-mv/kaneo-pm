import { PlugIcon, UnplugIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { DeliveryFooter } from "@/components/project/integrations/delivery-panel/delivery-footer";
import { DeliveryPanelSkeleton } from "@/components/project/integrations/delivery-panel/delivery-panel-skeleton";
import { IntegrationPanel } from "@/components/project/integrations/panel/integration-panel";
import { IntegrationPanelSection } from "@/components/project/integrations/panel/integration-panel-section";
import { Input } from "@/components/ui/input";
import {
  useDeleteGoogleCalendarIntegration,
  useSaveGoogleCalendarIntegration,
} from "@/hooks/mutations/google-calendar-integration/use-google-calendar-integration";
import useGetGoogleCalendarIntegration from "@/hooks/queries/google-calendar-integration/use-get-google-calendar-integration";
import { toast } from "@/lib/toast";

const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function GoogleCalendarIntegrationSettings({
  projectId,
}: {
  projectId: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } =
    useGetGoogleCalendarIntegration(projectId);
  const { mutateAsync: save, isPending: isSaving } =
    useSaveGoogleCalendarIntegration();
  const { mutateAsync: remove, isPending: isRemoving } =
    useDeleteGoogleCalendarIntegration();

  const connected = data?.integration ?? null;
  const [calendarId, setCalendarId] = React.useState("");
  const [timeZone, setTimeZone] = React.useState(BROWSER_TIME_ZONE);

  React.useEffect(() => {
    setCalendarId(connected?.calendarId ?? "");
    setTimeZone(connected?.timeZone ?? BROWSER_TIME_ZONE);
  }, [connected?.calendarId, connected?.timeZone]);

  if (isError && !data) {
    return (
      <IntegrationPanel>
        <IntegrationPanelSection>
          <p className="text-sm text-destructive" role="alert">
            {t("settings:googleCalendarIntegration.loadError")}
          </p>
        </IntegrationPanelSection>
      </IntegrationPanel>
    );
  }

  if (isLoading || !data) {
    return <DeliveryPanelSkeleton />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save({
        projectId,
        json: { calendarId: calendarId.trim(), timeZone: timeZone.trim() },
      });
      toast.success(t("settings:googleCalendarIntegration.toast.saved"), {
        icon: PlugIcon,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:googleCalendarIntegration.toast.saveError"),
      );
    }
  };

  const handleDisconnect = async () => {
    try {
      await remove(projectId);
      toast.success(t("settings:googleCalendarIntegration.toast.removed"), {
        icon: UnplugIcon,
      });
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:googleCalendarIntegration.toast.removeError"),
      );
      return false;
    }
  };

  if (!data.configured) {
    return (
      <IntegrationPanel>
        <IntegrationPanelSection>
          <p className="text-sm text-muted-foreground">
            {t("settings:googleCalendarIntegration.notConfigured")}
          </p>
        </IntegrationPanelSection>
      </IntegrationPanel>
    );
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)}>
      <IntegrationPanel>
        <IntegrationPanelSection className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("settings:googleCalendarIntegration.shareHint")}{" "}
            <code className="select-all rounded bg-muted px-1 py-0.5 text-xs text-foreground">
              {data.serviceAccountEmail}
            </code>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              {t("settings:googleCalendarIntegration.calendarIdLabel")}
              <Input
                autoComplete="off"
                onChange={(event) => setCalendarId(event.target.value)}
                placeholder="abc123@group.calendar.google.com"
                value={calendarId}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              {t("settings:googleCalendarIntegration.timeZoneLabel")}
              <Input
                autoComplete="off"
                onChange={(event) => setTimeZone(event.target.value)}
                value={timeZone}
              />
            </label>
          </div>
          {connected ? (
            <p className="text-xs text-muted-foreground">
              {connected.lastError
                ? t("settings:googleCalendarIntegration.syncError", {
                    message: connected.lastError,
                  })
                : connected.lastSyncAt
                  ? t("settings:googleCalendarIntegration.lastSynced", {
                      time: new Date(connected.lastSyncAt).toLocaleString(),
                    })
                  : t("settings:googleCalendarIntegration.firstSyncPending")}
            </p>
          ) : null}
        </IntegrationPanelSection>
        <DeliveryFooter
          busy={isSaving || isRemoving}
          connectLabel={t("settings:googleCalendarIntegration.connect")}
          connected={Boolean(connected)}
          disconnectDescription={t(
            "settings:googleCalendarIntegration.disconnectDescription",
          )}
          disconnectTitle={t(
            "settings:googleCalendarIntegration.disconnectTitle",
          )}
          disconnecting={isRemoving}
          onDisconnect={handleDisconnect}
        />
      </IntegrationPanel>
    </form>
  );
}
