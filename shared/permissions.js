// Shared permission helpers that can be reused by another site or a backend API.
(function () {
  const defaultRoleMenus = {
    system_owner: ["systemOwner", "dashboard", "personal", "schedules", "notices", "subjects", "teachers", "materials", "assignments", "exams", "portfolios", "penalties", "people", "friendAwards", "timetable", "print", "site", "admin", "requests", "meals", "budget", "clubs", "attendance", "accounts", "examSchedules", "records", "lessons", "projects", "system", "mealApplications", "afterschool", "academic", "specialLectures", "homeLetters", "schoolNotices"],
    super_manager: ["dashboard", "personal", "schedules", "notices", "subjects", "teachers", "materials", "assignments", "exams", "portfolios", "penalties", "people", "friendAwards", "timetable", "print", "site", "admin", "requests", "meals", "budget", "clubs", "attendance", "accounts", "examSchedules", "records", "lessons", "projects", "system", "mealApplications", "afterschool", "academic", "specialLectures", "homeLetters", "schoolNotices"],
    manager: ["dashboard", "personal", "schedules", "notices", "subjects", "teachers", "materials", "assignments", "exams", "portfolios", "penalties", "people", "friendAwards", "timetable", "print", "site", "admin", "requests", "meals", "budget", "clubs", "attendance", "accounts", "examSchedules", "records", "lessons", "projects", "system", "mealApplications", "afterschool", "academic", "specialLectures", "homeLetters", "schoolNotices"],
    teacher: ["dashboard", "personal", "schedules", "notices", "subjects", "teachers", "materials", "assignments", "exams", "portfolios", "timetable", "requests", "meals", "clubs", "attendance", "accounts", "examSchedules", "records", "lessons", "projects", "mealApplications", "afterschool", "academic", "specialLectures", "homeLetters", "schoolNotices"],
    normal: ["dashboard", "personal", "schedules", "notices", "subjects", "materials", "assignments", "exams", "portfolios", "timetable", "requests", "meals", "attendance", "accounts", "examSchedules", "records", "lessons", "projects", "mealApplications", "afterschool", "academic", "specialLectures", "homeLetters", "schoolNotices"],
    viewer: ["dashboard", "personal", "schedules", "notices", "subjects", "materials", "assignments", "exams", "portfolios", "timetable", "meals", "accounts", "examSchedules", "records", "lessons", "projects", "mealApplications", "academic", "homeLetters", "schoolNotices"],
    print_account: ["print", "accounts", "examSchedules"],
    pending: []
  };

  function menusForRole(role, overrides) {
    if (Array.isArray(overrides) && overrides.length) return overrides;
    return defaultRoleMenus[window.PMShared?.roles?.normalizeRole(role) || role] || [];
  }

  function hasMenuAccess(user, menuKey) {
    if (!user || user.active === false || user.emailVerified === false) return false;
    return menusForRole(user.role, user.menuOverrides).includes(menuKey);
  }

  function hasActionPermission(user, permissionMap, menuKey, action) {
    if (!hasMenuAccess(user, menuKey) && action === "view") return false;
    const role = window.PMShared?.roles?.normalizeRole(user.role) || user.role;
    return (permissionMap?.[menuKey]?.[action] || []).includes(role);
  }

  window.PMShared = window.PMShared || {};
  window.PMShared.permissions = { defaultRoleMenus, menusForRole, hasMenuAccess, hasActionPermission };
})();
