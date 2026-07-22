import type { AppSession } from "../auth/authTypes";
import { ALL_PERMISSIONS, WORKSPACE_ROLE_PERMISSIONS } from "./permissions";
import type { Permission } from "./permissionTypes";
import {
  WORKSPACE_ROLES,
  WORKSPACE_ROLE_RANK,
  type WorkspaceRole,
} from "./roles";

export function hasPermission(
  session: AppSession | null,
  permission: Permission,
): boolean {
  if (!session || !session.isAuthenticated || session.status !== "active") {
    return false;
  }

  if (session.isSystemOwner) {
    return ALL_PERMISSIONS.includes(permission);
  }

  if (!session.currentWorkspaceRole) {
    return false;
  }

  return WORKSPACE_ROLE_PERMISSIONS[session.currentWorkspaceRole].includes(permission);
}

export function canManageWorkspaceRole(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
): boolean {
  if (actorRole === WORKSPACE_ROLES.SUPER_MANAGER) {
    return targetRole !== WORKSPACE_ROLES.SUPER_MANAGER;
  }

  if (actorRole === WORKSPACE_ROLES.MANAGER) {
    const managerAssignableRoles: readonly WorkspaceRole[] = [
      WORKSPACE_ROLES.TEACHER,
      WORKSPACE_ROLES.NORMAL,
      WORKSPACE_ROLES.VIEWER,
      WORKSPACE_ROLES.PRINT_ACCOUNT,
    ];

    return managerAssignableRoles.includes(targetRole);
  }

  return false;
}

export function canManageWorkspaceRoleChange(params: {
  actorUid: string;
  targetUid: string;
  actorRole: WorkspaceRole;
  targetRole: WorkspaceRole;
}): boolean {
  if (params.actorUid === params.targetUid) {
    return false;
  }

  return canManageWorkspaceRole(params.actorRole, params.targetRole);
}

export function compareWorkspaceRoleRank(
  left: WorkspaceRole,
  right: WorkspaceRole,
): number {
  return WORKSPACE_ROLE_RANK[left] - WORKSPACE_ROLE_RANK[right];
}
