# Parent / Child Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a project have child projects (one level), shown nested in the sidebar, with the parent's board, list, backlog, calendar and Gantt rolling up its own and its children's tasks.

**Architecture:** A nullable `parentProjectId` on `projectTable` stores the grouping workspace-wide. The API validates and sets it through one route gated by `project:update`, and hides the parent id when the viewer cannot see the parent. The rollup is built on the web by fetching each accessible project's existing board (`["tasks", projectId]`) and merging them, so per-project access checks, pagination and WebSocket updates are reused unchanged and Redis stays optional.

**Tech Stack:** Hono + Zod OpenAPI + Drizzle/PostgreSQL (`apps/api`), React + TanStack Query + dnd-kit (`apps/web`), Vitest (`vp`).

**Spec:** `docs/superpowers/specs/2026-10-29-parent-child-projects-design.md`

## Global Constraints

- One level of nesting only: a child cannot have children, a parent cannot become a child.
- Grouping and ungrouping require `project: ["update"]`, the same as `PUT /project/reorder`.
- Existing projects stay top-level: the new column is nullable, no backfill.
- Opening a project with no children must not fetch or render anything extra.
- No Redis requirement, no new service; no task is copied or moved.
- Public project views never include children.
- A hidden parent's id never appears in any project response (list, get, reorder, update, archive, unarchive, set-parent).
- The rolled-up (`everything`) view is read-only for drag-reorder, column actions and bulk selection; task edits go through each task's own `projectId`. Merged data is never written into `useProjectStore` or the `["tasks", parentId]` cache.
- Scope switch values are exactly `own` and `everything`; default `everything`.
- User-facing copy goes in static i18n keys, `i18n/en-US.json` (repo root) as source; run `pnpm i18n:check` and regenerate `i18n/schema.json` as the root scripts require.
- Run only the test files a task touches; never the full suite while the dev server is up.
- Do not commit beyond the per-task commits below; do not push or open a PR unless asked.

## Review Focus

- Moving a project to another workspace (`move-project.ts`) must clear its `parentProjectId` and detach its children, or groups span workspaces.
- Deleting a parent must leave children as top-level projects, not delete or orphan them.
- A viewer with access to a child but not its parent must get `parentProjectId: null` for that child from the list endpoint (no existence leak).
- Making a project a child of a project that already is a child, or nesting a project that has children, is rejected with 400.
- A child archived or lost to access mid-session drops out of the rollup without breaking the parent board or navigating the user away.
- Dragging a card or using a column action on the rolled-up view must not write child tasks into the parent's board or send them to `reorderTasks` under the parent's `projectId`.
- Opening a parent with N children must not refetch every child board on window focus; sockets carry updates.

---

### Task 1: Schema column, migration, response schema

**Files:**
- Modify: `apps/api/src/database/schema.ts` (`projectTable`, ~L348-386)
- Create: `apps/api/drizzle/0068_*.sql` (generated)
- Modify: `apps/api/src/project/response.ts`

**Interfaces:**
- Produces: `projectTable.parentProjectId: string | null`; `projectSchema` (and list/get responses) include `parentProjectId: string | null`.

- [ ] **Step 1: Add `parentProjectId: text("parent_project_id")` to `projectTable`**, referencing `projectTable.id` with `onDelete: "set null"`, plus index `project_parentProjectId_idx` on it. A self-reference needs the `AnyPgColumn` return-type form.
- [ ] **Step 2: Generate the migration** with `pnpm --filter @kaneo/api db:generate`. Inspect the SQL: it must only add one nullable column, the FK and the index. No data statements.
- [ ] **Step 3: Add `parentProjectId` to the project response schema** in `apps/api/src/project/response.ts` as `z.string().nullable()`.
- [ ] **Step 4: Typecheck** `pnpm --filter @kaneo/api typecheck`; expected: passes.
- [ ] **Step 5: Commit** `feat(api): add parent_project_id to projects`.

### Task 2: Set-parent route and rules

**Files:**
- Create: `apps/api/src/project/controllers/set-project-parent.ts`
- Modify: `apps/api/src/project/index.ts` (new route next to `reorderProjectsRoute`, ~L162), `apps/api/src/project/schema.ts`
- Modify: `apps/api/src/project/controllers/move-project.ts`
- Test: `tests/api-integration/project-parent.test.ts` (new; rules, permission, access, workspace), `tests/api-integration/project-move.test.ts` (existing; add the move case)

