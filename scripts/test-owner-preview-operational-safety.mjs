import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const checkDist = process.argv.includes("--dist");

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function listFiles(dir) {
  const base = path.join(rootDir, dir);
  if (!fs.existsSync(base)) return [];
  const result = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else result.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  };
  walk(base);
  return result;
}

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, status: "passed" });
  } catch (error) {
    results.push({
      name,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function createSafetySandbox(options = {}) {
  const listeners = {};
  const sandbox = {
    console: {
      info() {},
      warn() {},
      error() {},
    },
    Object,
    Set,
    String,
    Boolean,
    Number,
    Date,
    RegExp,
    Array,
    window: null,
    globalThis: null,
    location: {
      hostname: options.hostname || "127.0.0.1",
      reloadCalled: false,
      reload() {
        this.reloadCalled = true;
      },
    },
    localStorage: {
      values: new Map(),
      getItem(key) {
        return this.values.get(key) || null;
      },
      setItem(key, value) {
        this.values.set(key, String(value));
      },
    },
    document: {
      body: {
        children: [1],
        replaceChildren() {},
      },
      createElement() {
        return {
          className: "",
          innerHTML: "",
          querySelector() {
            return {
              addEventListener() {},
            };
          },
        };
      },
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    __listeners: listeners,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readText("shared/operationalSafety.js"), sandbox, {
    filename: "shared/operationalSafety.js",
  });
  return sandbox;
}

const files = {
  index: readText("index.html"),
  appNextHtml: readText("app-next.html"),
  ownerDiagnostics: readText("owner-admin-diagnostics.html"),
  shadowAuth: readText("shadow-auth-test.html"),
  authRegression: readText("auth-regression-preview.html"),
  viteConfig: readText("vite.config.js"),
  sharedSafety: readText("shared/operationalSafety.js"),
  app: readText("app.js"),
  appNext: readText("src/app-next/AppNext.tsx"),
  appNextFirebase: readText("src/lib/firebase.ts"),
  errorBoundary: readText("src/app-next/AppNextErrorBoundary.tsx"),
  safetyAdapter: readText("src/release/operationalSafetyAdapter.ts"),
  workspaceDataService: readText("services/workspaceDataService.js"),
  releaseManifest: readText("shared/ownerPreviewReleaseManifest.js"),
};

test("production build input excludes development HTML pages", () => {
  assert.doesNotMatch(files.viteConfig, /owner-admin-diagnostics\.html/);
  assert.doesNotMatch(files.viteConfig, /shadow-auth-test\.html/);
  assert.doesNotMatch(files.viteConfig, /auth-regression-preview\.html/);
  assert.match(files.viteConfig, /index\.html/);
  assert.match(files.viteConfig, /app-next\.html/);
});

test("owner preview HTML entries include noindex", () => {
  for (const [name, text] of [
    ["index", files.index],
    ["app-next", files.appNextHtml],
    ["owner-admin-diagnostics", files.ownerDiagnostics],
    ["shadow-auth-test", files.shadowAuth],
    ["auth-regression-preview", files.authRegression],
  ]) {
    assert.match(text, /name="robots" content="noindex,nofollow"/, `${name} missing noindex`);
  }
});

test("operational and app-next entries load shared safety runtime", () => {
  assert.match(files.index, /shared\/operationalSafety\.js\?v=2/);
  assert.match(files.appNextHtml, /shared\/operationalSafety\.js\?v=2/);
});

test("operational safety default mode is normal", () => {
  const sandbox = createSafetySandbox();
  assert.equal(sandbox.PMOperationalSafety.status().mode, "normal");
  assert.equal(sandbox.PMOperationalSafety.status().writeBlocked, false);
});

test("maintenance and emergency block general users", () => {
  const sandbox = createSafetySandbox();
  sandbox.PM_OPERATIONAL_SAFETY_MODE = "maintenance";
  assert.equal(sandbox.PMOperationalSafety.status().blocksGeneralUsers, true);
  sandbox.PM_OPERATIONAL_SAFETY_MODE = "emergency";
  assert.equal(sandbox.PMOperationalSafety.status().blocksGeneralUsers, true);
});

test("partial outage keeps reads and exposes write block structure", () => {
  const sandbox = createSafetySandbox();
  sandbox.PM_OPERATIONAL_SAFETY_MODE = "partial-outage";
  assert.equal(sandbox.PMOperationalSafety.status().readAllowed, true);
  assert.equal(sandbox.PMOperationalSafety.status().writeBlocked, true);
  assert.equal(sandbox.PMOperationalSafety.isWriteBlocked(), true);
});

test("manual status config keeps mode and flags consistent", () => {
  const sandbox = createSafetySandbox();
  sandbox.PM_OPERATIONAL_SAFETY_STATUS = {
    mode: "maintenance",
    title: "Maintenance test",
    description: "Read and write disabled",
    estimatedRecoveryAt: "checking",
    readAllowed: true,
    writeBlocked: false,
    blocksGeneralUsers: false,
  };
  const maintenance = sandbox.PMOperationalSafety.status();
  assert.equal(maintenance.mode, "maintenance");
  assert.equal(maintenance.title, "Maintenance test");
  assert.equal(maintenance.readAllowed, false);
  assert.equal(maintenance.writeBlocked, true);
  assert.equal(maintenance.blocksGeneralUsers, true);
  assert.equal(sandbox.PMOperationalSafety.isWriteBlocked(), true);

  sandbox.PM_OPERATIONAL_SAFETY_STATUS = {
    mode: "partial-outage",
    title: "Partial test",
  };
  const partial = sandbox.PMOperationalSafety.status();
  assert.equal(partial.mode, "partial-outage");
  assert.equal(partial.readAllowed, true);
  assert.equal(partial.writeBlocked, true);
  assert.equal(partial.blocksGeneralUsers, false);
});

test("development test controls override and clear without storage", () => {
  const sandbox = createSafetySandbox();
  assert.ok(sandbox.PMOperationalSafetyTestControls);
  sandbox.PMOperationalSafetyTestControls.setMode("emergency", {
    title: "Emergency test",
    description: "Blocked",
    estimatedRecoveryAt: "soon",
  });
  const emergency = sandbox.PMOperationalSafety.status();
  assert.equal(emergency.mode, "emergency");
  assert.equal(emergency.title, "Emergency test");
  assert.equal(emergency.readAllowed, false);
  assert.equal(emergency.writeBlocked, true);
  assert.equal(emergency.blocksGeneralUsers, true);
  assert.equal(sandbox.localStorage.values.size, 0);

  sandbox.PMOperationalSafetyTestControls.clearMode();
  assert.equal(sandbox.PMOperationalSafety.status().mode, "normal");
});

test("production ignores late console mode changes and has no test controls", () => {
  const sandbox = createSafetySandbox({ hostname: "preview.example.test" });
  assert.equal(sandbox.PMOperationalSafetyTestControls, undefined);
  sandbox.PM_OPERATIONAL_SAFETY_STATUS = {
    mode: "emergency",
    title: "Late console edit",
  };
  assert.equal(sandbox.PMOperationalSafety.status().mode, "normal");
  sandbox.PM_OPERATIONAL_SAFETY_MODE = "maintenance";
  assert.equal(sandbox.PMOperationalSafety.status().mode, "normal");
});

test("global error and unhandled rejection are classified without raw stack storage", () => {
  const sandbox = createSafetySandbox();
  sandbox.__listeners.error({ error: Object.assign(new Error("boom"), { code: "auth/network-request-failed" }) });
  sandbox.__listeners.unhandledrejection({ reason: Object.assign(new Error("quota"), { code: "resource-exhausted" }) });
  const snapshot = sandbox.PMOperationalSafetyDiagnostics.snapshot();
  assert.equal(snapshot.globalErrorCount, 1);
  assert.equal(snapshot.unhandledRejectionCount, 1);
  assert.equal(snapshot.lastErrorCategory, "resource-exhausted");
  assert.doesNotMatch(JSON.stringify(snapshot), /boom|quota/);
});

test("operational diagnostics expose required fields", () => {
  const sandbox = createSafetySandbox();
  const snapshot = sandbox.PMOperationalSafetyDiagnostics.snapshot();
  for (const key of [
    "releaseChannel",
    "buildMode",
    "globalErrorCount",
    "unhandledRejectionCount",
    "firebaseInitState",
    "authInitState",
    "workspaceInitState",
    "manifestLoadState",
    "lastErrorCategory",
    "lastErrorCode",
    "lastErrorAt",
    "recoveryAttemptCount",
    "recoverySuccessCount",
    "sensitiveValueDetected",
  ]) {
    assert.ok(Object.hasOwn(snapshot, key), `${key} missing`);
  }
});

test("operational safety detects Firebase sensitive markers", () => {
  const sandbox = createSafetySandbox();
  sandbox.PMOperationalSafety.recordError(new Error("AIzaExampleSensitiveValue1234567890"), "firebase-debug");
  const snapshot = sandbox.PMOperationalSafetyDiagnostics.snapshot();
  assert.equal(snapshot.sensitiveValueDetected, true);
  assert.equal(snapshot.lastErrorCode, "Error");
});

test("manifest load failure has a safe fallback state", () => {
  const sandbox = createSafetySandbox();
  delete sandbox.PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1;
  assert.equal(sandbox.PMOperationalSafetyDiagnostics.snapshot().manifestLoadState, "missing");
  sandbox.PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1 = {
    releaseChannel: "owner-preview",
    manifestVersion: "test",
    features: [],
  };
  assert.equal(sandbox.PMOperationalSafetyDiagnostics.snapshot().manifestLoadState, "loaded");
});

test("retry increments recovery counters without sign out", () => {
  const sandbox = createSafetySandbox();
  sandbox.PMOperationalSafety.retry();
  const snapshot = sandbox.PMOperationalSafetyDiagnostics.snapshot();
  assert.equal(snapshot.recoveryAttemptCount, 1);
  assert.equal(snapshot.recoverySuccessCount, 1);
  assert.equal(sandbox.location.reloadCalled, true);
});

test("operational app installs safety diagnostics and maintenance gate", () => {
  assert.match(files.app, /PMOperationalSafetyDiagnostics/);
  assert.match(files.app, /applyOperationalSafetyGateV125/);
  assert.match(files.app, /renderOperationalSafetyNoticeV125/);
  assert.match(files.app, /renderOperationalSafetyOwnerPanelV125/);
});

test("operational app wraps Firebase auth and workspace init failures", () => {
  assert.match(files.app, /firebaseInitOperationalSafetyV125/);
  assert.match(files.app, /authOperationalSafetyV125/);
  assert.match(files.app, /startWorkspaceDataSyncOperationalSafetyV125/);
  assert.match(files.app, /updateOperationalSafetyRuntimeStatesV126/);
  assert.doesNotMatch(files.app, /signOut\(auth\).*operationalSafety/i);
});

test("app-next Firebase config debug log is removed and init state is recorded", () => {
  assert.doesNotMatch(files.appNextFirebase, /PM Firebase env debug/);
  assert.doesNotMatch(files.appNextFirebase, /console\.info\(/);
  assert.match(files.appNextFirebase, /recordOperationalSafetyState\("firebaseInitState", "starting"\)/);
  assert.match(files.appNextFirebase, /recordOperationalSafetyState\("firebaseInitState", "ready"\)/);
  assert.match(files.appNext, /recordOperationalSafetyState\(\s*"workspaceInitState"/);
});

test("workspace sync exposes listener lifecycle and transport diagnostics", () => {
  for (const field of [
    "listenTransportErrorCount",
    "lastListenTransportErrorAt",
    "lastListenTransportErrorCode",
    "visibilityChangeCount",
    "visibilityHiddenCount",
    "visibilityVisibleCount",
    "listenerRestartAttemptCount",
    "listenerRestartSuccessCount",
    "listenerRestartBlockedCount",
    "duplicateListenerPathCount",
    "activeListenerPathCount",
    "lastVisibilityState",
    "lastListenerLifecycleAction",
    "lifecycleHandlerInstallCount",
    "duplicateLifecycleHandlerCount",
    "hiddenPauseScheduledCount",
    "hiddenPauseCancelledCount",
    "actualPauseCount",
    "actualResumeCount",
  ]) {
    assert.match(files.workspaceDataService, new RegExp(field));
  }
  assert.match(files.workspaceDataService, /document\.addEventListener\("visibilitychange"/);
  assert.match(files.workspaceDataService, /pauseRealtimeForVisibility/);
  assert.match(files.workspaceDataService, /resumeRealtimeAfterVisibility/);
  assert.match(files.workspaceDataService, /HIDDEN_PAUSE_DELAY_MS/);
  assert.match(files.workspaceDataService, /hidden-pause-scheduled/);
});

test("workspace sync blocks duplicate listener paths and avoids retry loops", () => {
  assert.match(files.workspaceDataService, /duplicate-listener-blocked/);
  assert.match(files.workspaceDataService, /resume-blocked-in-flight/);
  assert.doesNotMatch(files.workspaceDataService, /setInterval\(/);
  assert.doesNotMatch(files.workspaceDataService, /Listen\/channel/);
});

test("workspace sync diagnostics do not expose raw workspace identifiers", () => {
  assert.doesNotMatch(files.workspaceDataService, /workspaceId:\s*currentWorkspaceId/);
  assert.match(files.workspaceDataService, /currentWorkspaceMasked:\s*maskId\(currentWorkspaceId\)/);
  assert.match(files.workspaceDataService, /workspacePresent:\s*Boolean\(currentWorkspaceId\)/);
  assert.match(files.workspaceDataService, /activeListenerPaths:\s*\[\.\.\.activeListenerPaths\]\.map\(maskPath\)/);
  assert.match(files.workspaceDataService, /lastErrorPath:\s*maskPath\(lastError\?\.path \|\| ""\)/);
});

test("workspace save readiness uses internal service state without raw diagnostics ids", () => {
  assert.match(files.workspaceDataService, /function saveReadiness\(workspaceId, options = \{\}\)/);
  assert.match(files.workspaceDataService, /serviceStarted = Boolean\(currentWorkspaceId && currentStore && Number\(startedAt \|\| 0\) > 0\)/);
  assert.match(files.workspaceDataService, /workspaceMatched = Boolean\(/);
  assert.match(files.workspaceDataService, /safetyBlocked = operationalSafetyWriteBlocked\(\)/);
  assert.match(files.workspaceDataService, /checkSaveReadiness/);
  assert.doesNotMatch(files.app, /sync\.workspaceId !== canonicalWorkspaceId/);
  assert.doesNotMatch(files.app, /Boolean\(sync\.workspaceId\)/);
});

test("workspace save readiness diagnostics expose safe counters", () => {
  for (const field of [
    "saveReadinessCheckCount",
    "saveReadinessAcceptedCount",
    "saveReadinessBlockedCount",
    "lastSaveReadinessReason",
    "lastSaveReadinessServiceStarted",
    "lastSaveReadinessCanonicalResolved",
    "lastSaveReadinessWorkspaceMatched",
    "lastSaveReadinessSafetyBlocked",
    "syncRecoveryAttemptCount",
    "syncRecoverySuccessCount",
    "syncRecoveryFailureCount",
  ]) {
    assert.match(files.workspaceDataService, new RegExp(field));
  }
});

test("notice direct Firestore writes are blocked by operational write gate", () => {
  assert.match(files.app, /function checkNoticeOperationalWriteAllowedV127\(action = "write"\)/);
  assert.match(files.app, /APP_PATCH_VERSION_V127/);
  assert.match(files.app, /PMNoticeOperationalWriteGateV127/);
  assert.match(files.app, /noticeWriteGateVersion:\s*"V127"/);
  assert.match(files.app, /noticeWriteGateInstalled:\s*true/);
  assert.match(files.app, /PMOperationalSafety\?\.isWriteBlocked\?\.\(\)/);
  assert.match(files.app, /notice-operational-write-blocked/);
  assert.match(files.app, /NOTICE_WRITE_BLOCKED_SAVE_MESSAGE_V127/);
  assert.match(files.app, /NOTICE_WRITE_BLOCKED_DELETE_MESSAGE_V127/);
  const saveSource = files.app.slice(
    files.app.indexOf("saveNoticeDirectToFirestoreV52 = async function saveNoticeDirectToFirestoreV115"),
    files.app.indexOf("async function saveEditorWithNoticeServerRefreshV115")
  );
  assert.notEqual(saveSource.length, 0);
  assert.ok(
    saveSource.indexOf("checkNoticeOperationalWriteAllowedV127(writeAction)") <
      saveSource.indexOf(".doc(docId).set(payload, { merge: true })")
  );
  const deleteSource = files.app.slice(
    files.app.indexOf("deleteWorkspaceNoticeRemoteV112 = async function deleteWorkspaceNoticeRemoteV113"),
    files.app.indexOf("deleteWorkspaceNoticeIdsRemoteV112 = async function deleteWorkspaceNoticeIdsRemoteV113")
  );
  assert.notEqual(deleteSource.length, 0);
  assert.ok(
    deleteSource.indexOf('checkNoticeOperationalWriteAllowedV127("delete")') <
      deleteSource.indexOf(".doc(id).delete()")
  );
  const bulkDeleteSource = files.app.slice(
    files.app.indexOf("deleteWorkspaceNoticeIdsRemoteV112 = async function deleteWorkspaceNoticeIdsRemoteV113"),
    files.app.indexOf("const renderNoticesSplitBeforeV113")
  );
  assert.notEqual(bulkDeleteSource.length, 0);
  assert.ok(
    bulkDeleteSource.indexOf('checkNoticeOperationalWriteAllowedV127("bulk-delete")') <
      bulkDeleteSource.indexOf("batch.commit()")
  );
  const finalSaveWrapperSource = files.app.slice(
    files.app.indexOf("saveNoticeDirectToFirestoreV52 = async function saveNoticeDirectToFirestoreV127"),
    files.app.indexOf("deleteWorkspaceNoticeRemoteV112 = async function deleteWorkspaceNoticeRemoteV127")
  );
  assert.notEqual(finalSaveWrapperSource.length, 0);
  assert.ok(
    finalSaveWrapperSource.indexOf("blockNoticeWriteIfNeededV127(action") <
      finalSaveWrapperSource.indexOf("saveNoticeDirectToFirestoreBeforeV127.apply")
  );
  const finalDeleteWrapperSource = files.app.slice(
    files.app.indexOf("deleteWorkspaceNoticeRemoteV112 = async function deleteWorkspaceNoticeRemoteV127"),
    files.app.indexOf("deleteWorkspaceNoticeIdsRemoteV112 = async function deleteWorkspaceNoticeIdsRemoteV127")
  );
  assert.notEqual(finalDeleteWrapperSource.length, 0);
  assert.ok(
    finalDeleteWrapperSource.indexOf('blockNoticeWriteIfNeededV127("delete")') <
      finalDeleteWrapperSource.indexOf("deleteWorkspaceNoticeRemoteBeforeV127.apply")
  );
  const finalBulkDeleteWrapperSource = files.app.slice(
    files.app.indexOf("deleteWorkspaceNoticeIdsRemoteV112 = async function deleteWorkspaceNoticeIdsRemoteV127"),
    files.app.indexOf("window.PMNoticeOperationalWriteGateV127")
  );
  assert.notEqual(finalBulkDeleteWrapperSource.length, 0);
  assert.ok(
    finalBulkDeleteWrapperSource.indexOf('blockNoticeWriteIfNeededV127("bulk-delete")') <
      finalBulkDeleteWrapperSource.indexOf("deleteWorkspaceNoticeIdsRemoteBeforeV127.apply")
  );
});

test("notice write gate exposes safe diagnostics and keeps bootstrap blocked", () => {
  for (const field of [
    "noticeWriteGateCheckCount",
    "noticeWriteGateAllowedCount",
    "noticeWriteGateBlockedCount",
    "lastNoticeWriteGateAction",
    "lastNoticeWriteGateReason",
    "lastNoticeWriteGateMode",
    "noticeCreateBlockedCount",
    "noticeUpdateBlockedCount",
    "noticeDeleteBlockedCount",
    "noticeBulkDeleteBlockedCount",
  ]) {
    assert.match(files.app, new RegExp(field));
    assert.match(files.workspaceDataService, new RegExp(field));
  }
  assert.match(files.workspaceDataService, /noticeBootstrapCreateBlockedCount/);
  assert.match(files.workspaceDataService, /notice-empty-remote-bootstrap-blocked/);
  assert.doesNotMatch(files.app, /lastNoticeWriteGate.*uid/i);
  assert.doesNotMatch(files.app, /lastNoticeWriteGate.*email/i);
  assert.doesNotMatch(files.app, /lastNoticeWriteGate.*workspaceId/i);
});

test("workspace sync diagnostic call history keeps workspace values masked", () => {
  assert.match(files.workspaceDataService, /recentScheduleCalls\.push\(\{\s*at:\s*Date\.now\(\),\s*workspaceId:\s*maskId\(workspaceId\)/s);
  assert.match(files.workspaceDataService, /recentSaveReasons:\s*\[\.\.\.recentScheduleCalls\]/);
});

test("app-next uses shared safety status and React error boundary fallback", () => {
  assert.match(files.appNext, /getOperationalSafetyStatus/);
  assert.match(files.appNext, /operationalSafetyBlocksRoute/);
  assert.match(files.errorBoundary, /recordOperationalSafetyError/);
  assert.match(files.errorBoundary, /retryOperationalSafety/);
});

test("system owner sees release info while ordinary users do not", () => {
  assert.match(files.app, /isOperationalSafetyOwnerV125/);
  assert.match(files.app, /renderOperationalSafetyOwnerPanelV125/);
  assert.match(files.appNext, /session\?\.isSystemOwner \?/);
  assert.match(files.appNext, /Owner Preview Release/);
});

test("safety runtime and adapter are read-only", () => {
  const combined = [files.sharedSafety, files.safetyAdapter].join("\n");
  for (const token of ["setDoc", "addDoc", "updateDoc", "deleteDoc", "writeBatch", "runTransaction", "onSnapshot", "collection("]) {
    assert.doesNotMatch(combined, new RegExp(`\\b${token.replace("(", "\\(")}\\b`), `${token} should not be used`);
  }
});

test("source map policy is not enabled", () => {
  assert.doesNotMatch(files.viteConfig, /sourcemap\s*:\s*true/);
});

test("owner preview manifest remains included", () => {
  assert.match(files.index, /shared\/ownerPreviewReleaseManifest\.js\?v=1/);
  assert.match(files.appNextHtml, /shared\/ownerPreviewReleaseManifest\.js\?v=1/);
  assert.match(files.releaseManifest, /releaseChannel:\s*"owner-preview"/);
});

test("source files do not contain service account or private key markers", () => {
  const combined = [
    files.sharedSafety,
    files.safetyAdapter,
    files.appNext,
    files.errorBoundary,
  ].join("\n");
  assert.doesNotMatch(combined, /BEGIN PRIVATE KEY|private_key|client_email|refresh_token/i);
});

if (checkDist) {
  test("dist excludes development and sensitive files", () => {
    assert.ok(exists("dist/index.html"), "dist/index.html missing");
    const distFiles = listFiles("dist");
    for (const forbidden of [
      "owner-admin-diagnostics.html",
      "shadow-auth-test.html",
      "auth-regression-preview.html",
      ".env",
      ".env.local",
      "firebase-config.local.js",
      "firestore.rules.console-current",
      "firestore.rules.next",
    ]) {
      assert.equal(distFiles.includes(forbidden), false, `${forbidden} should not be in dist`);
    }
    for (const file of distFiles) {
      assert.doesNotMatch(file, /\.(map|log|bak|tmp)$/i, `${file} should not be in dist`);
      assert.doesNotMatch(file, /service-account|credentials|secret/i, `${file} should not be in dist`);
    }
  });

  test("dist contains noindex and safety runtime", () => {
    assert.match(readText("dist/index.html"), /noindex,nofollow/);
    assert.match(readText("dist/app-next.html"), /noindex,nofollow/);
    assert.ok(exists("dist/shared/operationalSafety.js"), "operationalSafety runtime missing");
  });
}

for (const result of results) {
  console.log(`${result.status === "passed" ? "ok" : "not ok"} - ${result.name}`);
  if (result.message) console.log(`  ${result.message}`);
}

const failed = results.filter((result) => result.status === "failed");
console.log(`${results.length - failed.length}/${results.length} owner preview operational safety tests passed.`);
if (failed.length) process.exitCode = 1;
