import { afterEach, expect, it, vi } from "vite-plus/test";
import { buildEvent, eventIdForTask } from "./mapping";
import { syncTasksToCalendar, syncTaskToCalendar } from "./sync-task";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  linkedEventId: vi.fn(),
  getEvent: vi.fn(),
  upsertEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

vi.mock("../../database", () => ({ default: { select: mocks.select } }));
vi.mock("./event-link", () => ({ linkedEventId: mocks.linkedEventId }));
vi.mock("./client", () => ({
  getEvent: mocks.getEvent,
  upsertEvent: mocks.upsertEvent,
  deleteEvent: mocks.deleteEvent,
}));

afterEach(() => vi.resetAllMocks());

const zone = "Indian/Maldives";
const target = {
  integrationId: "i1",
  projectId: "p1",
  config: { calendarId: "team@group.calendar.google.com", timeZone: zone },
};
const task = {
  id: "t1",
  projectId: "p1",
  title: "Launch",
  description: null,
  startDate: null,
  dueDate: new Date("2026-11-02T07:00:00Z"),
};

function selectRows(rows: unknown[]) {
  const chain = {
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: async () => rows,
  };
  mocks.select.mockReturnValue(chain);
}

function kaneoEvent(id: string) {
  const event = buildEvent(task, {
    timeZone: zone,
    integrationId: "i1",
    projectName: "VARA",
    statusName: "To do",
    taskUrl: "/dashboard/workspace/w1/project/p1/task/t1",
  });
  if (!event) throw new Error("expected an event");
  return { ...event, id };
}

it("writes an imported task to its Google event, never a second one", async () => {
  selectRows([
    { task, projectName: "VARA", workspaceId: "w1", statusName: "To do" },
  ]);
  mocks.linkedEventId.mockResolvedValue("googlemade1");
  mocks.getEvent.mockResolvedValue({
    id: "googlemade1",
    summary: "Launch",
    description: "Agenda",
    start: { date: "2026-11-02" },
    end: { date: "2026-11-03" },
  });

  await syncTaskToCalendar("t1", target);

  expect(mocks.getEvent).toHaveBeenCalledWith(
    target.config.calendarId,
    "googlemade1",
  );
  expect(mocks.upsertEvent).toHaveBeenCalledOnce();
  const written = mocks.upsertEvent.mock.calls[0]?.[1];
  expect(written.id).toBe("googlemade1");
  expect(written.id).not.toBe(eventIdForTask("t1"));
  // The description someone wrote in Google stays.
  expect(written.description).toBe("Agenda");
});

it("does not write again once the snapshot is in place", async () => {
  selectRows([
    { task, projectName: "VARA", workspaceId: "w1", statusName: "To do" },
  ]);
  mocks.linkedEventId.mockResolvedValue("googlemade1");
  mocks.getEvent.mockResolvedValue({
    ...kaneoEvent("googlemade1"),
    description: "Agenda",
  });

  await syncTaskToCalendar("t1", target);

  expect(mocks.upsertEvent).not.toHaveBeenCalled();
});

it("reports Google's reason for a failed push, not just a count", async () => {
  selectRows([
    { task, projectName: "VARA", workspaceId: "w1", statusName: "To do" },
  ]);
  mocks.linkedEventId.mockResolvedValue(null);
  mocks.getEvent.mockResolvedValue(null);
  mocks.upsertEvent.mockRejectedValue(
    new Error("Google Calendar POST /calendars/x/events failed (403) denied"),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});

  const result = await syncTasksToCalendar(["t1", "t1"], target);

  expect(result.failed).toBe(2);
  expect(result.error).toBe(
    "2 tasks failed to sync: Google Calendar POST /calendars/x/events failed (403) denied",
  );
});

it("reports no error when every push lands", async () => {
  expect(await syncTasksToCalendar([], target)).toEqual({
    failed: 0,
    error: null,
  });
});

it("still uses the derived id for tasks made in Kaneo", async () => {
  selectRows([
    { task, projectName: "VARA", workspaceId: "w1", statusName: "To do" },
  ]);
  mocks.linkedEventId.mockResolvedValue(null);
  mocks.getEvent.mockResolvedValue(null);

  await syncTaskToCalendar("t1", target);

  expect(mocks.upsertEvent.mock.calls[0]?.[1].id).toBe(eventIdForTask("t1"));
});
