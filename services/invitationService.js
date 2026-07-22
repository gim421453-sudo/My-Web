// Invitation service for workspace-scoped invite codes.
(function () {
  const STATUSES = ["active", "accepted", "expired", "revoked"];

  function randomCode() {
    const a = Math.random().toString(36).slice(2, 6).toUpperCase();
    const b = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PM-${a}-${b}`;
  }

  function normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
  }

  function maskDiagnosticId(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    }
    return `fp_${Math.abs(hash).toString(16).slice(0, 8)}`;
  }

  function safeError(error) {
    return {
      code: error?.code || "",
      message: error?.message || String(error)
    };
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(normalizeCode(value));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function normalizedMaxUses(value) {
    if (value === null || value === undefined || value === "") return null;
    return Number(value || 1);
  }

  function normalizeInvite(invite) {
    const now = Date.now();
    const expiresAt = Number(invite.expiresAt || 0);
    if (invite.status === "pending") invite.status = "active";
    if (invite.status === "active" && expiresAt && now > expiresAt) invite.status = "expired";
    invite.usedCount = Number(invite.usedCount || 0);
    invite.maxUses = normalizedMaxUses(invite.maxUses);
    invite.code = normalizeCode(invite.code || invite.invitationId || "");
    return invite;
  }

  function canCreateInvite(actorRole, targetRole) {
    if (targetRole === "system_owner") return false;
    if (actorRole === "super_manager") return ["manager", "teacher", "normal", "viewer", "print_account"].includes(targetRole);
    if (actorRole === "manager") return ["teacher", "normal", "viewer", "print_account"].includes(targetRole);
    return false;
  }

  async function createInvite({ authState, currentUser, workspaceId, role, email, maxUses, expiresHours, reusable }) {
    const targetWorkspaceId = workspaceId || currentUser?.workspace_id || currentUser?.workspaceId;
    if (!targetWorkspaceId) throw new Error("초대코드를 만들 workspace가 없습니다.");
    if (!canCreateInvite(currentUser?.role, role)) throw new Error("현재 계정은 해당 역할의 초대코드를 만들 수 없습니다.");

    const code = normalizeCode(randomCode());
    const codeHash = await sha256(code);
    const invite = {
      invitationId: code,
      code,
      workspaceId: targetWorkspaceId,
      role: role || "normal",
      codeHash,
      email: String(email || "").trim().toLowerCase(),
      maxUses: reusable ? Number(maxUses || 20) : 1,
      usedCount: 0,
      expiresAt: expiresHours ? Date.now() + Number(expiresHours) * 60 * 60 * 1000 : null,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.uid || currentUser?.id || "",
      inviterUid: currentUser?.uid || currentUser?.id || "",
      inviterEmail: currentUser?.email || "",
      status: "active",
      usedAt: "",
      usedBy: "",
      reusable: !!reusable,
      codePreview: `${code.slice(0, 3)}-****-${code.slice(-4)}`
    };

    authState.invitations = authState.invitations || [];
    authState.invitations.unshift(invite);
    await saveRemoteInvite(invite);
    return { invite, code };
  }

  async function saveRemoteInvite(invite) {
    try {
      const runtime = await window.PMFirebaseRuntime?.init?.();
      if (!runtime) return;
      const { firestore } = runtime.sdk;
      const code = normalizeCode(invite.code || invite.invitationId);
      const remoteInvite = {
        ...invite,
        invitationId: code,
        code,
        createdBy: invite.createdBy || invite.inviterUid || "",
        invitedBy: invite.createdBy || invite.inviterUid || "",
        status: invite.status === "pending" ? "active" : invite.status,
        createdAt: firestore.serverTimestamp()
      };
      await firestore.setDoc(firestore.doc(runtime.db, "invites", code), remoteInvite, { merge: true });
      await firestore.setDoc(firestore.doc(runtime.db, "invitations", code), remoteInvite, { merge: true });
      if (invite.workspaceId) {
        await firestore.setDoc(firestore.doc(runtime.db, "workspaces", invite.workspaceId, "inviteCodes", code), remoteInvite, { merge: true });
      }
    } catch (error) {
      console.error("[PM Firestore permission check]", {
        step: "save invite code",
        path: "invites/{inviteCode}",
        inviteFingerprint: maskDiagnosticId(invite.code || invite.invitationId),
        ...safeError(error)
      });
      throw error;
    }
  }

  async function getRemoteInvite(code) {
    const normalized = normalizeCode(code);
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) return null;
    const { firestore } = runtime.sdk;
    try {
      console.info("[PM Firestore]", {
        step: "get invite code",
        path: "invites/{inviteCode}",
        inviteFingerprint: maskDiagnosticId(normalized)
      });
      const snap = await firestore.getDoc(firestore.doc(runtime.db, "invites", normalized));
      return snap.exists() ? normalizeInvite({ ...snap.data(), invitationId: normalized, code: normalized }) : null;
    } catch (error) {
      console.error("[PM Firestore permission check]", {
        step: "get invite code",
        path: "invites/{inviteCode}",
        inviteFingerprint: maskDiagnosticId(normalized),
        ...safeError(error)
      });
      throw error;
    }
  }

  function validateInvite(invite, user) {
    if (!invite) throw new Error("존재하지 않는 초대코드입니다.");
    const normalized = normalizeInvite(invite);
    if (normalized.status === "expired") throw new Error("만료된 초대코드입니다.");
    if (normalized.status === "revoked") throw new Error("비활성화된 초대코드입니다.");
    if (normalized.status === "accepted" && !normalized.reusable) throw new Error("이미 사용된 초대코드입니다.");
    if (normalized.maxUses !== null && normalized.usedCount >= normalized.maxUses) throw new Error("사용 가능한 횟수를 초과한 초대코드입니다.");
    if (normalized.email && user.email && normalized.email !== String(user.email).toLowerCase()) throw new Error("이 이메일에는 권한이 없는 초대코드입니다.");
    return normalized;
  }

  function roleAfterInvite(currentRole, inviteRole) {
    if (["system_owner", "super_manager", "manager"].includes(currentRole)) return currentRole;
    return "normal";
  }

  function inviteOwnerUid(invite) {
    return invite.inviterUid || invite.createdBy || invite.invitedBy || "";
  }

  async function acceptRemoteInviteCode({ user, code }) {
    const normalized = normalizeCode(code);
    const invite = validateInvite(await getRemoteInvite(normalized), user);
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) throw new Error("Firebase 서버와 연결이 필요합니다.");

    const { firestore } = runtime.sdk;
    const uid = user.uid || user.id;
    const userRef = firestore.doc(runtime.db, "users", uid);
    const userSnap = await firestore.getDoc(userRef);
    const existingUser = userSnap.exists() ? userSnap.data() : {};
    const existingWorkspaceId = user.workspace_id || user.workspaceId || user.currentWorkspaceId || existingUser.workspaceId || existingUser.currentWorkspaceId;
    const currentRole = user.role || user.currentRole || existingUser.role || existingUser.currentRole || "";
    const role = roleAfterInvite(currentRole, invite.role || "normal");
    const workspaceId = invite.workspaceId;
    const existingStatus = existingUser.status || user.status || "";
    if (existingWorkspaceId === workspaceId && existingStatus === "active") {
      throw new Error("이미 이 workspace에 연결된 계정입니다.");
    }
    const now = firestore.serverTimestamp();
    const ownerUid = inviteOwnerUid(invite);
    const email = user.email || existingUser.email || "";
    const displayName = existingUser.displayName || user.displayName || user.name || email || "";
    const requestId = `${workspaceId}_${uid}_${normalized}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    const userRole = currentRole && currentRole !== "pending" ? currentRole : "normal";
    const userPayload = {
      uid,
      email,
      displayName,
      workspaceId: null,
      currentWorkspaceId: null,
      role: userRole,
      currentRole: userRole,
      status: "waiting_approval",
      pendingWorkspaceId: workspaceId,
      pendingInviteCodeId: normalized,
      updatedAt: now,
      disabled: false
    };
    const requestPayload = {
      id: requestId,
      uid,
      email,
      displayName,
      workspaceId,
      pendingWorkspaceId: workspaceId,
      inviteCodeId: normalized,
      pendingInviteCodeId: normalized,
      inviteCode: normalized,
      invitedBy: ownerUid,
      invitedByEmail: invite.inviterEmail || "",
      requestedRole: role,
      role,
      requestType: "invite_code",
      status: "pending",
      createdAt: now,
      updatedAt: now
    };
    const batch = firestore.writeBatch(runtime.db);

    batch.set(userRef, userPayload, { merge: true });
    batch.set(firestore.doc(runtime.db, "workspaceJoinRequests", requestId), requestPayload, { merge: true });
    if (ownerUid) {
      batch.set(firestore.doc(runtime.db, "users", ownerUid, "invitedUsers", uid), {
        uid,
        email,
        displayName,
        workspaceId,
        pendingWorkspaceId: workspaceId,
        inviteCodeId: normalized,
        requestedAt: now,
        role,
        status: "pending"
      }, { merge: true });
    }

    console.info("[PM Firestore]", {
      step: "submit invite join request",
      path: "invites/{inviteCode}, users/{uid}, workspaceJoinRequests/{requestId}",
      inviteFingerprint: maskDiagnosticId(normalized),
      requestFingerprint: maskDiagnosticId(requestId),
      uidPresent: Boolean(uid)
    });
    try {
      await batch.commit();
      console.info("[PM invite request success]", {
        inviteCodeFingerprint: maskDiagnosticId(normalized),
        workspaceFingerprint: maskDiagnosticId(workspaceId),
        inviteOwnerUidPresent: Boolean(ownerUid),
        joinedUserUidPresent: Boolean(uid),
        joinedUserEmailPresent: Boolean(email),
        usersDocumentSaved: true,
        workspaceJoinRequestSaved: true,
        inviterLinkSaved: !!ownerUid
      });
    } catch (error) {
      console.error("[PM invite request failure]", {
        inviteCodeFingerprint: maskDiagnosticId(normalized),
        workspaceFingerprint: maskDiagnosticId(workspaceId),
        inviteOwnerUidPresent: Boolean(ownerUid),
        joinedUserUidPresent: Boolean(uid),
        joinedUserEmailPresent: Boolean(email),
        usersDocumentSaved: false,
        workspaceJoinRequestSaved: false,
        ...safeError(error)
      });
      throw new Error("초대코드 등록 중 일부 데이터 연결에 실패했습니다. 관리자에게 문의해주세요.");
    }
    return {
      invite: { ...invite, lastRequestedBy: uid },
      member: {
        workspaceId,
        uid,
        role,
        status: "pending",
        pendingWorkspaceId: workspaceId,
        inviteCode: normalized,
        inviteCodeId: normalized
      },
      pending: true,
      workspaceId,
      inviteCodeId: normalized,
      requestId
    };
  }

  async function acceptInviteCode({ authState, user, code }) {
    const normalized = normalizeCode(code);
    const codeHash = await sha256(normalized);
    let remoteResult = null;
    let invite = null;

    if (window.PMFirebaseRuntime?.hasConfig?.()) {
      remoteResult = await acceptRemoteInviteCode({ user, code: normalized });
      invite = remoteResult.invite;
    } else {
      const invitations = (authState.invitations || []).map(normalizeInvite);
      invite = invitations.find((item) => item.codeHash === codeHash || item.code === normalized || item.invitationId === normalized);
      validateInvite(invite, user);
    }

    authState.invitations = authState.invitations || [];
    const localInvite = authState.invitations.find((item) => item.codeHash === codeHash || item.code === normalized || item.invitationId === normalized);
    if (!localInvite && invite) authState.invitations.unshift({ ...invite, codeHash, invitationId: normalized, code: normalized });

    authState.workspace_members = authState.workspace_members || [];
    const uid = user.uid || user.id;
    if (remoteResult?.pending) {
      user.status = "waiting_approval";
      user.role = remoteResult.member.role || "normal";
      user.currentRole = user.role;
      user.workspaceRole = user.role;
      user.workspace_id = "";
      user.workspaceId = "";
      user.currentWorkspaceId = "";
      user.pendingWorkspaceId = remoteResult.workspaceId || invite.workspaceId || "";
      user.pendingInviteCodeId = normalized;
      user.invitedBy = invite.inviterUid || invite.createdBy || "";
      user.invitedByEmail = invite.inviterEmail || "";
      user.inviteCode = normalized;
      user.inviteCodeId = normalized;
      return { invite, member: remoteResult.member, pending: true };
    }
    if ((user.workspace_id || user.workspaceId) === invite.workspaceId) throw new Error("이미 이 workspace에 연결된 계정입니다.");
    const localRole = roleAfterInvite(user.role, invite.role || "normal");
    const memberId = `${invite.workspaceId}_${uid}`;
    let member = authState.workspace_members.find((item) => item.id === memberId || (item.workspaceId === invite.workspaceId && item.uid === uid));
    if (!member) {
      member = {
        id: memberId,
        workspaceId: invite.workspaceId,
        uid,
        role: localRole,
        status: "active",
        joinedAt: new Date().toISOString(),
        invitedBy: invite.inviterUid || invite.createdBy || null,
        invitedByEmail: invite.inviterEmail || "",
        invitationId: normalized,
        inviteCode: normalized,
        lastAccessAt: new Date().toISOString()
      };
      authState.workspace_members.unshift(member);
    } else {
      member.role = localRole;
      member.status = "active";
      member.invitationId = normalized;
      member.inviteCode = normalized;
    }

    user.workspace_id = invite.workspaceId;
    user.workspaceId = invite.workspaceId;
    user.role = localRole;
    user.invitedBy = invite.inviterUid || invite.createdBy || "";
    user.invitedByEmail = invite.inviterEmail || "";
    user.inviteCode = normalized;
    user.inviteCodeId = normalized;

    if (!remoteResult) await saveRemoteMember(member);
    return { invite, member };
  }

  async function saveRemoteMember(member) {
    try {
      const runtime = await window.PMFirebaseRuntime?.init?.();
      if (!runtime) return;
      const { firestore } = runtime.sdk;
      await firestore.setDoc(firestore.doc(runtime.db, "workspace_members", member.id), {
        ...member,
        lastAccessAt: firestore.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.warn("Remote member save skipped", error);
    }
  }

  function revokeInvite(authState, invitationId) {
    const invite = (authState.invitations || []).find((item) => item.invitationId === invitationId || item.id === invitationId);
    if (!invite) return null;
    invite.status = "revoked";
    return invite;
  }

  function refreshStatuses(authState) {
    (authState.invitations || []).forEach(normalizeInvite);
    return authState.invitations || [];
  }

  window.PMInvitationService = {
    STATUSES,
    sha256,
    normalizeCode,
    getRemoteInvite,
    validateInvite,
    roleAfterInvite,
    canCreateInvite,
    createInvite,
    acceptInviteCode,
    acceptRemoteInviteCode,
    revokeInvite,
    refreshStatuses
  };
})();
