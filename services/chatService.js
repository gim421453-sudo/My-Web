// Firestore-backed admin/support chat facade shared by the web app and future app clients.
(function () {
  const THREADS = "chatThreads";
  const MESSAGES = "chatMessages";
  const EVENT_LOGS = "logs";
  const LOCAL_ERROR_KEY = "pm:error-logs:v92";
  const MANAGER_ROLES = ["system_owner", "super_manager", "manager"];
  const USER_ROLES = ["normal", "viewer", "print_account", "teacher"];

  function uidOf(user) {
    return user?.uid || user?.id || "";
  }

  function roleOf(user) {
    return window.PMShared?.roles?.normalizeRole?.(user?.role || user?.currentRole || user?.workspaceRole) || user?.role || "normal";
  }

  function workspaceIdOf(user) {
    return user?.workspace_id || user?.workspaceId || user?.currentWorkspaceId || window.PMDataService?.currentWorkspaceId?.() || "";
  }

  function canManage(user) {
    return MANAGER_ROLES.includes(roleOf(user));
  }

  function canUseChat(user) {
    return !!uidOf(user) && !!workspaceIdOf(user) && [...MANAGER_ROLES, ...USER_ROLES].includes(roleOf(user));
  }

  function serverTimestamp(runtime) {
    return runtime.sdk.firestore.serverTimestamp();
  }

  function safeId(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function readLocalErrors() {
    try { return JSON.parse(localStorage.getItem(LOCAL_ERROR_KEY) || "[]"); } catch { return []; }
  }

  function writeLocalErrors(rows) {
    localStorage.setItem(LOCAL_ERROR_KEY, JSON.stringify(rows.slice(0, 80)));
  }

  function localErrorLog(payload = {}) {
    const row = {
      logId: payload.logId || `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      source: payload.source || "app",
      level: payload.level || "error",
      message: String(payload.message || payload.error?.message || payload.error || "Unknown error"),
      stack: String(payload.stack || payload.error?.stack || ""),
      workspaceId: payload.workspaceId || workspaceIdOf(payload.user) || "",
      uid: payload.uid || uidOf(payload.user) || "",
      role: payload.role || roleOf(payload.user || {}),
      action: payload.action || payload.eventType || "",
      eventType: payload.eventType || payload.action || "",
      createdAt: payload.createdAt || nowIso(),
      context: payload.context || {}
    };
    const rows = readLocalErrors();
    rows.unshift(row);
    writeLocalErrors(rows);
    return row;
  }

  async function runtimeRequired() {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    if (!runtime) throw new Error("정상적으로 연결되지 않았습니다");
    return runtime;
  }

  async function writeEvent(type, user, payload = {}) {
    const local = localErrorLog({
      source: payload.source || "chat",
      level: payload.level || "info",
      message: payload.message || type,
      user,
      workspaceId: payload.workspaceId,
      context: { type, ...(payload.context || {}) }
    });
    try {
      const runtime = await runtimeRequired();
      await runtime.db.collection(EVENT_LOGS).doc(local.logId).set({
        ...local,
        eventType: type,
        action: type,
        createdAt: serverTimestamp(runtime)
      }, { merge: true });
    } catch (error) {
      console.info("[chat:event-log:local-only]", error?.code || "", error?.message || String(error));
    }
    return local;
  }

  async function saveErrorLog(error, context = {}, user = window.currentUser || null) {
    const local = localErrorLog({ source: context.source || "runtime", level: "error", error, context, user });
    try {
      const runtime = await runtimeRequired();
      await runtime.db.collection(EVENT_LOGS).doc(local.logId).set({
        ...local,
        eventType: "error",
        action: context.action || "error",
        createdAt: serverTimestamp(runtime)
      }, { merge: true });
    } catch (writeError) {
      console.info("[chat:error-log:local-only]", writeError?.code || "", writeError?.message || String(writeError));
    }
    return local;
  }

  function visibleThreadQuery(runtime, user) {
    const workspaceId = workspaceIdOf(user);
    if (roleOf(user) === "system_owner") {
      return runtime.db.collection(THREADS).orderBy("updatedAt", "desc").limit(100);
    }
    if (canManage(user)) {
      return runtime.db.collection(THREADS).where("workspaceId", "==", workspaceId).limit(100);
    }
    return runtime.db.collection(THREADS)
      .where("participantUids", "array-contains", uidOf(user))
      .limit(50);
  }

  function toMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.seconds === "number") return value.seconds * 1000;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function sortThreads(rows) {
    return rows.sort((a, b) => toMillis(b.updatedAt || b.lastMessageAt || b.createdAt) - toMillis(a.updatedAt || a.lastMessageAt || a.createdAt));
  }

  async function listThreads(user) {
    const runtime = await runtimeRequired();
    const snap = await visibleThreadQuery(runtime, user).get();
    return sortThreads(snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) })));
  }

  function subscribeThreads(user, onChange, onError) {
    let unsubscribe = null;
    runtimeRequired().then((runtime) => {
      unsubscribe = visibleThreadQuery(runtime, user).onSnapshot((snap) => {
        onChange(sortThreads(snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))));
      }, (error) => {
        saveErrorLog(error, { source: "chat:subscribeThreads" }, user);
        onError?.(error);
      });
    }).catch((error) => {
      saveErrorLog(error, { source: "chat:subscribeThreads:init" }, user);
      onError?.(error);
    });
    return () => unsubscribe?.();
  }

  function subscribeMessages(threadId, user, onChange, onError) {
    let unsubscribe = null;
    runtimeRequired().then((runtime) => {
      unsubscribe = runtime.db.collection(MESSAGES)
        .where("threadId", "==", threadId)
        .limit(200)
        .onSnapshot((snap) => {
          onChange(snap.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
            .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt)));
        }, (error) => {
          saveErrorLog(error, { source: "chat:subscribeMessages", threadId }, user);
          onError?.(error);
        });
    }).catch((error) => {
      saveErrorLog(error, { source: "chat:subscribeMessages:init", threadId }, user);
      onError?.(error);
    });
    return () => unsubscribe?.();
  }

  async function createThread(user, options = {}) {
    if (!canUseChat(user)) throw new Error("채팅을 사용할 권한이 없습니다.");
    const runtime = await runtimeRequired();
    const workspaceId = options.workspaceId || workspaceIdOf(user);
    const uid = uidOf(user);
    const role = roleOf(user);
    const type = options.type === "admin" ? "admin" : "support";
    const threadId = safeId(options.threadId || `${workspaceId}_${type}_${uid}_${Date.now()}`);
    const now = serverTimestamp(runtime);
    const participantUids = [...new Set([uid, ...(options.participantUids || [])].filter(Boolean))];
    await runtime.db.collection(THREADS).doc(threadId).set({
      threadId,
      type,
      status: options.status || "new",
      title: options.title || (type === "admin" ? "관리자 간 대화" : "사용자 문의"),
      workspaceId,
      createdByUid: uid,
      createdByRole: role,
      createdByName: options.senderName || user?.name || user?.displayName || user?.email || uid,
      source: options.source || "main",
      participantUids,
      participantRoles: [...new Set([role, ...(options.participantRoles || [])].filter(Boolean))],
      lastMessageText: "",
      lastMessage: "",
      unreadByUid: {},
      relatedLogId: options.logId || options.relatedLogId || "",
      relatedLogIds: options.logId ? [options.logId] : [],
      context: options.context || {},
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    await writeEvent("chat_thread_created", user, { workspaceId, context: { threadId, type } });
    if (options.initialMessage) {
      await sendMessage(threadId, user, options.initialMessage, {
        logId: options.logId || options.relatedLogId,
        source: options.source || "main",
        attachments: options.attachments || [],
        senderName: options.senderName
      });
    }
    return threadId;
  }

  async function sendMessage(threadId, user, text, options = {}) {
    if (!String(text || "").trim()) throw new Error("메시지를 입력하세요.");
    const runtime = await runtimeRequired();
    const threadRef = runtime.db.collection(THREADS).doc(threadId);
    const threadSnap = await threadRef.get();
    const thread = threadSnap.exists ? threadSnap.data() || {} : {};
    const workspaceId = thread.workspaceId || options.workspaceId || workspaceIdOf(user);
    const uid = uidOf(user);
    const role = roleOf(user);
    const messageRef = runtime.db.collection(MESSAGES).doc();
    const now = serverTimestamp(runtime);
    const body = {
      messageId: messageRef.id,
      threadId,
      type: thread.type || options.type || "support",
      text: String(text).trim(),
      authorUid: uid,
      authorRole: role,
      senderUid: uid,
      senderRole: role,
      senderName: options.senderName || user?.name || user?.displayName || user?.email || uid,
      message: String(text).trim(),
      source: options.source || thread.source || "main",
      workspaceId,
      createdAt: now,
      readBy: [uid],
      logId: options.logId || options.relatedLogId || null,
      relatedLogId: options.logId || options.relatedLogId || null,
      attachments: options.attachments || []
    };
    const batch = runtime.db.batch();
    batch.set(messageRef, body);
    batch.set(threadRef, {
      workspaceId,
      lastMessageText: body.text.slice(0, 180),
      lastMessage: body.message.slice(0, 180),
      lastMessageAuthorUid: uid,
      lastMessageAt: now,
      updatedAt: now,
      status: thread.status === "closed" ? "processing" : thread.status || "new",
      participantUids: [...new Set([...(thread.participantUids || []), uid])],
      participantRoles: [...new Set([...(thread.participantRoles || []), role])],
      relatedLogId: options.logId || options.relatedLogId || thread.relatedLogId || "",
      relatedLogIds: options.logId ? [...new Set([...(thread.relatedLogIds || []), options.logId])] : (thread.relatedLogIds || [])
    }, { merge: true });
    await batch.commit();
    await writeEvent("chat_message_sent", user, { workspaceId, context: { threadId, messageId: messageRef.id, logId: options.logId || "" } });
    return body;
  }

  async function markRead(threadId, user) {
    const runtime = await runtimeRequired();
    await runtime.db.collection(THREADS).doc(threadId).update({
      [`readBy.${uidOf(user)}`]: serverTimestamp(runtime),
      [`unreadByUid.${uidOf(user)}`]: false,
      updatedAt: serverTimestamp(runtime)
    });
    await writeEvent("chat_thread_read", user, { workspaceId: workspaceIdOf(user), context: { threadId } });
  }

  async function updateStatus(threadId, user, status) {
    if (!canManage(user)) throw new Error("관리자만 상태를 변경할 수 있습니다.");
    const runtime = await runtimeRequired();
    await runtime.db.collection(THREADS).doc(threadId).set({
      status,
      updatedAt: serverTimestamp(runtime),
      statusUpdatedByUid: uidOf(user),
      statusUpdatedByRole: roleOf(user)
    }, { merge: true });
    await writeEvent("chat_status_updated", user, { workspaceId: workspaceIdOf(user), context: { threadId, status } });
  }

  function latestErrorLog() {
    return readLocalErrors()[0] || null;
  }

  window.PMChatService = {
    THREADS,
    MESSAGES,
    EVENT_LOGS,
    canManage,
    canUseChat,
    uidOf,
    roleOf,
    workspaceIdOf,
    listThreads,
    subscribeThreads,
    subscribeMessages,
    createThread,
    sendMessage,
    markRead,
    updateStatus,
    saveErrorLog,
    writeEvent,
    latestErrorLog,
    readLocalErrors
  };
})();
