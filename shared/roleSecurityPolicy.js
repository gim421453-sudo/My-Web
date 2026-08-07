(function (root, factory) {
  const policy = factory();
  if (typeof module === "object" && module.exports) module.exports = policy;
  if (root) root.PMRoleSecurityPolicy = policy;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const WORKSPACE_ROLES = Object.freeze([
    "super_manager",
    "manager",
    "teacher",
    "normal",
    "viewer",
    "print_account"
  ]);

  const GRANTABLE_ROLES = Object.freeze({
    system_owner: WORKSPACE_ROLES,
    super_manager: Object.freeze(["manager", "teacher", "normal", "viewer", "print_account"]),
    manager: Object.freeze(["teacher", "normal", "viewer", "print_account"]),
    teacher: Object.freeze([]),
    normal: Object.freeze([]),
    viewer: Object.freeze([]),
    print_account: Object.freeze([])
  });

  const FORBIDDEN_ROLE_PAYLOAD_KEYS = Object.freeze([
    "isAdmin",
    "systemOwner",
    "isSystemOwner",
    "isManager",
    "approved",
    "globalRole",
    "currentRole",
    "workspaceRole",
    "permissions",
    "extraPermissions",
    "capabilities",
    "capability",
    "scope",
    "scopes",
    "departmentIds",
    "classIds",
    "subjectIds",
    "homeroomClassIds",
    "departmentManager",
    "studentManager",
    "clubManager",
    "timetableManager",
    "gradeManager",
    "department_manager",
    "student_manager",
    "club_manager",
    "timetable_manager",
    "grade_manager"
  ]);

  function normalizeRole(value) {
    return String(value || "").trim();
  }

  function assignableRoles(actorRole) {
    return [...(GRANTABLE_ROLES[normalizeRole(actorRole)] || [])];
  }

  function canGrantRole(actorRole, requestedRole) {
    return assignableRoles(actorRole).includes(normalizeRole(requestedRole));
  }

  function canManageRole(actorRole, currentRole) {
    return canGrantRole(actorRole, currentRole);
  }

  function forbiddenPayloadKeys(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
    return FORBIDDEN_ROLE_PAYLOAD_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(payload, key));
  }

  return Object.freeze({
    WORKSPACE_ROLES,
    GRANTABLE_ROLES,
    FORBIDDEN_ROLE_PAYLOAD_KEYS,
    normalizeRole,
    assignableRoles,
    canGrantRole,
    canManageRole,
    forbiddenPayloadKeys
  });
});