**Interfaces:**
- Produces: `setProjectParent(projectId: string, parentProjectId: string | null, userId: string): Promise<Project>` (default export of `set-project-parent.ts`); route `PUT /api/project/{id}/parent`, operationId `setProjectParent`, body `setProjectParentBody = z.object({ parentProjectId: z.string().nullable() })`, middleware `workspaceAccess.fromProject("id")` + `requireWorkspacePermission({ project: ["update"] })`.

- [ ] **Step 1: Write failing integration tests** (the mocked unit style of `tests/api/project/delete-project.test.ts` cannot exercise workspace and nesting rules) named: `sets a parent`, `clears a parent with null`, `rejects itself as parent (400)`, `rejects a parent that is already a child (400)`, `rejects nesting a project that has children (400)`, `rejects a parent in another workspace (400)`, `rejects when user lacks access to either project (403)`.
- [ ] **Step 2: Run** the file; expected: FAIL (module missing).
- [ ] **Step 3: Implement `setProjectParent`**: `assertProjectAccess(userId, parentProjectId ? [projectId, parentProjectId] : projectId)` (its signature takes `string | readonly string[]`, no nulls; a nonexistent parent id is skipped there, so return 404 from the transaction load), load both rows in a transaction holding the same workspace advisory lock as `reorder-projects.ts` (key 1524), enforce the four rules above with `HTTPException(400, { message })`, update, return the row.
- [ ] **Step 4: Register the route** with `createRoute`, Zod body, 200/400/403/404 responses described in OpenAPI. After the update, `publishEvent("project.updated", ...)` for the project, its new parent and its previous parent, copying how the background handlers near `apps/api/src/project/index.ts:687` publish (the update route itself does not publish). The web `PROJECT_UPDATED` handler already invalidates `["projects"]`, so open parent views and other members' sockets refresh; members with no socket on those projects rely on the sidebar's existing 30s poll (accepted; children detached by a delete get no event).
- [ ] **Step 5: In `move-project.ts`**, inside its transaction set `parentProjectId = null` on the moved project and on every project whose `parentProjectId` is the moved project. Add test `move clears parent link and detaches children`.
- [ ] **Step 6: Integration test** `viewer without project:update gets 403 on PUT /project/{id}/parent`; follow `tests/api-integration/README.md` for how to run it.
- [ ] **Step 7: Run `pnpm openapi:check:fix`** and stage `apps/docs/openapi.json`, so `tests/api-integration/openapi.test.ts` stays green.
- [ ] **Step 8: Run** only the touched test files; expected: PASS.
- [ ] **Step 9: Commit** `feat(api): set a project's parent`.

### Task 3: Hide unreachable parent ids everywhere

**Files:**
- Create: `apps/api/src/project/redact-parent-project-id.ts`
- Modify: `apps/api/src/project/controllers/get-projects.ts`, `get-project.ts`, and the `toPublicProject` paths behind the reorder, update, archive, unarchive and set-parent responses (`apps/api/src/project/index.ts` ~L536-570)
- Test: add cases to `tests/api-integration/project-list.test.ts` and a get-project case

**Interfaces:**
- Consumes: `projectTable.parentProjectId` (Task 1).
- Produces: `redactParentProjectId<T extends { parentProjectId: string | null }>(project: T, visibleProjectIds: ReadonlySet<string>): T` (nulls the id unless in the set); `getProjects(...)` rows redacted against the returned set; single-project responses redacted by checking the parent with `canAccessProject` and that it is not archived.

- [ ] **Step 1: Write failing tests**: `child of an inaccessible parent comes back with parentProjectId null`, `child of an archived parent comes back with parentProjectId null when archived are excluded`, `child keeps parentProjectId when parent is listed`.
- [ ] **Step 2: Run**; expected: FAIL.
- [ ] **Step 3: Implement the helper and apply it** in `getProjects`' final `projects.map` (no extra query) and in every single-project response listed above. Add test `GET /project/{id} returns parentProjectId null for a hidden parent`.
- [ ] **Step 4: Run** the touched test files; expected: PASS.
- [ ] **Step 5: Run `pnpm openapi:check:fix`** if any schema text changed.
- [ ] **Step 6: Commit** `feat(api): never expose a hidden parent project id`.

