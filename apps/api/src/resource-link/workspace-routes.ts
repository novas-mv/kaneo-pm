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
  reorderResourceLinksBody,
  updateResourceLinkBody,
  workspaceLinkParam,
  workspaceParam,
} from "./schema";

const readMiddleware = [
  workspaceAccess.fromParam(),
  requireWorkspacePermission({ workspace: ["read"] }),
];
const manageMiddleware = [
  workspaceAccess.fromParam(),
  requireWorkspacePermission({ workspace: ["manage_settings"] }),
];
const manageErrors = {
  401: errorResponse("Unauthorized"),
  403: errorResponse("Missing workspace:manage_settings permission"),
  404: errorResponse("Workspace not found"),
};

export const workspaceResourceLinkRoutes = apiRouter<
  BaseVariables & { workspaceId: string }
>()
  .openapi(
    createRoute({
      method: "get",
      operationId: "listWorkspaceResourceLinks",
      path: "/workspace/{workspaceId}",
      tags: ["Resource links"],
      summary: "List workspace resource links",
      description: "List the links pinned for a workspace, in display order",
      middleware: readMiddleware,
      request: { params: workspaceParam },
      responses: {
        200: jsonResponse("Pinned workspace links", resourceLinkListSchema),
        403: errorResponse("Missing workspace:read permission"),
        404: errorResponse("Workspace not found"),
      },
    }),
    async (c) =>
      c.json(
        await listResourceLinks({
          workspaceId: c.get("workspaceId"),
          projectId: null,
        }),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "post",
      operationId: "createWorkspaceResourceLink",
      path: "/workspace/{workspaceId}",
      tags: ["Resource links"],
      summary: "Pin a workspace resource link",
      description:
        "Add a link to the end of the workspace list. Only http and https URLs are accepted.",
      middleware: manageMiddleware,
      request: {
        params: workspaceParam,
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
          { workspaceId: c.get("workspaceId"), projectId: null },
          c.req.valid("json"),
        ),
        201,
      ),
  )
  .openapi(
    createRoute({
      method: "put",
      operationId: "reorderWorkspaceResourceLinks",
      path: "/workspace/{workspaceId}/order",
      tags: ["Resource links"],
      summary: "Reorder workspace resource links",
      description:
        "Set the display order of the listed links. Links not listed follow the listed ones in their current order.",
      middleware: manageMiddleware,
      request: {
        params: workspaceParam,
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
        404: errorResponse("Workspace or a listed link not found"),
      },
    }),
    async (c) =>
      c.json(
        await reorderResourceLinks(
          { workspaceId: c.get("workspaceId"), projectId: null },
          c.req.valid("json").ids,
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "patch",
      operationId: "updateWorkspaceResourceLink",
      path: "/workspace/{workspaceId}/{id}",
      tags: ["Resource links"],
      summary: "Update a workspace resource link",
      description:
        "Change a pinned workspace link. Send null to clear the description or emoji.",
      middleware: manageMiddleware,
      request: {
        params: workspaceLinkParam,
        body: {
          required: true,
          content: { "application/json": { schema: updateResourceLinkBody } },
        },
      },
      responses: {
        200: jsonResponse("Resource link updated", resourceLinkSchema),
        400: errorResponse("Invalid link"),
        ...manageErrors,
        404: errorResponse("Workspace or resource link not found"),
      },
    }),
    async (c) =>
      c.json(
        await updateResourceLink(
          { workspaceId: c.get("workspaceId"), projectId: null },
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: "delete",
      operationId: "deleteWorkspaceResourceLink",
      path: "/workspace/{workspaceId}/{id}",
      tags: ["Resource links"],
      summary: "Remove a workspace resource link",
      description: "Unpin a workspace link",
      middleware: manageMiddleware,
      request: { params: workspaceLinkParam },
      responses: {
        200: jsonResponse(
          "Resource link removed",
          z.object({ id: z.string() }),
        ),
        ...manageErrors,
        404: errorResponse("Workspace or resource link not found"),
      },
    }),
    async (c) =>
      c.json(
        await deleteResourceLink(
          { workspaceId: c.get("workspaceId"), projectId: null },
          c.req.valid("param").id,
        ),
        200,
      ),
  );
