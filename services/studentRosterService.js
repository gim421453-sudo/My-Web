/*
 * Read-only canonical student roster adapter.
 * This service performs one-time reads only. It has no write or listener API.
 */
(function installStudentRosterService(scope) {
  const SOURCE_STUDENTS = "students";
  const SOURCE_FALLBACK = "people_fallback";
  const ALLOWED_MODES = new Set(["school", "academy"]);
  const EXCLUDED_STATUSES = new Set(["deleted", "removed", "archived", "inactive", "disabled"]);
  const EXCLUDED_ROLES = new Set(["teacher", "instructor", "manager", "admin", "administrator", "guardian", "parent"]);
  const EXCLUDED_RELATIONSHIPS = new Set([
    "friend", "family", "guardian", "parent", "teacher", "instructor", "manager", "contact",
    "친구", "가족", "보호자", "교사", "강사", "관리자", "연락처"
  ]);
  const resultCache = new Map();
  const inFlight = new Map();
  const diagnostics = {
    operationMode: "integrated_unconfigured",
    operationModeSource: "unresolved",
    rawOperationModePresent: false,
    normalizedOperationMode: "integrated_unconfigured",
    requestedWorkspaceFingerprint: "-",
    resolvedWorkspaceFingerprint: "-",
    workspaceModeLoadCount: 0,
    workspaceModeCacheHitCount: 0,
    workspaceModeMismatchDetected: false,
    appTarget: "main",
    workspaceResolved: false,
    source: "not-loaded",
    canonicalCount: 0,
    fallbackCount: 0,
    rejectedCount: 0,
    visibleCount: 0,
    cacheHitCount: 0,
    cacheMissCount: 0,
    serverLoadCount: 0,
    fallbackLoadCount: 0,
    activeRequestCount: 0,
    inFlightReusedCount: 0,
    lastErrorCode: "",
    lastDurationMs: 0,
    writableCount: 0,
    readOnlyCount: 0
  };

  function rosterError(code, cause) {
    const error = new Error(code);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function normalizeMode(value) {
    const mode = String(value || "").trim().toLowerCase().replace(/-/g, "_");
    return ["school", "academy", "personal", "integrated_unconfigured"].includes(mode)
      ? mode
      : "integrated_unconfigured";
  }

  function normalizedId(value) {
    const id = String(value || "").trim();
    return id && !id.includes("/") && !/[\u0000-\u001f]/.test(id) ? id : "";
  }

  function workspaceFingerprint(value) {
    const text = String(value || "").trim();
    if (!text) return "-";
    let hash = 2166136261;
    for (const char of text) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `fp_${(hash >>> 0).toString(16).slice(0, 8)}`;
  }

  function rowWorkspaceId(row = {}) {
    return String(row.workspaceId || row.workspace_id || "").trim();
  }

  function rowStatus(row = {}) {
    return String(row.status || "").trim().toLowerCase();
  }

  function isInactiveRow(row = {}) {
    return row.deleted === true
      || row.active === false
      || EXCLUDED_STATUSES.has(rowStatus(row));
  }

  function safeReference(source) {
    return Object.freeze({ source });
  }

  function normalizeStudentRecord(row = {}, options = {}) {
    const workspaceId = String(options.workspaceId || "").trim();
    const studentId = normalizedId(options.documentId || row.id);
    if (!workspaceId || !studentId || isInactiveRow(row)) return null;
    const declaredWorkspaceId = rowWorkspaceId(row);
    if (declaredWorkspaceId && declaredWorkspaceId !== workspaceId) return null;
    return Object.freeze({
      key: `student:${studentId}`,
      studentId,
      source: SOURCE_STUDENTS,
      displayName: String(row.displayName || row.studentName || row.name || "").trim() || "이름 미등록",
      workspaceId,
      authUid: String(row.authUid || "").trim() || null,
      studentNumber: String(row.studentNumber || row.studentNo || row.number || "").trim(),
      grade: String(row.grade || row.gradeLevel || "").trim(),
      className: String(row.className || row.class || "").trim(),
      classId: String(row.classId || "").trim() || null,
      status: rowStatus(row) || "active",
      active: true,
      deleted: false,
      writable: false,
      canonical: true,
      legacySourceId: null,
      rawReference: safeReference(SOURCE_STUDENTS)
    });
  }

  function isExplicitStudentPerson(row = {}) {
    const role = String(row.role || "").trim().toLowerCase();
    if (EXCLUDED_ROLES.has(role)) return false;
    const relationship = String(row.relationship || "").trim().toLowerCase();
    if (EXCLUDED_RELATIONSHIPS.has(relationship)) return false;
    return role === "student" || row.isStudent === true;
  }

  function normalizePeopleFallbackRecord(row = {}, options = {}) {
    const workspaceId = String(options.workspaceId || "").trim();
    const legacySourceId = normalizedId(options.documentId || row.id);
    if (!workspaceId || !legacySourceId || isInactiveRow(row) || !isExplicitStudentPerson(row)) return null;
    const declaredWorkspaceId = rowWorkspaceId(row);
    if (declaredWorkspaceId && declaredWorkspaceId !== workspaceId) return null;
    return Object.freeze({
      key: `legacy-person:${legacySourceId}`,
      studentId: null,
      source: SOURCE_FALLBACK,
      displayName: String(row.studentName || row.displayName || row.name || "").trim() || "이름 미등록",
      workspaceId,
      authUid: String(row.authUid || "").trim() || null,
      studentNumber: String(row.studentNumber || row.studentNo || row.number || "").trim(),
      grade: String(row.grade || row.gradeLevel || "").trim(),
      className: String(row.className || row.class || "").trim(),
      classId: String(row.classId || "").trim() || null,
      status: rowStatus(row) || "active",
      active: true,
      deleted: false,
      writable: false,
      canonical: false,
      legacySourceId,
      rawReference: safeReference(SOURCE_FALLBACK)
    });
  }

  function compareRosterRows(left, right) {
    const collator = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });
    const values = [
      [left.grade, right.grade],
      [left.className || left.classId, right.className || right.classId],
      [left.studentNumber, right.studentNumber],
      [left.displayName, right.displayName],
      [left.key, right.key]
    ];
    for (const [leftValue, rightValue] of values) {
      const compared = collator.compare(String(leftValue || ""), String(rightValue || ""));
      if (compared) return compared;
    }
    return 0;
  }

  function uniqueByKey(rows) {
    const unique = new Map();
    rows.forEach((row) => {
      if (row && !unique.has(row.key)) unique.set(row.key, row);
    });
    return [...unique.values()].sort(compareRosterRows);
  }

  async function defaultFetchStudents(workspaceId) {
    const runtime = await scope.PMFirebaseRuntime?.init?.();
    if (!runtime?.db) throw rosterError("STUDENT_ROSTER_LOAD_FAILED");
    const snapshot = await runtime.db.collection("workspaces").doc(workspaceId)
      .collection("students").get({ source: "server" });
    return (snapshot.docs || []).map((document) => ({
      id: document.id,
      ...(document.data?.() || {})
    }));
  }

  function emptyResult(workspaceId, operationMode, source, errorCode = "") {
    return Object.freeze({
      workspaceId,
      operationMode,
      source,
      rows: Object.freeze([]),
      canonicalCount: 0,
      fallbackCount: 0,
      rejectedCount: 0,
      writableCount: 0,
      readOnlyCount: 0,
      errorCode,
      loadedAt: Date.now()
    });
  }

  function updateDiagnostics(result, durationMs) {
    diagnostics.operationMode = result.operationMode;
    diagnostics.workspaceResolved = Boolean(result.workspaceId);
    diagnostics.source = result.source;
    diagnostics.canonicalCount = result.canonicalCount;
    diagnostics.fallbackCount = result.fallbackCount;
    diagnostics.rejectedCount = result.rejectedCount;
    diagnostics.visibleCount = result.rows.length;
    diagnostics.writableCount = result.writableCount;
    diagnostics.readOnlyCount = result.readOnlyCount;
    diagnostics.lastErrorCode = result.errorCode || "";
    diagnostics.lastDurationMs = Math.max(0, Number(durationMs) || 0);
  }

  function classifyLoadError(cause) {
    const code = String(cause?.code || "");
    if (code === "permission-denied" || code === "firestore/permission-denied") {
      return "STUDENT_ROSTER_PERMISSION_DENIED";
    }
    return code.startsWith("STUDENT_ROSTER_") ? code : "STUDENT_ROSTER_LOAD_FAILED";
  }

  function loadStudentRoster(options = {}) {
    const startedAt = Date.now();
    const workspaceId = String(options.workspaceId || "").trim();
    const operationMode = normalizeMode(options.operationMode);
    diagnostics.operationMode = operationMode;
    diagnostics.normalizedOperationMode = operationMode;
    diagnostics.operationModeSource = String(options.operationModeSource || "unresolved");
    diagnostics.rawOperationModePresent = options.rawOperationModePresent === true;
    diagnostics.requestedWorkspaceFingerprint = workspaceFingerprint(workspaceId);
    diagnostics.resolvedWorkspaceFingerprint = workspaceFingerprint(workspaceId);
    diagnostics.workspaceModeMismatchDetected = false;
    diagnostics.workspaceModeLoadCount = Number(options.workspaceModeLoadCount || 0);
    diagnostics.workspaceModeCacheHitCount = Number(options.workspaceModeCacheHitCount || 0);
    diagnostics.appTarget = String(options.appTarget || "main") === "admin-standalone" ? "admin-standalone" : "main";
    diagnostics.workspaceResolved = Boolean(workspaceId);

    if (!workspaceId) {
      const result = emptyResult("", operationMode, "error", "STUDENT_ROSTER_WORKSPACE_REQUIRED");
      updateDiagnostics(result, Date.now() - startedAt);
      return Promise.reject(rosterError(result.errorCode));
    }
    if (!ALLOWED_MODES.has(operationMode)) {
      const result = emptyResult(workspaceId, operationMode, "blocked", "STUDENT_ROSTER_MODE_BLOCKED");
      updateDiagnostics(result, Date.now() - startedAt);
      return Promise.resolve(result);
    }
    if (options.authorized !== true) {
      const result = emptyResult(workspaceId, operationMode, "error", "STUDENT_ROSTER_PERMISSION_DENIED");
      updateDiagnostics(result, Date.now() - startedAt);
      return Promise.reject(rosterError(result.errorCode));
    }

    if (!options.force && resultCache.has(workspaceId)) {
      diagnostics.cacheHitCount += 1;
      const cached = resultCache.get(workspaceId);
      updateDiagnostics(cached, Date.now() - startedAt);
      return Promise.resolve(cached);
    }
    if (inFlight.has(workspaceId)) {
      diagnostics.inFlightReusedCount += 1;
      return inFlight.get(workspaceId);
    }

    diagnostics.cacheMissCount += 1;
    if (options.force) resultCache.delete(workspaceId);
    const fetchStudents = typeof options.fetchStudents === "function"
      ? options.fetchStudents
      : defaultFetchStudents;
    const people = Array.isArray(options.people) ? options.people : [];

    let request;
    request = (async () => {
      diagnostics.activeRequestCount += 1;
      diagnostics.serverLoadCount += 1;
      try {
        const rawStudents = await fetchStudents(workspaceId);
        const canonicalRows = uniqueByKey((Array.isArray(rawStudents) ? rawStudents : [])
          .map((row) => normalizeStudentRecord(row, { workspaceId })));
        const canonicalRejected = Math.max(0, (Array.isArray(rawStudents) ? rawStudents.length : 0) - canonicalRows.length);
        let rows = canonicalRows;
        let source = SOURCE_STUDENTS;
        let fallbackCount = 0;
        let rejectedCount = canonicalRejected;

        if (!canonicalRows.length) {
          diagnostics.fallbackLoadCount += 1;
          const fallbackRows = uniqueByKey(people.map((row) => normalizePeopleFallbackRecord(row, { workspaceId })));
          rows = fallbackRows;
          source = fallbackRows.length ? SOURCE_FALLBACK : "empty";
          fallbackCount = fallbackRows.length;
          rejectedCount += Math.max(0, people.length - fallbackRows.length);
        }

        const result = Object.freeze({
          workspaceId,
          operationMode,
          source,
          rows: Object.freeze(rows),
          canonicalCount: canonicalRows.length,
          fallbackCount,
          rejectedCount,
          writableCount: rows.filter((row) => row.writable === true).length,
          readOnlyCount: rows.filter((row) => row.writable !== true).length,
          errorCode: source === SOURCE_FALLBACK ? "STUDENT_ROSTER_LEGACY_READ_ONLY" : "",
          loadedAt: Date.now()
        });
        resultCache.set(workspaceId, result);
        updateDiagnostics(result, Date.now() - startedAt);
        return result;
      } catch (cause) {
        const code = classifyLoadError(cause);
        diagnostics.lastErrorCode = code;
        diagnostics.lastDurationMs = Date.now() - startedAt;
        throw rosterError(code, cause);
      } finally {
        diagnostics.activeRequestCount = Math.max(0, diagnostics.activeRequestCount - 1);
        if (inFlight.get(workspaceId) === request) inFlight.delete(workspaceId);
      }
    })();
    inFlight.set(workspaceId, request);
    return request;
  }

  function getCachedStudentRoster(workspaceId) {
    return resultCache.get(String(workspaceId || "").trim()) || null;
  }

  function clearStudentRosterCache() {
    resultCache.clear();
  }

  function invalidateStudentRosterForWorkspace(workspaceId) {
    resultCache.delete(String(workspaceId || "").trim());
  }

  function resolveStudentSelection(value, options = {}) {
    const workspaceId = String(options.workspaceId || "").trim();
    const selected = String(value || "").trim();
    if (!workspaceId || !selected) return null;
    const result = resultCache.get(workspaceId);
    if (!result) return null;
    return result.rows.find((row) => row.key === selected || (row.studentId && row.studentId === selected)) || null;
  }

  function canUseStudentForWrite(selection) {
    return Boolean(selection?.canonical && selection?.writable && selection?.studentId);
  }

  function snapshotDiagnostics() {
    return Object.freeze({
      ...diagnostics,
      activeRequestCount: inFlight.size,
      sensitiveValueDetected: false
    });
  }

  const service = Object.freeze({
    loadStudentRoster,
    getCachedStudentRoster,
    clearStudentRosterCache,
    invalidateStudentRosterForWorkspace,
    resolveStudentSelection,
    canUseStudentForWrite,
    normalizeStudentRecord,
    normalizePeopleFallbackRecord,
    snapshotDiagnostics
  });

  scope.PMStudentRosterService = service;
  scope.PMStudentRosterDiagnostics = Object.freeze({ snapshot: snapshotDiagnostics });
})(typeof globalThis !== "undefined" ? globalThis : window);
