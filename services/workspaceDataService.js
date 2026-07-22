// Firestore workspace data sync adapter for the current app.js store model.
(function () {
  const COLLECTION_KEYS = [
    "schedules",
    "notices",
    "subjects",
    "teachers",
    "materials",
    "assignments",
    "portfolios",
    "penalties",
    "exams",
    "people",
    "friendAwards",
    "requests",
    "timetable",
    "timetableSets",
    "periodTimes",
    "meals",
    "attendance",
    "examSchedules",
    "records",
    "lessons",
    "studentAccessLogs",
    "masterDataVersions",
    "workspaceUpdates",
    "omrForms",
    "projects",
    "budget",
    "systemReports",
    "academic",
    "academicSchedules",
    "homeLetters",
    "schoolNotices",
    "mealApplications",
    "afterschoolPrograms",
    "afterschoolAttendance",
    "afterschoolSchedules",
    "specialLecturePrograms",
    "specialLectureAttendance",
    "specialLectureSchedules",
    "clubs",
    "clubPrograms",
    "clubAttendance",
    "clubSchedules"
  ];

  const SETTINGS_DOC_COLLECTION = "settings";
  const SETTINGS_DOC_ID = "app";
  let currentWorkspaceId = "";
  let currentStore = null;
  let unsubscribers = [];
  let remoteIdsByKey = {};
  let applyingRemote = false;
  let saveTimer = null;
  let saveInFlight = false;
  let pendingSave = false;
  let runtimePromise = null;
  let pendingLocalRowsByKey = {};
  let pendingDeletedIdsByKey = {};
  let currentContext = {};
  let activeListenerPaths = new Set();
  let lastError = null;
  let lastErrorAt = 0;
  let saveScheduledCount = 0;
  let saveSkippedCount = 0;
  let lastScheduleSkipReason = "";
  let lastFlushOperationCount = 0;
  let lastFlushKeys = [];
  let flushedCount = 0;
  let cancelledCount = 0;
  let lastScheduledAt = 0;
  let lastFlushedAt = 0;
  let duplicateStartAttempts = 0;
  let unsubscribeCount = 0;
  let startedAt = 0;
  let quotaBackoffUntil = 0;
  let lastBootstrapSaveAt = 0;
  let lastSaveInFlightStartedAt = 0;
  let lastSaveInFlightEndedAt = 0;
  let pendingSettingsSnapshot = null;
  let lastSyncedSettingsSignature = "";
  let lastSyncedRowsByKey = {};
  const recentScheduleCalls = [];
  const noticeDiagnostics = {
    noticeDeleteRequestedCount: 0,
    noticeDeleteConfirmedCount: 0,
    noticeDeleteFailedCount: 0,
    noticeBulkDeleteBatchCount: 0,
    noticeServerCountAfterDelete: null,
    noticeBootstrapCreateBlockedCount: 0,
    lastNoticeDeleteFailureCode: "",
    lastNoticeDeleteReason: ""
  };
  const PENDING_TTL_MS = 15000;
  const QUOTA_BACKOFF_MS = 60 * 60 * 1000;
  const bootstrapSaveWorkspaces = new Set();
  const SENSITIVE_COLLECTION_KEYS = new Set([
    "people",
    "friendAwards",
    "penalties",
    "exams",
    "attendance",
    "assignments",
    "lessons",
    "records",
    "portfolios",
    "academicSchedules",
    "studentAccessLogs"
  ]);
  const PRIVILEGED_ROLES = new Set(["system_owner", "super_manager", "manager"]);

  function contextUid(context = {}) {
    return context.uid || window.firebase?.auth?.().currentUser?.uid || "";
  }

  function rowOwnerUid(row = {}) {
    return row.studentUid || row.targetStudentId || row.ownerUid || row.uid || row.userUid || row.createdBy || row.createdByUid || "";
  }

  function isPublicApprovedRow(row = {}) {
    return row.visibility === "public" && (row.consentPublic === true || row.consentPublic === "true" || row.publicApproved === true);
  }

  function isPrivilegedContext(context = {}) {
    return PRIVILEGED_ROLES.has(context.role || "");
  }

  function isTeacherContext(context = {}) {
    return (context.role || "") === "teacher";
  }

  function canReadWorkspaceRow(key, row = {}, context = {}) {
    if (!SENSITIVE_COLLECTION_KEYS.has(key)) return true;
    const role = context.role || "";
    const uid = contextUid(context);
    if (PRIVILEGED_ROLES.has(role)) return true;
    if (uid && rowOwnerUid(row) === uid) return true;
    if (role === "teacher" && isPublicApprovedRow(row)) return true;
    return false;
  }

  function applyWorkspacePrivacyFilter(key, rows, context = {}) {
    if (!SENSITIVE_COLLECTION_KEYS.has(key)) return rows;
    return rows.filter((row) => canReadWorkspaceRow(key, row, context));
  }

  function canWriteWorkspaceRow(key, row = {}, context = {}) {
    if (!SENSITIVE_COLLECTION_KEYS.has(key)) return true;
    if (isPrivilegedContext(context)) return true;
    const uid = contextUid(context);
    if (!uid) return false;
    if (rowOwnerUid(row) === uid) return true;
    return isTeacherContext(context) && ["attendance", "assignments", "lessons", "exams", "records"].includes(key);
  }

  function hasFirebase() {
    return !!window.PMFirebaseRuntime?.hasConfig?.();
  }

  async function runtime() {
    if (!hasFirebase()) return null;
    runtimePromise ||= window.PMFirebaseRuntime.init();
    return runtimePromise;
  }

  function normalizeWorkspaceId(workspaceId) {
    return String(workspaceId || "").trim();
  }

  function maskId(value) {
    const text = String(value || "");
    if (!text) return "";
    if (text.length <= 8) return `${text.slice(0, 2)}***`;
    return `${text.slice(0, 4)}...${text.slice(-4)}`;
  }

  function maskPath(path = "") {
    return String(path || "").replace(/workspaces\/([^/]+)/g, (_, id) => `workspaces/${maskId(id)}`);
  }

  function diagnosticsEnabled() {
    try {
      return window.PM_DEBUG_SYNC === true
        || sessionStorage.getItem("pm-debug-sync") === "1"
        || new URLSearchParams(location.search).get("pmDebugSync") === "1";
    } catch {
      return false;
    }
  }

  function debugLog(...args) {
    if (diagnosticsEnabled()) console.info(...args);
  }

  function makeDocumentId(item) {
    const raw = item?.id || item?.uid || item?.code || item?.email || "";
    if (raw) return encodeURIComponent(String(raw)).replace(/[.%/#[\]]/g, "_");
    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    if (item && typeof item === "object") item.id = id;
    return id;
  }

  function cleanValue(value) {
    if (value === undefined || typeof value === "function") return null;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(cleanValue);
    if (value && typeof value === "object") {
      const result = {};
      Object.entries(value).forEach(([key, nested]) => {
        if (nested !== undefined && typeof nested !== "function") result[key] = cleanValue(nested);
      });
      return result;
    }
    return value;
  }

  function collectionRef(db, workspaceId, key) {
    return db.collection("workspaces").doc(workspaceId).collection(key);
  }

  function collectionQueryForContext(db, workspaceId, key, context = {}) {
    const ref = collectionRef(db, workspaceId, key);
    if (!SENSITIVE_COLLECTION_KEYS.has(key) || isPrivilegedContext(context)) return ref;
    const uid = contextUid(context);
    if (!uid) return null;
    if (isTeacherContext(context)) {
      return ref.where("visibility", "==", "public").where("consentPublic", "==", true);
    }
    return ref.where("studentUid", "==", uid);
  }

  function logFirestorePermissionError(phase, payload = {}, error) {
    const code = error?.code || "";
    lastError = { code, message: error?.message || String(error), phase, path: payload.path || "", collection: payload.collection || "" };
    lastErrorAt = Date.now();
    const data = {
      phase,
      path: maskPath(payload.path || ""),
      collection: payload.collection || "",
      workspaceId: maskId(payload.workspaceId || currentWorkspaceId || ""),
      role: payload.role || currentContext.role || "",
      status: payload.status || currentContext.status || "",
      pendingWorkspaceId: maskId(payload.pendingWorkspaceId || currentContext.pendingWorkspaceId || ""),
      uid: maskId(payload.uid || contextUid(currentContext)),
      code,
      message: error?.message || String(error)
    };
    if (code === "permission-denied") console.error("[Firestore Permission Error]", data);
    else console.error("[Firestore Error]", data);
  }

  function stableSignature(value) {
    try {
      return JSON.stringify(stripVolatileSyncFields(cleanValue(value)));
    } catch {
      return String(Date.now());
    }
  }

  function stripVolatileSyncFields(value) {
    if (Array.isArray(value)) return value.map(stripVolatileSyncFields);
    if (!value || typeof value !== "object") return value;
    const next = {};
    Object.keys(value).sort().forEach((key) => {
      if (key === "updatedAt" || key === "syncedAt") return;
      next[key] = stripVolatileSyncFields(value[key]);
    });
    return next;
  }

  function rememberScheduleCall(workspaceId, options = {}) {
    const stack = String(new Error().stack || "")
      .split("\n")
      .slice(2, 8)
      .map((line) => line.trim())
      .filter(Boolean);
    recentScheduleCalls.push({
      at: Date.now(),
      workspaceId: maskId(workspaceId),
      source: options.source || options.reason || "",
      keys: Array.isArray(options.keys) ? [...options.keys] : [],
      stack
    });
    while (recentScheduleCalls.length > 25) recentScheduleCalls.shift();
  }

  function normalizeScheduleKeys(keys) {
    if (!Array.isArray(keys) || !keys.length) return [...COLLECTION_KEYS];
    return [...new Set(keys.filter((key) => COLLECTION_KEYS.includes(key)))];
  }

  function rememberListenerPath(path) {
    if (!path) return;
    if (activeListenerPaths.has(path)) {
      console.warn("[PM workspace sync] duplicate listener blocked", { path: maskPath(path) });
      return false;
    }
    activeListenerPaths.add(path);
    return true;
  }

  function scheduleBootstrapSave(workspaceId, store, source) {
    const target = normalizeWorkspaceId(workspaceId);
    if (!target || bootstrapSaveWorkspaces.has(target)) return false;
    if (Date.now() < quotaBackoffUntil) return false;
    if (source === "notices") {
      noticeDiagnostics.noticeBootstrapCreateBlockedCount += 1;
      noticeDiagnostics.lastNoticeDeleteReason = "notice-empty-remote-bootstrap-blocked";
      debugLog("[PM workspace sync] notice bootstrap blocked", { workspaceId: maskId(target), source });
      return false;
    }
    bootstrapSaveWorkspaces.add(target);
    lastBootstrapSaveAt = Date.now();
    debugLog("[PM workspace sync] initial local bootstrap save scheduled", { workspaceId: maskId(target), source });
    scheduleSave(target, store, { source: `bootstrap:${source || "unknown"}` });
    return true;
  }

  function settingsRef(db, workspaceId) {
    return db.collection("workspaces").doc(workspaceId).collection(SETTINGS_DOC_COLLECTION).doc(SETTINGS_DOC_ID);
  }

  function stop() {
    unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
        unsubscribeCount += 1;
      } catch (error) {
        console.warn("[PM workspace sync] unsubscribe failed", error?.message || String(error));
      }
    });
    unsubscribers = [];
    currentWorkspaceId = "";
    currentStore = null;
    currentContext = {};
    remoteIdsByKey = {};
    pendingLocalRowsByKey = {};
    pendingDeletedIdsByKey = {};
    pendingSettingsSnapshot = null;
    lastSyncedSettingsSignature = "";
    lastSyncedRowsByKey = {};
    activeListenerPaths = new Set();
    applyingRemote = false;
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  function start(options) {
    const workspaceId = normalizeWorkspaceId(options?.workspaceId);
    if (!workspaceId || !options?.store || !hasFirebase()) return;
    if (workspaceId === currentWorkspaceId && currentStore === options.store) {
      duplicateStartAttempts += 1;
      return;
    }
    stop();
    currentWorkspaceId = workspaceId;
    currentStore = options.store;
    startedAt = Date.now();
    currentContext = {
      uid: options.uid || "",
      role: options.role || "",
      status: options.status || "",
      pendingWorkspaceId: options.pendingWorkspaceId || ""
    };
    runtime()
      .then((rt) => {
        if (!rt || workspaceId !== currentWorkspaceId) return;
        subscribeSettings(rt, workspaceId, options.store, options.onRemoteChange);
        COLLECTION_KEYS.forEach((key) => subscribeCollection(rt, workspaceId, key, options.store, options.onRemoteChange, currentContext));
        debugLog(`[PM workspace sync] realtime listeners started workspaceId=${maskId(workspaceId)} collections=${COLLECTION_KEYS.length}`);
      })
      .catch((error) => logFirestorePermissionError("start", { path: `workspaces/${workspaceId}`, workspaceId, uid: currentContext.uid, role: currentContext.role }, error));
  }

  function subscribeSettings(rt, workspaceId, store, onRemoteChange) {
    let initialized = false;
    const listenerPath = `workspaces/${workspaceId}/settings/${SETTINGS_DOC_ID}`;
    if (!rememberListenerPath(listenerPath)) return;
    const unsubscribe = settingsRef(rt.db, workspaceId).onSnapshot((snapshot) => {
      if (workspaceId !== currentWorkspaceId) return;
      initialized = true;
      if (!snapshot.exists) {
        if (store.settings && Object.keys(store.settings).length) scheduleBootstrapSave(workspaceId, store, "settings");
        return;
      }
      applyingRemote = true;
      const data = snapshot.data() || {};
      store.settings = { ...(store.settings || {}), ...data };
      lastSyncedSettingsSignature = stableSignature(store.settings || {});
      pendingSettingsSnapshot = null;
      applyingRemote = false;
      onRemoteChange?.({ key: "settings", type: "doc" });
    }, (error) => {
      logFirestorePermissionError("listen", {
        path: `workspaces/${workspaceId}/settings/${SETTINGS_DOC_ID}`,
        collection: "settings",
        workspaceId,
        uid: currentContext.uid,
        role: currentContext.role
      }, error);
    });
    unsubscribers.push(unsubscribe);
  }

  function subscribeCollection(rt, workspaceId, key, store, onRemoteChange, context = {}) {
    let initialized = false;
    const listenerPath = `workspaces/${workspaceId}/${key}`;
    if (!rememberListenerPath(listenerPath)) return;
    if (key === "notices") {
      debugLog("[notice:subscribe]", {
        workspaceId: maskId(workspaceId),
        uid: maskId(context.uid || firebase.auth?.().currentUser?.uid || ""),
        role: context.role || ""
      });
    }
    const query = collectionQueryForContext(rt.db, workspaceId, key, context);
    if (!query) {
      remoteIdsByKey[key] = new Set();
      if (Array.isArray(store[key])) store[key] = [];
      onRemoteChange?.({ key, rows: [] });
      debugLog(`[PM workspace sync] skipped sensitive listener workspaceId=${maskId(workspaceId)} collection=${key} role=${context.role || ""}`);
      return;
    }
    const unsubscribe = query.onSnapshot((snapshot) => {
      if (workspaceId !== currentWorkspaceId) return;
      const localRows = Array.isArray(store[key]) ? store[key] : [];
      if (!initialized) {
        initialized = true;
        if (snapshot.empty && localRows.length) {
          remoteIdsByKey[key] = new Set();
          if (key === "notices") {
            noticeDiagnostics.noticeBootstrapCreateBlockedCount += 1;
            noticeDiagnostics.lastNoticeDeleteReason = "notice-empty-remote-local-rows-cleared";
            pendingLocalRowsByKey[key] = {};
            applyingRemote = true;
            store[key] = [];
            applyingRemote = false;
            onRemoteChange?.({ key, rows: [] });
            debugLog("[PM workspace sync] notice empty remote kept empty", {
              workspaceId: maskId(workspaceId),
              localRows: localRows.length
            });
            return;
          }
          if (!SENSITIVE_COLLECTION_KEYS.has(key) || isPrivilegedContext(context)) scheduleBootstrapSave(workspaceId, store, key);
          return;
        }
      }
      applyingRemote = true;
      const snapshotIds = new Set(snapshot.docs.map((doc) => String(doc.id)));
      Object.keys(pendingDeletedIdsByKey[key] || {}).forEach((id) => {
        if (!snapshotIds.has(String(id))) delete pendingDeletedIdsByKey[key][id];
      });
      let rows = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
      lastSyncedRowsByKey[key] = {};
      rows.forEach((row) => {
        if (!row || typeof row !== "object") return;
        const id = makeDocumentId(row);
        lastSyncedRowsByKey[key][String(id)] = stableSignature({ ...row, id });
      });
      rows = mergePendingLocalRows(key, rows);
      rows = filterPendingDeletes(key, rows);
      rows = applyWorkspacePrivacyFilter(key, rows, context);
      remoteIdsByKey[key] = new Set(snapshot.docs.map((doc) => String(doc.id)));
      store[key] = rows;
      applyingRemote = false;
      if (key === "notices") {
        debugLog("[notice:update]", {
          workspaceId: maskId(workspaceId),
          count: snapshot.size,
          changes: snapshot.docChanges().map((change) => ({
            type: change.type,
            id: maskId(change.doc.id)
          }))
        });
      }
      debugLog(`[realtime:update] collection=${key} workspaceId=${maskId(workspaceId)} count=${rows.length} changes=${snapshot.docChanges().map((change) => `${change.type}:${maskId(change.doc.id)}`).join(",")}`);
      onRemoteChange?.({ key, rows });
    }, (error) => {
      if (key === "notices") {
        console.error("[notice:subscribe:error]", {
          workspaceId: maskId(workspaceId),
          uid: maskId(context.uid || firebase.auth?.().currentUser?.uid || ""),
          role: context.role || "",
          code: error?.code || "",
          message: error?.message || String(error)
        });
      }
      logFirestorePermissionError("listen", {
        path: `workspaces/${workspaceId}/${key}`,
        collection: key,
        workspaceId,
        uid: context.uid || "",
        role: context.role || ""
      }, error);
    });
    unsubscribers.push(unsubscribe);
  }

  function scheduleSave(workspaceId, store, options = {}) {
    if (applyingRemote || !hasFirebase()) return;
    const targetWorkspaceId = normalizeWorkspaceId(workspaceId || currentWorkspaceId);
    if (!targetWorkspaceId || !store) return;
    rememberScheduleCall(targetWorkspaceId, options);
    if (targetWorkspaceId !== currentWorkspaceId || !unsubscribers.length) {
      saveSkippedCount += 1;
      cancelledCount += 1;
      lastScheduleSkipReason = targetWorkspaceId !== currentWorkspaceId ? "workspace-sync-not-started" : "no-active-listeners";
      return;
    }
    rememberPendingLocalChanges(store, options);
    if (Date.now() < quotaBackoffUntil) {
      saveSkippedCount += 1;
      cancelledCount += 1;
      lastScheduleSkipReason = "quota-backoff";
      return;
    }
    saveScheduledCount += 1;
    lastScheduledAt = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => flush(targetWorkspaceId, store), 650);
  }

  function rememberPendingLocalChanges(store, options = {}) {
    const now = Date.now();
    const keys = normalizeScheduleKeys(options.keys);
    if (!Array.isArray(options.keys) || options.keys.includes("settings")) {
      const settings = cleanValue(store.settings || {}) || {};
      const signature = stableSignature(settings);
      if (signature !== lastSyncedSettingsSignature) pendingSettingsSnapshot = settings;
    }
    keys.forEach((key) => {
      const rows = Array.isArray(store[key]) ? store[key] : [];
      const seen = new Set();
      pendingLocalRowsByKey[key] ||= {};
      rows.forEach((row) => {
        if (!row || typeof row !== "object") return;
        const id = makeDocumentId(row);
        seen.add(String(id));
        const cleanRow = cleanValue({ ...row, id });
        const signature = stableSignature(cleanRow);
        if (lastSyncedRowsByKey[key]?.[String(id)] === signature) return;
        pendingLocalRowsByKey[key][id] = { row: cleanRow, signature, at: now };
      });
      pendingDeletedIdsByKey[key] ||= {};
      prunePending(key, now);
    });
  }

  function prunePending(key, now = Date.now()) {
    Object.entries(pendingLocalRowsByKey[key] || {}).forEach(([id, pending]) => {
      if (now - pending.at > PENDING_TTL_MS) delete pendingLocalRowsByKey[key][id];
    });
    Object.entries(pendingDeletedIdsByKey[key] || {}).forEach(([id, at]) => {
      if (now - at > PENDING_TTL_MS) delete pendingDeletedIdsByKey[key][id];
    });
  }

  function mergePendingLocalRows(key, rows) {
    const now = Date.now();
    prunePending(key, now);
    const byId = new Map(rows.map((row) => [String(row.id), row]));
    Object.entries(pendingLocalRowsByKey[key] || {}).forEach(([id, pending]) => {
      if (byId.has(String(id))) {
        const remoteSignature = stableSignature({ ...byId.get(String(id)), id });
        if (remoteSignature === pending?.signature) {
          delete pendingLocalRowsByKey[key][id];
          return;
        }
        byId.set(String(id), { id, ...(pending.row || {}) });
        return;
      }
      byId.set(String(id), { id, ...(pending.row || {}) });
    });
    return [...byId.values()];
  }

  function filterPendingDeletes(key, rows) {
    const pendingDeletes = pendingDeletedIdsByKey[key] || {};
    return rows.filter((row) => !pendingDeletes[String(row.id)]);
  }

  async function commitBatch(rt, batch, count) {
    if (!count) return;
    await batch.commit();
  }

  async function flush(workspaceId, store) {
    if (applyingRemote || !workspaceId || !store) return;
    if (saveInFlight) {
      pendingSave = true;
      return;
    }
    saveInFlight = true;
    lastSaveInFlightStartedAt = Date.now();
    try {
      const rt = await runtime();
      if (!rt) return;
      if (Date.now() < quotaBackoffUntil) return;
      const FieldValue = firebase.firestore.FieldValue;
      let batch = rt.db.batch();
      let operationCount = 0;
      let totalOperationCount = 0;
      const flushedKeys = [];
      const commitIfFull = async () => {
        if (operationCount < 430) return;
        await commitBatch(rt, batch, operationCount);
        batch = rt.db.batch();
        operationCount = 0;
      };

      if (pendingSettingsSnapshot) {
        batch.set(settingsRef(rt.db, workspaceId), {
          ...(pendingSettingsSnapshot || {}),
          workspaceId,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        operationCount += 1;
        totalOperationCount += 1;
      }

      const keysToFlush = new Set([
        ...Object.keys(pendingLocalRowsByKey).filter((key) => Object.keys(pendingLocalRowsByKey[key] || {}).length),
        ...Object.keys(pendingDeletedIdsByKey).filter((key) => Object.keys(pendingDeletedIdsByKey[key] || {}).length)
      ].filter((key) => COLLECTION_KEYS.includes(key)));
      for (const key of keysToFlush) {
        const pendingRows = pendingLocalRowsByKey[key] || {};
        for (const [id, pending] of Object.entries(pendingRows)) {
          const row = pending?.row || {};
          if (!canWriteWorkspaceRow(key, row, currentContext)) continue;
          batch.set(collectionRef(rt.db, workspaceId, key).doc(id), {
            ...(row || {}),
            id,
            workspaceId,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
          operationCount += 1;
          totalOperationCount += 1;
          flushedKeys.push(key);
          await commitIfFull();
        }
        const explicitDeletes = pendingDeletedIdsByKey[key] || {};
        if (isPrivilegedContext(currentContext)) {
          for (const id of Object.keys(explicitDeletes)) {
            batch.delete(collectionRef(rt.db, workspaceId, key).doc(String(id)));
            operationCount += 1;
            totalOperationCount += 1;
            flushedKeys.push(key);
            await commitIfFull();
          }
        }
      }

      await commitBatch(rt, batch, operationCount);
      if (pendingSettingsSnapshot) {
        lastSyncedSettingsSignature = stableSignature(pendingSettingsSnapshot);
        pendingSettingsSnapshot = null;
      }
      keysToFlush.forEach((key) => {
        lastSyncedRowsByKey[key] ||= {};
        Object.entries(pendingLocalRowsByKey[key] || {}).forEach(([id, pending]) => {
          if (pending?.signature) lastSyncedRowsByKey[key][String(id)] = pending.signature;
        });
        pendingLocalRowsByKey[key] = {};
        pendingDeletedIdsByKey[key] = {};
      });
      lastFlushOperationCount = totalOperationCount;
      lastFlushKeys = [...new Set(flushedKeys)];
      flushedCount += 1;
      lastFlushedAt = Date.now();
      debugLog(`[PM workspace sync] saved workspaceId=${maskId(workspaceId)} operations=${totalOperationCount} keys=${lastFlushKeys.join(",") || "none"}`);
    } catch (error) {
      logFirestorePermissionError("save", {
        path: `workspaces/${workspaceId}`,
        workspaceId,
        uid: currentContext.uid,
        role: currentContext.role
      }, error);
      if (error?.code === "resource-exhausted") {
        quotaBackoffUntil = Date.now() + QUOTA_BACKOFF_MS;
        pendingSave = false;
        lastScheduleSkipReason = "quota-backoff";
      }
    } finally {
      saveInFlight = false;
      lastSaveInFlightEndedAt = Date.now();
      if (pendingSave && Date.now() >= quotaBackoffUntil) {
        pendingSave = false;
        scheduleSave(workspaceId, store, { source: "pending-flush-retry" });
      }
    }
  }

  window.PMWorkspaceDataService = {
    collectionKeys: [...COLLECTION_KEYS],
    start,
    stop,
    scheduleSave,
    flush,
    markDeleted(key, id) {
      if (!key || id === undefined || id === null) return;
      pendingDeletedIdsByKey[key] ||= {};
      pendingDeletedIdsByKey[key][String(id)] = Date.now();
    },
    discardPendingRow(key, id) {
      if (!key || id === undefined || id === null) return;
      const target = String(id);
      if (pendingLocalRowsByKey[key]) delete pendingLocalRowsByKey[key][target];
      if (pendingDeletedIdsByKey[key]) delete pendingDeletedIdsByKey[key][target];
      if (lastSyncedRowsByKey[key]) delete lastSyncedRowsByKey[key][target];
      remoteIdsByKey[key]?.delete?.(target);
    },
    recordNoticeDeleteDiagnostic(patch = {}) {
      Object.entries(patch || {}).forEach(([key, value]) => {
        if (Object.prototype.hasOwnProperty.call(noticeDiagnostics, key)) noticeDiagnostics[key] = value;
      });
    },
    incrementNoticeDeleteDiagnostic(key, amount = 1) {
      if (!Object.prototype.hasOwnProperty.call(noticeDiagnostics, key)) return;
      noticeDiagnostics[key] = Number(noticeDiagnostics[key] || 0) + Number(amount || 0);
    },
    isApplyingRemote: () => applyingRemote
    ,
    diagnostics() {
      return {
        workspaceId: currentWorkspaceId,
        currentWorkspaceMasked: maskId(currentWorkspaceId),
        listenerCount: unsubscribers.length,
        activeListenerPaths: [...activeListenerPaths].map(maskPath),
        saveScheduledCount,
        scheduledCount: saveScheduledCount,
        flushedCount,
        cancelledCount,
        lastScheduledAt,
        lastFlushedAt,
        saveSkippedCount,
        lastScheduleSkipReason,
        saveInFlight,
        pendingSave,
        pendingKeys: Object.fromEntries(COLLECTION_KEYS.map((key) => [
          key,
          Object.keys(pendingLocalRowsByKey[key] || {}).length + Object.keys(pendingDeletedIdsByKey[key] || {}).length
        ]).filter((entry) => entry[1] > 0)),
        pendingSettings: !!pendingSettingsSnapshot,
        lastFlushOperationCount,
        lastFlushKeys,
        quotaBackoffUntil,
        quotaBackoffActive: Date.now() < quotaBackoffUntil,
        lastSaveInFlightStartedAt,
        lastSaveInFlightEndedAt,
        recentScheduleCalls: [...recentScheduleCalls],
        recentSaveReasons: [...recentScheduleCalls],
        duplicateStartAttempts,
        unsubscribeCount,
        startedAt,
        lastBootstrapSaveAt,
        lastErrorCode: lastError?.code || "",
        lastErrorMessage: lastError?.message || "",
        lastErrorPhase: lastError?.phase || "",
        lastErrorPath: lastError?.path || "",
        lastErrorAt,
        ...noticeDiagnostics
      };
    }
  };
})();
