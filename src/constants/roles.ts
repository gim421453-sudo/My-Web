export const GLOBAL_ROLES = {
  SYSTEM_OWNER: "system_owner",
  USER: "user",
} as const;

export const WORKSPACE_ROLES = {
  SUPER_MANAGER: "super_manager",
  MANAGER: "manager",
  TEACHER: "teacher",
  NORMAL: "normal",
  VIEWER: "viewer",
  PRINT_ACCOUNT: "print_account",
} as const;

export const USER_STATUSES = {
  ACTIVE: "active",
  PENDING: "pending",
  REJECTED: "rejected",
  DISABLED: "disabled",
} as const;

export type GlobalRole =
  (typeof GLOBAL_ROLES)[keyof typeof GLOBAL_ROLES];

export type WorkspaceRole =
  (typeof WORKSPACE_ROLES)[keyof typeof WORKSPACE_ROLES];

export type UserStatus =
  (typeof USER_STATUSES)[keyof typeof USER_STATUSES];

export const VALID_WORKSPACE_ROLES: WorkspaceRole[] = [
  WORKSPACE_ROLES.SUPER_MANAGER,
  WORKSPACE_ROLES.MANAGER,
  WORKSPACE_ROLES.TEACHER,
  WORKSPACE_ROLES.NORMAL,
  WORKSPACE_ROLES.VIEWER,
  WORKSPACE_ROLES.PRINT_ACCOUNT,
];

export function isWorkspaceRole(
  value: unknown,
): value is WorkspaceRole {
  return VALID_WORKSPACE_ROLES.includes(value as WorkspaceRole);
}