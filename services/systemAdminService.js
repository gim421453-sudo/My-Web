// System-owner administration facade. Keeps global approval/system-notice
// workflows separate from workspace data so a future admin site can reuse them.
(function () {
  const PRIORITY_WEIGHT = { critical: 4, high: 3, normal: 2, low: 1 };

  function normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
  }

  function safeId(value) {
    return String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 180);
  }

  async function runtimeRequired() {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) throw new Error("Firebase 서버와 연결이 필요합니다.");
    return runtime;
  }

  function serverTimestamp(runtime) {
    return runtime.sdk.firestore.serverTimestamp();
  }

  function toMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.seconds === "number") return value.seconds * 1000;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function docRows(snapshot) {
    return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
  }

  function rowWorkspaceId(row = {}) {
    return row.workspaceId || row.currentWorkspaceId || row.workspace_id || "";
  }

  function normalizeWorkspaceMemberRow(row = {}) {
    const workspaceId = rowWorkspaceId(row);
    let uid = row.uid || "";
    if (!uid && workspaceId && typeof row.id === "string" && row.id.startsWith(`${workspaceId}_`)) {
      uid = row.id.slice(workspaceId.length + 1);
    }
    const id = row.id || (workspaceId && uid ? `${workspaceId}_${uid}` : "");
    return {
      ...row,
      id,
      uid,
      workspaceId,
      currentWorkspaceId: row.currentWorkspaceId || workspaceId,
      workspace_id: row.workspace_id || workspaceId
    };
  }

  function mergeWorkspaceMemberRows(rootRows = [], nestedRows = []) {
    const merged = new Map();
    const put = (row, flags) => {
      const normalized = normalizeWorkspaceMemberRow(row);
      const workspaceId = rowWorkspaceId(normalized);
      const uid = normalized.uid || "";
      const key = workspaceId && uid ? `${workspaceId}_${uid}` : normalized.id;
      if (!key) return;
      const previous = merged.get(key) || {};
      merged.set(key, {
        ...previous,
        ...normalized,
        id: key,
        uid,
        workspaceId,
        currentWorkspaceId: workspaceId,
        workspace_id: workspaceId,
        rootMemberExists: flags.root || normalized.rootMemberExists === true || previous.rootMemberExists === true,
        nestedMemberExists: flags.nested || normalized.nestedMemberExists === true || previous.nestedMemberExists === true
      });
    };
    rootRows.forEach((row) => put(row, { root: true, nested: false }));
    nestedRows.forEach((row) => put(row, { root: false, nested: true }));
    return [...merged.values()];
  }

  async function hydrateNestedMemberChecks(runtime, rows = []) {
    const checked = await Promise.all((rows || []).map(async (row) => {
      const normalized = normalizeWorkspaceMemberRow(row);
      const workspaceId = rowWorkspaceId(normalized);
      const uid = normalized.uid || "";
      if (!workspaceId || !uid) return { ...normalized, rootMemberExists: true, nestedMemberExists: normalized.nestedMemberExists === true };
      try {
        const nestedSnap = await runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid).get();
        if (!nestedSnap.exists) return { ...normalized, rootMemberExists: true, nestedMemberExists: false };
        return {
          ...normalized,
          ...(nestedSnap.data() || {}),
          id: `${workspaceId}_${uid}`,
          uid,
          workspaceId,
          currentWorkspaceId: workspaceId,
          workspace_id: workspaceId,
          rootMemberExists: true,
          nestedMemberExists: true
        };
      } catch (error) {
        console.error("[workspace-members:nested:direct-check:error]", { workspaceId, uid, error });
        return { ...normalized, rootMemberExists: true, nestedMemberExists: normalized.nestedMemberExists === true };
      }
    }));
    return checked;
  }

  function activeInviteStatus(status) {
    return ["active", "used", "accepted"].includes(status || "active");
  }

  function sortSystemNotices(rows, workspaceId) {
    return rows
      .filter((notice) => {
        if ((notice.status || "active") !== "active") return false;
        if ((notice.target || "all_workspaces") === "all_workspaces") return true;
        if (notice.target === "selected_workspaces") return (notice.targetWorkspaceIds || []).includes(workspaceId);
        return false;
      })
      .sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) return Number(!!b.pinned) - Number(!!a.pinned);
        const priorityDiff = (PRIORITY_WEIGHT[b.priority || "normal"] || 0) - (PRIORITY_WEIGHT[a.priority || "normal"] || 0);
        if (priorityDiff) return priorityDiff;
        return toMillis(b.createdAt) - toMillis(a.createdAt);
      });
  }

  async function getUserDocument(uid) {
    const runtime = await runtimeRequired();
    const snap = await runtime.db.collection("users").doc(uid).get();
    return snap.exists ? { id: snap.id, ...(snap.data() || {}) } : null;
  }

  async function isSystemOwner(uid) {
    if (!uid) return false;
    const runtime = await runtimeRequired();
    try {
      const ownerSnap = await runtime.db.collection("systemOwners").doc(uid).get();
      if (ownerSnap.exists && (ownerSnap.data()?.status || "active") === "active") return true;
    } catch (error) {
      console.info("[system-owner:check]", { source: "systemOwners", code: error?.code || "", message: error?.message || String(error) });
    }
    const user = await getUserDocument(uid);
    return user?.role === "system_owner" && user?.status !== "disabled" && user?.disabled !== true;
  }

  async function submitJoinRequest({ user, code }) {
    const runtime = await runtimeRequired();
    const normalized = normalizeCode(code);
    if (!normalized) throw new Error("초대코드를 입력하세요.");
    const invite = window.PMInvitationService?.validateInvite
      ? window.PMInvitationService.validateInvite(await window.PMInvitationService.getRemoteInvite(normalized), user)
      : null;
    if (!invite || !activeInviteStatus(invite.status)) throw new Error("유효한 초대코드가 아닙니다.");
    const uid = user?.uid || user?.id || runtime.auth.currentUser?.uid || "";
    if (!uid) throw new Error("로그인 사용자 정보를 확인할 수 없습니다.");
    const now = serverTimestamp(runtime);
    const workspaceId = invite.workspaceId;
    const inviteOwnerUid = invite.inviterUid || invite.createdBy || invite.invitedBy || "";
    const email = user?.email || runtime.auth.currentUser?.email || "";
    const displayName = user?.displayName || user?.name || email || uid;
    const requestId = safeId(`${workspaceId}_${uid}_${normalized}`);
    const userRole = user?.role && user.role !== "pending" ? user.role : "normal";
    const batch = runtime.db.batch();

    batch.set(runtime.db.collection("workspaceJoinRequests").doc(requestId), {
      requestType: "workspace_join",
      uid,
      email,
      displayName,
      inviteCode: normalized,
      inviteCodeId: normalized,
      workspaceId,
      pendingWorkspaceId: workspaceId,
      pendingInviteCodeId: normalized,
      invitedBy: inviteOwnerUid,
      inviterEmail: invite.inviterEmail || "",
      requestedRole: invite.role || "normal",
      status: "pending",
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    batch.set(runtime.db.collection("users").doc(uid), {
      uid,
      email,
      displayName,
      role: userRole,
      currentRole: userRole,
      status: "waiting_approval",
      workspaceId: null,
      currentWorkspaceId: null,
      pendingWorkspaceId: workspaceId,
      pendingInviteCodeId: normalized,
      updatedAt: now
    }, { merge: true });
    await batch.commit();
    console.info("[workspace-join-request]", { requestId, workspaceId, uid, inviteCodeId: normalized });
    return { requestId, workspaceId, inviteCodeId: normalized, invitedBy: inviteOwnerUid };
  }

  async function submitAdminApplication({ user, fields }) {
    const runtime = await runtimeRequired();
    const uid = user?.uid || user?.id || runtime.auth.currentUser?.uid || "";
    if (!uid) throw new Error("로그인 사용자 정보를 확인할 수 없습니다.");
    const now = serverTimestamp(runtime);
    const applicationId = safeId(`admin_${uid}_${Date.now()}`);
    await runtime.db.collection("adminApplications").doc(applicationId).set({
      uid,
      email: fields.email || user?.email || runtime.auth.currentUser?.email || "",
      displayName: fields.displayName || user?.displayName || user?.name || "",
      phone: fields.phone || "",
      organization: fields.organization || "",
      reason: fields.reason || "",
      requestedWorkspaceName: fields.requestedWorkspaceName || "",
      memo: fields.memo || "",
      status: "pending",
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    await runtime.db.collection("users").doc(uid).set({
      uid,
      email: fields.email || user?.email || runtime.auth.currentUser?.email || "",
      displayName: fields.displayName || user?.displayName || user?.name || "",
      role: "normal",
      currentRole: "normal",
      status: "waiting_approval",
      workspaceId: null,
      currentWorkspaceId: null,
      pendingWorkspaceId: null,
      pendingInviteCodeId: null,
      updatedAt: now
    }, { merge: true });
    return { applicationId };
  }

  function subscribeCurrentUser(uid, onChange, onError) {
    if (!uid) return () => {};
    let unsubscribe = () => {};
    runtimeRequired()
      .then((runtime) => {
        unsubscribe = runtime.db.collection("users").doc(uid).onSnapshot((snapshot) => {
          onChange?.(snapshot.exists ? { id: snapshot.id, ...(snapshot.data() || {}) } : null);
        }, (error) => {
          console.error("[current-user:onSnapshot:error]", error);
          onError?.(error);
        });
      })
      .catch((error) => {
        console.error("[current-user:subscribe:error]", error);
        onError?.(error);
      });
    return () => unsubscribe();
  }

  function subscribeSystemNotices(workspaceId, onChange, onError) {
    let unsubscribe = () => {};
    runtimeRequired()
      .then((runtime) => {
        unsubscribe = runtime.db.collection("systemNotices")
          .where("status", "==", "active")
          .onSnapshot((snapshot) => {
            onChange?.(sortSystemNotices(docRows(snapshot), workspaceId));
          }, (error) => {
            console.error("[systemNotices:onSnapshot:error]", error);
            onError?.(error);
          });
      })
      .catch((error) => {
        console.error("[systemNotices:subscribe:error]", error);
        onError?.(error);
      });
    return () => unsubscribe();
  }

  function subscribeCollection(collectionName, onChange, onError) {
    let unsubscribe = () => {};
    runtimeRequired()
      .then((runtime) => {
        unsubscribe = runtime.db.collection(collectionName).onSnapshot((snapshot) => {
          onChange?.(docRows(snapshot));
        }, (error) => {
          console.error(`[${collectionName}:onSnapshot:error]`, error);
          onError?.(error);
        });
      })
      .catch((error) => {
        console.error(`[${collectionName}:subscribe:error]`, error);
        onError?.(error);
      });
    return () => unsubscribe();
  }

  function subscribeCollectionGroup(collectionName, onChange, onError) {
    let unsubscribe = () => {};
    runtimeRequired()
      .then((runtime) => {
        unsubscribe = runtime.db.collectionGroup(collectionName).onSnapshot((snapshot) => {
          onChange?.(docRows(snapshot));
        }, (error) => {
          console.error(`[collectionGroup:${collectionName}:onSnapshot:error]`, error);
          onError?.(error);
        });
      })
      .catch((error) => {
        console.error(`[collectionGroup:${collectionName}:subscribe:error]`, error);
        onError?.(error);
      });
    return () => unsubscribe();
  }

  function subscribeWorkspaceMembers(onChange, onError) {
    let rootRows = [];
    let nestedRows = [];
    let rootUnsubscribe = () => {};
    let nestedUnsubscribe = () => {};
    let active = true;
    const emit = () => {
      if (active) onChange?.(mergeWorkspaceMemberRows(rootRows, nestedRows));
    };
    const reportError = (source, error) => {
      console.error(`[workspace-members:${source}:onSnapshot:error]`, error);
      onError?.(error);
      emit();
    };
    runtimeRequired()
      .then((runtime) => {
        rootUnsubscribe = runtime.db.collection("workspace_members").onSnapshot(async (snapshot) => {
          const rows = docRows(snapshot);
          rootRows = rows.map((row) => ({ ...row, rootMemberExists: true }));
          emit();
          rootRows = await hydrateNestedMemberChecks(runtime, rows);
          emit();
        }, (error) => reportError("root", error));
        nestedUnsubscribe = runtime.db.collectionGroup("members").onSnapshot((snapshot) => {
          nestedRows = docRows(snapshot);
          emit();
        }, (error) => reportError("nested", error));
      })
      .catch((error) => {
        console.error("[workspace-members:subscribe:error]", error);
        onError?.(error);
      });
    return () => {
      active = false;
      try { rootUnsubscribe(); } catch {}
      try { nestedUnsubscribe(); } catch {}
    };
  }

  async function listWorkspaceMembers() {
    const runtime = await runtimeRequired();
    const [rootResult, nestedResult] = await Promise.allSettled([
      runtime.db.collection("workspace_members").get(),
      runtime.db.collectionGroup("members").get()
    ]);
    const rootRows = rootResult.status === "fulfilled" ? await hydrateNestedMemberChecks(runtime, docRows(rootResult.value)) : [];
    const nestedRows = nestedResult.status === "fulfilled" ? docRows(nestedResult.value) : [];
    if (rootResult.status === "rejected") console.error("[workspace-members:root:get:error]", rootResult.reason);
    if (nestedResult.status === "rejected") console.error("[workspace-members:nested:get:error]", nestedResult.reason);
    return mergeWorkspaceMemberRows(rootRows, nestedRows);
  }

  function subscribeWorkspaceNotices(workspaceIds, onChange, onError) {
    const ids = [...new Set((workspaceIds || []).filter(Boolean))];
    let unsubscribers = [];
    const bucket = {};
    runtimeRequired()
      .then((runtime) => {
        if (!ids.length) {
          onChange?.([]);
          return;
        }
        unsubscribers = ids.map((workspaceId) => runtime.db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("notices")
          .onSnapshot((snapshot) => {
            bucket[workspaceId] = docRows(snapshot).map((row) => ({
              ...row,
              workspaceId: row.workspaceId || workspaceId
            }));
            onChange?.(Object.values(bucket).flat());
          }, (error) => {
            console.error(`[workspace-notices:onSnapshot:error] workspaceId=${workspaceId}`, error);
            onError?.(error);
          }));
      })
      .catch((error) => {
        console.error("[workspace-notices:subscribe:error]", error);
        onError?.(error);
      });
    return () => {
      unsubscribers.forEach((unsubscribe) => {
        try { if (typeof unsubscribe === "function") unsubscribe(); } catch {}
      });
      unsubscribers = [];
    };
  }

  async function logAdminAction(runtime, payload) {
    const now = serverTimestamp(runtime);
    const id = safeId(`${payload.action}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const uid = runtime.auth.currentUser?.uid || "";
    const email = runtime.auth.currentUser?.email || "";
    return runtime.db.collection("adminLogs").doc(id).set({
      ...payload,
      ownerUid: payload.ownerUid || uid,
      ownerEmail: payload.ownerEmail || email,
      createdAt: now
    }, { merge: true });
  }

  async function approveJoinRequest(request, selectedRole = "normal") {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const uid = request.uid;
    const options = typeof selectedRole === "object" && selectedRole !== null ? selectedRole : { role: selectedRole };
    const workspaceId = options.workspaceId || request.workspaceId || request.pendingWorkspaceId || "";
    if (!workspaceId) throw new Error("승인할 workspace를 선택하세요.");
    const role = options.role || request.requestedRole || "normal";
    const memberId = `${workspaceId}_${uid}`;
    const ownerUid = runtime.auth.currentUser?.uid || "";
    const payload = {
      uid,
      email: request.email || "",
      displayName: request.displayName || request.email || uid,
      role,
      status: "active",
      workspaceId,
      workspace_id: workspaceId,
      rootMemberExists: true,
      nestedMemberExists: true,
      inviteCodeId: request.inviteCodeId || request.inviteCode || "",
      invitedBy: request.invitedBy || "",
      approvedBy: ownerUid,
      joinedAt: now,
      updatedAt: now
    };
    const batch = runtime.db.batch();
    batch.set(runtime.db.collection("users").doc(uid), {
      uid,
      email: payload.email,
      displayName: payload.displayName,
      workspaceId,
      currentWorkspaceId: workspaceId,
      workspace_id: workspaceId,
      role,
      currentRole: role,
      status: "active",
      disabled: false,
      pendingWorkspaceId: null,
      pendingInviteCodeId: null,
      approvedBy: ownerUid,
      approvedAt: now,
      updatedAt: now
    }, { merge: true });
    batch.set(runtime.db.collection("workspace_members").doc(memberId), { id: memberId, ...payload }, { merge: true });
    batch.set(runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid), { id: memberId, ...payload }, { merge: true });
    batch.set(runtime.db.collection("workspaceJoinRequests").doc(request.id), {
      status: "approved",
      approvedBy: ownerUid,
      approvedAt: now,
      updatedAt: now
    }, { merge: true });
    await batch.commit();
    await logAdminAction(runtime, { action: "approve_workspace_join", targetUid: uid, workspaceId, after: { role, requestId: request.id } });
  }

  async function rejectJoinRequest(request) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const ownerUid = runtime.auth.currentUser?.uid || "";
    const batch = runtime.db.batch();
    batch.set(runtime.db.collection("users").doc(request.uid), {
      status: "rejected",
      rejectedBy: ownerUid,
      rejectedAt: now,
      updatedAt: now
    }, { merge: true });
    batch.set(runtime.db.collection("workspaceJoinRequests").doc(request.id), {
      status: "rejected",
      rejectedBy: ownerUid,
      rejectedAt: now,
      updatedAt: now
    }, { merge: true });
    await batch.commit();
    await logAdminAction(runtime, { action: "reject_workspace_join", targetUid: request.uid, workspaceId: request.workspaceId, after: { requestId: request.id } });
  }

  async function approveAdminApplication(application, options = {}) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const ownerUid = runtime.auth.currentUser?.uid || "";
    const role = options.role || "super_manager";
    const uid = application.uid;
    const workspaceId = options.workspaceMode === "existing"
      ? options.workspaceId
      : safeId(`ws_${uid}_${Date.now()}`);
    if (!workspaceId) throw new Error("workspace를 선택하거나 새 workspace 이름을 입력하세요.");
    if (role === "super_manager" && !confirm("이 사용자에게 해당 workspace의 최고관리자 권한을 부여하시겠습니까?\n이 권한은 해당 workspace의 사용자와 데이터를 관리할 수 있습니다.")) {
      return;
    }
    const memberId = `${workspaceId}_${uid}`;
    const workspaceName = options.workspaceName || application.requestedWorkspaceName || `${application.displayName || application.email || uid} workspace`;
    const memberPayload = {
      id: memberId,
      uid,
      email: application.email || "",
      displayName: application.displayName || application.email || uid,
      role,
      status: "active",
      workspaceId,
      workspace_id: workspaceId,
      rootMemberExists: true,
      nestedMemberExists: true,
      approvedBy: ownerUid,
      joinedAt: now,
      updatedAt: now
    };
    const batch = runtime.db.batch();
    batch.set(runtime.db.collection("workspaces").doc(workspaceId), {
      workspaceId,
      name: workspaceName,
      ownerUid: role === "super_manager" ? uid : ownerUid,
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    batch.set(runtime.db.collection("users").doc(uid), {
      uid,
      email: memberPayload.email,
      displayName: memberPayload.displayName,
      role,
      currentRole: role,
      status: "active",
      disabled: false,
      workspaceId,
      currentWorkspaceId: workspaceId,
      workspace_id: workspaceId,
      invitedBy: request.invitedBy || null,
      invitedByEmail: request.inviterEmail || request.invitedByEmail || "",
      inviteCode: request.inviteCode || request.inviteCodeId || "",
      inviteCodeId: request.inviteCodeId || request.inviteCode || "",
      joinedAt: now,
      joinedWorkspaceAt: now,
      pendingWorkspaceId: null,
      pendingInviteCodeId: null,
      approvedBy: ownerUid,
      approvedAt: now,
      updatedAt: now
    }, { merge: true });
    batch.set(runtime.db.collection("workspace_members").doc(memberId), memberPayload, { merge: true });
    batch.set(runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid), memberPayload, { merge: true });
    batch.set(runtime.db.collection("adminApplications").doc(application.id), {
      status: "approved",
      approvedBy: ownerUid,
      approvedAt: now,
      workspaceId,
      role,
      updatedAt: now
    }, { merge: true });
    await batch.commit();
    await logAdminAction(runtime, { action: "approve_admin_application", targetUid: uid, workspaceId, after: { role, applicationId: application.id } });
  }

  async function rejectAdminApplication(application) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const ownerUid = runtime.auth.currentUser?.uid || "";
    const batch = runtime.db.batch();
    batch.set(runtime.db.collection("adminApplications").doc(application.id), {
      status: "rejected",
      rejectedBy: ownerUid,
      rejectedAt: now,
      updatedAt: now
    }, { merge: true });
    batch.set(runtime.db.collection("users").doc(application.uid), {
      status: "rejected",
      rejectedBy: ownerUid,
      rejectedAt: now,
      updatedAt: now
    }, { merge: true });
    await batch.commit();
    await logAdminAction(runtime, { action: "reject_admin_application", targetUid: application.uid, after: { applicationId: application.id } });
  }

  async function saveSystemNotice(notice) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const id = notice.id || safeId(`system_notice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const payload = {
      title: notice.title || "",
      content: notice.content || "",
      status: notice.status || "active",
      priority: notice.priority || "normal",
      pinned: !!notice.pinned,
      target: notice.target || "all_workspaces",
      targetWorkspaceIds: Array.isArray(notice.targetWorkspaceIds) ? notice.targetWorkspaceIds : [],
      createdBy: notice.createdBy || runtime.auth.currentUser?.uid || "",
      createdByEmail: notice.createdByEmail || runtime.auth.currentUser?.email || "",
      updatedAt: now
    };
    if (!notice.id) payload.createdAt = now;
    await runtime.db.collection("systemNotices").doc(id).set(payload, { merge: true });
    await logAdminAction(runtime, { action: notice.id ? "update_system_notice" : "create_system_notice", noticeId: id, after: payload });
    return { id, ...payload };
  }

  function normalizeWorkspaceTargets({ targetMode, workspaceIds, allWorkspaceIds }) {
    const mode = targetMode || "single";
    if (mode === "all") return [...new Set((allWorkspaceIds || []).filter(Boolean))];
    return [...new Set((workspaceIds || []).filter(Boolean))];
  }

  async function createWorkspaceNotice(options = {}) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const title = String(options.title || "").trim();
    const content = String(options.content || "").trim();
    const targetWorkspaceIds = normalizeWorkspaceTargets(options);
    if (!targetWorkspaceIds.length) throw new Error("워크스페이스를 선택해주세요.");
    if (!title) throw new Error("공지 제목을 입력해주세요.");
    if (!content) throw new Error("공지 내용을 입력해주세요.");

    const ownerUid = runtime.auth.currentUser?.uid || "";
    const ownerEmail = runtime.auth.currentUser?.email || "";
    const batch = runtime.db.batch();
    const noticeIds = [];
    targetWorkspaceIds.forEach((workspaceId, index) => {
      const noticeId = safeId(`workspace_notice_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`);
      noticeIds.push({ workspaceId, noticeId });
      batch.set(runtime.db.collection("workspaces").doc(workspaceId).collection("notices").doc(noticeId), {
        title,
        content,
        workspaceId,
        status: options.status || "active",
        visibility: "workspace",
        pinned: !!options.pinned,
        priority: options.priority || "normal",
        authorUid: ownerUid,
        authorEmail: ownerEmail,
        authorRole: "system_owner",
        createdFrom: "system_admin",
        createdAt: now,
        updatedAt: now
      }, { merge: true });
    });

    const logId = safeId(`create_workspace_notice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    batch.set(runtime.db.collection("adminLogs").doc(logId), {
      action: "create_workspace_notice",
      ownerUid,
      ownerEmail,
      targetWorkspaceIds,
      noticeTitle: title,
      noticeIds,
      createdAt: now
    }, { merge: true });
    await batch.commit();
    return { targetWorkspaceIds, noticeIds };
  }

  async function updateWorkspaceNotice(options = {}) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const workspaceId = String(options.workspaceId || "").trim();
    const id = String(options.id || "").trim();
    if (!workspaceId || !id) throw new Error("workspace notice id is required.");
    const payload = {
      title: String(options.title || "").trim(),
      content: String(options.content || "").trim(),
      status: options.status || "active",
      visibility: "workspace",
      pinned: !!options.pinned,
      priority: options.priority || "normal",
      updatedAt: now,
      updatedBy: runtime.auth.currentUser?.uid || "",
      updatedByEmail: runtime.auth.currentUser?.email || ""
    };
    if (!payload.title) throw new Error("공지 제목을 입력하세요.");
    if (!payload.content) throw new Error("공지 내용을 입력하세요.");
    await runtime.db.collection("workspaces").doc(workspaceId).collection("notices").doc(id).set(payload, { merge: true });
    await logAdminAction(runtime, { action: "update_workspace_notice", workspaceId, noticeId: id, after: payload });
    return { workspaceId, id, ...payload };
  }

  async function deleteWorkspaceNotice(workspaceId, id) {
    const runtime = await runtimeRequired();
    if (!workspaceId || !id) throw new Error("workspace notice id is required.");
    await runtime.db.collection("workspaces").doc(workspaceId).collection("notices").doc(id).delete();
    await logAdminAction(runtime, { action: "delete_workspace_notice", workspaceId, noticeId: id });
  }

  async function archiveSystemNotice(id) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    await runtime.db.collection("systemNotices").doc(id).set({ status: "archived", updatedAt: now }, { merge: true });
    await logAdminAction(runtime, { action: "archive_system_notice", noticeId: id });
  }

  async function restoreSystemNotice(id) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    await runtime.db.collection("systemNotices").doc(id).set({ status: "active", updatedAt: now }, { merge: true });
    await logAdminAction(runtime, { action: "restore_system_notice", noticeId: id });
  }

  async function deleteSystemNotice(id) {
    const runtime = await runtimeRequired();
    await runtime.db.collection("systemNotices").doc(id).delete();
    await logAdminAction(runtime, { action: "delete_system_notice", noticeId: id });
  }

  async function saveSystemIntegration(provider = "neis", payload = {}) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const id = safeId(provider || "neis") || "neis";
    const data = {
      provider: id,
      enabled: payload.enabled === true,
      status: payload.status || "not_configured",
      displayName: payload.displayName || (id === "neis" ? "나이스 API" : id),
      keyStorage: "netlify_env",
      envKeyName: payload.envKeyName || (id === "neis" ? "NEIS_API_KEY" : `${id.toUpperCase()}_API_KEY`),
      updatedBy: runtime.auth.currentUser?.uid || "",
      updatedAt: now
    };
    await runtime.db.collection("systemIntegrations").doc(id).set(data, { merge: true });
    await logAdminAction(runtime, { action: "save_system_integration", provider: id, after: data });
    return { id, ...data };
  }

  async function testSystemIntegration(provider = "neis") {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const id = safeId(provider || "neis") || "neis";
    const result = {
      ok: false,
      message: "아직 Netlify Function/API Key 연결 전입니다. Firestore에는 키 원문을 저장하지 않고 NEIS_API_KEY 환경변수와 서버 함수를 연결한 뒤 실제 테스트를 수행합니다."
    };
    const batch = runtime.db.batch();
    batch.set(runtime.db.collection("systemIntegrations").doc(id), {
      provider: id,
      displayName: id === "neis" ? "나이스 API" : id,
      keyStorage: "netlify_env",
      envKeyName: id === "neis" ? "NEIS_API_KEY" : `${id.toUpperCase()}_API_KEY`,
      status: "not_configured",
      lastTestedAt: now,
      lastTestResult: result,
      updatedBy: runtime.auth.currentUser?.uid || "",
      updatedAt: now
    }, { merge: true });
    batch.set(runtime.db.collection("systemIntegrationLogs").doc(safeId(`${id}_test_${Date.now()}`)), {
      provider: id,
      action: "test_system_integration",
      ownerUid: runtime.auth.currentUser?.uid || "",
      ownerEmail: runtime.auth.currentUser?.email || "",
      result,
      createdAt: now
    }, { merge: true });
    batch.set(runtime.db.collection("adminLogs").doc(safeId(`test_system_integration_${Date.now()}`)), {
      action: "test_system_integration",
      provider: id,
      ownerUid: runtime.auth.currentUser?.uid || "",
      ownerEmail: runtime.auth.currentUser?.email || "",
      after: result,
      createdAt: now
    }, { merge: true });
    await batch.commit();
    return result;
  }

  async function ensureSystemOwnerWorkspace(options = {}) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const uid = runtime.auth.currentUser?.uid || "";
    if (!uid) throw new Error("Signed-in system owner is required.");
    const ownerSnap = await runtime.db.collection("users").doc(uid).get();
    const owner = ownerSnap.exists ? ownerSnap.data() || {} : {};
    if ((owner.role || owner.currentRole) !== "system_owner" && !await isSystemOwner(uid)) {
      throw new Error("Only system_owner can create an owner workspace.");
    }
    const email = runtime.auth.currentUser?.email || owner.email || "";
    const displayName = options.displayName || owner.displayName || email || uid;
    const workspaceId = owner.workspaceId || owner.currentWorkspaceId || safeId(`owner_ws_${uid}`);
    const workspaceName = options.name || owner.ownerWorkspaceName || `${displayName} workspace`;
    const memberId = `${workspaceId}_${uid}`;
    const memberPayload = {
      id: memberId,
      uid,
      email,
      displayName,
      role: "super_manager",
      status: "active",
      workspaceId,
      workspace_id: workspaceId,
      rootMemberExists: true,
      nestedMemberExists: true,
      joinedAt: owner.joinedAt || now,
      updatedAt: now,
      invitedBy: null,
      ownerGlobalRole: "system_owner"
    };
    const batch = runtime.db.batch();
    batch.set(runtime.db.collection("workspaces").doc(workspaceId), {
      workspaceId,
      name: workspaceName,
      ownerUid: uid,
      ownerEmail: email,
      status: "active",
      createdAt: owner.ownerWorkspaceCreatedAt || now,
      updatedAt: now
    }, { merge: true });
    batch.set(runtime.db.collection("users").doc(uid), {
      uid,
      email,
      displayName,
      role: "system_owner",
      currentRole: "system_owner",
      workspaceRole: "super_manager",
      status: "active",
      disabled: false,
      workspaceId,
      currentWorkspaceId: workspaceId,
      workspace_id: workspaceId,
      ownerWorkspaceName: workspaceName,
      ownerWorkspaceCreatedAt: owner.ownerWorkspaceCreatedAt || now,
      updatedAt: now
    }, { merge: true });
    batch.set(runtime.db.collection("workspace_members").doc(memberId), memberPayload, { merge: true });
    batch.set(runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid), memberPayload, { merge: true });
    await batch.commit();
    await logAdminAction(runtime, { action: "ensure_system_owner_workspace", targetUid: uid, workspaceId, after: { workspaceName } });
    return { workspaceId, workspaceName, role: "system_owner", workspaceRole: "super_manager", status: "active" };
  }

  function targetUserId(user) {
    return user?.uid || user?.id || "";
  }

  function targetWorkspaceId(user) {
    return user?.workspaceId || user?.currentWorkspaceId || user?.workspace_id || "";
  }

  function normalizeAdminRole(value) {
    const raw = String(value || "").trim();
    const mapped = {
      "최고관리자": "super_manager",
      "슈퍼매니저": "super_manager",
      "관리자": "manager",
      "선생님": "teacher",
      "일반": "normal",
      "일반사용자": "normal",
      "보기전용": "viewer",
      "읽기전용": "viewer",
      "프린트": "print_account",
      "프린트전용": "print_account"
    };
    return mapped[raw] || raw;
  }

  function assertMutableUser(runtime, user) {
    const uid = targetUserId(user);
    if (!uid) throw new Error("Target user uid is missing.");
    if (uid === runtime.auth.currentUser?.uid) throw new Error("You cannot modify the currently signed-in owner account.");
    if ((user?.role || user?.currentRole) === "system_owner") throw new Error("System owner accounts are protected.");
    return uid;
  }

  async function updateUserAdminFields(options = {}) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const user = options.user || {};
    const uid = assertMutableUser(runtime, user);
    const beforeWorkspaceId = targetWorkspaceId(user);
    const workspaceId = String(options.workspaceId || beforeWorkspaceId || "").trim();
    const role = normalizeAdminRole(options.role || user.role || user.currentRole || "normal");
    const status = "active";
    if (!role || ["pending", "null", "undefined"].includes(role)) throw new Error("저장할 실제 권한을 선택하세요. pending은 로그인 권한으로 저장할 수 없습니다.");
    if (role === "system_owner") throw new Error("system_owner 역할은 이 화면에서 부여할 수 없습니다.");
    if (!workspaceId) throw new Error("권한을 저장할 workspace를 선택하세요.");
    const memberId = `${workspaceId}_${uid}`;
    const previousMemberId = beforeWorkspaceId ? `${beforeWorkspaceId}_${uid}` : "";
    const email = user.email || "";
    const displayName = user.displayName || user.name || email || uid;
    const batch = runtime.db.batch();

    batch.set(runtime.db.collection("users").doc(uid), {
      uid,
      email,
      displayName,
      role,
      currentRole: role,
      workspaceRole: role,
      status,
      disabled: status === "disabled",
      active: status !== "disabled",
      workspaceId: workspaceId || null,
      currentWorkspaceId: workspaceId || null,
      workspace_id: workspaceId || null,
      pendingWorkspaceId: null,
      pendingInviteCodeId: null,
      rejectedReason: null,
      updatedAt: now,
      updatedBy: runtime.auth.currentUser?.uid || "",
      roleChangedAt: now,
      roleChangedBy: runtime.auth.currentUser?.uid || ""
    }, { merge: true });

    if (beforeWorkspaceId && workspaceId && beforeWorkspaceId !== workspaceId) {
      const movedPayload = {
        status: "moved",
        movedToWorkspaceId: workspaceId,
        updatedAt: now,
        updatedBy: runtime.auth.currentUser?.uid || ""
      };
      batch.set(runtime.db.collection("workspace_members").doc(previousMemberId), movedPayload, { merge: true });
      batch.set(runtime.db.collection("workspaces").doc(beforeWorkspaceId).collection("members").doc(uid), movedPayload, { merge: true });
    }

    const memberPayload = {
      id: memberId,
      uid,
      email,
      displayName,
      role,
      status,
      disabled: false,
      workspaceId,
      workspace_id: workspaceId,
      rootMemberExists: true,
      nestedMemberExists: true,
      joinedAt: user.joinedAt || now,
      updatedAt: now,
      updatedBy: runtime.auth.currentUser?.uid || "",
      roleChangedAt: now,
      roleChangedBy: runtime.auth.currentUser?.uid || ""
    };
    batch.set(runtime.db.collection("workspace_members").doc(memberId), memberPayload, { merge: true });
    batch.set(runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid), memberPayload, { merge: true });

    await batch.commit();

    const [savedUserSnap, savedRootSnap, savedNestedSnap] = await Promise.all([
      runtime.db.collection("users").doc(uid).get(),
      runtime.db.collection("workspace_members").doc(memberId).get(),
      runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid).get()
    ]);
    const savedUser = savedUserSnap.exists ? savedUserSnap.data() || {} : {};
    const savedRoot = savedRootSnap.exists ? savedRootSnap.data() || {} : {};
    const savedNested = savedNestedSnap.exists ? savedNestedSnap.data() || {} : {};
    const verification = {
      uid,
      expectedRole: role,
      expectedStatus: status,
      expectedWorkspaceId: workspaceId,
      userExists: savedUserSnap.exists,
      userRole: savedUser.role,
      userStatus: savedUser.status,
      userWorkspaceId: savedUser.workspaceId || savedUser.currentWorkspaceId || savedUser.workspace_id || null,
      rootExists: savedRootSnap.exists,
      rootRole: savedRoot.role,
      rootStatus: savedRoot.status,
      rootWorkspaceId: savedRoot.workspaceId || savedRoot.workspace_id || null,
      nestedExists: savedNestedSnap.exists,
      nestedRole: savedNested.role,
      nestedStatus: savedNested.status,
      nestedWorkspaceId: savedNested.workspaceId || savedNested.workspace_id || null
    };
    const verified = verification.userExists
      && verification.userRole === role
      && verification.userStatus === status
      && verification.userWorkspaceId === workspaceId
      && verification.rootExists
      && verification.rootRole === role
      && verification.rootStatus === status
      && verification.rootWorkspaceId === workspaceId
      && verification.nestedExists
      && verification.nestedRole === role
      && verification.nestedStatus === status
      && verification.nestedWorkspaceId === workspaceId;

    if (!verified) {
      console.error("[SystemAdmin Permission Verify Failed]", verification);
      throw new Error("권한 저장 후 검증에 실패했습니다. users와 workspace member 문서가 서로 맞지 않습니다.");
    }

    await logAdminAction(runtime, { action: "update_user_admin_fields", targetUid: uid, workspaceId, after: { role, status, beforeWorkspaceId, verified: true } });
    return {
      uid,
      workspaceId,
      role,
      status,
      email,
      displayName,
      rootMemberExists: true,
      nestedMemberExists: true,
      verified: true,
      verification
    };
  }

  async function repairUserPermission(user = {}) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const uid = targetUserId(user);
    if (!uid) throw new Error("Target user uid is missing.");
    const userSnap = await runtime.db.collection("users").doc(uid).get();
    const existingUserData = userSnap.exists ? { id: userSnap.id, ...(userSnap.data() || {}) } : {};
    const userData = { ...existingUserData, ...user };
    const workspaceId = String(targetWorkspaceId(user) || targetWorkspaceId(userData) || "").trim();
    if (!workspaceId) throw new Error("연결할 workspaceId가 없습니다.");
    const memberId = `${workspaceId}_${uid}`;
    const rootSnap = await runtime.db.collection("workspace_members").doc(memberId).get();
    const nestedSnap = await runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid).get();
    const rootMember = rootSnap.exists ? rootSnap.data() || {} : {};
    const nestedMember = nestedSnap.exists ? nestedSnap.data() || {} : {};
    const isOwner = userData.role === "system_owner" || userData.currentRole === "system_owner";
    const selectedRole = String(user.role || user.currentRole || user.workspaceRole || "").trim();
    let workspaceRole = isOwner
      ? "super_manager"
      : selectedRole || userData.workspaceRole || userData.currentRole || userData.role || nestedMember.role || rootMember.role || "normal";
    if (!workspaceRole || workspaceRole === "pending" || workspaceRole === "null" || workspaceRole === "undefined") workspaceRole = "normal";
    const selectedStatus = String(user.status || userData.status || "").trim();
    const status = selectedStatus === "disabled" || rootMember.status === "disabled" || nestedMember.status === "disabled"
      ? "disabled"
      : "active";
    const email = userData.email || rootMember.email || nestedMember.email || "";
    const displayName = userData.displayName || userData.name || rootMember.displayName || nestedMember.displayName || email || uid;
    const restoredBy = runtime.auth.currentUser?.uid || "";
    const memberPayload = {
      id: memberId,
      uid,
      email,
      displayName,
      role: workspaceRole,
      status,
      disabled: status === "disabled",
      workspaceId,
      workspace_id: workspaceId,
      rootMemberExists: true,
      nestedMemberExists: true,
      joinedAt: nestedMember.joinedAt || rootMember.joinedAt || userData.joinedAt || now,
      updatedAt: now,
      repairedAt: now,
      repairedBy: restoredBy,
      restoredAt: now,
      restoredBy
    };
    if (isOwner) memberPayload.ownerGlobalRole = "system_owner";
    const batch = runtime.db.batch();
    batch.set(runtime.db.collection("users").doc(uid), {
      uid,
      email,
      displayName,
      role: isOwner ? "system_owner" : workspaceRole,
      currentRole: isOwner ? "system_owner" : workspaceRole,
      workspaceRole,
      status,
      disabled: status === "disabled",
      active: status !== "disabled",
      workspaceId,
      currentWorkspaceId: workspaceId,
      workspace_id: workspaceId,
      pendingWorkspaceId: null,
      pendingInviteCodeId: null,
      rejectedReason: null,
      updatedAt: now,
      repairedAt: now,
      repairedBy: restoredBy,
      restoredAt: now,
      restoredBy
    }, { merge: true });
    batch.set(runtime.db.collection("workspace_members").doc(memberId), memberPayload, { merge: true });
    batch.set(runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid), memberPayload, { merge: true });
    await batch.commit();
    const repairedRootSnap = await runtime.db.collection("workspace_members").doc(memberId).get();
    const repairedNestedSnap = await runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid).get();
    await logAdminAction(runtime, { action: "repair_user_permission", targetUid: uid, workspaceId, after: { role: workspaceRole, status } });
    return {
      uid,
      workspaceId,
      role: workspaceRole,
      status,
      email,
      displayName,
      rootMemberExists: repairedRootSnap.exists,
      nestedMemberExists: repairedNestedSnap.exists
    };
  }

  async function disableUserAccount(user) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const uid = assertMutableUser(runtime, user);
    const workspaceId = targetWorkspaceId(user);
    const memberId = workspaceId ? `${workspaceId}_${uid}` : "";
    const batch = runtime.db.batch();

    batch.set(runtime.db.collection("users").doc(uid), {
      status: "disabled",
      disabled: true,
      active: false,
      updatedAt: now,
      disabledAt: now,
      disabledBy: runtime.auth.currentUser?.uid || ""
    }, { merge: true });
    if (workspaceId) {
      batch.set(runtime.db.collection("workspace_members").doc(memberId), {
        status: "disabled",
        disabled: true,
        updatedAt: now,
        disabledAt: now,
        disabledBy: runtime.auth.currentUser?.uid || ""
      }, { merge: true });
      batch.set(runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid), {
        status: "disabled",
        disabled: true,
        updatedAt: now,
        disabledAt: now,
        disabledBy: runtime.auth.currentUser?.uid || ""
      }, { merge: true });
    }
    await batch.commit();
    await logAdminAction(runtime, { action: "disable_user_account", targetUid: uid, workspaceId, after: { email: user?.email || "", role: user?.role || "" } });
  }

  async function enableUserAccount(user) {
    const runtime = await runtimeRequired();
    const now = serverTimestamp(runtime);
    const uid = assertMutableUser(runtime, user);
    const workspaceId = targetWorkspaceId(user);
    const memberId = workspaceId ? `${workspaceId}_${uid}` : "";
    const role = user?.workspaceRole || user?.currentRole || user?.role || "normal";
    const batch = runtime.db.batch();

    batch.set(runtime.db.collection("users").doc(uid), {
      status: "active",
      disabled: false,
      active: true,
      role,
      currentRole: role,
      workspaceRole: role,
      updatedAt: now,
      enabledAt: now,
      enabledBy: runtime.auth.currentUser?.uid || ""
    }, { merge: true });
    if (workspaceId) {
      const memberPayload = {
        role,
        status: "active",
        disabled: false,
        active: true,
        workspaceId,
        workspace_id: workspaceId,
        updatedAt: now,
        enabledAt: now,
        enabledBy: runtime.auth.currentUser?.uid || ""
      };
      batch.set(runtime.db.collection("workspace_members").doc(memberId), memberPayload, { merge: true });
      batch.set(runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid), memberPayload, { merge: true });
    }
    await batch.commit();
    await logAdminAction(runtime, { action: "enable_user_account", targetUid: uid, workspaceId, after: { email: user?.email || "", role } });
  }

  async function deleteUserFirestoreProfile(user) {
    const runtime = await runtimeRequired();
    const uid = assertMutableUser(runtime, user);
    const workspaceId = targetWorkspaceId(user);
    const memberId = workspaceId ? `${workspaceId}_${uid}` : "";
    const batch = runtime.db.batch();

    batch.delete(runtime.db.collection("users").doc(uid));
    if (workspaceId) {
      batch.delete(runtime.db.collection("workspace_members").doc(memberId));
      batch.delete(runtime.db.collection("workspaces").doc(workspaceId).collection("members").doc(uid));
    }
    await batch.commit();
    await logAdminAction(runtime, { action: "delete_user_firestore_profile", targetUid: uid, workspaceId, after: { email: user?.email || "", authDeleted: false } });
  }

  window.PMSystemAdminService = {
    isSystemOwner,
    getUserDocument,
    submitJoinRequest,
    submitAdminApplication,
    subscribeCurrentUser,
    subscribeSystemNotices,
    subscribeUsers: (onChange, onError) => subscribeCollection("users", onChange, onError),
    subscribeWorkspaces: (onChange, onError) => subscribeCollection("workspaces", onChange, onError),
    subscribeWorkspaceMembers,
    listWorkspaceMembers,
    subscribeWorkspaceNotices,
    subscribeJoinRequests: (onChange, onError) => subscribeCollection("workspaceJoinRequests", onChange, onError),
    subscribeAdminApplications: (onChange, onError) => subscribeCollection("adminApplications", onChange, onError),
    subscribeAdminLogs: (onChange, onError) => subscribeCollection("adminLogs", onChange, onError),
    subscribeSystemNoticeAdmin: (onChange, onError) => subscribeCollection("systemNotices", onChange, onError),
    subscribeSystemIntegrations: (onChange, onError) => subscribeCollection("systemIntegrations", onChange, onError),
    subscribeSystemIntegrationLogs: (onChange, onError) => subscribeCollection("systemIntegrationLogs", onChange, onError),
    approveJoinRequest,
    rejectJoinRequest,
    approveAdminApplication,
    rejectAdminApplication,
    saveSystemNotice,
    restoreSystemNotice,
    deleteSystemNotice,
    createWorkspaceNotice,
    updateWorkspaceNotice,
    deleteWorkspaceNotice,
    archiveSystemNotice,
    saveSystemIntegration,
    testSystemIntegration,
    ensureSystemOwnerWorkspace,
    updateUserAdminFields,
    repairUserPermission,
    disableUserAccount,
    enableUserAccount,
    deleteUserFirestoreProfile,
    sortSystemNotices
  };
})();