### Task 4: Sidebar tree and drag-to-group

**Files:**
- Create: `apps/web/src/lib/project-tree.ts` (+ `project-tree.test.ts`)
- Create: `apps/web/src/fetchers/project/set-project-parent.ts`
- Create: `apps/web/src/hooks/mutations/project/use-set-project-parent.ts`
- Modify: `apps/web/src/components/nav-projects.tsx` (render and drag handling)
- Modify: `i18n/en-US.json` (repo root; keys under `workspace:projects.*` and `navigation:*` following neighbors)

**Interfaces:**
- Produces: `buildProjectTree(projects: ProjectWithTasks[]): Array<{ project: ProjectWithTasks; children: ProjectWithTasks[] }>` (preserves API order; a child whose parent is not in the list becomes a top-level entry); `useSetProjectParent()` returning `{ setParent(workspaceId: string, projectId: string, parentProjectId: string | null, options?): void }` which optimistically updates `["projects", workspaceId]`, rolls back on error and invalidates on settle (mirror `use-reorder-projects.ts`).

- [ ] **Step 1: Write failing tests** for `buildProjectTree`: `nests children under their parent in list order`, `orphaned child is top-level`, `ignores grandchildren links defensively (rendered top-level)`.
- [ ] **Step 2: Run**; expected: FAIL. Implement; run; expected: PASS.
- [ ] **Step 3: Implement the fetcher and mutation hook** against the generated `client.project[":id"].parent.$put`.
- [ ] **Step 4: Render children indented** under a parent row (left rule, as in the approved mockup option C) in `nav-projects.tsx`. Children still use `SortableProjectItem`; reorder among siblings keeps using `useReorderProjects` with the full ordered list.
- [ ] **Step 5: Nest by dropping onto the middle of a top-level row** via a droppable id `nest:{projectId}` per eligible row; `handleDragEnd` calls `setParent(...)` when `over.id` starts with `nest:`. Rows are ineligible (no nest zone) when the target is itself a child or the dragged project has children. Dropping a child onto a top-level reorder slot clears its parent. Gate all of it on the existing `canReorder`.
- [ ] **Step 6: Add a "Remove from group" item** to the project row dropdown (child rows only, `canReorder` only) calling `setParent(..., null)`, so ungrouping works without dragging.
- [ ] **Step 7: Run** the new test file and `pnpm --filter @kaneo/web typecheck`; expected: PASS.
- [ ] **Step 8: Browser check** in the dev server: drag a project onto another, it nests; "Remove from group" restores it; reload keeps the state. Report what was seen.
- [ ] **Step 9: Commit** `feat(web): nest projects in the sidebar`.

### Task 5: Read-only rollup for board, list, backlog, calendar, Gantt

**Files:**
- Create: `apps/web/src/lib/group-board.ts` (+ `group-board.test.ts`)
- Create: `apps/web/src/hooks/queries/task/board-query-options.ts`; modify `use-get-tasks.ts` to use it
- Create: `apps/web/src/hooks/queries/task/use-get-group-tasks.ts` (+ test, style of `use-get-tasks.test.tsx`)
- Create: `apps/web/src/hooks/use-group-scope.ts`, `apps/web/src/components/project/group-scope-switch.tsx`, `apps/web/src/components/project/child-project-socket.tsx`
- Modify: `apps/web/src/hooks/use-project-websocket.ts` (access-revoked behavior only)
- Modify: the four route files `board.tsx` (also renders list mode), `backlog.tsx`, `calendar.tsx`, `gantt.tsx` under `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/`; the kanban board (`components/kanban-board/index.tsx`, `select-reorder-board.ts`), task card/calendar bar/Gantt row for the project tag
- Modify: `i18n/en-US.json`

