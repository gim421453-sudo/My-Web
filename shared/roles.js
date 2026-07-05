// Reusable role definitions. Keep this file free of app-specific UI code.
(function () {
  const roles = {
    system_owner: {
      label: "System Owner",
      level: 120,
      canInvite: ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"],
      canManageRoles: ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"],
      hiddenInUserApp: true
    },
    super_manager: {
      label: "Super Manager",
      level: 100,
      canInvite: ["manager", "teacher", "normal", "viewer", "print_account"],
      canManageRoles: ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"]
    },
    manager: {
      label: "Manager",
      level: 80,
      canInvite: ["teacher", "normal", "viewer", "print_account"],
      canManageRoles: ["teacher", "normal", "viewer", "print_account"]
    },
    teacher: {
      label: "Teacher",
      level: 60,
      canInvite: [],
      canManageRoles: []
    },
    normal: {
      label: "Normal",
      level: 40,
      canInvite: [],
      canManageRoles: []
    },
    viewer: {
      label: "Viewer",
      level: 20,
      canInvite: [],
      canManageRoles: []
    },
    print_account: {
      label: "Print Account",
      level: 10,
      canInvite: [],
      canManageRoles: []
    },
    pending: {
      label: "Pending",
      level: 0,
      canInvite: [],
      canManageRoles: []
    }
  };

  function normalizeRole(role) {
    return { admin: "manager", user: "normal", print: "print_account" }[role] || role || "normal";
  }

  function canInviteRole(actorRole, targetRole) {
    const actor = roles[normalizeRole(actorRole)];
    return !!actor && actor.canInvite.includes(normalizeRole(targetRole));
  }

  function canManageUser(actorRole, targetRole) {
    const actor = roles[normalizeRole(actorRole)];
    return !!actor && actor.canManageRoles.includes(normalizeRole(targetRole));
  }

  window.PMShared = window.PMShared || {};
  window.PMShared.roles = { roles, normalizeRole, canInviteRole, canManageUser };
})();
