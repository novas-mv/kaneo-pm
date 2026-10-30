import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { applyChange } from "./apply-change";
import { buildEvent, eventIdForTask } from "./mapping";

const mocks = vi.hoisted(() => ({
  findTask: vi.fn(),
  transaction: vi.fn(),
  linkedTaskId: vi.fn(),
  importEvent: vi.fn(),
  syncTaskToCalendar: vi.fn(),
}));

vi.mock("../../database", () => ({
  default: {
    query: { taskTable: { findFirst: mocks.findTask } },
    transaction: mocks.transaction,
  },
}));
vi.mock("../../events", () => ({ publishEvent: vi.fn() }));
vi.mock("../../task/controllers/task-mutation-effects", () => ({
  publishTaskMutation: vi.fn(),
  recordTaskMutation: vi.fn(),
}));
vi.mock("./event-link", () => ({ linkedTaskId: mocks.linkedTaskId }));
vi.mock("./import-task", () => ({ importEvent: mocks.importEvent }));
vi.mock("./sync-task", () => ({
  syncTaskToCalendar: mocks.syncTaskToCalendar,
}));

afterEach(() => vi.resetAllMocks());

const zone = "Indian/Maldives";
const target = {
  integrationId: "i1",
  projectId: "p1",
  config: { calendarId: "team@group.calendar.google.com", timeZone: zone },
};
const googleEvent = {
  id: "googlemade1",
  status: "confirmed",
  summary: "Launch",
  start: { date: "2026-11-02" },
  end: { date: "2026-11-03" },
};

describe("Google-made events", () => {
  it("imports a new event once and writes its snapshot", async () => {
    mocks.linkedTaskId.mockResolvedValue(null);
    mocks.importEvent.mockResolvedValue("t-new");

    await applyChange(googleEvent, target, { canImport: true });

    expect(mocks.importEvent).toHaveBeenCalledOnce();
    expect(mocks.syncTaskToCalendar).toHaveBeenCalledWith("t-new", target);
  });

  it("updates the linked task instead of importing again", async () => {
    const task = {
      id: "t1",
      projectId: "p1",
      title: "Launch",
      description: null,
      startDate: null,
      dueDate: new Date("2026-11-02T07:00:00Z"),
      status: "to-do",
    };
    const pushed = buildEvent(task, {
      timeZone: zone,
      integrationId: "i1",
      projectName: "VARA",
      statusName: null,
      taskUrl: "https://kaneo.test",
    });
    mocks.linkedTaskId.mockResolvedValue("t1");
    mocks.findTask.mockResolvedValue(task);
    mocks.transaction.mockResolvedValue({ ...task, title: "Renamed" });

    await applyChange(
      {
        ...googleEvent,
        summary: "Renamed",
        extendedProperties: pushed?.extendedProperties,
      },
      target,
      { canImport: true },
    );

    expect(mocks.importEvent).not.toHaveBeenCalled();
    expect(mocks.linkedTaskId).toHaveBeenCalledWith("i1", "googlemade1");
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.syncTaskToCalendar).toHaveBeenCalledWith("t1", target);
  });

  it("does not import when the calendar is shared by several projects", async () => {
    mocks.linkedTaskId.mockResolvedValue(null);
    await applyChange(googleEvent, target, { canImport: false });
    expect(mocks.importEvent).not.toHaveBeenCalled();
  });

  it("leaves tasks alone when an event is deleted in Google", async () => {
    await applyChange({ ...googleEvent, status: "cancelled" }, target, {
      canImport: true,
    });
    expect(mocks.linkedTaskId).not.toHaveBeenCalled();
    expect(mocks.importEvent).not.toHaveBeenCalled();
    expect(mocks.findTask).not.toHaveBeenCalled();
  });
});

it("finds Kaneo-made events by id without a link lookup", async () => {
  mocks.findTask.mockResolvedValue(null);
  await applyChange(
    {
      ...googleEvent,
      id: eventIdForTask("t2"),
      extendedProperties: {
        private: { kaneoTaskId: "t2", kaneoIntegrationId: "i1" },
      },
    },
    target,
    { canImport: true },
  );
  expect(mocks.linkedTaskId).not.toHaveBeenCalled();
  expect(mocks.findTask).toHaveBeenCalledOnce();
  expect(mocks.importEvent).not.toHaveBeenCalled();
});

it("reads back a timed event Kaneo pushed without a new task or update", async () => {
  const task = {
    id: "t3",
    projectId: "p1",
    title: "Call",
    description: null,
    startDate: null,
    // 15:00 in the Maldives.
    dueDate: new Date("2026-11-02T10:00:00Z"),
    status: "to-do",
  };
  const pushed = buildEvent(task, {
    timeZone: zone,
    integrationId: "i1",
    projectName: "VARA",
    statusName: null,
    taskUrl: "https://kaneo.test",
  });
  mocks.findTask.mockResolvedValue(task);

  await applyChange(
    {
      ...pushed,
      status: "confirmed",
      // Google answers in the calendar's offset.
      start: { dateTime: "2026-11-02T15:00:00+05:00", timeZone: zone },
      end: { dateTime: "2026-11-02T15:00:00+05:00", timeZone: zone },
    },
    target,
    { canImport: true },
  );

  expect(mocks.importEvent).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
});
