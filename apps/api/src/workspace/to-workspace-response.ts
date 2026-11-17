import { resolveWorkspaceFeatures } from "@kaneo/permissions";
import { workspaceTable } from "../database/schema";
import { resolveWorkspaceDescription } from "./resolve-workspace-description";

export const workspaceColumns = {
  id: workspaceTable.id,
  name: workspaceTable.name,
  slug: workspaceTable.slug,
  logo: workspaceTable.logo,
  description: workspaceTable.description,
  metadata: workspaceTable.metadata,
  features: workspaceTable.features,
  createdAt: workspaceTable.createdAt,
};

export function toWorkspaceResponse(row: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  metadata: string | null;
  features: unknown;
  createdAt: Date;
  role: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo,
    description: resolveWorkspaceDescription(row),
    features: resolveWorkspaceFeatures(row.features),
    createdAt: row.createdAt,
    role: row.role,
  };
}
