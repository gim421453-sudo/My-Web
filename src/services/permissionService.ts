import {
  GLOBAL_ROLES,
  WORKSPACE_ROLES,
  type GlobalRole,
  type WorkspaceRole,
} from "../constants/roles";

/**
 * 화면 권한 판정에 사용할 수 있는 역할입니다.
 *
 * system_owner:
 *   서비스 전체 전역 역할
 *
 * 나머지:
 *   현재 워크스페이스 멤버 역할
 */
export type PermissionRole =
  | typeof GLOBAL_ROLES.SYSTEM_OWNER
  | WorkspaceRole;

/**
 * 워크스페이스 역할별 접근 가능 메뉴입니다.
 *
 * system_owner는 워크스페이스 역할이 아니므로
 * 이 객체에 포함하지 않습니다.
 * canAccessMenu()에서 별도로 전체 허용합니다.
 */
export const roleMenus: Record<
  WorkspaceRole,
  readonly string[]
> = {
  [WORKSPACE_ROLES.SUPER_MANAGER]: [
    "*",
  ],

  [WORKSPACE_ROLES.MANAGER]: [
    "dashboard",
    "personal",
    "schedules",
    "notices",
    "subjects",
    "teachers",
    "materials",
    "assignments",
    "exams",
    "portfolios",
    "penalties",
    "people",
    "friendAwards",
    "timetable",
    "print",
    "site",
    "admin",
    "requests",
    "meals",
    "budget",
    "clubs",
    "attendance",
    "accounts",
    "examSchedules",
    "records",
    "lessons",
    "projects",
    "system",
    "mealApplications",
    "afterschool",
    "academic",
    "specialLectures",
    "homeLetters",
    "schoolNotices",
  ],

  [WORKSPACE_ROLES.TEACHER]: [
    "dashboard",
    "personal",
    "schedules",
    "notices",
    "subjects",
    "teachers",
    "materials",
    "assignments",
    "exams",
    "timetable",
    "requests",
    "attendance",
    "examSchedules",
    "records",
    "lessons",
  ],

  [WORKSPACE_ROLES.NORMAL]: [
    "dashboard",
    "personal",
    "schedules",
    "notices",
    "subjects",
    "materials",
    "assignments",
    "exams",
    "portfolios",
    "timetable",
    "requests",
    "meals",
    "attendance",
    "examSchedules",
    "records",
    "lessons",
  ],

  [WORKSPACE_ROLES.VIEWER]: [
    "dashboard",
    "personal",
    "schedules",
    "notices",
    "subjects",
    "materials",
    "assignments",
    "exams",
    "portfolios",
    "timetable",
    "meals",
    "examSchedules",
    "records",
  ],

  [WORKSPACE_ROLES.PRINT_ACCOUNT]: [
    "print",
    "materials",
    "examSchedules",
  ],
};

/**
 * 전역 역할과 현재 워크스페이스 역할을
 * 하나의 화면 권한 역할로 변환합니다.
 */
export function resolvePermissionRole(
  globalRole: GlobalRole | null | undefined,
  currentRole: WorkspaceRole | null | undefined,
): PermissionRole | null {
  if (
    globalRole ===
    GLOBAL_ROLES.SYSTEM_OWNER
  ) {
    return GLOBAL_ROLES.SYSTEM_OWNER;
  }

  return currentRole ?? null;
}

/**
 * 특정 메뉴 접근 가능 여부를 확인합니다.
 */
export function canAccessMenu(
  role: PermissionRole | null | undefined,
  menuKey: string,
): boolean {
  if (
    role ===
    GLOBAL_ROLES.SYSTEM_OWNER
  ) {
    return true;
  }

  if (!role) {
    return menuKey === "dashboard";
  }

  const menus = roleMenus[role];

  return (
    menus.includes("*") ||
    menus.includes(menuKey)
  );
}

/**
 * 특정 사용자의 역할을 변경할 수 있는지 확인합니다.
 *
 * targetRole에는 system_owner가 들어올 수 없습니다.
 * system_owner는 워크스페이스 역할이 아니기 때문입니다.
 */
export function canManageRole(
  actorRole: PermissionRole | null | undefined,
  targetRole: WorkspaceRole,
): boolean {
  if (
    actorRole ===
      GLOBAL_ROLES.SYSTEM_OWNER ||
    actorRole ===
      WORKSPACE_ROLES.SUPER_MANAGER
  ) {
    return true;
  }

  if (
    actorRole ===
    WORKSPACE_ROLES.MANAGER
  ) {
    const managerAssignableRoles:
      readonly WorkspaceRole[] = [
        WORKSPACE_ROLES.TEACHER,
        WORKSPACE_ROLES.NORMAL,
        WORKSPACE_ROLES.VIEWER,
        WORKSPACE_ROLES.PRINT_ACCOUNT,
      ];

    return managerAssignableRoles.includes(
      targetRole,
    );
  }

  return false;
}

/**
 * 현재 워크스페이스와 대상 워크스페이스가 같은지 확인합니다.
 *
 * system_owner는 모든 워크스페이스에 접근할 수 있습니다.
 */
export function assertWorkspaceAccess(
  userWorkspaceId:
    | string
    | null
    | undefined,

  targetWorkspaceId:
    | string
    | null
    | undefined,

  globalRole?:
    | GlobalRole
    | null,
): boolean {
  if (
    globalRole ===
    GLOBAL_ROLES.SYSTEM_OWNER
  ) {
    return true;
  }

  return Boolean(
    userWorkspaceId &&
      targetWorkspaceId &&
      userWorkspaceId ===
        targetWorkspaceId,
  );
}