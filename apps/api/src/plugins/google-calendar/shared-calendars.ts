export function calendarIdOf(config: string) {
  try {
    const parsed = JSON.parse(config) as { calendarId?: unknown };
    return typeof parsed.calendarId === "string"
      ? parsed.calendarId.trim().toLowerCase()
      : null;
  } catch {
    return null;
  }
}

// Calendar ids connected to more than one project.
export function sharedCalendarIds(rows: Array<{ config: string }>) {
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const row of rows) {
    const id = calendarIdOf(row.config);
    if (!id) continue;
    if (seen.has(id)) shared.add(id);
    seen.add(id);
  }
  return shared;
}
