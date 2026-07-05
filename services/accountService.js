// Account lifecycle helpers. Destructive Firebase Auth deletion is intentionally TODO.
(function () {
  function userId(user) {
    return user?.uid || user?.id || "";
  }

  function requestPasswordReset(user) {
    if (!user) throw new Error("사용자를 찾을 수 없습니다.");
    user.passwordResetRequested = true;
    user.passwordResetRequestedAt = new Date().toISOString();
    return user;
  }

  function canWithdraw(authState, user) {
    const uid = userId(user);
    const ownMemberships = (authState.workspace_members || []).filter((member) => member.uid === uid && member.status !== "disabled" && member.status !== "withdrawn");
    const blocking = ownMemberships.find((member) => {
      if (member.role !== "super_manager") return false;
      const peers = (authState.workspace_members || []).filter((item) => item.workspaceId === member.workspaceId && item.uid !== uid && item.role === "super_manager" && item.status !== "disabled" && item.status !== "withdrawn");
      return peers.length === 0;
    });
    if (blocking) {
      return { ok: false, reason: "유일한 최고관리자인 workspace가 있습니다. 다른 사용자에게 super_manager 권한을 먼저 위임하세요." };
    }
    return { ok: true, reason: "" };
  }

  function withdraw(authState, user) {
    const check = canWithdraw(authState, user);
    if (!check.ok) throw new Error(check.reason);
    const uid = userId(user);
    user.disabled = true;
    user.active = false;
    user.status = "withdrawn";
    user.deletedAt = new Date().toISOString();
    (authState.workspace_members || []).forEach((member) => {
      if (member.uid === uid) {
        member.status = "withdrawn";
        member.withdrawnAt = new Date().toISOString();
      }
    });
    return user;
  }

  window.PMAccountService = { requestPasswordReset, canWithdraw, withdraw };
})();
