import { apiRouter } from "../openapi";
import { projectResourceLinkRoutes } from "./project-routes";
import { workspaceResourceLinkRoutes } from "./workspace-routes";

const resourceLink = apiRouter()
  .route("/", workspaceResourceLinkRoutes)
  .route("/", projectResourceLinkRoutes);

export default resourceLink;
