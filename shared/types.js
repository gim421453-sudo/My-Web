// Shared type contracts for future multi-site auth/data integration.
(function () {
  const SharedTypes = {
    UserRole: ["system_owner", "super_manager", "manager", "teacher", "normal", "viewer", "print_account"],
    InvitationStatus: ["invited", "completed", "expired", "revoked"],
    AccountStatus: ["active", "disabled", "pending_verification"],
    DataScope: ["auth", "workspace", "user", "session"],
    createWorkspaceContext(workspaceId, userId) {
      return {
        workspace_id: workspaceId || "personal-local",
        user_id: userId || null,
        schema_version: 1
      };
    }
  };

  window.PMShared = window.PMShared || {};
  window.PMShared.types = SharedTypes;
})();
