import {
  GLOBAL_ROLES,
  WORKSPACE_ROLES,
  type WorkspaceRole,
} from "../constants/roles";

import type { AppSession } from "../types/auth";

export function isSystemOwner(
  session: AppSession | null,
): boolean {
  return (
    session?.globalRole ===
    GLOBAL_ROLES.SYSTEM_OWNER
  );
}

export function hasWorkspaceRole(
  session: AppSession | null,
  allowedRoles: WorkspaceRole[],
): boolean {
  if (!session?.currentRole) {
    return false;
  }

  return allowedRoles.includes(
    session.currentRole,
  );
}

export function canManageWorkspace(
  session: AppSession | null,
): boolean {
  if (isSystemOwner(session)) {
    return true;
  }

  return hasWorkspaceRole(session, [
    WORKSPACE_ROLES.SUPER_MANAGER,
    WORKSPACE_ROLES.MANAGER,
  ]);
}

export function canManageMembers(
  session: AppSession | null,
): boolean {
  return canManageWorkspace(session);
}

export function canEditLessons(
  session: AppSession | null,
): boolean {
  if (isSystemOwner(session)) {
    return true;
  }

  return hasWorkspaceRole(session, [
    WORKSPACE_ROLES.SUPER_MANAGER,
    WORKSPACE_ROLES.MANAGER,
    WORKSPACE_ROLES.TEACHER,
  ]);
}

export function canUseNormalFeatures(
  session: AppSession | null,
): boolean {
  if (isSystemOwner(session)) {
    return true;
  }

  return hasWorkspaceRole(session, [
    WORKSPACE_ROLES.SUPER_MANAGER,
    WORKSPACE_ROLES.MANAGER,
    WORKSPACE_ROLES.TEACHER,
    WORKSPACE_ROLES.NORMAL,
  ]);
}

export function isReadOnlyAccount(
  session: AppSession | null,
): boolean {
  return hasWorkspaceRole(session, [
    WORKSPACE_ROLES.VIEWER,
    WORKSPACE_ROLES.PRINT_ACCOUNT,
  ]);
}