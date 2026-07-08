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
  const PENDING_TTL_MS = 15000;
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
    const data = {
      phase,
      path: payload.path || "",
      collection: payload.collection || "",
      workspaceId: payload.workspaceId || currentWorkspaceId || "",
      role: payload.role || currentContext.role || "",
      status: payload.status || currentContext.status || "",
      pendingWorkspaceId: payload.pendingWorkspaceId || currentContext.pendingWorkspaceId || "",
      uid: payload.uid || contextUid(currentContext),
      code,
      message: error?.message || String(error)
    };
    if (code === "permission-denied") console.error("[Firestore Permission Error]", data);
    else console.error("[Firestore Error]", data);
  }

  function settingsRef(db, workspaceId) {
    return db.collection("workspaces").doc(workspaceId).collection(SETTINGS_DOC_COLLECTION).doc(SETTINGS_DOC_ID);
  }

  function stop() {
    unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
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
    applyingRemote = false;
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  function start(options) {
    const workspaceId = normalizeWorkspaceId(options?.workspaceId);
    if (!workspaceId || !options?.store || !hasFirebase()) return;
    if (workspaceId === currentWorkspaceId && currentStore === options.store) return;
    stop();
    currentWorkspaceId = workspaceId;
    currentStore = options.store;
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
        console.info(`[PM workspace sync] realtime listeners started workspaceId=${workspaceId} collections=${COLLECTION_KEYS.length}`);
      })
      .catch((error) => logFirestorePermissionError("start", { path: `workspaces/${workspaceId}`, workspaceId, uid: currentContext.uid, role: currentContext.role }, error));
  }

  function subscribeSettings(rt, workspaceId, store, onRemoteChange) {
    let initialized = false;
    const unsubscribe = settingsRef(rt.db, workspaceId).onSnapshot((snapshot) => {
      if (workspaceId !== currentWorkspaceId) return;
      initialized = true;
      if (!snapshot.exists) {
        if (store.settings && Object.keys(store.settings).length) scheduleSave(workspaceId, store);
        return;
      }
      applyingRemote = true;
      store.settings = { ...(store.settings || {}), ...(snapshot.data() || {}) };
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
    if (key === "notices") {
      console.info("[notice:subscribe]", {
        workspaceId,
        uid: context.uid || firebase.auth?.().currentUser?.uid || "",
        role: context.role || ""
      });
    }
    const query = collectionQueryForContext(rt.db, workspaceId, key, context);
    if (!query) {
      remoteIdsByKey[key] = new Set();
      if (Array.isArray(store[key])) store[key] = [];
      onRemoteChange?.({ key, rows: [] });
      console.info(`[PM workspace sync] skipped sensitive listener workspaceId=${workspaceId} collection=${key} role=${context.role || ""}`);
      return;
    }
    const unsubscribe = query.onSnapshot((snapshot) => {
      if (workspaceId !== currentWorkspaceId) return;
      const localRows = Array.isArray(store[key]) ? store[key] : [];
      if (!initialized) {
        initialized = true;
        if (snapshot.empty && localRows.length) {
          remoteIdsByKey[key] = new Set();
          if (!SENSITIVE_COLLECTION_KEYS.has(key) || isPrivilegedContext(context)) scheduleSave(workspaceId, store);
          return;
        }
      }
      applyingRemote = true;
      const snapshotIds = new Set(snapshot.docs.map((doc) => String(doc.id)));
      Object.keys(pendingDeletedIdsByKey[key] || {}).forEach((id) => {
        if (!snapshotIds.has(String(id))) delete pendingDeletedIdsByKey[key][id];
      });
      let rows = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
      rows = mergePendingLocalRows(key, rows);
      rows = filterPendingDeletes(key, rows);
      rows = applyWorkspacePrivacyFilter(key, rows, context);
      remoteIdsByKey[key] = new Set(snapshot.docs.map((doc) => String(doc.id)));
      store[key] = rows;
      applyingRemote = false;
      if (key === "notices") {
        console.info("[notice:update]", {
          workspaceId,
          count: snapshot.size,
          changes: snapshot.docChanges().map((change) => ({
            type: change.type,
            id: change.doc.id,
            data: change.doc.data()
          }))
        });
      }
      console.info(`[realtime:update] collection=${key} workspaceId=${workspaceId} count=${rows.length} changes=${snapshot.docChanges().map((change) => `${change.type}:${change.doc.id}`).join(",")}`);
      onRemoteChange?.({ key, rows });
    }, (error) => {
      if (key === "notices") {
        console.error("[notice:subscribe:error]", {
          workspaceId,
          uid: context.uid || firebase.auth?.().currentUser?.uid || "",
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

  function scheduleSave(workspaceId, store) {
    if (applyingRemote || !hasFirebase()) return;
    const targetWorkspaceId = normalizeWorkspaceId(workspaceId || currentWorkspaceId);
    if (!targetWorkspaceId || !store) return;
    rememberPendingLocalChanges(store);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => flush(targetWorkspaceId, store), 650);
  }

  function rememberPendingLocalChanges(store) {
    const now = Date.now();
    COLLECTION_KEYS.forEach((key) => {
      const rows = Array.isArray(store[key]) ? store[key] : [];
      const seen = new Set();
      pendingLocalRowsByKey[key] ||= {};
      rows.forEach((row) => {
        if (!row || typeof row !== "object") return;
        const id = makeDocumentId(row);
        seen.add(String(id));
        pendingLocalRowsByKey[key][id] = { row: cleanValue({ ...row, id }), at: now };
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
        delete pendingLocalRowsByKey[key][id];
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
    try {
      const rt = await runtime();
      if (!rt) return;
      const FieldValue = firebase.firestore.FieldValue;
      let batch = rt.db.batch();
      let operationCount = 0;
      const commitIfFull = async () => {
        if (operationCount < 430) return;
        await commitBatch(rt, batch, operationCount);
        batch = rt.db.batch();
        operationCount = 0;
      };

      batch.set(settingsRef(rt.db, workspaceId), {
        ...(cleanValue(store.settings || {}) || {}),
        workspaceId,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      operationCount += 1;

      for (const key of COLLECTION_KEYS) {
        const rows = (Array.isArray(store[key]) ? store[key] : [])
          .filter((row) => canWriteWorkspaceRow(key, row, currentContext));
        const seen = new Set();
        for (const row of rows) {
          if (!row || typeof row !== "object") continue;
          const id = makeDocumentId(row);
          seen.add(String(id));
          batch.set(collectionRef(rt.db, workspaceId, key).doc(id), {
            ...(cleanValue(row) || {}),
            id,
            workspaceId,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
          operationCount += 1;
          await commitIfFull();
        }
        const explicitDeletes = pendingDeletedIdsByKey[key] || {};
        if (isPrivilegedContext(currentContext)) {
          for (const id of Object.keys(explicitDeletes)) {
            batch.delete(collectionRef(rt.db, workspaceId, key).doc(String(id)));
            operationCount += 1;
            await commitIfFull();
          }
        }
        remoteIdsByKey[key] = seen;
      }

      await commitBatch(rt, batch, operationCount);
      console.info(`[PM workspace sync] saved workspaceId=${workspaceId} collections=${COLLECTION_KEYS.length}`);
    } catch (error) {
      logFirestorePermissionError("save", {
        path: `workspaces/${workspaceId}`,
        workspaceId,
        uid: currentContext.uid,
        role: currentContext.role
      }, error);
    } finally {
      saveInFlight = false;
      if (pendingSave) {
        pendingSave = false;
        scheduleSave(workspaceId, store);
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
    isApplyingRemote: () => applyingRemote
  };
})();
