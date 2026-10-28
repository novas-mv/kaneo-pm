import { getAccessToken } from "./auth";
import type { CalendarEvent } from "./mapping";

const API = "https://www.googleapis.com/calendar/v3";

export class GoogleCalendarError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const RETRY_DELAYS_MS = [1000, 2000, 4000];

function isRateLimited(status: number, body: string) {
  return (
    status === 429 ||
    (status === 403 && /rateLimitExceeded|userRateLimitExceeded/.test(body))
  );
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; query?: Record<string, string> } = {},
): Promise<T | null> {
  const url = new URL(`${API}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, value);
  }
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (response.ok) {
      return response.status === 204 ? null : ((await response.json()) as T);
    }
    const text = await response.text().catch(() => "");
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay !== undefined && isRateLimited(response.status, text)) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    throw new GoogleCalendarError(
      response.status,
      `Google Calendar ${method} ${path} failed (${response.status}) ${text.slice(0, 200)}`,
    );
  }
}

const eventsPath = (calendarId: string) =>
  `/calendars/${encodeURIComponent(calendarId)}/events`;

export async function getEvent(calendarId: string, eventId: string) {
  try {
    return await request<CalendarEvent>(
      "GET",
      `${eventsPath(calendarId)}/${eventId}`,
    );
  } catch (error) {
    if (error instanceof GoogleCalendarError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function upsertEvent(calendarId: string, event: CalendarEvent) {
  if (!event.id) throw new Error("Event id is required");
  try {
    await request("POST", eventsPath(calendarId), { body: event });
  } catch (error) {
    // The event exists already, or was deleted earlier and Google still holds
    // its id. Patch only the fields Kaneo owns, so anything people added in
    // Google, such as a colour or reminders, survives.
    if (!(error instanceof GoogleCalendarError) || error.status !== 409) {
      throw error;
    }
    const { id, ...fields } = event;
    await request("PATCH", `${eventsPath(calendarId)}/${id}`, {
      body: { ...fields, status: "confirmed" },
    });
  }
}

export async function deleteEvent(calendarId: string, eventId: string) {
  try {
    await request("DELETE", `${eventsPath(calendarId)}/${eventId}`);
  } catch (error) {
    if (
      error instanceof GoogleCalendarError &&
      (error.status === 404 || error.status === 410)
    ) {
      return;
    }
    throw error;
  }
}

type EventList = {
  items?: CalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

// Returns every change since `syncToken`, or the current state when it is
// absent. An expired token (410) tells the caller to start over.
export async function listChanges(calendarId: string, syncToken?: string) {
  const items: CalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  do {
    const page = await request<EventList>("GET", eventsPath(calendarId), {
      query: {
        showDeleted: "true",
        maxResults: "250",
        ...(syncToken ? { syncToken } : {}),
        ...(pageToken ? { pageToken } : {}),
      },
    });
    items.push(...(page?.items ?? []));
    pageToken = page?.nextPageToken;
    nextSyncToken = page?.nextSyncToken ?? nextSyncToken;
  } while (pageToken);
  return { items, nextSyncToken };
}

// Throws when the service account cannot read the calendar, which is what
// happens until the calendar owner shares it with the service account.
export async function assertCalendarAccess(calendarId: string) {
  await request("GET", eventsPath(calendarId), { query: { maxResults: "1" } });
}
