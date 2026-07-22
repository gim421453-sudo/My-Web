import type { WorkspaceRole } from "../permissions/roles";

export type WorkspaceMemberStatus =
  | "active"
  | "accepted"
  | "pending"
  | "disabled"
  | "invited"
  | "rejected";

export interface WorkspaceDocument {
  id: string;
  name?: string;
  title?: string;
  ownerUid?: string;
  status?: string;
  active?: boolean;
  disabled?: boolean | string;
  deleted?: boolean;
  archived?: boolean;
}

export interface WorkspaceMembership {
  uid: string;
  role: WorkspaceRole | string;
  status: WorkspaceMemberStatus | string;
  joinedAt?: unknown;
  updatedAt?: unknown;
}

export interface LegacyMembershipDiagnostic {
  source: "workspace_members" | "workspaceMembers";
  exists: boolean;
  role?: unknown;
  status?: unknown;
}

export interface WorkspaceLookupResult {
  exists: boolean;
  workspace: WorkspaceDocument | null;
}

export interface MembershipLookupResult {
  exists: boolean;
  membership: WorkspaceMembership | null;
}

export function isWorkspaceDeletedLike(workspace: WorkspaceDocument): boolean {
  return workspace.deleted === true ||
    workspace.archived === true ||
    workspace.disabled === true ||
    workspace.disabled === "true" ||
    workspace.active === false ||
    ["deleted", "archived", "disabled", "suspended"].includes(String(workspace.status || ""));
}
