import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import createResourceLink from "./controllers/create-resource-link";
import deleteResourceLink from "./controllers/delete-resource-link";
import listResourceLinks from "./controllers/list-resource-links";
import reorderResourceLinks from "./controllers/reorder-resource-links";
import updateResourceLink from "./controllers/update-resource-link";
import { resourceLinkListSchema, resourceLinkSchema } from "./response";
import {
  createResourceLinkBody,
  projectLinkParam,
  projectParam,
  reorderResourceLinksBody,
  updateResourceLinkBody,
} from "./schema";

// fromProject also rejects members who are limited to other projects.
const readMiddleware = [
  workspaceAccess.fromProject("projectId"),
  requireWorkspacePermission({ project: ["read"] }),
];
const manageMiddleware = [
  workspaceAccess.fromProject("projectId"),
  requireWorkspacePermission({ project: ["update"] }),
];
const manageErrors = {
  401: errorResponse("Unauthorized"),
  403: errorResponse("No access to the project, or missing project:update"),
  404: errorResponse("Project not found"),
};

export const projectResourceLinkRoutes = apiRouter<
  BaseVariables & { workspaceId: string }
>()
  .openapi(
    createRoute({
      method: "get",
      operationId: "listProjectResourceLinks",
      path: "/project/{projectId}",
      tags: ["Resource links"],
      summary: "List project resource links",
      description: "List the links pinned for a project, in display order",
      middleware: readMiddleware,
      request: { params: projectParam },
      responses: {
        200: jsonResponse("Pinned project links", resourceLinkListSchema),
        403: errorResponse("No access to the project, or missing read access"),
        404: errorResponse("Project not found"),
      },
    }),
    async (c) =>
      c.json(
        await listResourceLinks({
          workspaceId: c.get("workspaceId"),
          projectId: c.req.valid("param").projectId,
        }),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      operationId: "createProjectResourceLink",
      path: "/project/{projectId}",
      tags: ["Resource links"],
      summary: "Pin a project resource link",
      description:
        "Add a link to the end of the project list. Only http and https URLs are accepted.",
      middleware: manageMiddleware,
      request: {
        params: projectParam,
        body: {
          required: true,
          content: { "application/json": { schema: createResourceLinkBody } },
        },
      },
      responses: {
        201: jsonResponse("Resource link created", resourceLinkSchema),
        400: errorResponse("Invalid link, or the list is full"),
        ...manageErrors,
      },
    }),
    async (c) =>
      c.json(
        await createResourceLink(
          {
            workspaceId: c.get("workspaceId"),
            projectId: c.req.valid("param").projectId,
          },
          c.req.valid("json"),
        ),
        201,
      ),
  )
  .openapi(
    createRoute({
      method: "put",
      operationId: "reorderProjectResourceLinks",
      path: "/project/{projectId}/order",
      tags: ["Resource links"],
      summary: "Reorder project resource links",
      description:
        "Set the display order of the listed links. Links not listed follow the listed ones in their current order.",
      middleware: manageMiddleware,
      request: {
        params: projectParam,
        body: {
          required: true,
          content: {
            "application/json": { schema: reorderResourceLinksBody },
          },
        },
      },
      responses: {
        200: jsonResponse("Links in their new order", resourceLinkListSchema),
        400: errorResponse("Duplicate link IDs"),
        ...manageErrors,
        404: errorResponse("Project or a listed link not found"),
      },
    }),
    async (c) =>
      c.json(
        await reorderResourceLinks(
          {
            workspaceId: c.get("workspaceId"),
            projectId: c.req.valid("param").projectId,
          },
          c.req.valid("json").ids,
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "patch",
      operationId: "updateProjectResourceLink",
      path: "/project/{projectId}/{id}",
      tags: ["Resource links"],
      summary: "Update a project resource link",
      description:
        "Change a pinned project link. Send null to clear the description or emoji.",
      middleware: manageMiddleware,
      request: {
        params: projectLinkParam,
        body: {
          required: true,
          content: { "application/json": { schema: updateResourceLinkBody } },
        },
      },
      responses: {
        200: jsonResponse("Resource link updated", resourceLinkSchema),
        400: errorResponse("Invalid link"),
        ...manageErrors,
        404: errorResponse("Project or resource link not found"),
      },
    }),
    async (c) => {
      const { projectId, id } = c.req.valid("param");
      return c.json(
        await updateResourceLink(
          { workspaceId: c.get("workspaceId"), projectId },
          id,
          c.req.valid("json"),
        ),
        200,
      );
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      operationId: "deleteProjectResourceLink",
      path: "/project/{projectId}/{id}",
      tags: ["Resource links"],
      summary: "Remove a project resource link",
      description: "Unpin a project link",
      middleware: manageMiddleware,
      request: { params: projectLinkParam },
      responses: {
        200: jsonResponse(
          "Resource link removed",
          z.object({ id: z.string() }),
        ),
        ...manageErrors,
        404: errorResponse("Project or resource link not found"),
      },
    }),
    async (c) => {
      const { projectId, id } = c.req.valid("param");
      return c.json(
        await deleteResourceLink(
          { workspaceId: c.get("workspaceId"), projectId },
          id,
        ),
        200,
      );
    },
  );
