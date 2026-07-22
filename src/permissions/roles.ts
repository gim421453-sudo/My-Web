export const GLOBAL_ROLES = {
  SYSTEM_OWNER: "system_owner",
  USER: "user",
} as const;

export type GlobalRole =
  (typeof GLOBAL_ROLES)[keyof typeof GLOBAL_ROLES];

export const WORKSPACE_ROLES = {
  SUPER_MANAGER: "super_manager",
  MANAGER: "manager",
  TEACHER: "teacher",
  NORMAL: "normal",
  VIEWER: "viewer",
  PRINT_ACCOUNT: "print_account",
} as const;

export type WorkspaceRole =
  (typeof WORKSPACE_ROLES)[keyof typeof WORKSPACE_ROLES];

export const VALID_GLOBAL_ROLES: readonly GlobalRole[] = [
  GLOBAL_ROLES.SYSTEM_OWNER,
  GLOBAL_ROLES.USER,
];

export const VALID_WORKSPACE_ROLES: readonly WorkspaceRole[] = [
  WORKSPACE_ROLES.SUPER_MANAGER,
  WORKSPACE_ROLES.MANAGER,
  WORKSPACE_ROLES.TEACHER,
  WORKSPACE_ROLES.NORMAL,
  WORKSPACE_ROLES.VIEWER,
  WORKSPACE_ROLES.PRINT_ACCOUNT,
];

export const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  [WORKSPACE_ROLES.SUPER_MANAGER]: 50,
  [WORKSPACE_ROLES.MANAGER]: 40,
  [WORKSPACE_ROLES.TEACHER]: 30,
  [WORKSPACE_ROLES.NORMAL]: 20,
  [WORKSPACE_ROLES.VIEWER]: 10,
  [WORKSPACE_ROLES.PRINT_ACCOUNT]: 10,
};

export function isGlobalRole(value: unknown): value is GlobalRole {
  return VALID_GLOBAL_ROLES.includes(value as GlobalRole);
}

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return VALID_WORKSPACE_ROLES.includes(value as WorkspaceRole);
}

