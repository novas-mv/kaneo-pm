# Parent / child projects with rolled-up board and calendar

## Intent and why

Related work is split across several projects that are really one effort. Example from the requester's workspace: "DiveOS" holds the actual app tasks, while "DiveOS Migration" and "DiveOS Sales" are part of the same effort. "Prospects" is unrelated and should stay a separate top-level project. The sidebar is a flat list, so related projects are scattered and there is no way to see the whole effort at once.

The requester does not want folders as such. They want to **group related projects** and get a **higher-level view**: a group-level board (tasks) and calendar that roll up everything in the group.

## What was decided (by the requester)

- **Structure:** a project can have a parent project. The parent is itself a real project with its own tasks (DiveOS has app tasks). Children (Migration, Sales) nest under it. No separate "folder" object.
- **Shared grouping:** grouping is workspace-wide (stored on the project), so everyone sees the same sidebar structure. Grouping and ungrouping need the same permission as reordering projects today (`project:update`).
- **One level of nesting** is confirmed as enough for now (children cannot have children).
- **Sidebar:** the parent is a normal row; children are indented under it (mockup option C: parent row, then an indented, left-ruled list of children). Ungrouped projects look exactly as today.
- **Grouping gesture:** drag a project onto a parent in the sidebar to make it a child. Dragging it out returns it to top level.
- **Parent view:** opening a parent shows the same Tasks board and Calendar as any project, but rolled up: the parent's own tasks plus all children's tasks. Each task card/bar carries a small tag showing which project it belongs to.
- **Scope switch:** a toggle on the parent view, "Own only" / "Everything". Default is "Everything".
- **Children stay normal projects.** Opening a child shows only that child, as today.
- **Creating a task from a parent view:** the create dialog lets the user pick the target project (parent or any child). The parent is preselected.

## Goals

- Group related projects in the sidebar with one gesture.
- Roll up board and calendar for a parent without copying or moving any data.
- Existing installs keep working untouched: every existing project is top-level after upgrade.

## Non-goals

- Arbitrary-depth nesting. One level only (children cannot have children); confirmed by the requester for now.
- Folders that are not projects.
- Cross-workspace grouping.
- Rolled-up views for other surfaces (reports, statistics) in v1.
- Full mobile and MCP parity in v1 (see "Left to the builder").

## Anti-goals (would be a failure even if it technically works)

- Slower boards: opening an ordinary (non-parent) project must not get slower or fetch more.
- Leaking a child project's tasks to someone who lacks access to that child. A hidden UI control is not authorization; the API must enforce it.
- Requiring Redis or any new service. Live updates must still work on a single instance.
- Duplicating tasks into the parent, or any change that makes a task live in two places.

## Constraints (from the repo; see AGENTS.md)

- API owns authorization: use `requireWorkspacePermission` and the per-project access predicate (`apps/api/src/project-access/`). Tasks carry no workspace id; workspace scope is reached via the project.
- Schema in `apps/api/src/database/schema.ts` (`projectTable`); new migration generated with `pnpm --filter @kaneo/api db:generate` (next is 0068 in `apps/api/drizzle/`), SQL inspected. The new column must be nullable so existing rows need no backfill.
- Public contract: Zod schemas and OpenAPI accurate; run `pnpm openapi:check:fix` (`apps/docs/openapi.json` is committed).
- Web: fetchers in `apps/web/src/fetchers/`, TanStack Query hooks, static i18n keys in `i18n/en-US.json`, accessibility, and the reverse action (un-group).
- Realtime: events via `publishEvent()`; WebSocket delivery and cache updates must be checked; Redis fan-out stays optional.

## Current state (findings)

- No parent concept exists anywhere: `projectTable` (schema.ts ~L348) has no parent column.
- Board: `GET /api/task/tasks/{projectId}` (`apps/api/src/task/index.ts`, controller `task/controllers/get-tasks.ts`) is single-project and paginated; web query key `["tasks", projectId]`.
- Calendar (web) has no API of its own; it reuses the board query (`.../project/$projectId/calendar.tsx`, `components/calendar/`). It follows whatever the board data is.
- Realtime is one WebSocket per project (`apps/web/src/hooks/use-project-websocket.ts`, `apps/api/src/ws/index.ts`, `broadcastToProject`), patching `["tasks", projectId]`.
- Sidebar: `components/nav-projects.tsx` renders `useGetProjects` (key `["projects", workspaceId]`) with drag-reorder already (`useReorderProjects`, `position` column).
- Create dialog: `components/shared/modals/create-task-modal.tsx` already has a project picker, defaulting to the route project.
- Other entry points: mobile (own HTTP client, `apps/mobile/src/lib/api/endpoints.ts`), MCP (`packages/mcp/src/tools/register.ts`), typed client in `packages/libs` (follows API types automatically).

## Writer's calls (not agreed with the requester; please check)

1. (Resolved: one level, confirmed by the requester.)
2. A group view only shows children the viewer has access to; inaccessible children are silently omitted.
3. Archiving a parent does not archive its children; they become top-level (or stay visible) rather than disappearing.
4. Mobile and MCP are not updated in v1; they keep seeing a flat project list, and each project still works on its own.
5. Default scope on a parent is "Everything".
6. The "Own only / Everything" switch applies to every view that reads the project's tasks (Board, List, Calendar, Backlog, Gantt) and the choice carries across tabs, so switching tabs never silently changes what is shown.
7. Public projects: a public parent's anonymous view stays "own only". Children never appear in a public view, even if they are public themselves. This keeps private tasks from leaking.
8. Archived parent: children keep their link but show as top-level in the sidebar while the parent is archived; unarchiving restores the grouping, unless a project regrouped meanwhile would then sit two levels deep, in which case it stays top-level. Nesting rules ignore archived projects, so they match what the sidebar shows. Archived children are left out of the rollup, the same way archived projects are hidden elsewhere today.
9. A viewer who can see a child but not its parent sees the child as a normal top-level project. The API does not return the parent id for a parent the viewer cannot access, so it does not reveal that a hidden project exists.
10. In v1 the rolled-up ("Everything") view is read-only for drag-reorder, column actions and bulk selection, because the merged board is not a real board of any one project. Tasks can still be opened and edited, and every action uses the task's own project. "Own only" behaves exactly as a normal project does today. (Added after plan review; please check.)

## Left to the builder

- Data model details: column name, FK behavior on parent delete, how `position` interacts with children ordering.
- Rollup mechanism: an aggregate endpoint that checks access per child versus the client fetching each child; pagination and filter behavior for the rolled-up board.
- Realtime for rollups: how a parent view hears about children's task changes (e.g. subscribe to each accessible child) while keeping Redis optional.
- Whether the board columns/statuses of children with different columns are merged, and how.
- Drag-and-drop implementation inside the existing sidebar reorder.
- Tests: focused unit/integration tests for the access filtering, parent assignment rules (no cycles, one level), and the rollup query. Run only the test files touched.