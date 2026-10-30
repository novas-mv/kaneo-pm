import { afterEach, expect, it, vi } from "vite-plus/test";
import { CALENDAR_EVENT_LINK } from "./event-link";
import { importEvent } from "./import-task";

const mocks = vi.hoisted(() => ({
  binding: vi.fn(),
  linkedTaskId: vi.fn(),
  insert: vi.fn(),
  publishEvent: vi.fn(),
}));

const calendarId = "team@group.calendar.google.com";
const tx = {
  select: () => ({
    from: () => ({ where: () => ({ for: mocks.binding }) }),
  }),
  query: {
    columnTable: {
      findFirst: async () => ({ id: "col1", slug: "planned" }),
    },
  },
  insert: mocks.insert,
};

vi.mock("../../database", () => ({
  default: { transaction: (run: (t: typeof tx) => unknown) => run(tx) },
}));
vi.mock("../../events", () => ({ publishEvent: mocks.publishEvent }));
vi.mock("../../task/controllers/claim-task-numbers", () => ({
  claimTaskNumber: async () => 7,
}));
vi.mock("../../task/controllers/next-task-position", () => ({
  nextTaskPosition: async () => 1,
}));
vi.mock("./event-link", async (original) => ({
  ...(await original<typeof import("./event-link")>()),
  linkedTaskId: mocks.linkedTaskId,
}));

afterEach(() => vi.resetAllMocks());

const target = {
  integrationId: "i1",
  projectId: "p1",
  config: { calendarId, timeZone: "Indian/Maldives" },
};
const event = {
  id: "googlemade1",
  status: "confirmed",
  summary: "Launch",
  start: { date: "2026-11-02" },
  end: { date: "2026-11-03" },
};

function recordInserts() {
  const values: unknown[] = [];
  mocks.insert.mockImplementation(() => ({
    values: (row: Record<string, unknown>) => {
      values.push(row);
      // Awaiting a plain object resolves to it, as the link insert does.
      return { returning: async () => [{ id: "t-new", ...row }] };
    },
  }));
  return values;
}

it("creates the task in the first open column and links the event", async () => {
  mocks.binding.mockResolvedValue([{ config: JSON.stringify({ calendarId }) }]);
  mocks.linkedTaskId.mockResolvedValue(null);
  const values = recordInserts();

  expect(await importEvent(event, target)).toBe("t-new");

  expect(values[0]).toMatchObject({
    projectId: "p1",
    title: "Launch",
    status: "planned",
    columnId: "col1",
    number: 7,
  });
  expect(values[1]).toMatchObject({
    taskId: "t-new",
    integrationId: "i1",
    resourceType: CALENDAR_EVENT_LINK,
    externalId: "googlemade1",
  });
  expect(mocks.publishEvent).toHaveBeenCalledWith(
    "task.created",
    expect.objectContaining({ taskId: "t-new", projectId: "p1" }),
  );
});

it("creates nothing when the event is already linked", async () => {
  mocks.binding.mockResolvedValue([{ config: JSON.stringify({ calendarId }) }]);
  mocks.linkedTaskId.mockResolvedValue("t-old");

  expect(await importEvent(event, target)).toBeNull();
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.publishEvent).not.toHaveBeenCalled();
});

it("creates nothing after a disconnect or a calendar switch", async () => {
  mocks.binding.mockResolvedValue([]);
  expect(await importEvent(event, target)).toBeNull();
  mocks.binding.mockResolvedValue([
    {
      config: JSON.stringify({ calendarId: "other@group.calendar.google.com" }),
    },
  ]);
  expect(await importEvent(event, target)).toBeNull();
  expect(mocks.insert).not.toHaveBeenCalled();
});
