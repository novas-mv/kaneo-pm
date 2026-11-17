import { requireEntitlement } from "../billing/require-entitlement-middleware";
import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import applyTaskTemplate from "./controllers/apply-task-template";
import createTaskTemplate from "./controllers/create-task-template";
import deleteTaskTemplate from "./controllers/delete-task-template";
import getTaskTemplates from "./controllers/get-task-templates";
import updateTaskTemplate from "./controllers/update-task-template";
import {
  appliedTaskTemplateSchema,
  taskTemplateListSchema,
  taskTemplateSchema,
} from "./response";
import {
  applyTaskTemplateBody,
  createTaskTemplateBody,
  projectIdParam,
  templateIdParam,
  updateTaskTemplateBody,
} from "./schema";

const tags = ["Task Templates"];

const listTaskTemplatesRoute = createRoute({
  method: "get",
  operationId: "listTaskTemplates",
  path: "/project/{projectId}",
  tags,
  summary: "List task templates",
  description:
    "Get a project's task templates, sorted by name. A template is a list of steps, each due a number of days before or after a post date.",
  middleware: [
    workspaceAccess.fromProject("projectId"),
    requireWorkspacePermission({ project: ["read"] }),
  ] as const,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse("The project's task templates", taskTemplateListSchema),
    403: errorResponse("No access to the project, or missing read permission"),
    404: errorResponse("Project not found"),
  },
});

const createTaskTemplateRoute = createRoute({
  method: "post",
  operationId: "createTaskTemplate",
  path: "/project/{projectId}",
  tags,
  summary: "Create task template",
  description: "Add a task template to a project.",
  middleware: [
    workspaceAccess.fromProject("projectId"),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: {
    params: projectIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: createTaskTemplateBody } },
    },
  },
  responses: {
    200: jsonResponse("The created template", taskTemplateSchema),
    400: errorResponse("Invalid body"),
    403: errorResponse(
      "No access to the project, or missing project:update permission",
    ),
    404: errorResponse("Project not found"),
  },
});

const updateTaskTemplateRoute = createRoute({
  method: "patch",
  operationId: "updateTaskTemplate",
  path: "/{templateId}",
  tags,
  summary: "Update task template",
  description:
    "Rename a template, replace its steps, or both. Tasks already created from it are not changed.",
  middleware: [
    workspaceAccess.fromTaskTemplate("templateId"),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: {
    params: templateIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateTaskTemplateBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated template", taskTemplateSchema),
    400: errorResponse("Invalid body"),
    403: errorResponse(
      "No access to the project, or missing project:update permission",
    ),
    404: errorResponse("Task template not found"),
  },
});

const deleteTaskTemplateRoute = createRoute({
  method: "delete",
  operationId: "deleteTaskTemplate",
  path: "/{templateId}",
  tags,
  summary: "Delete task template",
  description:
    "Delete a template. Tasks already created from it are kept. Returns the deleted template.",
  middleware: [
    workspaceAccess.fromTaskTemplate("templateId"),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: { params: templateIdParam },
  responses: {
    200: jsonResponse("The deleted template", taskTemplateSchema),
    403: errorResponse(
      "No access to the project, or missing project:update permission",
    ),
    404: errorResponse("Task template not found"),
  },
});

const applyTaskTemplateRoute = createRoute({
  method: "post",
  operationId: "applyTaskTemplate",
  path: "/{templateId}/apply",
  tags,
  summary: "Apply task template",
  description:
    "Create a parent task due on `postDate` and one task per step, each due `offsetDays` from `postDate` at the same time of day and linked to the parent as a subtask. Tasks are created through the normal task path, so numbering, activity, notifications, integrations and live updates behave as for hand-made tasks. The tasks are created one after another, not atomically.",
  middleware: [
    workspaceAccess.fromTaskTemplate("templateId"),
    requireWorkspacePermission({ task: ["create"] }),
    requireEntitlement,
  ] as const,
  request: {
    params: templateIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: applyTaskTemplateBody } },
    },
  },
  responses: {
    200: jsonResponse(
      "The parent task and the step tasks",
      appliedTaskTemplateSchema,
    ),
    400: errorResponse(
      "Invalid body, unknown status, or the project requires custom fields",
    ),
    403: errorResponse(
      "No access to the project, or missing task:create permission",
    ),
    404: errorResponse("Task template not found"),
  },
});

const taskTemplate = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(listTaskTemplatesRoute, async (c) =>
    c.json(await getTaskTemplates(c.req.valid("param").projectId), 200),
  )
  .openapi(createTaskTemplateRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    const { name, steps } = c.req.valid("json");
    return c.json(await createTaskTemplate({ projectId, name, steps }), 200);
  })
  .openapi(updateTaskTemplateRoute, async (c) =>
    c.json(
      await updateTaskTemplate(
        c.req.valid("param").templateId,
        c.req.valid("json"),
      ),
      200,
    ),
  )
  .openapi(deleteTaskTemplateRoute, async (c) =>
    c.json(await deleteTaskTemplate(c.req.valid("param").templateId), 200),
  )
  .openapi(applyTaskTemplateRoute, async (c) => {
    const { title, postDate, status } = c.req.valid("json");
    return c.json(
      await applyTaskTemplate({
        templateId: c.req.valid("param").templateId,
        title,
        postDate: new Date(postDate),
        status,
        userId: c.get("userId"),
        workspaceId: c.get("workspaceId"),
      }),
      200,
    );
  });

export default taskTemplate;
