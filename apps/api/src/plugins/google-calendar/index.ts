import type {
  IntegrationPlugin,
  PluginContext,
  TaskMovedEvent,
} from "../types";
import { isGoogleCalendarConfigured } from "./auth";
import { validateGoogleCalendarConfig } from "./config";
import { removeFromSourceCalendar } from "./move";
import { syncTaskToCalendar, targetFromContext } from "./sync-task";

// Handlers do nothing without a key rather than failing on every task event.
function pushTask(removeWhenUndated: boolean) {
  return async (event: { taskId: string }, context: PluginContext) => {
    if (!isGoogleCalendarConfigured()) return;
    await syncTaskToCalendar(event.taskId, targetFromContext(context), {
      removeWhenUndated,
    });
  };
}

async function onTaskMoved(event: TaskMovedEvent, context: PluginContext) {
  if (!isGoogleCalendarConfigured()) return;
  await removeFromSourceCalendar(event);
  await syncTaskToCalendar(event.taskId, targetFromContext(context), {
    removeWhenUndated: true,
  });
}

export const googleCalendarPlugin: IntegrationPlugin = {
  type: "google-calendar",
  name: "Google Calendar",
  onTaskCreated: pushTask(false),
  onTaskTitleChanged: pushTask(false),
  onTaskStatusChanged: pushTask(false),
  onTaskDueDateChanged: pushTask(true),
  onTaskDeleted: pushTask(true),
  onTaskMoved,
  validateConfig: validateGoogleCalendarConfig,
};
