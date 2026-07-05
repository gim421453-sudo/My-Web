export type WorkspaceRole = "system_owner" | "super_manager" | "manager" | "teacher" | "normal" | "viewer" | "print_account";

export const roleMenus: Record<WorkspaceRole, string[]> = {
  system_owner: [],
  super_manager: ["*"],
  manager: ["dashboard", "personal", "schedules", "notices", "subjects", "teachers", "materials", "assignments", "exams", "portfolios", "penalties", "people", "friendAwards", "timetable", "print", "site", "admin", "requests", "meals", "budget", "clubs", "attendance", "accounts", "examSchedules", "records", "lessons", "projects", "system", "mealApplications", "afterschool", "academic", "specialLectures", "homeLetters", "schoolNotices"],
  teacher: ["dashboard", "personal", "schedules", "notices", "subjects", "teachers", "materials", "assignments", "exams", "timetable", "requests", "attendance", "examSchedules", "records", "lessons"],
  normal: ["dashboard", "personal", "schedules", "notices", "subjects", "materials", "assignments", "exams", "portfolios", "timetable", "requests", "meals", "attendance", "examSchedules", "records", "lessons"],
  viewer: ["dashboard", "personal", "schedules", "notices", "subjects", "materials", "assignments", "exams", "portfolios", "timetable", "meals", "examSchedules", "records"],
  print_account: ["print", "materials", "examSchedules"]
};

export function canAccessMenu(role: WorkspaceRole | null | undefined, menuKey: string) {
  if (!role) return menuKey === "dashboard";
  const menus = roleMenus[role] || [];
  return menus.includes("*") || menus.includes(menuKey);
}

export function canManageRole(actorRole: WorkspaceRole, targetRole: WorkspaceRole) {
  if (actorRole === "system_owner") return targetRole !== "system_owner";
  if (actorRole === "super_manager") return targetRole !== "system_owner";
  if (actorRole === "manager") return !["system_owner", "super_manager", "manager"].includes(targetRole);
  return false;
}

export function assertWorkspaceAccess(userWorkspaceId: string, targetWorkspaceId: string, globalRole?: string) {
  if (globalRole === "system_owner") return true;
  return !!userWorkspaceId && userWorkspaceId === targetWorkspaceId;
}