**Interfaces:**
- Consumes: `buildProjectTree` (Task 4), existing `useGetTasks(projectId)`.
- Produces:
  - `boardQueryOptions(queryClient: QueryClient, projectId: string, onProgress?)`: the one `queryKey: ["tasks", projectId]` / `queryFn` currently inline in `use-get-tasks.ts` (including `markBoardCacheChanged` and the invalidate-race handling). `useGetTasks` and the rollup both use it; no second fetch function for that key.
  - `mergeGroupBoards(parent: ProjectWithTasks, children: ProjectWithTasks[]): ProjectWithTasks` (columns merged by column `name`, unmatched child columns appended after the parent's; `plannedTasks` and `archivedTasks` concatenated; each task keeps its own `projectId`).
  - `useGroupScope(parentId: string): ["own" | "everything", (scope: "own" | "everything") => void]` (default `"everything"`, per parent, `localStorage` in try/catch, shared by all tabs of the parent).
  - `useGetGroupTasks(projectId: string): { data, isLoading, isRollup: boolean, ... }` same shape as `useGetTasks` plus `isRollup`; `data` is the merged board only when scope is `everything` and the project has accessible, non-archived children, otherwise the project's own board.
  - `ChildProjectSocket({ projectId }: { projectId: string })`: renders nothing, calls `useProjectWebSocket(projectId, { rollupChild: true })`.

- [ ] **Step 1: Read `board.tsx`, `kanban-board/index.tsx` and `select-reorder-board.ts`** and decide how merged data reaches the views without entering `useProjectStore`. Write the decision as a short comment at the top of `use-get-group-tasks.ts`. The store keeps the parent's own board; views render the merged board read-only.
- [ ] **Step 2: Write failing tests** for `mergeGroupBoards`: `merges same-named columns and keeps task order parent-first`, `appends a child column with no match`, `concatenates planned and archived tasks`, `with no children returns the parent board unchanged`. Run; expected FAIL. Implement; run; expected PASS.
- [ ] **Step 3: Extract `boardQueryOptions`** from `use-get-tasks.ts` and keep `use-get-tasks.test.tsx` green unchanged.
- [ ] **Step 4: Write failing hook tests** for `useGetGroupTasks`: `scope own returns only the parent board`, `everything merges children boards`, `a child query error drops that child and the parent board still renders`, `project without children issues exactly one board query`, `child queries do not refetch on window focus`. Implement with `useQueries` over `boardQueryOptions` for accessible, non-archived children from `["projects", workspaceId]` with `refetchOnWindowFocus: false`; the parent's own board renders first and merges children as they resolve.
- [ ] **Step 5: Add `rollupChild` option to `useProjectWebSocket`**: when set, an access-revoked close invalidates `["projects", workspaceId]` instead of navigating to the workspace page. Add test `rollup child socket does not navigate on access revoked`. Render one `ChildProjectSocket` per rolled-up child from the parent's view.
- [ ] **Step 6: Switch the four routes** to `useGetGroupTasks`; show `GroupScopeSwitch` in the project header only when the project has children.
- [ ] **Step 7: Make the rollup read-only**: when `isRollup`, disable card drag, column add/rename/delete and bulk selection; task card menus and detail edits use `task.projectId`, never the open project's id. Add tests `drag is disabled on a rolled-up board` and `task card actions use the task's own projectId`.
- [ ] **Step 8: Add a project-name tag** on task cards, calendar bars and Gantt rows when `task.projectId` differs from the open project.
- [ ] **Step 9: Create-task dialog**: keep the existing picker in `components/shared/modals/create-task-modal.tsx`, preselect the open project, confirm children appear. `useCreateTask` already invalidates `["tasks", variables.projectId]`, which refreshes the rollup; add a test only if that proves false.
- [ ] **Step 10: Public project routes untouched**; add test `public project view issues no child queries`.
- [ ] **Step 11: Run** the touched test files, `pnpm --filter @kaneo/web typecheck`, `pnpm i18n:check`; expected: PASS.
- [ ] **Step 12: Browser check** in the dev server: open a parent, child tasks appear tagged; drag is disabled on the merged board and works under "Own only"; a task change in a child appears without reload; scope persists across tabs; revoking a child's access does not navigate away. Report what was seen.
- [ ] **Step 13: Commit** `feat(web): roll up child project tasks on parent views`.

### Task 6: Contract, copy and final check

**Files:**
- Modify: `apps/docs/openapi.json` (generated), docs page for projects if one exists under `apps/docs`

- [ ] **Step 1: Run `pnpm openapi:check:fix`**; expected: no diff after a second run.
- [ ] **Step 2: Run `pnpm exec vp check --fix`** and inspect formatting changes.
- [ ] **Step 3: Run `pnpm typecheck`** and `pnpm i18n:check`; expected: passes.
- [ ] **Step 4: Add a short docs note** on grouping projects where project docs live under `apps/docs`.
- [ ] **Step 5: Commit** `docs: describe project grouping`.
