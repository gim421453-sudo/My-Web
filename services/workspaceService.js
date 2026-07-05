// Workspace membership and switching helpers.
(function () {
  function userId(user) {
    return user?.uid || user?.id || "";
  }

  function listMemberships(authState, user) {
    const uid = userId(user);
    if (!uid) return [];
    const workspaces = authState.workspaces || [];
    return (authState.workspace_members || [])
      .filter((member) => member.uid === uid && ["active", "accepted"].includes(member.status || "active"))
      .map((member) => ({
        ...member,
        workspace: workspaces.find((workspace) => workspace.workspaceId === member.workspaceId) || {
          workspaceId: member.workspaceId,
          name: member.workspaceId
        }
      }));
  }

  function ensurePersonalWorkspace(authState, user) {
    const uid = userId(user);
    if (!uid) return null;
    const workspaceId = user.workspace_id || `ws_${uid}`;
    const memberRole = user.workspaceRole || (user.role === "system_owner" ? "super_manager" : user.role || "super_manager");
    authState.workspaces = authState.workspaces || [];
    authState.workspace_members = authState.workspace_members || [];
    if (!authState.workspaces.some((workspace) => workspace.workspaceId === workspaceId)) {
      authState.workspaces.unshift({
        workspaceId,
        name: `${user.name || user.displayName || user.email || "My"} workspace`,
        ownerUid: uid,
        plan: "local",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    const memberId = `${workspaceId}_${uid}`;
    if (!authState.workspace_members.some((member) => member.id === memberId || (member.workspaceId === workspaceId && member.uid === uid))) {
      authState.workspace_members.unshift({
        id: memberId,
        workspaceId,
        uid,
        role: memberRole,
        status: "active",
        joinedAt: new Date().toISOString(),
        invitedBy: null,
        invitationId: null,
        lastAccessAt: new Date().toISOString()
      });
    }
    return workspaceId;
  }

  function switchWorkspace(authState, user, workspaceId) {
    const uid = userId(user);
    const member = (authState.workspace_members || []).find((item) => item.uid === uid && item.workspaceId === workspaceId && ["active", "accepted"].includes(item.status || "active"));
    if (!member) throw new Error("이 workspace에 접근할 권한이 없습니다.");
    user.workspace_id = workspaceId;
    user.workspaceRole = member.role;
    if (user.role !== "system_owner") user.role = member.role;
    member.lastAccessAt = new Date().toISOString();
    window.PMDataService?.setWorkspaceId?.(workspaceId);
    return member;
  }

  window.PMWorkspaceService = { listMemberships, ensurePersonalWorkspace, switchWorkspace };
})();
