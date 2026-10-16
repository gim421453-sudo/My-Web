import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { scheduleCrudTests } from "./app-next-schedules-crud-tests.mjs";

const requireNative = createRequire(import.meta.url);
const projectRoot = process.cwd();
const moduleCache = new Map();

function resolveLocalModule(request, parentFile) {
  if (!request.startsWith(".")) {
    return request;
  }

  const base = path.resolve(path.dirname(parentFile), request);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Cannot resolve ${request} from ${parentFile}`);
  }

  return found;
}

function loadTsModule(filePath) {
  const normalized = path.resolve(projectRoot, filePath);
  if (moduleCache.has(normalized)) {
    return moduleCache.get(normalized).exports;
  }

  const source = readFileSync(normalized, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: normalized,
  }).outputText;

  const module = { exports: {} };
  moduleCache.set(normalized, module);

  const localRequire = (request) => {
    const resolved = resolveLocalModule(request, normalized);
    return path.isAbsolute(resolved)
      ? loadTsModule(resolved)
      : requireNative(resolved);
  };

  const context = {
    exports: module.exports,
    module,
    require: localRequire,
    console,
  };

  vm.runInNewContext(output, context, { filename: normalized });
  return module.exports;
}

function makeUser(uid = "user-1") {
  return {
    uid,
    email: `${uid}@example.test`,
    displayName: `User ${uid}`,
    emailVerified: true,
  };
}

function makeRepository(overrides = {}) {
  return {
    async getUserDocument(uid) {
      return {
        exists: true,
        data: {
          uid,
          email: `${uid}@example.test`,
          displayName: `User ${uid}`,
          status: "active",
          globalRole: "user",
          currentWorkspaceId: null,
        },
      };
    },
    async hasSystemOwnerDocument() {
      return false;
    },
    async findPrimaryOwnerWorkspaceMembership() {
      return {
        exists: false,
        workspaceId: null,
        role: null,
      };
    },
    async getWorkspace(workspaceId) {
      return {
        exists: true,
        workspace: {
          id: workspaceId,
          status: "active",
        },
      };
    },
    async getNestedMembership() {
      return {
        exists: true,
        membership: {
          uid: "user-1",
          role: "normal",
          status: "active",
        },
      };
    },
    async getLegacyMembershipDiagnostics() {
      return [];
    },
    ...overrides,
  };
}

async function assertRejectsWithCode(promise, code) {
  try {
    await promise;
  } catch (error) {
    assert.equal(error.code, code);
    return;
  }

  assert.fail(`Expected rejection with ${code}`);
}

const normalization = loadTsModule("src/auth/authNormalization.ts");
const sessionService = loadTsModule("src/auth/sessionService.ts");
const permissionService = loadTsModule("src/permissions/permissionService.ts");
const shadowComparator = loadTsModule("src/auth/shadow/shadowSessionComparator.ts");
const shadowService = loadTsModule("src/auth/shadow/shadowSessionService.ts");
const shadowPageUtils = loadTsModule("src/dev-shadow/shadowPageUtils.ts");
const adminDiagnosticsUtils = loadTsModule("src/dev-diagnostics/adminDiagnosticsUtils.ts");
const newAuthDiagnosticsFlag = loadTsModule("src/dev-diagnostics/newAuthDiagnosticsFlag.ts");
const authProviderPreviewUtils = loadTsModule("src/dev-auth-preview/authProviderPreviewUtils.ts");
const firstReactScreenAuthUtils = loadTsModule("src/dev-shadow/firstReactScreenAuthUtils.ts");
const verifyEmailUtils = loadTsModule("src/pages/verifyEmailUtils.ts");
const loginDevicesUtils = loadTsModule("src/pages/Settings/loginDevicesUtils.ts");
const notificationsUtils = loadTsModule("src/pages/Settings/notificationsUtils.ts");
const legacyAuthAdapterUtils = loadTsModule("src/auth/legacy/legacyAuthAdapterUtils.ts");
const legacyGuardDecisionUtils = loadTsModule("src/auth/legacy/guards/legacyGuardDecisionUtils.ts");
const requireAuthBridgeUtils = loadTsModule("src/auth/legacy/guards/requireAuthBridgeUtils.ts");
const protectedRouteBridgeUtils = loadTsModule("src/auth/legacy/guards/protectedRouteBridgeUtils.ts");
const workspaceRoleBridgeUtils = loadTsModule("src/auth/legacy/guards/workspaceRoleBridgeUtils.ts");
const loginBridgeUtils = loadTsModule("src/pages/loginBridgeUtils.ts");
const appNextUtils = loadTsModule("src/app-next/appNextUtils.ts");
const appNextRouteUtils = loadTsModule("src/app-next/appNextRouteUtils.ts");
const appNextLoginDevicesUtils = loadTsModule("src/app-next/appNextLoginDevicesUtils.ts");
const appNextNotificationsUtils = loadTsModule("src/app-next/appNextNotificationsUtils.ts");
const appNextWorkspaceNoticesUtils = loadTsModule("src/app-next/appNextWorkspaceNoticesUtils.ts");
const appNextWorkspaceNoticeCrudUtils = loadTsModule("src/app-next/appNextWorkspaceNoticeCrudUtils.ts");
const appNextDashboardUtils = loadTsModule("src/app-next/appNextDashboardUtils.ts");
const appNextAccountSettingsUtils = loadTsModule("src/app-next/appNextAccountSettingsUtils.ts");
const appNextTimetableReadonlyUtils = loadTsModule("src/app-next/appNextTimetableReadonlyUtils.ts");
const appNextSchedulesReadonlyUtils = loadTsModule("src/app-next/appNextSchedulesReadonlyUtils.ts");
const workspaceParentRecoveryUtils = loadTsModule("src/dev-recovery/workspaceParentRecoveryUtils.ts");

function makeSession(overrides = {}) {
  return {
    uid: "user-1",
    email: "user-1@example.test",
    displayName: "User user-1",
    emailVerified: true,
    status: "active",
    globalRole: "user",
    currentWorkspaceId: null,
    currentWorkspaceRole: null,
    isSystemOwner: false,
    isAuthenticated: true,
    warnings: [],
    ...overrides,
  };
}

function makeLegacySession(overrides = {}) {
  return {
    uid: "user-1",
    email: "user-1@example.test",
    status: "active",
    role: "normal",
    currentRole: "normal",
    globalRole: "user",
    workspaceRole: "normal",
    currentWorkspaceId: null,
    workspaceId: null,
    isSystemOwner: false,
    isAuthenticated: true,
    ...overrides,
  };
}

const ownerLegacyFixture = makeLegacySession({
  uid: "owner",
  email: "owner@example.test",
  status: "active",
  globalRole: "user",
  role: "system_owner",
  currentRole: "system_owner",
  workspaceRole: "system_owner",
  currentWorkspaceId: "ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2",
  workspaceId: "ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2",
  isSystemOwner: true,
});

const tests = [
  ...scheduleCrudTests(loadTsModule, projectRoot),
  ["status active creates active status", () => {
    const result = normalization.normalizeAccountStatus({ status: "active" });
    assert.equal(result.status, "active");
  }],
  ["canonical systemOwner authority requires active and non-disabled record state", () => {
    assert.equal(normalization.isActiveSystemOwnerAuthority({ schemaVersion: 1 }), true);
    assert.equal(normalization.isActiveSystemOwnerAuthority({ status: "active", disabled: false, active: true }), true);
    assert.equal(normalization.isActiveSystemOwnerAuthority({ status: "disabled" }), false);
    assert.equal(normalization.isActiveSystemOwnerAuthority({ disabled: true }), false);
    assert.equal(normalization.isActiveSystemOwnerAuthority({ active: false }), false);
    assert.equal(normalization.isActiveSystemOwnerAuthority({ disabled: "false" }), false);
  }],
  ["disabled string false is not disabled", () => {
    const result = normalization.normalizeAccountStatus({ disabled: "false" });
    assert.equal(result.status, "active");
  }],
  ["disabled string true becomes disabled", () => {
    const result = normalization.normalizeAccountStatus({ disabled: "true" });
    assert.equal(result.status, "disabled");
  }],
  ["status and disabled conflict creates warning", () => {
    const result = normalization.normalizeAccountStatus({
      status: "active",
      disabled: "true",
    });
    assert.ok(result.warnings.some((warning) => warning.code === "STATUS_FIELD_CONFLICT"));
  }],
  ["currentWorkspaceId null returns normal session", async () => {
    const session = await sessionService.buildAppSession(makeUser(), makeRepository());
    assert.equal(session.status, "active");
    assert.equal(session.currentWorkspaceId, null);
    assert.equal(session.currentWorkspaceRole, null);
  }],
  ["missing workspace creates warning and clears workspace", async () => {
    const session = await sessionService.buildAppSession(makeUser(), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            currentWorkspaceId: "missing-ws",
          },
        };
      },
      async getWorkspace() {
        return { exists: false, workspace: null };
      },
    }));

    assert.equal(session.currentWorkspaceId, null);
    assert.ok(session.warnings.some((warning) => warning.code === "WORKSPACE_NOT_FOUND"));
  }],
  ["missing nested member creates warning", async () => {
    const session = await sessionService.buildAppSession(makeUser(), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            currentWorkspaceId: "owner-ws",
          },
        };
      },
      async getNestedMembership() {
        return { exists: false, membership: null };
      },
    }));

    assert.equal(session.currentWorkspaceRole, null);
    assert.ok(session.warnings.some((warning) => warning.code === "MEMBERSHIP_NOT_FOUND"));
  }],
  ["denied legacy membership diagnostics do not block canonical login session", async () => {
    const session = await sessionService.buildAppSession(makeUser(), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            currentWorkspaceId: "workspace-main",
          },
        };
      },
      async getLegacyMembershipDiagnostics() {
        throw Object.assign(new Error("permission denied"), { code: "permission-denied" });
      },
    }));

    assert.equal(session.currentWorkspaceId, "workspace-main");
    assert.equal(session.currentWorkspaceRole, "normal");
    assert.ok(session.warnings.some(
      (warning) => warning.code === "LEGACY_MEMBERSHIP_DIAGNOSTIC_DENIED",
    ));
  }],
  ["invalid workspace role creates warning", async () => {
    const session = await sessionService.buildAppSession(makeUser(), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            currentWorkspaceId: "owner-ws",
          },
        };
      },
      async getNestedMembership() {
        return {
          exists: true,
          membership: {
            uid: "user-1",
            role: "system_owner",
            status: "active",
          },
        };
      },
    }));

    assert.equal(session.currentWorkspaceRole, null);
    assert.ok(session.warnings.some((warning) => warning.code === "INVALID_WORKSPACE_ROLE"));
  }],
  ["systemOwners document computes system_owner", async () => {
    const session = await sessionService.buildAppSession(makeUser(), makeRepository({
      async hasSystemOwnerDocument() {
        return true;
      },
    }));

    assert.equal(session.globalRole, "system_owner");
    assert.equal(session.isSystemOwner, true);
  }],
  ["users.globalRole spoof cannot grant system_owner without canonical systemOwners document", async () => {
    const session = await sessionService.buildAppSession(makeUser(), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            globalRole: "system_owner",
            currentWorkspaceId: null,
          },
        };
      },
      async hasSystemOwnerDocument() {
        return false;
      },
    }));

    assert.equal(session.globalRole, "user");
    assert.equal(session.isSystemOwner, false);
    assert.ok(session.warnings.some((warning) => warning.code === "GLOBAL_ROLE_MISMATCH"));
  }],
  ["systemOwners and globalRole mismatch creates warning", async () => {
    const session = await sessionService.buildAppSession(makeUser(), makeRepository({
      async hasSystemOwnerDocument() {
        return true;
      },
    }));

    assert.ok(session.warnings.some((warning) => warning.code === "GLOBAL_ROLE_MISMATCH"));
  }],
  ["existing legacy system owner data still creates authenticated session", async () => {
    const session = await sessionService.buildAppSession(makeUser("owner"), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            email: "owner@example.test",
            displayName: "Owner",
            status: "active",
            globalRole: "user",
            role: "system_owner",
            currentRole: "system_owner",
            workspaceRole: "system_owner",
            currentWorkspaceId: "ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2",
          },
        };
      },
      async hasSystemOwnerDocument() {
        return true;
      },
      async getWorkspace() {
        return { exists: false, workspace: null };
      },
      async findPrimaryOwnerWorkspaceMembership() {
        return {
          exists: true,
          workspaceId: "owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1",
          role: "super_manager",
        };
      },
    }));

    assert.equal(session.status, "active");
    assert.equal(session.isAuthenticated, true);
    assert.equal(session.isSystemOwner, true);
    assert.equal(session.globalRole, "system_owner");
    assert.equal(session.currentWorkspaceId, null);
    assert.equal(session.currentWorkspaceRole, null);
    assert.ok(session.warnings.some((warning) => warning.code === "GLOBAL_ROLE_MISMATCH"));
    assert.ok(session.warnings.some((warning) => warning.code === "LEGACY_ROLE_PRESENT"));
    assert.ok(session.warnings.some((warning) => warning.code === "WORKSPACE_NOT_FOUND"));
    assert.ok(session.warnings.some((warning) => warning.code === "CURRENT_WORKSPACE_NOT_ACCESSIBLE"));
  }],
  ["invalid currentWorkspaceId does not become current workspace for system owner", async () => {
    const session = await sessionService.buildAppSession(makeUser("owner"), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            globalRole: "user",
            role: "system_owner",
            currentWorkspaceId: "deleted-ws",
          },
        };
      },
      async hasSystemOwnerDocument() {
        return true;
      },
      async getWorkspace() {
        return { exists: false, workspace: null };
      },
      async findPrimaryOwnerWorkspaceMembership() {
        return {
          exists: true,
          workspaceId: "owner-ws",
          role: "super_manager",
        };
      },
    }));

    assert.equal(session.currentWorkspaceId, null);
    assert.notEqual(session.currentWorkspaceId, "deleted-ws");
    assert.equal(session.currentWorkspaceRole, null);
    assert.ok(session.warnings.some((warning) => warning.code === "CURRENT_WORKSPACE_NOT_ACCESSIBLE"));
  }],
  ["explicit valid owner workspace loads super_manager role", async () => {
    const session = await sessionService.buildAppSession(makeUser("owner"), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            globalRole: "user",
            role: "system_owner",
            currentWorkspaceId: "owner-ws",
          },
        };
      },
      async hasSystemOwnerDocument() {
        return true;
      },
      async getWorkspace(workspaceId) {
        return {
          exists: true,
          workspace: {
            id: workspaceId,
            status: "active",
          },
        };
      },
      async getNestedMembership() {
        return {
          exists: true,
          membership: {
            uid: "owner",
            role: "super_manager",
            status: "active",
          },
        };
      },
    }));

    assert.equal(session.currentWorkspaceId, "owner-ws");
    assert.equal(session.currentWorkspaceRole, "super_manager");
    assert.equal(session.isSystemOwner, true);
  }],
  ["system owner keeps server workspace when membership is missing", async () => {
    const session = await sessionService.buildAppSession(makeUser("owner"), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            globalRole: "user",
            role: "system_owner",
            currentWorkspaceId: "owner-ws",
          },
        };
      },
      async hasSystemOwnerDocument() {
        return true;
      },
      async getWorkspace(workspaceId) {
        return {
          exists: true,
          workspace: {
            id: workspaceId,
            status: "active",
          },
        };
      },
      async getNestedMembership() {
        return { exists: false, membership: null };
      },
    }));

    assert.equal(session.globalRole, "system_owner");
    assert.equal(session.currentWorkspaceId, "owner-ws");
    assert.equal(session.currentWorkspaceRole, null);
    assert.equal(session.workspaceResolution.serverCurrentWorkspaceDocumentExists, true);
    assert.equal(session.workspaceResolution.canonicalMembershipExists, false);
    assert.equal(session.workspaceResolution.systemOwnerWorkspaceAccessAllowed, true);
    assert.equal(session.workspaceResolution.workspaceResolutionFailureKind, "none");
    assert.equal(session.warnings.some((warning) => warning.code === "CURRENT_WORKSPACE_NOT_ACCESSIBLE"), false);
  }],
  ["system owner keeps server workspace but does not invent role for inactive membership", async () => {
    const session = await sessionService.buildAppSession(makeUser("owner"), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            role: "system_owner",
            currentWorkspaceId: "owner-ws",
          },
        };
      },
      async hasSystemOwnerDocument() {
        return true;
      },
      async getNestedMembership() {
        return {
          exists: true,
          membership: {
            uid: "owner",
            role: "manager",
            status: "disabled",
          },
        };
      },
    }));

    assert.equal(session.currentWorkspaceId, "owner-ws");
    assert.equal(session.currentWorkspaceRole, null);
    assert.equal(session.workspaceResolution.canonicalMembershipExists, true);
    assert.equal(session.workspaceResolution.canonicalMembershipStatus, "disabled");
    assert.equal(session.workspaceResolution.canonicalMembershipRole, "manager");
    assert.equal(session.workspaceResolution.workspaceResolutionFailureKind, "none");
  }],
  ["normal user without membership rejects server workspace with resolution reason", async () => {
    const session = await sessionService.buildAppSession(makeUser("normal"), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            currentWorkspaceId: "workspace-main",
          },
        };
      },
      async getNestedMembership() {
        return { exists: false, membership: null };
      },
    }));

    assert.equal(session.currentWorkspaceId, null);
    assert.equal(session.currentWorkspaceRole, null);
    assert.equal(session.workspaceResolution.serverCurrentWorkspacePresent, true);
    assert.equal(session.workspaceResolution.serverCurrentWorkspaceDocumentExists, true);
    assert.equal(session.workspaceResolution.workspaceResolutionFailureKind, "canonical-membership-missing");
    assert.ok(session.warnings.some((warning) => warning.code === "CURRENT_WORKSPACE_NOT_ACCESSIBLE"));
  }],
  ["normal user inactive membership rejects server workspace with resolution reason", async () => {
    const session = await sessionService.buildAppSession(makeUser("normal"), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            currentWorkspaceId: "workspace-main",
          },
        };
      },
      async getNestedMembership() {
        return {
          exists: true,
          membership: {
            uid: "normal",
            role: "normal",
            status: "disabled",
          },
        };
      },
    }));

    assert.equal(session.currentWorkspaceId, null);
    assert.equal(session.workspaceResolution.workspaceResolutionFailureKind, "membership-inactive");
  }],
  ["server users currentWorkspaceId wins over owner membership fallback", async () => {
    let fallbackCalled = false;
    const session = await sessionService.buildAppSession(makeUser("owner"), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            role: "system_owner",
            currentWorkspaceId: "server-ws",
          },
        };
      },
      async hasSystemOwnerDocument() {
        return true;
      },
      async getNestedMembership() {
        return {
          exists: true,
          membership: {
            uid: "owner",
            role: "super_manager",
            status: "active",
          },
        };
      },
      async findPrimaryOwnerWorkspaceMembership() {
        fallbackCalled = true;
        return {
          exists: true,
          workspaceId: "fallback-ws",
          role: "super_manager",
        };
      },
    }));

    assert.equal(session.currentWorkspaceId, "server-ws");
    assert.equal(session.currentWorkspaceRole, "super_manager");
    assert.equal(fallbackCalled, false);
  }],
  ["multiple memberships do not auto-select first membership without server currentWorkspaceId", async () => {
    let fallbackCalled = false;
    const session = await sessionService.buildAppSession(makeUser("owner"), makeRepository({
      async getUserDocument(uid) {
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            role: "system_owner",
            currentWorkspaceId: null,
          },
        };
      },
      async hasSystemOwnerDocument() {
        return true;
      },
      async findPrimaryOwnerWorkspaceMembership() {
        fallbackCalled = true;
        return {
          exists: true,
          workspaceId: "first-membership-ws",
          role: "super_manager",
        };
      },
    }));

    assert.equal(session.currentWorkspaceId, null);
    assert.equal(session.currentWorkspaceRole, null);
    assert.equal(fallbackCalled, false);
  }],
  ["viewer has no write permission", () => {
    const session = {
      isAuthenticated: true,
      status: "active",
      isSystemOwner: false,
      currentWorkspaceRole: "viewer",
    };
    assert.equal(permissionService.hasPermission(session, "lessons.write"), false);
  }],
  ["print_account cannot write general assignment data", () => {
    const session = {
      isAuthenticated: true,
      status: "active",
      isSystemOwner: false,
      currentWorkspaceRole: "print_account",
    };
    assert.equal(permissionService.hasPermission(session, "assignments.write"), false);
  }],
  ["manager cannot manage super_manager", () => {
    assert.equal(permissionService.canManageWorkspaceRole("manager", "super_manager"), false);
  }],
  ["manager can manage teacher", () => {
    assert.equal(permissionService.canManageWorkspaceRole("manager", "teacher"), true);
  }],
  ["older session request is superseded", async () => {
    sessionService.invalidateSessionLoads();
    let resolveSlow;
    const slowPromise = new Promise((resolve) => {
      resolveSlow = resolve;
    });

    const slowRepo = makeRepository({
      async getUserDocument(uid) {
        await slowPromise;
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            currentWorkspaceId: null,
          },
        };
      },
    });

    const firstLoad = sessionService.loadSessionSafely(makeUser("old"), slowRepo);
    const secondLoad = sessionService.loadSessionSafely(makeUser("new"), makeRepository());

    await secondLoad;
    resolveSlow();
    await assertRejectsWithCode(firstLoad, "SESSION_SUPERSEDED");
  }],
  ["read-only session loader reuses in-flight load for same uid", async () => {
    sessionService.resetSessionLoaderDiagnosticsForTests();
    let readCount = 0;
    let resolveSlow;
    const slowPromise = new Promise((resolve) => {
      resolveSlow = resolve;
    });
    const slowRepo = makeRepository({
      async getUserDocument(uid) {
        readCount += 1;
        await slowPromise;
        return {
          exists: true,
          data: {
            uid,
            status: "active",
            currentWorkspaceId: null,
          },
        };
      },
    });

    const firstLoad = sessionService.loadSessionReadOnlySafely(makeUser("same"), slowRepo);
    const secondLoad = sessionService.loadSessionReadOnlySafely(makeUser("same"), slowRepo);
    resolveSlow();
    await Promise.all([firstLoad, secondLoad]);
    assert.equal(readCount, 1);
    assert.equal(sessionService.getSessionLoaderDiagnostics().sessionWriteCount, 0);
  }],
  ["read-only session loader blocks quota retries without signout decision", async () => {
    sessionService.resetSessionLoaderDiagnosticsForTests();
    let readCount = 0;
    const quotaRepo = makeRepository({
      async getUserDocument() {
        readCount += 1;
        const error = new Error("Quota exceeded");
        error.code = "resource-exhausted";
        throw error;
      },
    });

    await assertRejectsWithCode(
      sessionService.loadSessionReadOnlySafely(makeUser("quota"), quotaRepo),
      "SESSION_READ_QUOTA_EXCEEDED",
    );
    await assertRejectsWithCode(
      sessionService.loadSessionReadOnlySafely(makeUser("quota"), quotaRepo),
      "SESSION_READ_QUOTA_EXCEEDED",
    );

    const diagnostics = sessionService.getSessionLoaderDiagnostics();
    assert.equal(readCount, 1);
    assert.equal(diagnostics.lastErrorCode, "SESSION_READ_QUOTA_EXCEEDED");
    assert.equal(diagnostics.bootstrapBlockedCount, 1);
    assert.equal(diagnostics.sessionWriteCount, 0);
  }],
  ["shadow comparison confirms matching uid", () => {
    const comparison = shadowComparator.compareShadowSessions(
      makeLegacySession(),
      makeSession(),
    );
    assert.equal(comparison.uidMatches, true);
    assert.equal(comparison.authenticationMatches, true);
  }],
  ["shadow mode keeps legacy owner authenticated without arbitrary workspace fallback", async () => {
    const diagnostic = await shadowService.runShadowSessionComparison({
      firebaseUser: makeUser("owner"),
      legacySession: ownerLegacyFixture,
      repository: makeRepository({
        async getUserDocument(uid) {
          return {
            exists: true,
            data: {
              uid,
              email: "owner@example.test",
              displayName: "Owner",
              status: "active",
              globalRole: "user",
              role: "system_owner",
              currentRole: "system_owner",
              workspaceRole: "system_owner",
              currentWorkspaceId: "ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2",
              workspaceId: "ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2",
              workspace_id: "ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2",
            },
          };
        },
        async hasSystemOwnerDocument() {
          return true;
        },
        async getWorkspace() {
          return { exists: false, workspace: null };
        },
        async findPrimaryOwnerWorkspaceMembership() {
          return {
            exists: true,
            workspaceId: "owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1",
            role: "super_manager",
          };
        },
      }),
    });

    assert.equal(diagnostic.shadowSession.isAuthenticated, true);
    assert.equal(diagnostic.shadowSession.isSystemOwner, true);
    assert.equal(diagnostic.shadowSession.globalRole, "system_owner");
    assert.equal(diagnostic.shadowSession.currentWorkspaceId, null);
    assert.equal(diagnostic.shadowSession.currentWorkspaceRole, null);
    assert.ok(diagnostic.shadowSession.warnings.some((warning) => warning.code === "GLOBAL_ROLE_MISMATCH"));
    assert.ok(diagnostic.shadowSession.warnings.some((warning) => warning.code === "LEGACY_ROLE_PRESENT"));
    assert.ok(diagnostic.shadowSession.warnings.some((warning) => warning.code === "WORKSPACE_NOT_FOUND"));
    assert.ok(diagnostic.shadowSession.warnings.some((warning) => warning.code === "CURRENT_WORKSPACE_NOT_ACCESSIBLE"));
  }],
  ["shadow system owner authority matches legacy owner", () => {
    const comparison = shadowComparator.compareShadowSessions(
      ownerLegacyFixture,
      makeSession({
        uid: "owner",
        email: "owner@example.test",
        globalRole: "system_owner",
        currentWorkspaceId: "owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1",
        currentWorkspaceRole: "super_manager",
        isSystemOwner: true,
      }),
    );

    assert.equal(comparison.systemOwnerMatches, true);
  }],
  ["shadow flags legacy globalRole user versus new system_owner as warning", () => {
    const comparison = shadowComparator.compareShadowSessions(
      ownerLegacyFixture,
      makeSession({
        uid: "owner",
        email: "owner@example.test",
        globalRole: "system_owner",
        currentWorkspaceId: "owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1",
        currentWorkspaceRole: "super_manager",
        isSystemOwner: true,
      }),
    );
    const mismatch = comparison.mismatches.find((item) => item.code === "GLOBAL_ROLE_MISMATCH");
    assert.equal(mismatch.severity, "warning");
  }],
  ["shadow flags legacy workspaceRole system_owner versus super_manager as warning", () => {
    const comparison = shadowComparator.compareShadowSessions(
      ownerLegacyFixture,
      makeSession({
        uid: "owner",
        email: "owner@example.test",
        globalRole: "system_owner",
        currentWorkspaceId: "owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1",
        currentWorkspaceRole: "super_manager",
        isSystemOwner: true,
      }),
    );
    const mismatch = comparison.mismatches.find((item) => item.code === "WORKSPACE_ROLE_MISMATCH");
    assert.equal(mismatch.severity, "warning");
  }],
  ["shadow treats wrong currentWorkspaceId as non-critical warning", () => {
    const comparison = shadowComparator.compareShadowSessions(
      ownerLegacyFixture,
      makeSession({
        uid: "owner",
        email: "owner@example.test",
        globalRole: "system_owner",
        currentWorkspaceId: "owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1",
        currentWorkspaceRole: "super_manager",
        isSystemOwner: true,
        warnings: [{
          code: "WORKSPACE_NOT_FOUND",
          message: "missing legacy workspace",
        }],
      }),
    );
    const mismatch = comparison.mismatches.find((item) => item.code === "WORKSPACE_ID_MISMATCH");
    assert.equal(mismatch.severity, "warning");
  }],
  ["shadow flags legacy authenticated but new unauthenticated as critical", () => {
    const comparison = shadowComparator.compareShadowSessions(makeLegacySession(), null);
    assert.ok(comparison.mismatches.some((item) => item.code === "NEW_SESSION_MISSING" && item.severity === "critical"));
    assert.ok(comparison.mismatches.some((item) => item.code === "AUTH_STATE_MISMATCH" && item.severity === "critical"));
  }],
  ["shadow uid mismatch is critical", () => {
    const comparison = shadowComparator.compareShadowSessions(
      makeLegacySession({ uid: "legacy-user" }),
      makeSession({ uid: "new-user" }),
    );
    assert.ok(comparison.mismatches.some((item) => item.code === "UID_MISMATCH" && item.severity === "critical"));
  }],
  ["shadow currentWorkspaceId null normal user is accepted", async () => {
    const diagnostic = await shadowService.runShadowSessionComparison({
      firebaseUser: makeUser("normal-null-ws"),
      legacySession: makeLegacySession({
        uid: "normal-null-ws",
        email: "normal-null-ws@example.test",
        currentWorkspaceId: null,
        workspaceId: null,
      }),
      repository: makeRepository({
        async getUserDocument(uid) {
          return {
            exists: true,
            data: {
              uid,
              email: "normal-null-ws@example.test",
              status: "active",
              globalRole: "user",
              currentWorkspaceId: null,
            },
          };
        },
      }),
    });

    assert.equal(diagnostic.shadowSession.status, "active");
    assert.equal(diagnostic.shadowSession.currentWorkspaceId, null);
    assert.equal(diagnostic.comparison.workspaceIdMatches, true);
  }],
  ["shadow active user with valid nested membership loads role", async () => {
    const diagnostic = await shadowService.runShadowSessionComparison({
      firebaseUser: makeUser("manager-user"),
      legacySession: makeLegacySession({
        uid: "manager-user",
        email: "manager-user@example.test",
        workspaceRole: "manager",
        currentWorkspaceId: "workspace-a",
        workspaceId: "workspace-a",
      }),
      repository: makeRepository({
        async getUserDocument(uid) {
          return {
            exists: true,
            data: {
              uid,
              email: "manager-user@example.test",
              status: "active",
              globalRole: "user",
              currentWorkspaceId: "workspace-a",
            },
          };
        },
        async getNestedMembership() {
          return {
            exists: true,
            membership: {
              uid: "manager-user",
              role: "manager",
              status: "active",
            },
          };
        },
      }),
    });

    assert.equal(diagnostic.shadowSession.currentWorkspaceRole, "manager");
    assert.equal(diagnostic.comparison.workspaceRoleMatches, true);
  }],
  ["shadow active user with deleted workspace does not fail critically", async () => {
    const diagnostic = await shadowService.runShadowSessionComparison({
      firebaseUser: makeUser("deleted-ws-user"),
      legacySession: makeLegacySession({
        uid: "deleted-ws-user",
        email: "deleted-ws-user@example.test",
        currentWorkspaceId: "deleted-ws",
        workspaceId: "deleted-ws",
      }),
      repository: makeRepository({
        async getUserDocument(uid) {
          return {
            exists: true,
            data: {
              uid,
              status: "active",
              globalRole: "user",
              currentWorkspaceId: "deleted-ws",
            },
          };
        },
        async getWorkspace() {
          return {
            exists: true,
            workspace: {
              id: "deleted-ws",
              deleted: true,
            },
          };
        },
      }),
    });

    assert.equal(diagnostic.shadowSession.currentWorkspaceId, null);
    assert.ok(diagnostic.shadowSession.warnings.some((warning) => warning.code === "WORKSPACE_NOT_FOUND"));
    assert.equal(diagnostic.comparison.mismatches.some((item) => item.severity === "critical"), false);
  }],
  ["shadow pending user returns account action state only", async () => {
    const diagnostic = await shadowService.runShadowSessionComparison({
      firebaseUser: makeUser("pending-user"),
      legacySession: makeLegacySession({
        uid: "pending-user",
        email: "pending-user@example.test",
        status: "pending",
      }),
      repository: makeRepository({
        async getUserDocument(uid) {
          return {
            exists: true,
            data: {
              uid,
              email: "pending-user@example.test",
              status: "pending",
              globalRole: "user",
              currentWorkspaceId: "workspace-a",
            },
          };
        },
      }),
    });

    assert.equal(diagnostic.shadowSession.status, "pending");
    assert.equal(diagnostic.shadowSession.currentWorkspaceId, null);
  }],
  ["shadow disabled string false remains active", async () => {
    const diagnostic = await shadowService.runShadowSessionComparison({
      firebaseUser: makeUser("disabled-false-user"),
      legacySession: makeLegacySession({
        uid: "disabled-false-user",
        email: "disabled-false-user@example.test",
        status: "active",
      }),
      repository: makeRepository({
        async getUserDocument(uid) {
          return {
            exists: true,
            data: {
              uid,
              email: "disabled-false-user@example.test",
              disabled: "false",
            },
          };
        },
      }),
    });

    assert.equal(diagnostic.shadowSession.status, "active");
  }],
  ["shadow disabled string true becomes disabled", async () => {
    const diagnostic = await shadowService.runShadowSessionComparison({
      firebaseUser: makeUser("disabled-true-user"),
      legacySession: makeLegacySession({
        uid: "disabled-true-user",
        email: "disabled-true-user@example.test",
        status: "disabled",
      }),
      repository: makeRepository({
        async getUserDocument(uid) {
          return {
            exists: true,
            data: {
              uid,
              email: "disabled-true-user@example.test",
              disabled: "true",
            },
          };
        },
      }),
    });

    assert.equal(diagnostic.shadowSession.status, "disabled");
  }],
  ["shadow detects viewer workspace role difference", () => {
    const comparison = shadowComparator.compareShadowSessions(
      makeLegacySession({ workspaceRole: "normal", currentRole: "normal", role: "normal" }),
      makeSession({ currentWorkspaceRole: "viewer" }),
    );
    assert.ok(comparison.mismatches.some((item) => item.code === "WORKSPACE_ROLE_MISMATCH"));
  }],
  ["shadow detects print_account workspace role difference", () => {
    const comparison = shadowComparator.compareShadowSessions(
      makeLegacySession({ workspaceRole: "normal", currentRole: "normal", role: "normal" }),
      makeSession({ currentWorkspaceRole: "print_account" }),
    );
    assert.ok(comparison.mismatches.some((item) => item.code === "WORKSPACE_ROLE_MISMATCH"));
  }],
  ["shadow missing nested member stays non-critical", async () => {
    const diagnostic = await shadowService.runShadowSessionComparison({
      firebaseUser: makeUser("no-member-user"),
      legacySession: makeLegacySession({
        uid: "no-member-user",
        email: "no-member-user@example.test",
        currentWorkspaceId: "workspace-a",
        workspaceId: "workspace-a",
      }),
      repository: makeRepository({
        async getUserDocument(uid) {
          return {
            exists: true,
            data: {
              uid,
              status: "active",
              globalRole: "user",
              currentWorkspaceId: "workspace-a",
            },
          };
        },
        async getNestedMembership() {
          return { exists: false, membership: null };
        },
      }),
    });

    assert.equal(diagnostic.shadowSession.currentWorkspaceRole, null);
    assert.ok(diagnostic.shadowSession.warnings.some((warning) => warning.code === "MEMBERSHIP_NOT_FOUND"));
    assert.equal(diagnostic.comparison.mismatches.some((item) => item.severity === "critical"), false);
  }],
  ["shadow masks uid and email in logger payload", () => {
    assert.equal(shadowComparator.maskUid("abcdef123456"), "abcd...3456");
    assert.equal(shadowComparator.maskEmail("student@example.test"), "st***t@example.test");
  }],
  ["shadow logging is disabled outside development", () => {
    assert.equal(shadowComparator.shouldEmitShadowLog(false), false);
    assert.equal(shadowComparator.shouldEmitShadowLog(true), true);
  }],
  ["shadow service emits masked payload only when logging is enabled", async () => {
    const logs = [];
    await shadowService.runShadowSessionComparison({
      firebaseUser: makeUser("logger-user"),
      legacySession: makeLegacySession({
        uid: "logger-user",
        email: "logger-user@example.test",
      }),
      repository: makeRepository(),
      enableLogging: true,
      logger(payload) {
        logs.push(payload);
      },
    });

    assert.equal(logs.length, 1);
    assert.equal(logs[0].uid, "logg...user");
    assert.equal(logs[0].email, "lo***r@example.test");
    assert.equal(Object.prototype.hasOwnProperty.call(logs[0], "legacySession"), false);
  }],
  ["shadow legacy snapshot reads pm-auth-v31 without writing storage", () => {
    const state = {
      auth: { currentUserId: "local-1" },
      users: [{
        id: "local-1",
        email: "local@example.test",
        role: "normal",
        status: "active",
        currentWorkspaceId: "workspace-a",
      }],
    };
    const writes = [];
    const snapshot = shadowService.readLegacySessionSnapshot({
      windowLike: {
        localStorage: {
          getItem(key) {
            assert.equal(key, "pm-auth-v31");
            return JSON.stringify(state);
          },
          setItem(key) {
            writes.push(key);
          },
        },
        sessionStorage: {
          getItem() {
            return "local-1";
          },
        },
      },
    });

    assert.equal(snapshot.uid, "local-1");
    assert.equal(snapshot.currentWorkspaceId, "workspace-a");
    assert.deepEqual(writes, []);
  }],
  ["shadow page is enabled only in development", () => {
    assert.equal(shadowPageUtils.isShadowPageAllowed(true), true);
    assert.equal(shadowPageUtils.isShadowPageAllowed(false), false);
  }],
  ["shadow masks workspaceId", () => {
    assert.equal(
      shadowComparator.maskWorkspaceId("owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1"),
      "owner_...Vax1",
    );
    assert.equal(shadowComparator.maskWorkspaceId("ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2"), "ws_...NBc2");
  }],
  ["shadow safe summary contains no personal identifiers", () => {
    const summary = shadowPageUtils.createSafeShadowSummary({
      legacySession: makeLegacySession({
        uid: "private-uid",
        email: "private@example.test",
        currentWorkspaceId: "workspace-private",
      }),
      shadowSession: makeSession({
        uid: "private-uid",
        email: "private@example.test",
        currentWorkspaceId: "workspace-private",
        currentWorkspaceRole: "normal",
      }),
      comparison: shadowComparator.compareShadowSessions(
        makeLegacySession({ uid: "private-uid" }),
        makeSession({ uid: "private-uid" }),
      ),
      timestamp: "2026-06-18T00:00:00.000Z",
    }, true);

    assert.equal(shadowPageUtils.assertSafeSummaryHasNoSensitiveIdentifiers(summary), true);
    assert.equal(JSON.stringify(summary).includes("@"), false);
    assert.equal(JSON.stringify(summary).includes("private-uid"), false);
    assert.equal(JSON.stringify(summary).includes("workspace-private"), false);
  }],
  ["shadow warning-only result is not critical", () => {
    const comparison = shadowComparator.compareShadowSessions(
      ownerLegacyFixture,
      makeSession({
        uid: "owner",
        email: "owner@example.test",
        globalRole: "system_owner",
        currentWorkspaceId: "owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1",
        currentWorkspaceRole: "super_manager",
        isSystemOwner: true,
      }),
    );

    assert.equal(shadowPageUtils.getShadowResultLevel(comparison), "WARNING");
  }],
  ["shadow refresh comparison does not mutate legacy session", async () => {
    const legacy = makeLegacySession({
      uid: "refresh-user",
      email: "refresh-user@example.test",
      currentWorkspaceId: "workspace-a",
    });
    const before = JSON.stringify(legacy);

    await shadowService.runShadowSessionComparison({
      firebaseUser: makeUser("refresh-user"),
      legacySession: legacy,
      repository: makeRepository(),
    });

    assert.equal(JSON.stringify(legacy), before);
  }],
  ["shadow mode does not call repository write APIs", async () => {
    let attemptedWrite = false;
    const readOnlyRepository = new Proxy(makeRepository(), {
      get(target, property) {
        const name = String(property).toLowerCase();
        if (name.includes("set") || name.includes("update") || name.includes("delete") || name.includes("write")) {
          attemptedWrite = true;
          throw new Error(`unexpected write api ${String(property)}`);
        }
        return target[property];
      },
    });

    await shadowService.runShadowSessionComparison({
      firebaseUser: makeUser("read-only-user"),
      legacySession: makeLegacySession({
        uid: "read-only-user",
        email: "read-only-user@example.test",
      }),
      repository: readOnlyRepository,
    });

    assert.equal(attemptedWrite, false);
  }],
  ["shadow source files do not import Firestore write APIs", () => {
    const files = [
      "src/auth/shadow/shadowReadRepository.ts",
      "src/auth/shadow/ShadowAuthObserver.tsx",
      "src/dev-shadow/ShadowAuthTestApp.tsx",
      "src/dev-diagnostics/OwnerAdminDiagnosticsApp.tsx",
      "src/dev-auth-preview/AuthProviderPreviewApp.tsx",
      "src/dev-auth-preview/main.tsx",
      "src/dev-auth-preview/authProviderPreviewUtils.ts",
      "src/dev-shadow/FirstReactScreenAuthPanel.tsx",
      "src/dev-shadow/firstReactScreenAuthUtils.ts",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["owner admin diagnostics creates safe bug report", () => {
    const comparison = shadowComparator.compareShadowSessions(
      ownerLegacyFixture,
      makeSession({
        uid: "owner",
        email: "owner@example.test",
        globalRole: "system_owner",
        currentWorkspaceId: "owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1",
        currentWorkspaceRole: "super_manager",
        isSystemOwner: true,
      }),
    );
    const report = adminDiagnosticsUtils.createSafeAdminBugReport({
      input: {
        screenOrTab: "?쒖뒪??愿由ъ옄 > 紐⑤뱺 ?뚯썝",
        clickedButton: "沅뚰븳 ?먭?/蹂듦뎄",
        symptom: "紐⑸줉??媛깆떊?섏? ?딆쓬",
        consoleError: "Missing or insufficient permissions",
        firestorePermissionDenied: "yes",
        reproductionSteps: "1. ?ㅻ꼫 濡쒓렇??n2. ?쒖뒪??愿由ъ옄 ??n3. 沅뚰븳 ?먭?/蹂듦뎄 ?대┃",
        persistsAfterRefresh: "yes",
      },
      legacySession: ownerLegacyFixture,
      diagnostic: {
        legacySession: ownerLegacyFixture,
        shadowSession: makeSession({
          uid: "owner",
          email: "owner@example.test",
          globalRole: "system_owner",
          currentWorkspaceId: "owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1",
          currentWorkspaceRole: "super_manager",
          isSystemOwner: true,
        }),
        comparison,
        timestamp: "2026-06-18T00:00:00.000Z",
      },
      firebaseAuthenticated: true,
      origin: "http://127.0.0.1:5173",
      createdAt: "2026-06-18T00:00:00.000Z",
    });

    assert.equal(report.reportType, "owner-admin-diagnostics");
    assert.equal(report.shadow.isSystemOwner, true);
    assert.equal(report.shadowRoleContext.currentWorkspaceRole, "super_manager");
    assert.equal(report.legacy.workspaceIdMasked, "ws_...NBc2");
    assert.equal(report.shadowRoleContext.workspaceIdMasked, "owner_...Vax1");
    assert.equal(adminDiagnosticsUtils.assertAdminBugReportHasNoRawIdentifiers(report), true);
    assert.equal(JSON.stringify(report).includes("owner@example.test"), false);
    assert.equal(JSON.stringify(report).includes("owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1"), false);
  }],
  ["owner admin diagnostics empty input has required fields", () => {
    const input = adminDiagnosticsUtils.emptyAdminBugInput();
    assert.deepEqual(Object.keys(input).sort(), [
      "clickedButton",
      "consoleError",
      "firestorePermissionDenied",
      "persistsAfterRefresh",
      "reproductionSteps",
      "screenOrTab",
      "symptom",
    ].sort());
  }],
  ["owner admin diagnostics new auth flag defaults off", () => {
    assert.equal(newAuthDiagnosticsFlag.resolveNewAuthDiagnosticsFlag(), false);
    assert.equal(newAuthDiagnosticsFlag.authModeForNewAuthDiagnosticsFlag(false), "legacy-direct");
  }],
  ["owner admin diagnostics new auth flag reads env", () => {
    assert.equal(newAuthDiagnosticsFlag.resolveNewAuthDiagnosticsFlag({
      envValue: "true",
    }), true);
    assert.equal(newAuthDiagnosticsFlag.resolveNewAuthDiagnosticsFlag({
      envValue: "false",
    }), false);
  }],
  ["owner admin diagnostics query switch overrides env", () => {
    assert.equal(newAuthDiagnosticsFlag.resolveNewAuthDiagnosticsFlag({
      search: "?newAuth=off",
      envValue: "true",
    }), false);
    assert.equal(newAuthDiagnosticsFlag.resolveNewAuthDiagnosticsFlag({
      search: "?newAuth=on",
      envValue: "false",
    }), true);
    assert.equal(newAuthDiagnosticsFlag.authModeForNewAuthDiagnosticsFlag(true), "new-provider");
  }],
  ["auth provider preview flag defaults off", () => {
    assert.equal(authProviderPreviewUtils.resolveAuthProviderPreviewFlag({
      isDev: true,
    }), false);
  }],
  ["auth provider preview flag reads env in dev only", () => {
    assert.equal(authProviderPreviewUtils.resolveAuthProviderPreviewFlag({
      envValue: "true",
      isDev: true,
    }), true);
    assert.equal(authProviderPreviewUtils.resolveAuthProviderPreviewFlag({
      envValue: "true",
      isDev: false,
    }), false);
  }],
  ["auth provider preview query switch overrides env", () => {
    assert.equal(authProviderPreviewUtils.resolveAuthProviderPreviewFlag({
      search: "?preview=off",
      envValue: "true",
      isDev: true,
    }), false);
    assert.equal(authProviderPreviewUtils.resolveAuthProviderPreviewFlag({
      search: "?preview=on",
      envValue: "false",
      isDev: true,
    }), true);
  }],
  ["auth provider preview phase messages cover required states", () => {
    assert.ok(authProviderPreviewUtils.phaseMessageForPreview("initializing", null).title);
    assert.ok(authProviderPreviewUtils.phaseMessageForPreview("signed_out", null).title);
    assert.ok(authProviderPreviewUtils.phaseMessageForPreview("loading_session", null).title);
    assert.ok(authProviderPreviewUtils.phaseMessageForPreview("authenticated", makeSession()).title);
    assert.ok(authProviderPreviewUtils.phaseMessageForPreview("account_action_required", makeSession({ status: "pending" })).title);
    assert.ok(authProviderPreviewUtils.phaseMessageForPreview("error", null, "PERMISSION_DENIED").title);
  }],
  ["auth provider preview currentWorkspaceId null is normal authenticated state", () => {
    const message = authProviderPreviewUtils.phaseMessageForPreview("authenticated", makeSession({
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
    }));
    assert.equal(message.tone, "success");
    assert.ok(message.body);
  }],
  ["auth provider preview system_owner receives all preview permissions", () => {
    const rows = authProviderPreviewUtils.createPermissionPreview(makeSession({
      globalRole: "system_owner",
      isSystemOwner: true,
      currentWorkspaceRole: "super_manager",
    }));
    assert.equal(rows.every((row) => row.allowed), true);
  }],
  ["auth provider preview warnings are not treated as login failure", () => {
    const message = authProviderPreviewUtils.phaseMessageForPreview("authenticated", makeSession({
      warnings: [
        { code: "GLOBAL_ROLE_MISMATCH", message: "legacy mismatch" },
        { code: "WORKSPACE_NOT_FOUND", message: "legacy workspace missing" },
      ],
    }));
    assert.equal(message.tone, "success");
  }],
  ["auth provider preview permission result includes allowed and denied labels", () => {
    const rows = authProviderPreviewUtils.createPermissionPreview(makeSession({
      currentWorkspaceRole: "viewer",
    }));
    assert.ok(rows.find((row) => row.permission === "workspace.read")?.label);
    assert.ok(rows.find((row) => row.permission === "lessons.write")?.label);
  }],
  ["auth provider preview viewer write permission is denied", () => {
    const rows = authProviderPreviewUtils.createPermissionPreview(makeSession({
      currentWorkspaceRole: "viewer",
    }));
    assert.equal(rows.find((row) => row.permission === "assignments.write")?.allowed, false);
  }],
  ["auth provider preview print_account general write is denied", () => {
    const rows = authProviderPreviewUtils.createPermissionPreview(makeSession({
      currentWorkspaceRole: "print_account",
    }));
    assert.equal(rows.find((row) => row.permission === "assignments.write")?.allowed, false);
  }],
  ["auth provider preview manager role management is limited", () => {
    const rows = authProviderPreviewUtils.createRoleManagementPreview(makeSession({
      currentWorkspaceRole: "manager",
    }));
    assert.equal(rows.find((row) => row.targetRole === "super_manager")?.allowed, false);
    assert.equal(rows.find((row) => row.targetRole === "teacher")?.allowed, true);
  }],
  ["auth provider preview reload button uses provider reloadSession only", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-auth-preview/AuthProviderPreviewApp.tsx"), "utf8");
    assert.match(source, /reloadSession\(\)/);
    assert.equal(/\bsignOut\(/.test(source), false);
  }],
  ["auth provider preview reload failure does not call Firebase sign out", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/auth/AuthProvider.tsx"), "utf8");
    const reloadStart = source.indexOf("const reloadSession = useCallback");
    const switchStart = source.indexOf("const switchWorkspace = useCallback");
    const reloadSource = source.slice(reloadStart, switchStart);
    assert.match(reloadSource, /setPhase\("error"\)/);
    assert.equal(/firebaseSignOut/.test(reloadSource), false);
  }],
  ["auth provider preview prevents duplicate reload clicks", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-auth-preview/AuthProviderPreviewApp.tsx"), "utf8");
    assert.match(source, /if \(reloadBusy\) return/);
    assert.match(source, /disabled=\{reloadBusy \|\| isSessionLoading\}/);
  }],
  ["auth provider preview does not delete storage", () => {
    const files = [
      "src/dev-auth-preview/AuthProviderPreviewApp.tsx",
      "src/dev-auth-preview/main.tsx",
      "src/dev-auth-preview/authProviderPreviewUtils.ts",
    ];
    const forbidden = /\b(localStorage|sessionStorage)\.(removeItem|clear)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["auth provider preview page is production blocked by DEV guard", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-auth-preview/main.tsx"), "utf8");
    assert.match(source, /import\.meta\.env\.DEV/);
    assert.equal(authProviderPreviewUtils.resolveAuthProviderPreviewFlag({
      search: "?preview=on",
      envValue: "true",
      isDev: false,
    }), false);
  }],
  ["auth provider preview uses new AuthProvider context as state source", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "src/dev-auth-preview/AuthProviderPreviewApp.tsx"), "utf8");
    const mainSource = readFileSync(path.resolve(projectRoot, "src/dev-auth-preview/main.tsx"), "utf8");
    assert.match(appSource, /useAuth\(\)/);
    assert.match(mainSource, /<AuthProvider>/);
    assert.equal(/pm-auth-v31/.test(appSource), false);
  }],
  ["first react screen new auth flag defaults off", () => {
    assert.equal(firstReactScreenAuthUtils.resolveFirstReactScreenAuthFlag({
      isDev: true,
    }), false);
  }],
  ["first react screen new auth query on enables provider", () => {
    assert.equal(firstReactScreenAuthUtils.resolveFirstReactScreenAuthFlag({
      search: "?newAuthScreen=on",
      envValue: "false",
      isDev: true,
    }), true);
  }],
  ["first react screen query off overrides env true", () => {
    assert.equal(firstReactScreenAuthUtils.resolveFirstReactScreenAuthFlag({
      search: "?newAuthScreen=off",
      envValue: "true",
      isDev: true,
    }), false);
  }],
  ["first react screen renders with new provider state when enabled", () => {
    const panelSource = readFileSync(path.resolve(projectRoot, "src/dev-shadow/FirstReactScreenAuthPanel.tsx"), "utf8");
    const mainSource = readFileSync(path.resolve(projectRoot, "src/dev-shadow/main.tsx"), "utf8");
    assert.match(panelSource, /useAuth\(\)/);
    assert.match(mainSource, /<AuthProvider>/);
    assert.match(mainSource, /<FirstReactScreenAuthPanel \/>/);
  }],
  ["first react screen preserves existing fallback", () => {
    const mainSource = readFileSync(path.resolve(projectRoot, "src/dev-shadow/main.tsx"), "utf8");
    assert.match(mainSource, /<ShadowAuthTestApp \/>/);
    assert.equal(firstReactScreenAuthUtils.resolveFirstReactScreenAuthFlag({
      envValue: "false",
      isDev: true,
    }), false);
  }],
  ["first react screen authenticated state message", () => {
    const message = firstReactScreenAuthUtils.firstReactScreenPhaseMessage("authenticated", makeSession({
      currentWorkspaceId: "workspace-a",
      currentWorkspaceRole: "normal",
    }));
    assert.ok(message.title);
    assert.equal(message.tone, "success");
  }],
  ["first react screen signed out state message", () => {
    assert.ok(firstReactScreenAuthUtils.firstReactScreenPhaseMessage("signed_out", null).title);
  }],
  ["first react screen loading session state message", () => {
    assert.ok(firstReactScreenAuthUtils.firstReactScreenPhaseMessage("loading_session", null).title);
  }],
  ["first react screen account action required state message", () => {
    const message = firstReactScreenAuthUtils.firstReactScreenPhaseMessage("account_action_required", makeSession({
      status: "pending",
    }));
    assert.ok(message.title);
    assert.match(message.body, /pending/);
  }],
  ["first react screen error state has retry wording", () => {
    const message = firstReactScreenAuthUtils.firstReactScreenPhaseMessage("error", null, "PERMISSION_DENIED");
    assert.ok(message.title);
    assert.match(message.body, /reloadSession/);
  }],
  ["first react screen currentWorkspaceId null is not logout", () => {
    const session = makeSession({
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
    });
    const message = firstReactScreenAuthUtils.firstReactScreenPhaseMessage("authenticated", session);
    const guard = firstReactScreenAuthUtils.firstReactScreenGuardResult("authenticated", session);
    assert.equal(message.tone, "success");
    assert.equal(guard.reason, "workspace-missing");
    assert.ok(guard.message);
  }],
  ["first react screen system owner passes workspace read without workspace role system_owner", () => {
    const guard = firstReactScreenAuthUtils.firstReactScreenGuardResult("authenticated", makeSession({
      globalRole: "system_owner",
      isSystemOwner: true,
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      warnings: [
        { code: "GLOBAL_ROLE_MISMATCH", message: "legacy mismatch" },
      ],
    }));
    assert.equal(guard.allowed, true);
  }],
  ["first react screen permission guard allows workspace read", () => {
    const guard = firstReactScreenAuthUtils.firstReactScreenGuardResult("authenticated", makeSession({
      currentWorkspaceId: "workspace-a",
      currentWorkspaceRole: "viewer",
    }));
    assert.equal(guard.allowed, true);
  }],
  ["first react screen permission guard denies missing permission", () => {
    const guard = firstReactScreenAuthUtils.firstReactScreenGuardResult(
      "authenticated",
      makeSession({
        currentWorkspaceId: "workspace-a",
        currentWorkspaceRole: "viewer",
      }),
      "lessons.write",
    );
    assert.equal(guard.allowed, false);
    assert.ok(guard.message);
  }],
  ["first react screen reload success path is present", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-shadow/FirstReactScreenAuthPanel.tsx"), "utf8");
    assert.match(source, /await reloadSession\(\)/);
    assert.ok(source);
  }],
  ["first react screen reload failure does not sign out", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-shadow/FirstReactScreenAuthPanel.tsx"), "utf8");
    assert.ok(source);
    assert.equal(/\bsignOut\(/.test(source), false);
  }],
  ["first react screen imports no Firestore write APIs", () => {
    const files = [
      "src/dev-shadow/FirstReactScreenAuthPanel.tsx",
      "src/dev-shadow/firstReactScreenAuthUtils.ts",
      "src/dev-shadow/main.tsx",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["first react screen does not delete browser storage", () => {
    const files = [
      "src/dev-shadow/FirstReactScreenAuthPanel.tsx",
      "src/dev-shadow/firstReactScreenAuthUtils.ts",
      "src/dev-shadow/main.tsx",
    ];
    const forbidden = /\b(localStorage|sessionStorage)\.(removeItem|clear)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["first react screen does not regress existing operational entry files", () => {
    const mainSource = readFileSync(path.resolve(projectRoot, "src/dev-shadow/main.tsx"), "utf8");
    assert.match(mainSource, /resolveFirstReactScreenAuthFlag/);
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("newAuthScreen"), false);
    assert.equal(readFileSync(path.resolve(projectRoot, "app.js"), "utf8").includes("newAuthScreen"), false);
  }],
  ["first react screen feature is default off in production", () => {
    assert.equal(firstReactScreenAuthUtils.resolveFirstReactScreenAuthFlag({
      search: "?newAuthScreen=on",
      envValue: "true",
      isDev: false,
    }), false);
  }],
  ["verify email new auth flag defaults false", () => {
    assert.equal(verifyEmailUtils.resolveVerifyEmailNewAuthFlag({
      isDev: true,
    }), false);
  }],
  ["verify email new auth query on enables", () => {
    assert.equal(verifyEmailUtils.resolveVerifyEmailNewAuthFlag({
      search: "?newAuthVerify=on",
      envValue: "false",
      isDev: true,
    }), true);
  }],
  ["verify email new auth query off overrides env true", () => {
    assert.equal(verifyEmailUtils.resolveVerifyEmailNewAuthFlag({
      search: "?newAuthVerify=off",
      envValue: "true",
      isDev: true,
    }), false);
  }],
  ["verify email initializing message", () => {
    assert.ok(verifyEmailUtils.verifyEmailPhaseMessage("initializing").body);
  }],
  ["verify email signed out message", () => {
    assert.ok(verifyEmailUtils.verifyEmailPhaseMessage("signed_out").body);
  }],
  ["verify email loading session message", () => {
    assert.ok(verifyEmailUtils.verifyEmailPhaseMessage("loading_session").body);
  }],
  ["verify email authenticated message", () => {
    assert.ok(verifyEmailUtils.verifyEmailPhaseMessage("authenticated").body);
  }],
  ["verify email account action required message", () => {
    assert.ok(verifyEmailUtils.verifyEmailPhaseMessage("account_action_required").body);
  }],
  ["verify email error message", () => {
    assert.ok(verifyEmailUtils.verifyEmailPhaseMessage("error").body);
  }],
  ["verify email verified true message", () => {
    const message = verifyEmailUtils.emailVerificationMessage(true);
    assert.ok(message.body);
    assert.equal(message.tone, "success");
  }],
  ["verify email verified false message", () => {
    const message = verifyEmailUtils.emailVerificationMessage(false);
    assert.ok(message.body);
    assert.equal(message.tone, "warning");
  }],
  ["verify email active status message", () => {
    assert.ok(verifyEmailUtils.accountStatusMessage("active").body);
  }],
  ["verify email pending status message", () => {
    assert.ok(verifyEmailUtils.accountStatusMessage("pending").body);
  }],
  ["verify email rejected status message", () => {
    assert.ok(verifyEmailUtils.accountStatusMessage("rejected").body);
  }],
  ["verify email disabled status message", () => {
    assert.ok(verifyEmailUtils.accountStatusMessage("disabled").body);
  }],
  ["verify email unknown status message", () => {
    assert.ok(verifyEmailUtils.accountStatusMessage("unknown").body);
  }],
  ["verify email currentWorkspaceId null is normal", () => {
    const message = verifyEmailUtils.workspaceStatusMessage(makeSession({
      status: "active",
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
    }));
    assert.ok(message.body);
    assert.ok(message.body);
  }],
  ["verify email system owner values are displayed as session values", () => {
    const session = makeSession({
      globalRole: "system_owner",
      isSystemOwner: true,
      currentWorkspaceRole: "super_manager",
    });
    assert.equal(session.globalRole, "system_owner");
    assert.ok(verifyEmailUtils.booleanYesNo(session.isSystemOwner));
    assert.equal(verifyEmailUtils.valueOrDash(session.currentWorkspaceRole), "super_manager");
  }],
  ["verify email legacy warning is not failure", () => {
    const session = makeSession({
      warnings: [
        { code: "LEGACY_STATUS_FIELDS_PRESENT", message: "legacy status" },
        { code: "LEGACY_ROLE_PRESENT", message: "legacy role" },
        { code: "GLOBAL_ROLE_MISMATCH", message: "legacy global role" },
        { code: "WORKSPACE_NOT_FOUND", message: "legacy workspace" },
      ],
    });
    assert.match(verifyEmailUtils.warningCodes(session), /GLOBAL_ROLE_MISMATCH/);
    assert.equal(verifyEmailUtils.verifyEmailPhaseMessage("authenticated").tone, "success");
  }],
  ["verify email reload success path is present", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/pages/VerifyEmail.tsx"), "utf8");
    assert.match(source, /await reloadSession\(\)/);
    assert.ok(source);
  }],
  ["verify email reload failure does not sign out", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/pages/VerifyEmail.tsx"), "utf8");
    assert.ok(source);
    assert.equal(/\bsignOut\(/.test(source), false);
  }],
  ["verify email imports no Firestore write APIs", () => {
    const files = [
      "src/pages/VerifyEmail.tsx",
      "src/pages/verifyEmailMain.tsx",
      "src/pages/verifyEmailUtils.ts",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["verify email does not modify auth user", () => {
    const files = [
      "src/pages/VerifyEmail.tsx",
      "src/pages/verifyEmailMain.tsx",
      "src/pages/verifyEmailUtils.ts",
    ];
    const forbidden = /\b(sendEmailVerification|updateEmail|updatePassword|deleteUser|reauthenticate|signOut)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["verify email does not delete browser storage", () => {
    const files = [
      "src/pages/VerifyEmail.tsx",
      "src/pages/verifyEmailMain.tsx",
      "src/pages/verifyEmailUtils.ts",
    ];
    const forbidden = /\b(localStorage|sessionStorage)\.(removeItem|clear)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["verify email masks sensitive email", () => {
    const rawEmail = "student123@example.test";
    const masked = verifyEmailUtils.maskEmailForVerifyEmail(rawEmail);
    assert.equal(masked, "st***3@example.test");
    assert.equal(verifyEmailUtils.hasMaskedSensitiveEmail(masked, rawEmail), true);
  }],
  ["verify email fallback preserves existing placeholder", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/pages/VerifyEmail.tsx"), "utf8");
    const mainSource = readFileSync(path.resolve(projectRoot, "src/pages/verifyEmailMain.tsx"), "utf8");
    assert.match(source, /mode = "legacy-placeholder"/);
    assert.match(source, /return null/);
    assert.match(mainSource, /<VerifyEmail \/>/);
  }],
  ["verify email entry uses AuthProvider only when enabled", () => {
    const mainSource = readFileSync(path.resolve(projectRoot, "src/pages/verifyEmailMain.tsx"), "utf8");
    assert.match(mainSource, /resolveVerifyEmailNewAuthFlag/);
    assert.match(mainSource, /<AuthProvider>/);
    assert.match(mainSource, /<VerifyEmail mode="new-auth" \/>/);
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("newAuthVerify"), false);
    assert.equal(readFileSync(path.resolve(projectRoot, "app.js"), "utf8").includes("newAuthVerify"), false);
  }],
  ["login devices new auth flag defaults false", () => {
    assert.equal(loginDevicesUtils.resolveLoginDevicesNewAuthFlag({
      isDev: true,
    }), false);
  }],
  ["login devices new auth query on enables", () => {
    assert.equal(loginDevicesUtils.resolveLoginDevicesNewAuthFlag({
      search: "?newAuthDevices=on",
      envValue: "false",
      isDev: true,
    }), true);
  }],
  ["login devices query off overrides env true", () => {
    assert.equal(loginDevicesUtils.resolveLoginDevicesNewAuthFlag({
      search: "?newAuthDevices=off",
      envValue: "true",
      isDev: true,
    }), false);
  }],
  ["login devices feature is default off in production", () => {
    assert.equal(loginDevicesUtils.resolveLoginDevicesNewAuthFlag({
      search: "?newAuthDevices=on",
      envValue: "true",
      isDev: false,
    }), false);
  }],
  ["login devices initializing message", () => {
    assert.ok(loginDevicesUtils.loginDevicesPhaseMessage("initializing").body);
  }],
  ["login devices signed out message", () => {
    assert.ok(loginDevicesUtils.loginDevicesPhaseMessage("signed_out").body);
  }],
  ["login devices loading session message", () => {
    assert.ok(loginDevicesUtils.loginDevicesPhaseMessage("loading_session").body);
  }],
  ["login devices authenticated message", () => {
    assert.ok(loginDevicesUtils.loginDevicesPhaseMessage("authenticated").body);
  }],
  ["login devices account action required message", () => {
    assert.ok(loginDevicesUtils.loginDevicesPhaseMessage("account_action_required").body);
  }],
  ["login devices error message", () => {
    assert.ok(loginDevicesUtils.loginDevicesPhaseMessage("error").body);
  }],
  ["login devices active account can show devices", () => {
    assert.equal(loginDevicesUtils.loginDevicesAccountStatusMessage("active").tone, "success");
  }],
  ["login devices pending blocks device read", () => {
    assert.ok(loginDevicesUtils.loginDevicesAccountStatusMessage("pending").body);
  }],
  ["login devices rejected blocks device read", () => {
    assert.ok(loginDevicesUtils.loginDevicesAccountStatusMessage("rejected").body);
  }],
  ["login devices disabled blocks device read", () => {
    assert.ok(loginDevicesUtils.loginDevicesAccountStatusMessage("disabled").body);
  }],
  ["login devices uid filter applies", () => {
    const rows = loginDevicesUtils.normalizeDeviceRecords([
      {
        deviceId: "a",
        uid: "user-1",
        workspaceId: "ws-1",
        lastLoginAt: "2026-06-16T10:00:00.000Z",
        lastActiveAt: "2026-06-16T11:00:00.000Z",
      },
      {
        deviceId: "b",
        uid: "other-user",
        workspaceId: "ws-1",
      },
    ], {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].deviceId, "a");
  }],
  ["login devices excludes other uid data", () => {
    const rows = loginDevicesUtils.normalizeDeviceRecords([
      {
        deviceId: "a",
        uid: "other-user",
        workspaceId: "ws-1",
      },
    ], {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(rows.length, 0);
  }],
  ["login devices workspaceId null guidance", () => {
    const message = loginDevicesUtils.workspaceMissingMessage();
    assert.ok(message.body);
    assert.ok(message.body);
  }],
  ["login devices firestore results dedupe by deviceId", () => {
    const rows = loginDevicesUtils.normalizeDeviceRecords([
      {
        deviceId: "same",
        uid: "user-1",
        workspaceId: "ws-1",
      },
      {
        deviceId: "same",
        uid: "user-1",
        workspaceId: "ws-1",
      },
    ], {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(rows.length, 1);
  }],
  ["login devices local fallback parses records", () => {
    const rows = loginDevicesUtils.parseLocalFallbackDevices(JSON.stringify([
      {
        deviceId: "local-1",
        uid: "user-1",
        workspaceId: "ws-1",
      },
    ]), {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].deviceId, "local-1");
  }],
  ["login devices current device ?쒖떆", () => {
    const rows = loginDevicesUtils.normalizeDeviceRecords([
      {
        deviceId: "current",
        uid: "user-1",
        workspaceId: "ws-1",
        isCurrentDevice: true,
      },
    ], {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(rows[0].isCurrentDevice, true);
    assert.ok(rows[0].statusLabel);
  }],
  ["login devices current device duplicate warning", () => {
    const warning = loginDevicesUtils.currentDeviceWarning([
      {
        deviceId: "a",
        uid: "user-1",
        workspaceId: "ws-1",
        deviceName: "A",
        deviceType: "desktop",
        browser: "Chrome",
        os: "Windows",
        lastLoginAt: "?뺤씤?????놁쓬",
        lastActiveAt: "?뺤씤?????놁쓬",
        isCurrentDevice: true,
        revokedAt: null,
        statusLabel: "current",
      },
      {
        deviceId: "b",
        uid: "user-1",
        workspaceId: "ws-1",
        deviceName: "B",
        deviceType: "desktop",
        browser: "Chrome",
        os: "Windows",
        lastLoginAt: "?뺤씤?????놁쓬",
        lastActiveAt: "?뺤씤?????놁쓬",
        isCurrentDevice: true,
        revokedAt: null,
        statusLabel: "current",
      },
    ]);
    assert.ok(warning);
  }],
  ["login devices current device missing warning", () => {
    const warning = loginDevicesUtils.currentDeviceWarning([
      {
        deviceId: "a",
        uid: "user-1",
        workspaceId: "ws-1",
        deviceName: "A",
        deviceType: "desktop",
        browser: "Chrome",
        os: "Windows",
        lastLoginAt: "?뺤씤?????놁쓬",
        lastActiveAt: "?뺤씤?????놁쓬",
        isCurrentDevice: false,
        revokedAt: null,
        statusLabel: "理쒓렐 ?ъ슜",
      },
    ]);
    assert.ok(warning);
  }],
  ["login devices revokedAt status ?쒖떆", () => {
    const rows = loginDevicesUtils.normalizeDeviceRecords([
      {
        deviceId: "revoked",
        uid: "user-1",
        workspaceId: "ws-1",
        revokedAt: "2026-06-16T10:00:00.000Z",
      },
    ], {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.ok(rows[0].statusLabel);
  }],
  ["login devices Timestamp normalizes", () => {
    const value = loginDevicesUtils.normalizeTimestamp({
      toDate() {
        return new Date("2026-06-16T10:00:00.000Z");
      },
    });
    assert.notEqual(value, "-");
  }],
  ["login devices bad time value handled", () => {
    assert.ok(loginDevicesUtils.normalizeTimestamp("not-a-date"));
  }],
  ["login devices pushToken hidden", () => {
    const row = loginDevicesUtils.normalizeDeviceRecord({
      deviceId: "a",
      uid: "user-1",
      workspaceId: "ws-1",
      pushToken: "secret-push-token",
      browser: "Mozilla/5.0 Chrome/120.0",
    }, {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(JSON.stringify(row).includes("secret-push-token"), false);
  }],
  ["login devices full uid not exposed in normalized display fields", () => {
    const row = loginDevicesUtils.normalizeDeviceRecord({
      deviceId: "a",
      uid: "very-sensitive-uid",
      workspaceId: "ws-1",
    }, {
      uid: "very-sensitive-uid",
      workspaceId: "ws-1",
    });
    assert.equal(row.uid, "very-sensitive-uid");
    assert.equal([row.deviceName, row.browser, row.os, row.statusLabel].join(" ").includes("very-sensitive-uid"), false);
  }],
  ["login devices full workspaceId not exposed in normalized display fields", () => {
    const row = loginDevicesUtils.normalizeDeviceRecord({
      deviceId: "a",
      uid: "user-1",
      workspaceId: "workspace-secret",
    }, {
      uid: "user-1",
      workspaceId: "workspace-secret",
    });
    assert.equal(row.workspaceId, "workspace-secret");
    assert.equal([row.deviceName, row.browser, row.os, row.statusLabel].join(" ").includes("workspace-secret"), false);
  }],
  ["login devices permission denied user ?덈궡", () => {
    const message = loginDevicesUtils.permissionDeniedMessage();
    assert.ok(message.body);
    assert.ok(message.body);
    assert.equal(loginDevicesUtils.isPermissionDeniedError({ code: "permission-denied" }), true);
  }],
  ["login devices reloadSession failure does not sign out", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/pages/Settings/LoginDevices.tsx"), "utf8");
    assert.ok(source);
    assert.equal(/\bsignOut\(/.test(source), false);
  }],
  ["login devices imports no Firestore write APIs", () => {
    const files = [
      "src/pages/Settings/LoginDevices.tsx",
      "src/pages/Settings/loginDevicesUtils.ts",
      "src/pages/Settings/loginDevicesReadonlyService.ts",
      "src/pages/Settings/loginDevicesMain.tsx",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["login devices performs no localStorage writes", () => {
    const files = [
      "src/pages/Settings/LoginDevices.tsx",
      "src/pages/Settings/loginDevicesUtils.ts",
      "src/pages/Settings/loginDevicesReadonlyService.ts",
      "src/pages/Settings/loginDevicesMain.tsx",
    ];
    const forbidden = /\b(localStorage|sessionStorage)\.(setItem|removeItem|clear)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["login devices does not modify auth user", () => {
    const files = [
      "src/pages/Settings/LoginDevices.tsx",
      "src/pages/Settings/loginDevicesUtils.ts",
      "src/pages/Settings/loginDevicesReadonlyService.ts",
      "src/pages/Settings/loginDevicesMain.tsx",
    ];
    const forbidden = /\b(sendEmailVerification|updateEmail|updatePassword|deleteUser|reauthenticate|signOut)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["login devices fallback preserves existing placeholder", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/pages/Settings/LoginDevices.tsx"), "utf8");
    const mainSource = readFileSync(path.resolve(projectRoot, "src/pages/Settings/loginDevicesMain.tsx"), "utf8");
    assert.match(source, /mode = "legacy-placeholder"/);
    assert.match(source, /return null/);
    assert.match(mainSource, /<LoginDevices \/>/);
  }],
  ["login devices entry uses AuthProvider only when enabled", () => {
    const mainSource = readFileSync(path.resolve(projectRoot, "src/pages/Settings/loginDevicesMain.tsx"), "utf8");
    assert.match(mainSource, /resolveLoginDevicesNewAuthFlag/);
    assert.match(mainSource, /<AuthProvider>/);
    assert.match(mainSource, /<LoginDevices mode="new-auth" \/>/);
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("newAuthDevices"), false);
    assert.equal(readFileSync(path.resolve(projectRoot, "app.js"), "utf8").includes("newAuthDevices"), false);
  }],
  ["notifications new auth flag defaults false", () => {
    assert.equal(notificationsUtils.resolveNotificationsNewAuthFlag({
      isDev: true,
    }), false);
  }],
  ["notifications new auth query on enables", () => {
    assert.equal(notificationsUtils.resolveNotificationsNewAuthFlag({
      search: "?newAuthNotifications=on",
      envValue: "false",
      isDev: true,
    }), true);
  }],
  ["notifications query off overrides env true", () => {
    assert.equal(notificationsUtils.resolveNotificationsNewAuthFlag({
      search: "?newAuthNotifications=off",
      envValue: "true",
      isDev: true,
    }), false);
  }],
  ["notifications feature is default off in production", () => {
    assert.equal(notificationsUtils.resolveNotificationsNewAuthFlag({
      search: "?newAuthNotifications=on",
      envValue: "true",
      isDev: false,
    }), false);
  }],
  ["notifications initializing message", () => {
    assert.ok(notificationsUtils.notificationsPhaseMessage("initializing").body);
  }],
  ["notifications signed out message", () => {
    assert.ok(notificationsUtils.notificationsPhaseMessage("signed_out").body);
  }],
  ["notifications loading session message", () => {
    assert.ok(notificationsUtils.notificationsPhaseMessage("loading_session").body);
  }],
  ["notifications authenticated message", () => {
    assert.ok(notificationsUtils.notificationsPhaseMessage("authenticated").body);
  }],
  ["notifications account action required message", () => {
    assert.ok(notificationsUtils.notificationsPhaseMessage("account_action_required").body);
  }],
  ["notifications error message", () => {
    assert.ok(notificationsUtils.notificationsPhaseMessage("error").body);
  }],
  ["notifications active account can show list", () => {
    assert.equal(notificationsUtils.notificationsAccountStatusMessage("active").tone, "success");
  }],
  ["notifications pending account blocks read", () => {
    assert.ok(notificationsUtils.notificationsAccountStatusMessage("pending").body);
  }],
  ["notifications rejected account blocks read", () => {
    assert.ok(notificationsUtils.notificationsAccountStatusMessage("rejected").body);
  }],
  ["notifications disabled account blocks read", () => {
    assert.ok(notificationsUtils.notificationsAccountStatusMessage("disabled").body);
  }],
  ["notifications uid filter applies", () => {
    const rows = notificationsUtils.normalizeNotificationRecords([
      {
        notificationId: "a",
        uid: "user-1",
        workspaceId: "ws-1",
        title: "A",
      },
      {
        notificationId: "b",
        uid: "other-user",
        workspaceId: "ws-1",
        title: "B",
      },
    ], {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].notificationId, "a");
  }],
  ["notifications excludes other uid data", () => {
    const rows = notificationsUtils.normalizeNotificationRecords([
      {
        notificationId: "a",
        uid: "other-user",
        workspaceId: "ws-1",
      },
    ], {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(rows.length, 0);
  }],
  ["notifications workspace filter applies", () => {
    const rows = notificationsUtils.normalizeNotificationRecords([
      {
        notificationId: "a",
        uid: "user-1",
        workspaceId: "ws-1",
      },
      {
        notificationId: "b",
        uid: "user-1",
        workspaceId: "ws-2",
      },
    ], {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].workspaceId, "ws-1");
  }],
  ["notifications workspaceId null guidance", () => {
    const message = notificationsUtils.notificationsWorkspaceMissingMessage();
    assert.ok(message.body);
    assert.ok(message.body);
  }],
  ["notifications local fallback parses records", () => {
    const rows = notificationsUtils.parseLocalFallbackNotifications(JSON.stringify([
      {
        notificationId: "local-1",
        uid: "user-1",
        workspaceId: "ws-1",
      },
    ]), {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].notificationId, "local-1");
  }],
  ["notifications dedupe by notificationId", () => {
    const rows = notificationsUtils.normalizeNotificationRecords([
      {
        notificationId: "same",
        uid: "user-1",
        workspaceId: "ws-1",
      },
      {
        notificationId: "same",
        uid: "user-1",
        workspaceId: "ws-1",
      },
    ], {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(rows.length, 1);
  }],
  ["notifications sort newest first", () => {
    const rows = notificationsUtils.normalizeNotificationRecords([
      {
        notificationId: "old",
        uid: "user-1",
        workspaceId: "ws-1",
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        notificationId: "new",
        uid: "user-1",
        workspaceId: "ws-1",
        createdAt: "2026-06-02T00:00:00.000Z",
      },
    ], {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(rows[0].notificationId, "new");
  }],
  ["notifications Timestamp value normalizes", () => {
    const value = notificationsUtils.notificationTimeLabel({
      toDate() {
        return new Date("2026-06-16T10:00:00.000Z");
      },
    });
    assert.notEqual(value, "?쒓컙???뺤씤?????놁쓬");
  }],
  ["notifications bad time value handled", () => {
    assert.ok(notificationsUtils.notificationTimeLabel("not-a-date"));
  }],
  ["notifications read true displays read", () => {
    const row = notificationsUtils.normalizeNotificationRecord({
      notificationId: "a",
      uid: "user-1",
      workspaceId: "ws-1",
      read: true,
    }, {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.ok(row.readLabel);
  }],
  ["notifications read false displays unread", () => {
    const row = notificationsUtils.normalizeNotificationRecord({
      notificationId: "a",
      uid: "user-1",
      workspaceId: "ws-1",
      read: false,
    }, {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.ok(row.readLabel);
  }],
  ["notifications message summary truncates", () => {
    const row = notificationsUtils.normalizeNotificationRecord({
      notificationId: "a",
      uid: "user-1",
      workspaceId: "ws-1",
      message: "1234567890",
    }, {
      uid: "user-1",
      workspaceId: "ws-1",
      maxMessageLength: 5,
    });
    assert.equal(row.messageSummary.length <= 5, true);
  }],
  ["notifications sanitizes html and whitespace", () => {
    assert.ok(notificationsUtils.sanitizeNotificationText("<b>hello</b>\n  world"));
  }],
  ["notifications service label maps system", () => {
    assert.ok(notificationsUtils.notificationServiceLabel("system"));
  }],
  ["notifications service label maps app", () => {
    assert.ok(notificationsUtils.notificationServiceLabel("app"));
  }],
  ["notifications full uid not exposed in display fields", () => {
    const row = notificationsUtils.normalizeNotificationRecord({
      notificationId: "a",
      uid: "very-sensitive-uid",
      workspaceId: "ws-1",
      title: "?뚮┝",
      message: "?댁슜",
    }, {
      uid: "very-sensitive-uid",
      workspaceId: "ws-1",
    });
    assert.equal(row.uid, "very-sensitive-uid");
    assert.equal([row.title, row.messageSummary, row.readLabel, row.createdAt, row.serviceLabel].join(" ").includes("very-sensitive-uid"), false);
  }],
  ["notifications full workspaceId not exposed in display fields", () => {
    const row = notificationsUtils.normalizeNotificationRecord({
      notificationId: "a",
      uid: "user-1",
      workspaceId: "workspace-secret",
      title: "?뚮┝",
      message: "?댁슜",
    }, {
      uid: "user-1",
      workspaceId: "workspace-secret",
    });
    assert.equal(row.workspaceId, "workspace-secret");
    assert.equal([row.title, row.messageSummary, row.readLabel, row.createdAt, row.serviceLabel].join(" ").includes("workspace-secret"), false);
  }],
  ["notifications relatedId is not exposed", () => {
    const row = notificationsUtils.normalizeNotificationRecord({
      notificationId: "a",
      uid: "user-1",
      workspaceId: "ws-1",
      relatedId: "internal-path-secret",
    }, {
      uid: "user-1",
      workspaceId: "ws-1",
    });
    assert.equal(JSON.stringify(row).includes("internal-path-secret"), false);
  }],
  ["notifications permission denied ?덈궡", () => {
    const message = notificationsUtils.notificationsPermissionDeniedMessage();
    assert.ok(message.body);
    assert.ok(message.body);
    assert.equal(notificationsUtils.isNotificationsPermissionDeniedError({ code: "permission-denied" }), true);
  }],
  ["notifications reloadSession failure does not sign out", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/pages/Settings/Notifications.tsx"), "utf8");
    assert.ok(source);
    assert.equal(/\bsignOut\(/.test(source), false);
  }],
  ["notifications imports no Firestore write APIs", () => {
    const files = [
      "src/pages/Settings/Notifications.tsx",
      "src/pages/Settings/notificationsUtils.ts",
      "src/pages/Settings/notificationsReadonlyService.ts",
      "src/pages/Settings/notificationsMain.tsx",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["notifications performs no localStorage writes", () => {
    const files = [
      "src/pages/Settings/Notifications.tsx",
      "src/pages/Settings/notificationsUtils.ts",
      "src/pages/Settings/notificationsReadonlyService.ts",
      "src/pages/Settings/notificationsMain.tsx",
    ];
    const forbidden = /\b(localStorage|sessionStorage)\.(setItem|removeItem|clear)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["notifications does not modify auth user", () => {
    const files = [
      "src/pages/Settings/Notifications.tsx",
      "src/pages/Settings/notificationsUtils.ts",
      "src/pages/Settings/notificationsReadonlyService.ts",
      "src/pages/Settings/notificationsMain.tsx",
    ];
    const forbidden = /\b(sendEmailVerification|updateEmail|updatePassword|deleteUser|reauthenticate|signOut)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["notifications does not mark read or delete", () => {
    const files = [
      "src/pages/Settings/Notifications.tsx",
      "src/pages/Settings/notificationsUtils.ts",
      "src/pages/Settings/notificationsReadonlyService.ts",
      "src/pages/Settings/notificationsMain.tsx",
    ];
    const forbidden = /\b(markNotificationRead|markRead|deleteNotification|read:\s*true)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["notifications fallback preserves existing placeholder", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/pages/Settings/Notifications.tsx"), "utf8");
    const mainSource = readFileSync(path.resolve(projectRoot, "src/pages/Settings/notificationsMain.tsx"), "utf8");
    assert.match(source, /mode = "legacy-placeholder"/);
    assert.match(source, /return null/);
    assert.match(mainSource, /<Notifications \/>/);
  }],
  ["notifications entry uses AuthProvider only when enabled", () => {
    const mainSource = readFileSync(path.resolve(projectRoot, "src/pages/Settings/notificationsMain.tsx"), "utf8");
    assert.match(mainSource, /resolveNotificationsNewAuthFlag/);
    assert.match(mainSource, /<AuthProvider>/);
    assert.match(mainSource, /<Notifications mode="new-auth" \/>/);
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("newAuthNotifications"), false);
    assert.equal(readFileSync(path.resolve(projectRoot, "app.js"), "utf8").includes("newAuthNotifications"), false);
  }],
  ["legacy auth adapter initializing maps loading true", () => {
    assert.equal(legacyAuthAdapterUtils.legacyLoadingFromPhase("initializing"), true);
  }],
  ["legacy auth adapter loading_session maps loading true", () => {
    assert.equal(legacyAuthAdapterUtils.legacyLoadingFromPhase("loading_session"), true);
  }],
  ["legacy auth adapter authenticated maps loading false", () => {
    assert.equal(legacyAuthAdapterUtils.legacyLoadingFromPhase("authenticated"), false);
  }],
  ["legacy auth adapter signed_out maps loading false", () => {
    assert.equal(legacyAuthAdapterUtils.legacyLoadingFromPhase("signed_out"), false);
  }],
  ["legacy auth adapter maps session fields", () => {
    const legacy = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "teacher",
    }));
    assert.equal(legacy.uid, "user-1");
    assert.equal(legacy.email, "user-1@example.test");
    assert.equal(legacy.status, "active");
    assert.equal(legacy.currentWorkspaceId, "ws-1");
  }],
  ["legacy auth adapter maps currentWorkspaceRole to currentRole", () => {
    const legacy = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      currentWorkspaceRole: "manager",
    }));
    assert.equal(legacy.currentRole, "manager");
  }],
  ["legacy auth adapter does not turn system_owner into currentRole", () => {
    const legacy = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      globalRole: "system_owner",
      isSystemOwner: true,
      currentWorkspaceRole: null,
    }));
    assert.equal(legacy.globalRole, "system_owner");
    assert.equal(legacy.isSystemOwner, true);
    assert.equal(legacy.currentRole, null);
  }],
  ["legacy auth adapter preserves isSystemOwner", () => {
    const legacy = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      globalRole: "system_owner",
      isSystemOwner: true,
    }));
    assert.equal(legacy.isSystemOwner, true);
  }],
  ["legacy auth adapter currentWorkspaceId null is normal", () => {
    const value = legacyAuthAdapterUtils.createLegacyAuthAdapterValue({
      phase: "authenticated",
      firebaseUser: null,
      session: makeSession({
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
      error: null,
      signInWithEmail: async () => {},
      signOut: async () => {},
      reloadSession: async () => {},
    });
    assert.equal(value.loading, false);
    assert.notEqual(value.session, null);
    assert.equal(value.currentRole, null);
    assert.equal(value.workspaceId, null);
    assert.equal(value.error, null);
  }],
  ["legacy auth adapter preserves pending status", () => {
    const value = legacyAuthAdapterUtils.createLegacyAuthAdapterValue({
      phase: "account_action_required",
      firebaseUser: null,
      session: makeSession({ status: "pending" }),
      error: null,
      signInWithEmail: async () => {},
      signOut: async () => {},
      reloadSession: async () => {},
    });
    assert.equal(value.status, "pending");
    assert.equal(value.isAuthenticated, true);
  }],
  ["legacy auth adapter preserves rejected status", () => {
    const value = legacyAuthAdapterUtils.createLegacyAuthAdapterValue({
      phase: "account_action_required",
      firebaseUser: null,
      session: makeSession({ status: "rejected" }),
      error: null,
      signInWithEmail: async () => {},
      signOut: async () => {},
      reloadSession: async () => {},
    });
    assert.equal(value.status, "rejected");
    assert.equal(value.isAuthenticated, true);
  }],
  ["legacy auth adapter preserves disabled status", () => {
    const value = legacyAuthAdapterUtils.createLegacyAuthAdapterValue({
      phase: "account_action_required",
      firebaseUser: null,
      session: makeSession({ status: "disabled" }),
      error: null,
      signInWithEmail: async () => {},
      signOut: async () => {},
      reloadSession: async () => {},
    });
    assert.equal(value.status, "disabled");
    assert.equal(value.isAuthenticated, true);
  }],
  ["legacy auth adapter structured error becomes user string", () => {
    const message = legacyAuthAdapterUtils.legacyErrorMessage({
      code: "PERMISSION_DENIED",
      message: "Firebase permission-denied at /users/secret",
    });
    assert.equal(message.includes("Firebase"), false);
    assert.equal(message.includes("/users/secret"), false);
    assert.ok(message);
  }],
  ["legacy auth adapter error conversion has no automatic sign out", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/auth/legacy/legacyAuthAdapterUtils.ts"), "utf8");
    assert.equal(/await\s+[^;\n]*signOut\(/.test(source), false);
    assert.equal(/params\.signOut\(\)/.test(source), false);
  }],
  ["legacy auth adapter forwards reloadSession", () => {
    const reloadSession = async () => {};
    const value = legacyAuthAdapterUtils.createLegacyAuthAdapterValue({
      phase: "authenticated",
      firebaseUser: null,
      session: makeSession(),
      error: null,
      signInWithEmail: async () => {},
      signOut: async () => {},
      reloadSession,
    });
    assert.equal(value.reloadSession, reloadSession);
  }],
  ["legacy auth adapter reload failure text keeps login", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-legacy-auth-adapter/LegacyAuthAdapterPreviewApp.tsx"), "utf8");
    assert.ok(source);
  }],
  ["legacy auth adapter forwards login reference", () => {
    const login = async () => {};
    const value = legacyAuthAdapterUtils.createLegacyAuthAdapterValue({
      phase: "authenticated",
      firebaseUser: null,
      session: makeSession(),
      error: null,
      signInWithEmail: login,
      signOut: async () => {},
      reloadSession: async () => {},
    });
    assert.equal(value.login, login);
  }],
  ["legacy auth adapter forwards logout reference", () => {
    const logout = async () => {};
    const value = legacyAuthAdapterUtils.createLegacyAuthAdapterValue({
      phase: "authenticated",
      firebaseUser: null,
      session: makeSession(),
      error: null,
      signInWithEmail: async () => {},
      signOut: logout,
      reloadSession: async () => {},
    });
    assert.equal(value.logout, logout);
  }],
  ["legacy auth adapter preview does not execute login or logout", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-legacy-auth-adapter/LegacyAuthAdapterPreviewApp.tsx"), "utf8");
    assert.equal(/onClick=\{[^}]*login/.test(source), false);
    assert.equal(/onClick=\{[^}]*logout/.test(source), false);
  }],
  ["legacy auth adapter imports no Firestore write APIs", () => {
    const files = [
      "src/auth/legacy/LegacyAuthAdapter.tsx",
      "src/auth/legacy/legacyAuthAdapterUtils.ts",
      "src/auth/legacy/legacyAuthAdapterTypes.ts",
      "src/dev-legacy-auth-adapter/LegacyAuthAdapterPreviewApp.tsx",
      "src/dev-legacy-auth-adapter/main.tsx",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["legacy auth adapter does not delete browser storage", () => {
    const files = [
      "src/auth/legacy/LegacyAuthAdapter.tsx",
      "src/auth/legacy/legacyAuthAdapterUtils.ts",
      "src/dev-legacy-auth-adapter/LegacyAuthAdapterPreviewApp.tsx",
      "src/dev-legacy-auth-adapter/main.tsx",
    ];
    const forbidden = /\b(localStorage|sessionStorage)\.(removeItem|clear)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["legacy auth adapter masks sensitive values", () => {
    assert.equal(legacyAuthAdapterUtils.maskLegacyAdapterEmail("student123@example.test"), "st***3@example.test");
    assert.equal(legacyAuthAdapterUtils.maskLegacyAdapterValue("workspace_secret_1234"), "work...1234");
  }],
  ["legacy auth adapter feature flag defaults false", () => {
    assert.equal(legacyAuthAdapterUtils.resolveLegacyAuthAdapterPreviewFlag({
      isDev: true,
    }), false);
  }],
  ["legacy auth adapter query on enables", () => {
    assert.equal(legacyAuthAdapterUtils.resolveLegacyAuthAdapterPreviewFlag({
      search: "?adapter=on",
      envValue: "false",
      isDev: true,
    }), true);
  }],
  ["legacy auth adapter query off overrides env true", () => {
    assert.equal(legacyAuthAdapterUtils.resolveLegacyAuthAdapterPreviewFlag({
      search: "?adapter=off",
      envValue: "true",
      isDev: true,
    }), false);
  }],
  ["legacy auth adapter production is always blocked", () => {
    assert.equal(legacyAuthAdapterUtils.resolveLegacyAuthAdapterPreviewFlag({
      search: "?adapter=on",
      envValue: "true",
      isDev: false,
    }), false);
  }],
  ["legacy auth adapter does not change existing AuthContext consumers", () => {
    const expected = [
      "src/pages/Login.tsx",
      "src/components/ProtectedRoute.tsx",
      "src/components/guards/RequireAuth.tsx",
      "src/components/guards/RequireWorkspaceRole.tsx",
    ];
    for (const file of expected) {
      assert.match(readFileSync(path.resolve(projectRoot, file), "utf8"), /context\/AuthContext/);
    }
  }],
  ["legacy auth adapter does not change guards to new RouteGuard", () => {
    const files = [
      "src/components/ProtectedRoute.tsx",
      "src/components/guards/RequireAuth.tsx",
      "src/components/guards/RequireWorkspaceRole.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(path.resolve(projectRoot, file), "utf8");
      assert.equal(source.includes("../auth/useAuth"), false, file);
      assert.equal(source.includes("auth/RouteGuard"), false, file);
    }
  }],
  ["legacy guard initializing maps loading", () => {
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "initializing",
      loading: true,
    }));
    assert.equal(decision.state, "loading");
    assert.equal(decision.reason, "AUTH_INITIALIZING");
  }],
  ["legacy guard loading_session maps loading", () => {
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "loading_session",
      loading: true,
    }));
    assert.equal(decision.state, "loading");
    assert.equal(decision.reason, "SESSION_LOADING");
  }],
  ["legacy guard loading has no redirect destination", () => {
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "loading_session",
      loading: true,
    }));
    assert.equal(legacyGuardDecisionUtils.expectedRedirectForDecision(decision), null);
  }],
  ["legacy guard signed_out denies", () => {
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "signed_out",
    }));
    assert.equal(decision.state, "deny");
    assert.equal(decision.reason, "SIGNED_OUT");
    assert.equal(decision.expectedDestination, "/login");
  }],
  ["legacy guard authenticated active allows", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "normal",
    }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
    }));
    assert.equal(decision.state, "allow");
    assert.equal(decision.reason, "AUTHENTICATED_ACTIVE");
  }],
  ["legacy guard authenticated active workspace null allows require auth", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
    }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
    }));
    assert.equal(decision.state, "allow");
    assert.equal(decision.reason, "AUTHENTICATED_WITHOUT_WORKSPACE");
  }],
  ["legacy guard session error denies without sign out instruction", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession());
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "error",
      session,
      isAuthenticated: true,
      error: "沅뚰븳 ?뺤씤 以?臾몄젣媛 諛쒖깮?덉뒿?덈떎.",
    }));
    assert.equal(decision.state, "deny");
    assert.equal(decision.reason, "SESSION_ERROR");
  }],
  ["legacy guard pending denies but keeps auth state", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      status: "pending",
    }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "account_action_required",
      session,
      isAuthenticated: true,
      status: "pending",
    }));
    assert.equal(decision.reason, "ACCOUNT_PENDING");
    assert.equal(decision.expectedDestination, "/pending");
  }],
  ["legacy guard rejected denies but keeps auth state", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      status: "rejected",
    }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "account_action_required",
      session,
      isAuthenticated: true,
      status: "rejected",
    }));
    assert.equal(decision.reason, "ACCOUNT_REJECTED");
    assert.equal(decision.expectedDestination, "/rejected");
  }],
  ["legacy guard disabled denies but keeps auth state", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      status: "disabled",
    }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "account_action_required",
      session,
      isAuthenticated: true,
      status: "disabled",
    }));
    assert.equal(decision.reason, "ACCOUNT_DISABLED");
    assert.equal(decision.expectedDestination, "/disabled");
  }],
  ["legacy guard status blockers do not call automatic sign out", () => {
    const files = [
      "src/auth/legacy/guards/legacyGuardDecisionUtils.ts",
      "src/auth/legacy/guards/TestOnlyLegacyRequireAuth.tsx",
      "src/auth/legacy/guards/TestOnlyLegacyRequireWorkspaceRole.tsx",
      "src/dev-legacy-guard/LegacyGuardPreviewApp.tsx",
      "src/dev-legacy-guard/main.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(path.resolve(projectRoot, file), "utf8");
      assert.equal(/\bsignOut\s*\(/.test(source), false, file);
    }
  }],
  ["legacy workspace guard workspace optional null allows", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
    }));
    const input = legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
    });
    const decision = legacyGuardDecisionUtils.decideLegacyRequireWorkspaceRole({
      ...input,
      allowedRoles: ["normal"],
      requireWorkspace: false,
    });
    assert.equal(decision.state, "allow");
    assert.equal(decision.reason, "AUTHENTICATED_WITHOUT_WORKSPACE");
  }],
  ["legacy workspace guard workspace required null denies", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
    }));
    const input = legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
    });
    const decision = legacyGuardDecisionUtils.decideLegacyRequireWorkspaceRole({
      ...input,
      allowedRoles: ["normal"],
      requireWorkspace: true,
    });
    assert.equal(decision.reason, "WORKSPACE_REQUIRED");
    assert.equal(decision.expectedDestination, "/workspace-select");
  }],
  ["legacy workspace guard role null denies when workspace exists", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: null,
    }));
    const input = legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
    });
    const decision = legacyGuardDecisionUtils.decideLegacyRequireWorkspaceRole({
      ...input,
      allowedRoles: ["normal"],
      requireWorkspace: true,
    });
    assert.equal(decision.reason, "WORKSPACE_ROLE_MISSING");
  }],
  ["legacy workspace guard allowed role allows", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "teacher",
    }));
    const input = legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
    });
    const decision = legacyGuardDecisionUtils.decideLegacyRequireWorkspaceRole({
      ...input,
      allowedRoles: ["teacher", "manager"],
      requireWorkspace: true,
    });
    assert.equal(decision.reason, "WORKSPACE_ROLE_ALLOWED");
  }],
  ["legacy workspace guard unallowed role denies", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "viewer",
    }));
    const input = legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
    });
    const decision = legacyGuardDecisionUtils.decideLegacyRequireWorkspaceRole({
      ...input,
      allowedRoles: ["teacher", "manager"],
      requireWorkspace: true,
    });
    assert.equal(decision.reason, "WORKSPACE_ROLE_NOT_ALLOWED");
  }],
  ["legacy workspace guard does not normalize system_owner as currentRole", () => {
    assert.equal(legacyGuardDecisionUtils.normalizeWorkspaceRole("system_owner"), null);
  }],
  ["legacy workspace guard system owner bypass true allows", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      globalRole: "system_owner",
      isSystemOwner: true,
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: null,
    }));
    const input = legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
      isSystemOwner: true,
    });
    const decision = legacyGuardDecisionUtils.decideLegacyRequireWorkspaceRole({
      ...input,
      allowedRoles: ["manager"],
      requireWorkspace: true,
      allowSystemOwnerBypass: true,
    });
    assert.equal(decision.reason, "SYSTEM_OWNER");
  }],
  ["legacy workspace guard system owner bypass false uses workspace role", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      globalRole: "system_owner",
      isSystemOwner: true,
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "viewer",
    }));
    const input = legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
      isSystemOwner: true,
    });
    const decision = legacyGuardDecisionUtils.decideLegacyRequireWorkspaceRole({
      ...input,
      allowedRoles: ["manager"],
      requireWorkspace: true,
      allowSystemOwnerBypass: false,
    });
    assert.equal(decision.reason, "WORKSPACE_ROLE_NOT_ALLOWED");
  }],
  ["legacy workspace guard system owner bypass only when explicit", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      globalRole: "system_owner",
      isSystemOwner: true,
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: null,
    }));
    const input = legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
      isSystemOwner: true,
    });
    const decision = legacyGuardDecisionUtils.decideLegacyRequireWorkspaceRole({
      ...input,
      allowedRoles: ["manager"],
      requireWorkspace: true,
    });
    assert.equal(decision.reason, "WORKSPACE_ROLE_MISSING");
  }],
  ["legacy guard existing guard imports unchanged", () => {
    assert.match(readFileSync(path.resolve(projectRoot, "src/components/ProtectedRoute.tsx"), "utf8"), /context\/AuthContext/);
    assert.match(readFileSync(path.resolve(projectRoot, "src/components/guards/RequireAuth.tsx"), "utf8"), /context\/AuthContext/);
    assert.match(readFileSync(path.resolve(projectRoot, "src/components/guards/RequireWorkspaceRole.tsx"), "utf8"), /context\/AuthContext/);
  }],
  ["legacy guard existing AuthContext unchanged by guard preview", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/context/AuthContext.tsx"), "utf8");
    assert.equal(source.includes("LegacyAuthAdapterProvider"), false);
    assert.equal(source.includes("legacyGuardDecisionUtils"), false);
  }],
  ["legacy guard Login unchanged by guard preview", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/pages/Login.tsx"), "utf8");
    assert.equal(source.includes("legacy-auth-guard-preview"), false);
    assert.equal(source.includes("TestOnlyLegacyRequireAuth"), false);
  }],
  ["legacy guard imports no Firebase Auth user mutation APIs", () => {
    const files = [
      "src/auth/legacy/guards/legacyGuardDecisionUtils.ts",
      "src/auth/legacy/guards/TestOnlyLegacyRequireAuth.tsx",
      "src/auth/legacy/guards/TestOnlyLegacyRequireWorkspaceRole.tsx",
      "src/dev-legacy-guard/LegacyGuardPreviewApp.tsx",
      "src/dev-legacy-guard/main.tsx",
    ];
    const forbidden = /\b(updateEmail|updatePassword|deleteUser|reauthenticate|sendEmailVerification)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["legacy guard imports no Firestore write APIs", () => {
    const files = [
      "src/auth/legacy/guards/legacyGuardDecisionUtils.ts",
      "src/auth/legacy/guards/TestOnlyLegacyRequireAuth.tsx",
      "src/auth/legacy/guards/TestOnlyLegacyRequireWorkspaceRole.tsx",
      "src/dev-legacy-guard/LegacyGuardPreviewApp.tsx",
      "src/dev-legacy-guard/main.tsx",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["legacy guard deletes no browser storage", () => {
    const files = [
      "src/auth/legacy/guards/legacyGuardDecisionUtils.ts",
      "src/auth/legacy/guards/TestOnlyLegacyRequireAuth.tsx",
      "src/auth/legacy/guards/TestOnlyLegacyRequireWorkspaceRole.tsx",
      "src/dev-legacy-guard/LegacyGuardPreviewApp.tsx",
      "src/dev-legacy-guard/main.tsx",
    ];
    const forbidden = /\b(localStorage|sessionStorage)\.(removeItem|clear)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["legacy guard preview has no actual redirect APIs", () => {
    const files = [
      "src/auth/legacy/guards/TestOnlyLegacyRequireAuth.tsx",
      "src/auth/legacy/guards/TestOnlyLegacyRequireWorkspaceRole.tsx",
      "src/dev-legacy-guard/LegacyGuardPreviewApp.tsx",
      "src/dev-legacy-guard/main.tsx",
    ];
    const forbidden = /\b(Navigate|useNavigate|window\.location|location\.assign|history\.pushState|history\.replaceState)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["legacy guard preview executes no login or logout", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-legacy-guard/LegacyGuardPreviewApp.tsx"), "utf8");
    assert.equal(/onClick=\{[^}]*login/.test(source), false);
    assert.equal(/onClick=\{[^}]*logout/.test(source), false);
    assert.equal(source.includes("useLegacyAuthAdapter().login"), false);
    assert.equal(source.includes("useLegacyAuthAdapter().logout"), false);
  }],
  ["legacy guard feature flag defaults false", () => {
    assert.equal(legacyGuardDecisionUtils.resolveLegacyAuthGuardPreviewFlag({
      isDev: true,
    }), false);
  }],
  ["legacy guard query on enables", () => {
    assert.equal(legacyGuardDecisionUtils.resolveLegacyAuthGuardPreviewFlag({
      search: "?guard=on",
      envValue: "false",
      isDev: true,
    }), true);
  }],
  ["legacy guard query off overrides env true", () => {
    assert.equal(legacyGuardDecisionUtils.resolveLegacyAuthGuardPreviewFlag({
      search: "?guard=off",
      envValue: "true",
      isDev: true,
    }), false);
  }],
  ["legacy guard production is always blocked", () => {
    assert.equal(legacyGuardDecisionUtils.resolveLegacyAuthGuardPreviewFlag({
      search: "?guard=on",
      envValue: "true",
      isDev: false,
    }), false);
  }],
  ["legacy guard preview contains one AuthProvider wrapper", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-legacy-guard/main.tsx"), "utf8");
    assert.equal((source.match(/<AuthProvider>/g) ?? []).length, 1);
  }],
  ["legacy guard preview creates no auth listener", () => {
    const files = [
      "src/auth/legacy/guards/legacyGuardDecisionUtils.ts",
      "src/auth/legacy/guards/TestOnlyLegacyRequireAuth.tsx",
      "src/auth/legacy/guards/TestOnlyLegacyRequireWorkspaceRole.tsx",
      "src/dev-legacy-guard/LegacyGuardPreviewApp.tsx",
      "src/dev-legacy-guard/main.tsx",
    ];
    for (const file of files) {
      assert.equal(readFileSync(path.resolve(projectRoot, file), "utf8").includes("onAuthStateChanged"), false, file);
    }
  }],
  ["legacy guard preview html is standalone and does not touch index", () => {
    assert.equal(existsSync(path.resolve(projectRoot, "legacy-auth-guard-preview.html")), true);
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("legacy-auth-guard-preview"), false);
  }],
  ["require auth bridge defaults to new auth", () => {
    assert.equal(requireAuthBridgeUtils.resolveNewAuthRequireAuthFlag({
      isDev: true,
    }), true);
    assert.equal(requireAuthBridgeUtils.resolveNewAuthRequireAuthFlag({
      isDev: false,
    }), true);
    assert.equal(requireAuthBridgeUtils.requireAuthModeForFlag(true), "new");
  }],
  ["require auth bridge env false is rollback to legacy", () => {
    assert.equal(requireAuthBridgeUtils.resolveNewAuthRequireAuthFlag({
      envValue: "false",
      isDev: true,
    }), false);
    assert.equal(requireAuthBridgeUtils.requireAuthModeForFlag(false), "legacy");
  }],
  ["require auth bridge env true keeps new auth", () => {
    assert.equal(requireAuthBridgeUtils.resolveNewAuthRequireAuthFlag({
      envValue: "true",
      isDev: true,
    }), true);
    assert.equal(requireAuthBridgeUtils.requireAuthModeForFlag(true), "new");
  }],
  ["require auth bridge query on enables new", () => {
    assert.equal(requireAuthBridgeUtils.resolveNewAuthRequireAuthFlag({
      search: "?newAuthRequireAuth=on",
      envValue: "false",
      isDev: true,
    }), true);
  }],
  ["require auth bridge query off forces legacy", () => {
    assert.equal(requireAuthBridgeUtils.resolveNewAuthRequireAuthFlag({
      search: "?newAuthRequireAuth=off",
      envValue: "true",
      isDev: true,
    }), false);
  }],
  ["require auth bridge query has priority over env", () => {
    assert.equal(requireAuthBridgeUtils.resolveNewAuthRequireAuthFlag({
      search: "?newAuthRequireAuth=on",
      envValue: "false",
      isDev: true,
    }), true);
    assert.equal(requireAuthBridgeUtils.resolveNewAuthRequireAuthFlag({
      search: "?newAuthRequireAuth=off",
      envValue: "true",
      isDev: true,
    }), false);
  }],
  ["require auth bridge production ignores query but keeps default new", () => {
    assert.equal(requireAuthBridgeUtils.resolveNewAuthRequireAuthFlag({
      search: "?newAuthRequireAuth=on",
      isDev: false,
    }), true);
    assert.equal(requireAuthBridgeUtils.resolveNewAuthRequireAuthFlag({
      search: "?newAuthRequireAuth=off",
      isDev: false,
    }), true);
  }],
  ["require auth bridge production env false rollback is explicit", () => {
    assert.equal(requireAuthBridgeUtils.resolveNewAuthRequireAuthFlag({
      search: "?newAuthRequireAuth=on",
      envValue: "false",
      isDev: false,
    }), false);
  }],
  ["require auth bridge flag off preserves legacy RequireAuth branch", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/components/guards/RequireAuth.tsx"), "utf8");
    assert.match(source, /LegacyRequireAuthBranch/);
    assert.ok(source);
    assert.match(source, /to="\/login"/);
    assert.match(source, /context\/AuthContext/);
  }],
  ["require auth bridge keeps legacy AuthContext import", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/components/guards/RequireAuth.tsx"), "utf8");
    assert.match(source, /from "\.\.\/\.\.\/context\/AuthContext"/);
  }],
  ["require auth bridge keeps existing login redirect", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/components/guards/RequireAuth.tsx"), "utf8");
    assert.match(source, /<Navigate[\s\S]*to="\/login"[\s\S]*replace/);
  }],
  ["require auth bridge initializing loading decision", () => {
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "initializing",
      loading: true,
    }));
    assert.equal(requireAuthBridgeUtils.shouldRenderRequireAuthChildren(decision), false);
    assert.equal(requireAuthBridgeUtils.redirectDestinationForRequireAuthDecision({
      decision,
      currentPath: "/anything",
    }), null);
  }],
  ["require auth bridge loading_session loading decision", () => {
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "loading_session",
      loading: true,
    }));
    assert.equal(decision.state, "loading");
    assert.ok(requireAuthBridgeUtils.requireAuthBridgeMessage(decision));
  }],
  ["require auth bridge active renders children", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "normal",
    }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
    }));
    assert.equal(requireAuthBridgeUtils.shouldRenderRequireAuthChildren(decision), true);
  }],
  ["require auth bridge active workspace null renders children", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
    }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session,
      isAuthenticated: true,
    }));
    assert.equal(decision.reason, "AUTHENTICATED_WITHOUT_WORKSPACE");
    assert.equal(requireAuthBridgeUtils.shouldRenderRequireAuthChildren(decision), true);
  }],
  ["require auth bridge signed_out goes to login outside login path", () => {
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "signed_out",
    }));
    assert.equal(requireAuthBridgeUtils.redirectDestinationForRequireAuthDecision({
      decision,
      currentPath: "/dashboard",
    }), "/login");
  }],
  ["require auth bridge pending blocks without sign out", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({ status: "pending" }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "account_action_required",
      session,
      isAuthenticated: true,
      status: "pending",
    }));
    assert.equal(requireAuthBridgeUtils.shouldRenderRequireAuthChildren(decision), false);
    assert.ok(requireAuthBridgeUtils.requireAuthBridgeMessage(decision));
  }],
  ["require auth bridge rejected blocks without sign out", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({ status: "rejected" }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "account_action_required",
      session,
      isAuthenticated: true,
      status: "rejected",
    }));
    assert.equal(requireAuthBridgeUtils.shouldRenderRequireAuthChildren(decision), false);
    assert.ok(requireAuthBridgeUtils.requireAuthBridgeMessage(decision));
  }],
  ["require auth bridge disabled blocks without sign out", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({ status: "disabled" }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "account_action_required",
      session,
      isAuthenticated: true,
      status: "disabled",
    }));
    assert.equal(requireAuthBridgeUtils.shouldRenderRequireAuthChildren(decision), false);
    assert.ok(requireAuthBridgeUtils.requireAuthBridgeMessage(decision));
  }],
  ["require auth bridge records safe diagnostics snapshot", () => {
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "authenticated",
      session: legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      })),
      isAuthenticated: true,
    }));
    requireAuthBridgeUtils.recordRequireAuthBridgeSnapshot({
      mode: "new",
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "system_owner",
      isSystemOwner: true,
      hasCurrentWorkspaceId: false,
      decision,
      childrenRendered: true,
      expectedDestination: null,
      redirectAttempted: false,
      automaticSignOutOccurred: false,
      authListenerCount: 1,
    });
    const snapshot = requireAuthBridgeUtils.getRequireAuthDiagnosticsSnapshot();
    assert.equal(snapshot.providerMode, "new");
    assert.equal(snapshot.sessionPhase, "authenticated");
    assert.equal(snapshot.isAuthenticated, true);
    assert.equal(snapshot.accountStatus, "active");
    assert.equal(snapshot.decision, "AUTHENTICATED_WITHOUT_WORKSPACE");
    assert.equal(snapshot.authListenerCount, 1);
    assert.equal(Object.hasOwn(snapshot, "uid"), false);
    assert.equal(Object.hasOwn(snapshot, "email"), false);
    assert.equal(Object.hasOwn(snapshot, "workspaceId"), false);
  }],
  ["require auth bridge installs diagnostics API without sensitive fields", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/auth/legacy/guards/requireAuthBridgeUtils.ts"), "utf8");
    assert.match(source, /PMRequireAuthDiagnostics/);
    assert.match(source, /getRequireAuthDiagnosticsSnapshot/);
    assert.equal(source.includes("uid:"), false);
    assert.equal(source.includes("email:"), false);
    assert.equal(source.includes("workspaceId:"), false);
  }],
  ["require auth bridge session error does not render children", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession());
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "error",
      session,
      isAuthenticated: true,
      error: "沅뚰븳 ?뺤씤 以?臾몄젣媛 諛쒖깮?덉뒿?덈떎.",
    }));
    assert.equal(decision.reason, "SESSION_ERROR");
    assert.equal(requireAuthBridgeUtils.shouldRenderRequireAuthChildren(decision), false);
  }],
  ["require auth bridge permission denied does not sign out", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthRequireAuthBridge.tsx",
      "src/auth/legacy/guards/requireAuthBridgeUtils.ts",
      "src/dev-require-auth-bridge/RequireAuthBridgePreviewApp.tsx",
      "src/dev-require-auth-bridge/main.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(path.resolve(projectRoot, file), "utf8");
      assert.equal(/\bsignOut\s*\(/.test(source), false, file);
      assert.equal(source.includes("permission-denied") && /\bsignOut\b/.test(source), false, file);
    }
  }],
  ["require auth bridge has no duplicate AuthProvider in new bridge", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/auth/legacy/guards/NewAuthRequireAuthBridge.tsx"), "utf8");
    assert.equal((source.match(/<AuthProvider>/g) ?? []).length, 1);
  }],
  ["require auth bridge creates no auth listener", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthRequireAuthBridge.tsx",
      "src/auth/legacy/guards/requireAuthBridgeUtils.ts",
      "src/components/guards/RequireAuth.tsx",
      "src/dev-require-auth-bridge/RequireAuthBridgePreviewApp.tsx",
      "src/dev-require-auth-bridge/main.tsx",
    ];
    for (const file of files) {
      assert.equal(readFileSync(path.resolve(projectRoot, file), "utf8").includes("onAuthStateChanged"), false, file);
    }
  }],
  ["require auth bridge does not call reloadSession", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthRequireAuthBridge.tsx",
      "src/auth/legacy/guards/requireAuthBridgeUtils.ts",
      "src/components/guards/RequireAuth.tsx",
      "src/dev-require-auth-bridge/RequireAuthBridgePreviewApp.tsx",
    ];
    for (const file of files) {
      assert.equal(readFileSync(path.resolve(projectRoot, file), "utf8").includes("reloadSession"), false, file);
    }
  }],
  ["require auth bridge imports no Firestore write APIs", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthRequireAuthBridge.tsx",
      "src/auth/legacy/guards/requireAuthBridgeUtils.ts",
      "src/components/guards/RequireAuth.tsx",
      "src/dev-require-auth-bridge/RequireAuthBridgePreviewApp.tsx",
      "src/dev-require-auth-bridge/main.tsx",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["require auth bridge deletes no browser storage", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthRequireAuthBridge.tsx",
      "src/auth/legacy/guards/requireAuthBridgeUtils.ts",
      "src/components/guards/RequireAuth.tsx",
      "src/dev-require-auth-bridge/RequireAuthBridgePreviewApp.tsx",
      "src/dev-require-auth-bridge/main.tsx",
    ];
    const forbidden = /\b(localStorage|sessionStorage)\.(removeItem|clear)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["require auth bridge imports no Firebase Auth mutation APIs", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthRequireAuthBridge.tsx",
      "src/auth/legacy/guards/requireAuthBridgeUtils.ts",
      "src/components/guards/RequireAuth.tsx",
      "src/dev-require-auth-bridge/RequireAuthBridgePreviewApp.tsx",
      "src/dev-require-auth-bridge/main.tsx",
    ];
    const forbidden = /\b(updateEmail|updatePassword|deleteUser|reauthenticate|sendEmailVerification)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["require auth bridge does not enable ProtectedRoute with RequireAuth flag", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/components/ProtectedRoute.tsx"), "utf8");
    assert.equal(source.includes("newAuthRequireAuth"), false);
  }],
  ["require auth bridge does not enable RequireWorkspaceRole with RequireAuth flag", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/components/guards/RequireWorkspaceRole.tsx"), "utf8");
    assert.equal(source.includes("newAuthRequireAuth"), false);
  }],
  ["require auth bridge leaves Login unchanged by flag", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/pages/Login.tsx"), "utf8");
    assert.equal(source.includes("newAuthRequireAuth"), false);
    assert.equal(source.includes("RequireAuthBridge"), false);
  }],
  ["require auth bridge does not touch operational static files", () => {
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("newAuthRequireAuth"), false);
    assert.equal(readFileSync(path.resolve(projectRoot, "app.js"), "utf8").includes("newAuthRequireAuth"), false);
  }],
  ["require auth bridge does not touch rules files", () => {
    assert.equal(readFileSync(path.resolve(projectRoot, "firestore.rules"), "utf8").includes("newAuthRequireAuth"), false);
    if (existsSync(path.resolve(projectRoot, "firestore.rules.next"))) {
      assert.equal(readFileSync(path.resolve(projectRoot, "firestore.rules.next"), "utf8").includes("newAuthRequireAuth"), false);
    }
  }],
  ["require auth bridge prevents login redirect loop", () => {
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "signed_out",
    }));
    assert.equal(requireAuthBridgeUtils.redirectDestinationForRequireAuthDecision({
      decision,
      currentPath: "/login",
    }), null);
  }],
  ["require auth bridge prevents pending redirect loop", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({ status: "pending" }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "account_action_required",
      session,
      isAuthenticated: true,
      status: "pending",
    }));
    assert.equal(requireAuthBridgeUtils.redirectDestinationForRequireAuthDecision({
      decision,
      currentPath: "/pending",
    }), null);
  }],
  ["require auth bridge prevents rejected redirect loop", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({ status: "rejected" }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "account_action_required",
      session,
      isAuthenticated: true,
      status: "rejected",
    }));
    assert.equal(requireAuthBridgeUtils.redirectDestinationForRequireAuthDecision({
      decision,
      currentPath: "/rejected",
    }), null);
  }],
  ["require auth bridge prevents disabled redirect loop", () => {
    const session = legacyAuthAdapterUtils.toLegacyAuthAdapterSession(makeSession({ status: "disabled" }));
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "account_action_required",
      session,
      isAuthenticated: true,
      status: "disabled",
    }));
    assert.equal(requireAuthBridgeUtils.redirectDestinationForRequireAuthDecision({
      decision,
      currentPath: "/disabled",
    }), null);
  }],
  ["require auth bridge redirects nowhere while loading", () => {
    const decision = legacyGuardDecisionUtils.decideLegacyRequireAuth(legacyGuardDecisionUtils.createLegacyGuardInput({
      phase: "loading_session",
      loading: true,
    }));
    assert.equal(requireAuthBridgeUtils.redirectDestinationForRequireAuthDecision({
      decision,
      currentPath: "/dashboard",
    }), null);
  }],
  ["require auth bridge preview html is standalone", () => {
    assert.equal(existsSync(path.resolve(projectRoot, "require-auth-bridge-preview.html")), true);
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("require-auth-bridge-preview"), false);
  }],
  ["protected route bridge feature flag defaults false", () => {
    assert.equal(protectedRouteBridgeUtils.resolveNewAuthProtectedRouteFlag({
      search: "",
      envValue: undefined,
      isDev: true,
    }), false);
  }],
  ["protected route bridge env false stays legacy", () => {
    assert.equal(protectedRouteBridgeUtils.protectedRouteModeForFlag(
      protectedRouteBridgeUtils.resolveNewAuthProtectedRouteFlag({
        search: "",
        envValue: "false",
        isDev: true,
      }),
    ), "legacy");
  }],
  ["protected route bridge env true enables new in dev", () => {
    assert.equal(protectedRouteBridgeUtils.protectedRouteModeForFlag(
      protectedRouteBridgeUtils.resolveNewAuthProtectedRouteFlag({
        search: "",
        envValue: "true",
        isDev: true,
      }),
    ), "new");
  }],
  ["protected route bridge query on enables new", () => {
    assert.equal(protectedRouteBridgeUtils.resolveNewAuthProtectedRouteFlag({
      search: "?newAuthProtectedRoute=on",
      envValue: "false",
      isDev: true,
    }), true);
  }],
  ["protected route bridge query off forces legacy", () => {
    assert.equal(protectedRouteBridgeUtils.resolveNewAuthProtectedRouteFlag({
      search: "?newAuthProtectedRoute=off",
      envValue: "true",
      isDev: true,
    }), false);
  }],
  ["protected route bridge production ignores query", () => {
    assert.equal(protectedRouteBridgeUtils.resolveNewAuthProtectedRouteFlag({
      search: "?newAuthProtectedRoute=on",
      envValue: "true",
      isDev: false,
    }), false);
  }],
  ["protected route bridge loading has no redirect", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "loading_session",
      loading: true,
      isAuthenticated: false,
      status: null,
      globalRole: null,
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
    });
    assert.equal(decision.state, "loading");
    assert.equal(protectedRouteBridgeUtils.redirectDestinationForProtectedRouteDecision({
      decision,
      currentPath: "/dashboard",
    }), null);
  }],
  ["protected route bridge signed out redirects to login", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "signed_out",
      loading: false,
      isAuthenticated: false,
      status: null,
      globalRole: null,
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
    });
    assert.equal(decision.reason, "SIGNED_OUT");
    assert.equal(protectedRouteBridgeUtils.redirectDestinationForProtectedRouteDecision({
      decision,
      currentPath: "/dashboard",
    }), "/login");
  }],
  ["protected route bridge prevents login redirect loop", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "signed_out",
      loading: false,
      isAuthenticated: false,
      status: null,
      globalRole: null,
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
    });
    assert.equal(protectedRouteBridgeUtils.redirectDestinationForProtectedRouteDecision({
      decision,
      currentPath: "/login",
    }), null);
  }],
  ["protected route bridge active workspace allows", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "normal",
      isSystemOwner: false,
      error: null,
      menuKey: "dashboard",
    });
    assert.equal(decision.allow, true);
    assert.equal(decision.reason, "AUTHENTICATED_ACTIVE");
  }],
  ["protected route bridge active null workspace allows plain auth", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
    });
    assert.equal(decision.allow, true);
    assert.equal(decision.reason, "AUTHENTICATED_WITHOUT_WORKSPACE");
  }],
  ["protected route bridge active null workspace denies menu role only", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
      menuKey: "admin",
    });
    assert.equal(decision.allow, false);
    assert.equal(decision.reason, "MENU_ROLE_MISSING");
    assert.equal(decision.expectedDestination, null);
  }],
  ["protected route bridge pending blocks without sign out", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "account_action_required",
      loading: false,
      isAuthenticated: true,
      status: "pending",
      globalRole: "user",
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
    });
    assert.equal(decision.reason, "ACCOUNT_PENDING");
    assert.equal(decision.allow, false);
  }],
  ["protected route bridge rejected blocks without sign out", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "account_action_required",
      loading: false,
      isAuthenticated: true,
      status: "rejected",
      globalRole: "user",
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
    });
    assert.equal(decision.reason, "ACCOUNT_REJECTED");
    assert.equal(decision.allow, false);
  }],
  ["protected route bridge disabled blocks without sign out", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "account_action_required",
      loading: false,
      isAuthenticated: true,
      status: "disabled",
      globalRole: "user",
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
    });
    assert.equal(decision.reason, "ACCOUNT_DISABLED");
    assert.equal(decision.allow, false);
  }],
  ["protected route bridge system owner allows without workspace role", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "system_owner",
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: true,
      error: null,
      menuKey: "admin",
    });
    assert.equal(decision.allow, true);
    assert.equal(decision.permissionRole, "system_owner");
  }],
  ["protected route bridge menu denies unallowed role", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "viewer",
      isSystemOwner: false,
      error: null,
      menuKey: "admin",
    });
    assert.equal(decision.allow, false);
    assert.equal(decision.reason, "MENU_ACCESS_DENIED");
  }],
  ["protected route bridge session error does not sign out", () => {
    const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
      phase: "error",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "normal",
      isSystemOwner: false,
      error: "permission denied",
    });
    assert.equal(decision.reason, "SESSION_ERROR");
    assert.equal(protectedRouteBridgeUtils.protectedRouteMessage(decision).includes("verified"), true);
  }],
  ["protected route bridge imports no Firestore write APIs", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthProtectedRouteBridge.tsx",
      "src/auth/legacy/guards/protectedRouteBridgeUtils.ts",
      "src/components/ProtectedRoute.tsx",
      "src/dev-protected-route-bridge/ProtectedRouteBridgePreviewApp.tsx",
      "src/dev-protected-route-bridge/main.tsx",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["protected route bridge imports no Firebase Auth mutation APIs", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthProtectedRouteBridge.tsx",
      "src/auth/legacy/guards/protectedRouteBridgeUtils.ts",
      "src/components/ProtectedRoute.tsx",
      "src/dev-protected-route-bridge/ProtectedRouteBridgePreviewApp.tsx",
      "src/dev-protected-route-bridge/main.tsx",
    ];
    const forbidden = /\b(signOut|updateEmail|updatePassword|deleteUser|reauthenticate|sendEmailVerification)\s*\(/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["protected route bridge deletes no browser storage", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthProtectedRouteBridge.tsx",
      "src/auth/legacy/guards/protectedRouteBridgeUtils.ts",
      "src/components/ProtectedRoute.tsx",
      "src/dev-protected-route-bridge/ProtectedRouteBridgePreviewApp.tsx",
      "src/dev-protected-route-bridge/main.tsx",
    ];
    const forbidden = /\b(localStorage|sessionStorage)\.(removeItem|clear|setItem)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["protected route bridge leaves operational static files untouched by flag", () => {
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("newAuthProtectedRoute"), false);
    assert.equal(readFileSync(path.resolve(projectRoot, "app.js"), "utf8").includes("newAuthProtectedRoute"), false);
  }],
  ["protected route bridge does not enable workspace guard with ProtectedRoute flag", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/components/guards/RequireWorkspaceRole.tsx"), "utf8");
    assert.equal(source.includes("newAuthProtectedRoute"), false);
    assert.equal(source.includes("NewAuthProtectedRouteBridge"), false);
  }],
  ["protected route bridge preview html is standalone", () => {
    assert.equal(existsSync(path.resolve(projectRoot, "protected-route-bridge-preview.html")), true);
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("protected-route-bridge-preview"), false);
  }],
  ["workspace role bridge feature flag defaults false", () => {
    assert.equal(workspaceRoleBridgeUtils.resolveNewAuthRequireWorkspaceRoleFlag({
      search: "",
      envValue: undefined,
      isDev: true,
    }), false);
  }],
  ["workspace role bridge query on enables new", () => {
    assert.equal(workspaceRoleBridgeUtils.requireWorkspaceRoleModeForFlag(
      workspaceRoleBridgeUtils.resolveNewAuthRequireWorkspaceRoleFlag({
        search: "?newAuthRequireWorkspaceRole=on",
        envValue: "false",
        isDev: true,
      }),
    ), "new");
  }],
  ["workspace role bridge query off forces legacy", () => {
    assert.equal(workspaceRoleBridgeUtils.requireWorkspaceRoleModeForFlag(
      workspaceRoleBridgeUtils.resolveNewAuthRequireWorkspaceRoleFlag({
        search: "?newAuthRequireWorkspaceRole=off",
        envValue: "true",
        isDev: true,
      }),
    ), "legacy");
  }],
  ["workspace role bridge production ignores query", () => {
    assert.equal(workspaceRoleBridgeUtils.resolveNewAuthRequireWorkspaceRoleFlag({
      search: "?newAuthRequireWorkspaceRole=on",
      envValue: "true",
      isDev: false,
    }), false);
  }],
  ["workspace role bridge loading has no redirect", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "loading_session",
      loading: true,
      isAuthenticated: false,
      status: null,
      globalRole: null,
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
      allowedRoles: ["manager"],
    });
    assert.equal(decision.state, "loading");
    assert.equal(workspaceRoleBridgeUtils.redirectDestinationForWorkspaceRoleDecision({
      decision,
      currentPath: "/admin",
    }), null);
  }],
  ["workspace role bridge signed out redirects to login", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "signed_out",
      loading: false,
      isAuthenticated: false,
      status: null,
      globalRole: null,
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
      allowedRoles: ["manager"],
    });
    assert.equal(decision.reason, "SIGNED_OUT");
    assert.equal(workspaceRoleBridgeUtils.redirectDestinationForWorkspaceRoleDecision({
      decision,
      currentPath: "/admin",
    }), "/login");
  }],
  ["workspace role bridge prevents login redirect loop", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "signed_out",
      loading: false,
      isAuthenticated: false,
      status: null,
      globalRole: null,
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
      allowedRoles: ["manager"],
    });
    assert.equal(workspaceRoleBridgeUtils.redirectDestinationForWorkspaceRoleDecision({
      decision,
      currentPath: "/login",
    }), null);
  }],
  ["workspace role bridge active workspace null shows no workspace", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
      allowedRoles: ["manager"],
      requireWorkspace: true,
    });
    assert.equal(decision.reason, "WORKSPACE_REQUIRED");
    assert.equal(workspaceRoleBridgeUtils.shouldNavigateWorkspaceRoleDecision(decision), false);
  }],
  ["workspace role bridge super manager route denies manager", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "manager",
      isSystemOwner: false,
      error: null,
      allowedRoles: ["super_manager"],
    });
    assert.equal(decision.reason, "WORKSPACE_ROLE_NOT_ALLOWED");
  }],
  ["workspace role bridge manager teacher route allows manager", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "manager",
      isSystemOwner: false,
      error: null,
      allowedRoles: ["manager", "teacher"],
    });
    assert.equal(decision.reason, "WORKSPACE_ROLE_ALLOWED");
    assert.equal(decision.allow, true);
  }],
  ["workspace role bridge manager teacher route allows teacher", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "teacher",
      isSystemOwner: false,
      error: null,
      allowedRoles: ["manager", "teacher"],
    });
    assert.equal(decision.reason, "WORKSPACE_ROLE_ALLOWED");
    assert.equal(decision.allow, true);
  }],
  ["workspace role bridge manager teacher route denies normal", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "normal",
      isSystemOwner: false,
      error: null,
      allowedRoles: ["manager", "teacher"],
    });
    assert.equal(decision.reason, "WORKSPACE_ROLE_NOT_ALLOWED");
  }],
  ["workspace role bridge null role denies without sign out", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: null,
      isSystemOwner: false,
      error: null,
      allowedRoles: ["manager"],
    });
    assert.equal(decision.reason, "WORKSPACE_ROLE_MISSING");
  }],
  ["workspace role bridge system owner bypass true allows only with workspace", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "system_owner",
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: null,
      isSystemOwner: true,
      error: null,
      allowedRoles: ["manager"],
      allowSystemOwnerBypass: true,
    });
    assert.equal(decision.reason, "SYSTEM_OWNER");
    assert.equal(decision.allow, true);
  }],
  ["workspace role bridge system owner without workspace is workspace required", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "system_owner",
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: true,
      error: null,
      allowedRoles: ["manager"],
      allowSystemOwnerBypass: true,
    });
    assert.equal(decision.reason, "WORKSPACE_REQUIRED");
    assert.equal(decision.allow, false);
    assert.equal(decision.expectedDestination, "/workspace-select");
  }],
  ["workspace role bridge system owner bypass false uses workspace role", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "system_owner",
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "viewer",
      isSystemOwner: true,
      error: null,
      allowedRoles: ["manager"],
      allowSystemOwnerBypass: false,
    });
    assert.equal(decision.reason, "WORKSPACE_ROLE_NOT_ALLOWED");
  }],
  ["workspace role bridge unknown role denies safely", () => {
    const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceId: "ws-1",
      currentWorkspaceRole: "admin",
      isSystemOwner: false,
      error: null,
      allowedRoles: ["manager"],
    });
    assert.equal(decision.reason, "UNKNOWN_WORKSPACE_ROLE");
    assert.equal(decision.allow, false);
  }],
  ["workspace role bridge pending rejected disabled block without sign out", () => {
    for (const [status, reason] of [
      ["pending", "ACCOUNT_PENDING"],
      ["rejected", "ACCOUNT_REJECTED"],
      ["disabled", "ACCOUNT_DISABLED"],
    ]) {
      const decision = workspaceRoleBridgeUtils.decideWorkspaceRoleAccess({
        phase: "account_action_required",
        loading: false,
        isAuthenticated: true,
        status,
        globalRole: "user",
        currentWorkspaceId: "ws-1",
        currentWorkspaceRole: "manager",
        isSystemOwner: false,
        error: null,
        allowedRoles: ["manager"],
      });
      assert.equal(decision.reason, reason);
      assert.equal(decision.allow, false);
    }
  }],
  ["workspace role bridge imports no Firestore write APIs", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthRequireWorkspaceRoleBridge.tsx",
      "src/auth/legacy/guards/workspaceRoleBridgeUtils.ts",
      "src/components/guards/RequireWorkspaceRole.tsx",
      "src/dev-require-workspace-role-bridge/RequireWorkspaceRoleBridgePreviewApp.tsx",
      "src/dev-require-workspace-role-bridge/main.tsx",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["workspace role bridge imports no Firebase Auth mutation APIs", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthRequireWorkspaceRoleBridge.tsx",
      "src/auth/legacy/guards/workspaceRoleBridgeUtils.ts",
      "src/components/guards/RequireWorkspaceRole.tsx",
      "src/dev-require-workspace-role-bridge/RequireWorkspaceRoleBridgePreviewApp.tsx",
      "src/dev-require-workspace-role-bridge/main.tsx",
    ];
    const forbidden = /\b(signOut|updateEmail|updatePassword|deleteUser|reauthenticate|sendEmailVerification)\s*\(/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["workspace role bridge deletes no browser storage", () => {
    const files = [
      "src/auth/legacy/guards/NewAuthRequireWorkspaceRoleBridge.tsx",
      "src/auth/legacy/guards/workspaceRoleBridgeUtils.ts",
      "src/components/guards/RequireWorkspaceRole.tsx",
      "src/dev-require-workspace-role-bridge/RequireWorkspaceRoleBridgePreviewApp.tsx",
      "src/dev-require-workspace-role-bridge/main.tsx",
    ];
    const forbidden = /\b(localStorage|sessionStorage)\.(removeItem|clear|setItem)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["workspace role bridge leaves operational static files untouched by flag", () => {
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("newAuthRequireWorkspaceRole"), false);
    assert.equal(readFileSync(path.resolve(projectRoot, "app.js"), "utf8").includes("newAuthRequireWorkspaceRole"), false);
  }],
  ["workspace role bridge does not touch Login by flag", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/pages/Login.tsx"), "utf8");
    assert.equal(source.includes("newAuthRequireWorkspaceRole"), false);
    assert.equal(source.includes("NewAuthRequireWorkspaceRoleBridge"), false);
  }],
  ["workspace role bridge preview html is standalone", () => {
    assert.equal(existsSync(path.resolve(projectRoot, "require-workspace-role-bridge-preview.html")), true);
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("require-workspace-role-bridge-preview"), false);
  }],
  ["login bridge feature flag defaults false", () => {
    assert.equal(loginBridgeUtils.resolveNewAuthLoginFlag({
      search: "",
      envValue: undefined,
      isDev: true,
    }), false);
  }],
  ["login bridge dev query on enables new", () => {
    assert.equal(loginBridgeUtils.resolveNewAuthLoginFlag({
      search: "?newAuthLogin=on",
      envValue: "false",
      isDev: true,
    }), true);
  }],
  ["login bridge dev query off forces legacy", () => {
    assert.equal(loginBridgeUtils.resolveNewAuthLoginFlag({
      search: "?newAuthLogin=off",
      envValue: "true",
      isDev: true,
    }), false);
  }],
  ["login bridge production ignores query", () => {
    assert.equal(loginBridgeUtils.resolveNewAuthLoginFlag({
      search: "?newAuthLogin=on",
      envValue: "true",
      isDev: false,
    }), false);
  }],
  ["login bridge flag off returns legacy mode", () => {
    assert.equal(loginBridgeUtils.loginBridgeModeForFlag(false), "legacy");
  }],
  ["login bridge flag on returns new mode", () => {
    assert.equal(loginBridgeUtils.loginBridgeModeForFlag(true), "new");
  }],
  ["login bridge signed out shows form", () => {
    const decision = loginBridgeUtils.decideLoginBridgeAccess({
      mode: "new",
      phase: "signed_out",
      isAuthenticated: false,
      status: null,
      hasCurrentWorkspaceId: false,
      isSystemOwner: false,
    });
    assert.equal(decision.state, "form");
    assert.equal(decision.showForm, true);
    assert.equal(decision.destination, null);
  }],
  ["login bridge duplicate submit is blocked", () => {
    const decision = loginBridgeUtils.decideLoginBridgeAccess({
      mode: "new",
      phase: "signed_out",
      isAuthenticated: false,
      status: null,
      hasCurrentWorkspaceId: false,
      isSystemOwner: false,
      isSubmitting: true,
    });
    assert.equal(decision.state, "submitting");
    assert.equal(decision.disableSubmit, true);
  }],
  ["login bridge waits while session loading", () => {
    const decision = loginBridgeUtils.decideLoginBridgeAccess({
      mode: "new",
      phase: "loading_session",
      isAuthenticated: true,
      status: null,
      hasCurrentWorkspaceId: false,
      isSystemOwner: false,
    });
    assert.equal(decision.state, "waiting");
    assert.equal(decision.destination, null);
  }],
  ["login bridge active redirects to dashboard", () => {
    const decision = loginBridgeUtils.decideLoginBridgeAccess({
      mode: "new",
      phase: "authenticated",
      isAuthenticated: true,
      status: "active",
      hasCurrentWorkspaceId: true,
      isSystemOwner: false,
    });
    assert.equal(decision.state, "redirect");
    assert.equal(decision.destination, "/");
  }],
  ["login bridge active null workspace still succeeds", () => {
    const decision = loginBridgeUtils.decideLoginBridgeAccess({
      mode: "new",
      phase: "authenticated",
      isAuthenticated: true,
      status: "active",
      hasCurrentWorkspaceId: false,
      isSystemOwner: false,
    });
    assert.equal(decision.reason, "AUTHENTICATED_WITHOUT_WORKSPACE");
    assert.equal(decision.destination, "/");
  }],
  ["login bridge pending rejected disabled do not redirect", () => {
    for (const [status, reason] of [
      ["pending", "ACCOUNT_PENDING"],
      ["rejected", "ACCOUNT_REJECTED"],
      ["disabled", "ACCOUNT_DISABLED"],
    ]) {
      const decision = loginBridgeUtils.decideLoginBridgeAccess({
        mode: "new",
        phase: "account_action_required",
        isAuthenticated: true,
        status,
        hasCurrentWorkspaceId: false,
        isSystemOwner: false,
      });
      assert.equal(decision.state, "account_action");
      assert.equal(decision.reason, reason);
      assert.equal(decision.destination, null);
    }
  }],
  ["login bridge session error does not redirect", () => {
    const decision = loginBridgeUtils.decideLoginBridgeAccess({
      mode: "new",
      phase: "error",
      isAuthenticated: true,
      status: "active",
      hasCurrentWorkspaceId: true,
      isSystemOwner: false,
      hasSessionError: true,
    });
    assert.equal(decision.state, "error");
    assert.equal(decision.destination, null);
  }],
  ["login bridge system owner active succeeds without workspace", () => {
    const decision = loginBridgeUtils.decideLoginBridgeAccess({
      mode: "new",
      phase: "authenticated",
      isAuthenticated: true,
      status: "active",
      hasCurrentWorkspaceId: false,
      isSystemOwner: true,
    });
    assert.equal(decision.destination, "/");
    assert.equal(decision.reason, "AUTHENTICATED_WITHOUT_WORKSPACE");
  }],
  ["login bridge remember false uses session persistence", () => {
    assert.equal(loginBridgeUtils.loginPersistenceModeForRemember(false), "session");
  }],
  ["login bridge remember true uses local persistence", () => {
    assert.equal(loginBridgeUtils.loginPersistenceModeForRemember(true), "local");
  }],
  ["login bridge auth error messages are user safe", () => {
    const invalid = loginBridgeUtils.safeLoginErrorMessage({ code: "auth/invalid-credential" });
    const network = loginBridgeUtils.safeLoginErrorMessage({ code: "auth/network-request-failed" });
    assert.ok(invalid);
    assert.ok(network);
    assert.equal(invalid.includes("Firebase"), false);
    assert.equal(network.includes("Firebase"), false);
  }],
  ["login bridge imports no Firestore write APIs", () => {
    const files = [
      "src/pages/Login.tsx",
      "src/pages/loginBridgeUtils.ts",
      "src/dev-login-bridge/LoginBridgePreviewApp.tsx",
      "src/dev-login-bridge/main.tsx",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["login bridge does not call Firebase signOut", () => {
    const files = [
      "src/pages/Login.tsx",
      "src/pages/loginBridgeUtils.ts",
      "src/dev-login-bridge/LoginBridgePreviewApp.tsx",
      "src/dev-login-bridge/main.tsx",
    ];
    const forbidden = /\bsignOut\s*\(/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["login bridge does not auto-create user or membership documents", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/pages/Login.tsx"), "utf8");
    assert.equal(/\b(createUser|setDoc|updateDoc|membership|currentWorkspaceId\s*=)/.test(source), false);
  }],
  ["login bridge leaves operational static files untouched by flag", () => {
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("newAuthLogin"), false);
    assert.equal(readFileSync(path.resolve(projectRoot, "app.js"), "utf8").includes("newAuthLogin"), false);
  }],
  ["login bridge does not touch timetable workspace sync", () => {
    assert.equal(readFileSync(path.resolve(projectRoot, "services/workspaceDataService.js"), "utf8").includes("newAuthLogin"), false);
  }],
  ["login bridge preview html is standalone", () => {
    assert.equal(existsSync(path.resolve(projectRoot, "login-bridge-preview.html")), true);
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("login-bridge-preview"), false);
  }],
  ["app-next auth defaults on", () => {
    assert.equal(appNextUtils.resolveAppNextFlag({ isDev: true }), true);
    assert.equal(appNextUtils.resolveAppNextFlag({ isDev: false }), true);
    assert.equal(appNextUtils.appNextModeForFlag(true), "enabled");
  }],
  ["app-next auth dev rollback query disables only in development", () => {
    assert.equal(appNextUtils.resolveAppNextFlag({
      search: "?appNextAuth=off",
      isDev: true,
    }), false);
    assert.equal(appNextUtils.resolveAppNextFlag({
      search: "?appNextAuth=off",
      isDev: false,
    }), true);
  }],
  ["app-next auth env can disable entry", () => {
    assert.equal(appNextUtils.resolveAppNextFlag({
      envValue: "false",
      isDev: false,
    }), false);
  }],
  ["app-next auth query source has priority in development", () => {
    const resolved = appNextUtils.resolveAppNextAuthFlag({
      search: "?appNextAuth=off",
      envValue: "true",
      isDev: true,
    });
    assert.equal(resolved.enabled, false);
    assert.equal(resolved.source, "development-query");
  }],
  ["app-next auth production ignores rollback query when env enables", () => {
    assert.equal(appNextUtils.resolveAppNextFlag({
      search: "?appNextAuth=off",
      envValue: "true",
      isDev: false,
    }), true);
  }],
  ["app-next account states cover loading and signed out", () => {
    assert.equal(appNextUtils.appNextAccountState({
      phase: "initializing",
      session: null,
    }), "loading");
    assert.equal(appNextUtils.appNextAccountState({
      phase: "loading_session",
      session: null,
    }), "loading");
    assert.equal(appNextUtils.appNextAccountState({
      phase: "signed_out",
      session: null,
    }), "signed_out");
  }],
  ["app-next account states cover active workspace variants", () => {
    assert.equal(appNextUtils.appNextAccountState({
      phase: "authenticated",
      session: {
        uid: "user-1",
        email: "user@example.test",
        displayName: "User",
        emailVerified: true,
        status: "active",
        globalRole: "user",
        currentWorkspaceId: "workspace-1",
        currentWorkspaceRole: "normal",
        isSystemOwner: false,
        isAuthenticated: true,
        warnings: [],
      },
    }), "active");
    assert.equal(appNextUtils.appNextAccountState({
      phase: "authenticated",
      session: {
        uid: "user-1",
        email: "user@example.test",
        displayName: "User",
        emailVerified: true,
        status: "active",
        globalRole: "user",
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
        isSystemOwner: false,
        isAuthenticated: true,
        warnings: [],
      },
    }), "active_without_workspace");
  }],
  ["app-next account states cover account action statuses", () => {
    for (const status of ["pending", "rejected", "disabled"]) {
      assert.equal(appNextUtils.appNextAccountState({
        phase: "account_action_required",
        session: {
          uid: "user-1",
          email: "user@example.test",
          displayName: "User",
          emailVerified: false,
          status,
          globalRole: "user",
          currentWorkspaceId: null,
          currentWorkspaceRole: null,
          isSystemOwner: false,
          isAuthenticated: true,
          warnings: [],
        },
      }), status);
    }
  }],
  ["app-next account states keep system_owner global", () => {
    assert.equal(appNextUtils.appNextAccountState({
      phase: "authenticated",
      session: {
        uid: "owner-1",
        email: "owner@example.test",
        displayName: "Owner",
        emailVerified: true,
        status: "active",
        globalRole: "system_owner",
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
        isSystemOwner: true,
        isAuthenticated: true,
        warnings: [],
      },
    }), "system_owner");
  }],
  ["app-next account states keep error without signout decision", () => {
    assert.equal(appNextUtils.appNextAccountState({
      phase: "error",
      session: null,
      hasError: true,
    }), "error");
    assert.ok(appNextUtils.appNextStateMessage("error").body);
  }],
  ["app-next account states show quota exceeded without signout decision", () => {
    assert.equal(appNextUtils.appNextAccountState({
      phase: "error",
      session: null,
      hasError: true,
      errorCode: "SESSION_READ_QUOTA_EXCEEDED",
    }), "quota_exceeded");
    assert.ok(appNextUtils.appNextStateMessage("quota_exceeded").body);
  }],
  ["app-next verification labels and masked email are safe", () => {
    assert.ok(appNextUtils.verificationStatusLabel(true));
    assert.ok(appNextUtils.verificationStatusLabel(false));
    assert.ok(appNextUtils.verificationStatusLabel(null));
    assert.equal(appNextUtils.maskAppNextEmail("abcd@example.com"), "ab***@e***.com");
  }],
  ["app-next verification errors hide Firebase internals", () => {
    const message = appNextUtils.safeEmailVerificationErrorMessage({ code: "auth/network-request-failed" });
    assert.ok(message);
    assert.equal(appNextUtils.safeEmailVerificationErrorMessage({ code: "auth/internal-error" }).includes("Firebase"), false);
  }],
  ["app-next google login errors are user safe", () => {
    assert.ok(appNextUtils.safeGoogleLoginErrorMessage({ code: "auth/popup-closed-by-user" }));
    assert.ok(appNextUtils.safeGoogleLoginErrorMessage({ code: "auth/popup-blocked" }));
    assert.ok(appNextUtils.safeGoogleLoginErrorMessage({ code: "auth/unauthorized-domain" }));
    assert.equal(appNextUtils.safeGoogleLoginErrorMessage({ code: "auth/internal-error" }).includes("Firebase"), false);
  }],
  ["app-next html is standalone and does not alter operational entry", () => {
    assert.equal(existsSync(path.resolve(projectRoot, "app-next.html")), true);
    assert.match(readFileSync(path.resolve(projectRoot, "app-next.html"), "utf8"), /src\/app-next\/main\.tsx/);
    assert.equal(readFileSync(path.resolve(projectRoot, "index.html"), "utf8").includes("app-next"), false);
    assert.equal(readFileSync(path.resolve(projectRoot, "app.js"), "utf8").includes("src/app-next"), false);
    assert.equal(readFileSync(path.resolve(projectRoot, "app.js"), "utf8").includes("<AuthProvider"), false);
  }],
  ["app-next uses new provider and adapter without legacy AuthContext", () => {
    const files = [
      "src/app-next/main.tsx",
      "src/app-next/AppNext.tsx",
      "src/app-next/AppNextAccountReadOnly.tsx",
      "src/app-next/AppNextLogin.tsx",
      "src/app-next/appNextUtils.ts",
    ];
    const combined = files
      .map((file) => readFileSync(path.resolve(projectRoot, file), "utf8"))
      .join("\n");
    assert.match(combined, /AuthProvider/);
    assert.match(combined, /LegacyAuthAdapterProvider/);
    assert.equal(combined.includes("context/AuthContext"), false);
  }],
  ["app-next wraps screen in error boundary", () => {
    const mainSource = readFileSync(path.resolve(projectRoot, "src/app-next/main.tsx"), "utf8");
    const boundarySource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextErrorBoundary.tsx"), "utf8");
    assert.match(mainSource, /AppNextErrorBoundary/);
    assert.ok(boundarySource);
    assert.equal(boundarySource.includes("signOut("), false);
  }],
  ["app-next diagnostics expose read-only counters without sensitive values", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    assert.match(source, /session load count/);
    assert.match(source, /session write count/);
    assert.match(source, /bootstrap attempt count/);
    assert.ok(source);
    assert.equal(/\b(token|password)\b/.test(diagnosticsSource), false);
    assert.match(diagnosticsSource, /Fingerprint/);
  }],
  ["app-next imports no Firestore write APIs", () => {
    const files = [
      "src/app-next/main.tsx",
      "src/app-next/AppNext.tsx",
      "src/app-next/AppNextAccountReadOnly.tsx",
      "src/app-next/AppNextLogin.tsx",
      "src/app-next/appNextUtils.ts",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["app-next does not call Firebase signOut", () => {
    const files = [
      "src/app-next/main.tsx",
      "src/app-next/AppNext.tsx",
      "src/app-next/AppNextLogin.tsx",
      "src/app-next/appNextUtils.ts",
    ];
    const forbidden = /\bsignOut\s*\(/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["app-next account and settings pilot is read-only", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    const accountSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextAccountReadOnly.tsx"), "utf8");
    assert.match(appSource, /<AppNextAccountReadOnly/);
    assert.match(appSource, /screen="account"/);
    assert.match(appSource, /screen="settings-readonly"/);
    assert.match(appSource, /<RequireAuth/);
    assert.equal(/\bsendEmailVerification\b/.test(appSource), false);
    assert.equal(/\b(sendEmailVerification|updateEmail|updatePassword|sendPasswordResetEmail|deleteUser|linkWithCredential|unlink|reauthenticateWithCredential|setPersistence|signOut)\b/.test(accountSource), false);
    assert.equal(/\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction|onSnapshot|getDoc|getDocs)\b/.test(accountSource), false);
    assert.match(accountSource, /Auth write" value="0"/);
    assert.match(accountSource, /Firestore read\/write\/listener" value="0 \/ 0 \/ 0"/);
  }],
  ["app-next account read-only policy allows active workspace null", () => {
    const policy = appNextAccountSettingsUtils.appNextAccountReadOnlyPolicy({
      phase: "authenticated",
      session: makeSession({
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
    });
    assert.equal(policy.canRender, true);
    assert.equal(policy.reason, "active");
    assert.equal(policy.hasWorkspace, false);
    assert.equal(policy.workspaceRoleCategory, "none");
  }],
  ["app-next account read-only policy blocks account action states", () => {
    for (const status of ["pending", "rejected", "disabled"]) {
      const policy = appNextAccountSettingsUtils.appNextAccountReadOnlyPolicy({
        phase: "account_action_required",
        session: makeSession({
          status,
        }),
      });
      assert.equal(policy.canRender, false);
      assert.equal(policy.reason, status);
    }
  }],
  ["app-next account read-only policy keeps system owner as global role", () => {
    const policy = appNextAccountSettingsUtils.appNextAccountReadOnlyPolicy({
      phase: "authenticated",
      session: makeSession({
        globalRole: "system_owner",
        isSystemOwner: true,
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
    });
    assert.equal(policy.canRender, true);
    assert.equal(policy.isSystemOwner, true);
    assert.equal(policy.globalRoleCategory, "system_owner");
    assert.equal(policy.workspaceRoleCategory, "none");
  }],
  ["app-next account provider and persistence categories are privacy safe", () => {
    assert.equal(appNextAccountSettingsUtils.providerCategoryFromIds(["google.com"]), "Google");
    assert.equal(appNextAccountSettingsUtils.providerCategoryFromIds(["password"]), "이메일/비밀번호");
    assert.equal(appNextAccountSettingsUtils.providerCategoryFromIds(["password", "google.com"]), "복수 제공자");
    assert.equal(appNextAccountSettingsUtils.providerCategoryFromIds([]), "알 수 없음");
    assert.equal(appNextAccountSettingsUtils.normalizePersistenceMode("local"), "local");
    assert.equal(appNextAccountSettingsUtils.normalizePersistenceMode("session"), "session");
    assert.equal(appNextAccountSettingsUtils.normalizePersistenceMode("none"), "none");
    assert.equal(appNextAccountSettingsUtils.normalizePersistenceMode("indexeddbLocalPersistence"), "unknown");
  }],
  ["app-next account warnings expose codes only", () => {
    const warnings = appNextAccountSettingsUtils.safeWarningCodes([
      {
        code: "WORKSPACE_NOT_FOUND",
        message: "raw@example.test workspace_123",
      },
      {
        code: "WORKSPACE_NOT_FOUND",
        message: "duplicate",
      },
      {
        code: "GLOBAL_ROLE_MISMATCH",
        message: "sensitive",
      },
    ]);
    assert.equal(JSON.stringify(warnings), JSON.stringify(["GLOBAL_ROLE_MISMATCH", "WORKSPACE_NOT_FOUND"]));
    assert.equal(appNextAccountSettingsUtils.detectSensitiveAccountText(warnings), false);
    assert.equal(appNextAccountSettingsUtils.detectSensitiveAccountText(["raw@example.test"]), true);
  }],
  ["app-next login form is gated by dedicated feature flag", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    assert.equal(source.includes("resolveAppNextLoginFlag"), false);
    assert.equal(source.includes("VITE_ENABLE_APP_NEXT_LOGIN"), false);
    assert.match(source, /<AppNextLogin \/>/);
  }],
  ["app-next login uses new provider signIn methods and auth persistence only", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextLogin.tsx"), "utf8");
    assert.match(source, /signInWithEmail\(email, password\)/);
    assert.match(source, /signInWithGoogle\(\)/);
    assert.match(source, /setPersistence/);
    assert.match(source, /browserSessionPersistence/);
    assert.match(source, /browserLocalPersistence/);
    assert.match(source, /useState\(true\)/);
    assert.equal(source.includes("useNavigate"), false);
    assert.equal(source.includes("window.location"), false);
    assert.equal(source.includes("context/AuthContext"), false);
  }],
  ["app-next login applies persistence before each sign-in provider", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextLogin.tsx"), "utf8");
    const googleBody = source.slice(
      source.indexOf("const handleGoogleLogin"),
      source.indexOf("const handleSubmit"),
    );
    const emailBody = source.slice(
      source.indexOf("const handleSubmit"),
      source.indexOf("if (false && isSignedOut)"),
    );
    assert.match(source, /rememberLogin/);
    assert.match(source, /recordAppNextPersistence\(requested, requested, provider, true, "none"\)/);
    assert.match(source, /recordAppNextPersistence\(\s*requested,\s*"unknown",\s*provider,\s*false,/);
    assert.ok(googleBody.indexOf('await preparePersistence("google")') >= 0);
    assert.ok(googleBody.indexOf('await preparePersistence("google")') < googleBody.indexOf("await signInWithGoogle()"));
    assert.ok(emailBody.indexOf('await preparePersistence("email")') >= 0);
    assert.ok(emailBody.indexOf('await preparePersistence("email")') < emailBody.indexOf("await signInWithEmail(email, password)"));
  }],
  ["app-next login diagnostics expose persistence and signout counters", () => {
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    const appSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    assert.match(diagnosticsSource, /requestedPersistence/);
    assert.match(diagnosticsSource, /effectivePersistence/);
    assert.match(diagnosticsSource, /persistenceSetCount/);
    assert.match(diagnosticsSource, /persistenceSetSucceeded/);
    assert.match(diagnosticsSource, /persistenceSetFailedCount/);
    assert.match(diagnosticsSource, /persistenceSetErrorKind/);
    assert.match(diagnosticsSource, /signInProvider/);
    assert.match(diagnosticsSource, /authStateChangeCount/);
    assert.match(diagnosticsSource, /explicitSignOutCount/);
    assert.match(diagnosticsSource, /automaticSignOutCount/);
    assert.match(diagnosticsSource, /currentOrigin/);
    assert.match(diagnosticsSource, /previousPageHadAuthenticatedUser/);
    assert.match(diagnosticsSource, /previousPageWasAuthenticated/);
    assert.match(diagnosticsSource, /previousExplicitSignOutAt/);
    assert.match(diagnosticsSource, /previousAutomaticSignOutAt/);
    assert.match(diagnosticsSource, /lastPageClosedAt/);
    assert.match(diagnosticsSource, /firebaseAppInitializedAt/);
    assert.match(diagnosticsSource, /authInstanceCreatedAt/);
    assert.match(diagnosticsSource, /authObserverAttachedAt/);
    assert.match(diagnosticsSource, /firstAuthCallbackHadUser/);
    assert.match(diagnosticsSource, /persistenceRestoreResult/);
    assert.match(diagnosticsSource, /crossTabSignedOutCount/);
    assert.match(appSource, /requestedPersistence/);
    assert.match(appSource, /effectivePersistence/);
    assert.match(appSource, /persistenceSetSucceeded/);
    assert.match(appSource, /persistenceSetFailedCount/);
    assert.match(appSource, /automaticSignOutCount/);
  }],
  ["app-next diagnostics drawer is accessible from every app-next tab", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    const styles = readFileSync(path.resolve(projectRoot, "src/app-next/styles.css"), "utf8");
    assert.match(source, /AppNextDiagnosticsDrawer/);
    assert.ok(source);
    assert.match(styles, /app-next-diagnostics-toggle/);
    assert.match(styles, /position: fixed/);
  }],
  ["app-next account and settings diagnostics are separated and privacy safe", () => {
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    const appSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    assert.match(diagnosticsSource, /PMAppNextAccountDiagnostics/);
    assert.match(diagnosticsSource, /PMAppNextSettingsReadOnlyDiagnostics/);
    assert.match(diagnosticsSource, /AppNextAccountDiagnosticsSnapshot/);
    assert.match(diagnosticsSource, /AppNextSettingsReadOnlyDiagnosticsSnapshot/);
    assert.match(appSource, /account\.accountReadCount/);
    assert.match(appSource, /settings\.writeAttemptCount/);
    assert.equal(/uid|workspaceId|documentId|apiKey|token/i.test(
      diagnosticsSource.slice(
        diagnosticsSource.indexOf("export interface AppNextAccountDiagnosticsSnapshot"),
        diagnosticsSource.indexOf("const MAX_APP_NEXT_DIAGNOSTIC_EVENTS"),
      ),
    ), false);
  }],
  ["app-next diagnostics drawer includes workspace notice read state", () => {
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    const appSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    const noticeSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextWorkspaceNotices.tsx"), "utf8");
    assert.match(diagnosticsSource, /AppNextNoticeDiagnosticsSnapshot/);
    assert.match(diagnosticsSource, /recordAppNextNoticeDiagnostics/);
    assert.match(appSource, /notice\.lastRequestedReadMode/);
    assert.match(appSource, /notice\.currentWorkspaceFingerprint/);
    assert.match(appSource, /notice\.serverUsersCurrentWorkspaceFingerprint/);
    assert.match(appSource, /notice\.sameFirebaseProject/);
    assert.match(noticeSource, /recordAppNextNoticeDiagnostics/);
    assert.match(noticeSource, /server-failed/);
  }],
  ["app-next copy buttons separate auth and notice diagnostic channels", () => {
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    const appSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    assert.match(diagnosticsSource, /appNextAuthDiagnosticsText/);
    assert.match(diagnosticsSource, /channel: "appNextAuthDiagnostics"/);
    assert.match(diagnosticsSource, /appNextWorkspaceNoticeDiagnosticsText/);
    assert.match(diagnosticsSource, /channel: "appNextWorkspaceNoticeDiagnostics"/);
    assert.ok(appSource);
    assert.ok(appSource);
    assert.match(appSource, /appNextAuthDiagnosticsText/);
    assert.match(appSource, /appNextWorkspaceNoticeDiagnosticsText/);
    assert.equal(appSource.includes("appNextDiagnosticsText()"), false);
  }],
  ["app-next notice diagnostics include read outcome fields without write channel", () => {
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    const noticeSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextWorkspaceNotices.tsx"), "utf8");
    assert.match(diagnosticsSource, /workspacePresent/);
    assert.match(diagnosticsSource, /workspaceRole/);
    assert.match(diagnosticsSource, /filteredCount/);
    assert.match(diagnosticsSource, /listenerCount/);
    assert.match(diagnosticsSource, /writeApiImported/);
    assert.match(diagnosticsSource, /automaticSignOut/);
    assert.match(diagnosticsSource, /appSessionWorkspaceFingerprint/);
    assert.match(diagnosticsSource, /usersCurrentWorkspaceFingerprint/);
    assert.match(diagnosticsSource, /serverUsersCurrentWorkspaceFingerprint/);
    assert.match(diagnosticsSource, /sameServerUsersCurrentWorkspace/);
    assert.match(diagnosticsSource, /canonicalSource/);
    assert.match(diagnosticsSource, /workspaceMismatchDetected/);
    assert.match(diagnosticsSource, /workspaceMismatchKind/);
    assert.match(diagnosticsSource, /server-workspace-rejected/);
    assert.match(diagnosticsSource, /appNextDiagnosticFingerprint/);
    assert.match(diagnosticsSource, /diagnosticFingerprint/);
    const fingerprintSource = readFileSync(path.resolve(projectRoot, "src/shared/diagnosticFingerprint.ts"), "utf8");
    assert.match(fingerprintSource, /`\$\{namespace\}:v1:\$\{text\}`/);
    assert.equal(diagnosticsSource.includes("`fp_"), false);
    assert.match(noticeSource, /filteredCount: result\.filteredCount/);
    assert.match(noticeSource, /getDocFromServer/);
    assert.match(noticeSource, /listenerCount: 0/);
    assert.match(noticeSource, /writeApiImported: true/);
    assert.match(noticeSource, /automaticSignOut: "none"/);
    assert.match(noticeSource, /canonicalSource: "AppSession\.currentWorkspaceId"/);
    assert.match(noticeSource, /서버 사용자 기준 세션 다시 확인/);
    assert.match(noticeSource, /reloadSession/);
  }],
  ["app-next firebase init and auth observer timeline are recorded", () => {
    const firebaseSource = readFileSync(path.resolve(projectRoot, "src/lib/firebase.ts"), "utf8");
    const providerSource = readFileSync(path.resolve(projectRoot, "src/auth/AuthProvider.tsx"), "utf8");
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    assert.match(firebaseSource, /recordAppNextFirebaseInit/);
    assert.match(firebaseSource, /recordAppNextAuthInstanceCreated/);
    assert.match(providerSource, /recordAppNextAuthObserverAttached/);
    assert.match(providerSource, /recordAppNextAuthCallback\(Boolean\(nextUser\)\)/);
    assert.match(providerSource, /recordAppNextAuthUser\(nextUid\)/);
    assert.match(providerSource, /recordAppNextCrossTabSignOut/);
    assert.match(diagnosticsSource, /persistenceRestoreResult = "no-user"/);
    assert.match(diagnosticsSource, /previousRequestedPersistence === "local"/);
    assert.match(diagnosticsSource, /previousEffectivePersistence === "local"/);
  }],
  ["app-next AuthProvider records auth changes but only explicit signout calls Firebase signOut", () => {
    const providerSource = readFileSync(path.resolve(projectRoot, "src/auth/AuthProvider.tsx"), "utf8");
    const explicitSignOutBody = providerSource.slice(
      providerSource.indexOf("const signOut = useCallback"),
      providerSource.indexOf("const reloadSession = useCallback"),
    );
    const beforeExplicitSignOut = providerSource.slice(0, providerSource.indexOf("const signOut = useCallback"));
    assert.match(providerSource, /recordAppNextAuthStateChange/);
    assert.match(explicitSignOutBody, /recordAppNextExplicitSignOut/);
    assert.match(explicitSignOutBody, /firebaseSignOut\(auth\)/);
    assert.equal(beforeExplicitSignOut.includes("firebaseSignOut(auth)"), false);
    assert.equal(providerSource.includes("recordAppNextAutomaticSignOut("), false);
  }],
  ["operational Google login diagnostics classify popup and session completion", () => {
    const authServiceSource = readFileSync(path.resolve(projectRoot, "services/authService.js"), "utf8");
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    assert.match(authServiceSource, /operationalGoogleLoginDiagnostics/);
    assert.match(authServiceSource, /googlePopupRequestedCount/);
    assert.match(authServiceSource, /googlePopupResolvedCount/);
    assert.match(authServiceSource, /googlePopupRejectedCount/);
    assert.match(authServiceSource, /googlePopupResult/);
    assert.match(authServiceSource, /coopWarningDisposition/);
    assert.match(authServiceSource, /benign-after-success/);
    assert.match(authServiceSource, /popup-resolved-but-no-auth-user/);
    assert.match(authServiceSource, /auth-user-present-session-missing/);
    assert.match(authServiceSource, /recordOperationalGoogleAuthState/);
    assert.match(authServiceSource, /recordOperationalGoogleSessionResolved/);
    assert.match(appSource, /recordOperationalGoogleAuthState\?\.\(Boolean\(firebaseUser\)\)/);
    assert.match(appSource, /recordOperationalGoogleSessionResolved/);
    assert.match(appSource, /APP_PATCH_VERSION_V119/);
  }],
  ["app-next login has disabled state and duplicate submit guard", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextLogin.tsx"), "utf8");
    assert.match(source, /if \(submittingMode \|\| isCheckingSession\) return/);
    assert.match(source, /disabled=\{disableSubmit\}/);
    assert.ok(source);
  }],
  ["app-next login presents google first and email password as advanced option", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextLogin.tsx"), "utf8");
    assert.ok(source);
    assert.ok(source);
    assert.match(source, /safeGoogleLoginErrorMessage/);
  }],
  ["app-next login disabled message and no redirect diagnostic are present", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextLogin.tsx"), "utf8");
    assert.ok(source);
    assert.match(source, /redirect target/);
    assert.match(source, />none</);
  }],
  ["app-next login feature flag is documented in env example", () => {
    assert.match(
      readFileSync(path.resolve(projectRoot, ".env.example"), "utf8"),
      /VITE_ENABLE_APP_NEXT_AUTH=true/,
    );
  }],
  ["app-next auth provider uses read-only session loader and no bootstrap writes", () => {
    const providerSource = readFileSync(path.resolve(projectRoot, "src/auth/AuthProvider.tsx"), "utf8");
    const sessionSource = readFileSync(path.resolve(projectRoot, "src/auth/sessionService.ts"), "utf8");
    assert.match(providerSource, /loadSessionReadOnlySafely/);
    assert.equal(/\b(setDoc|updateDoc|addDoc|writeBatch|runTransaction)\b/.test(sessionSource), false);
    assert.match(sessionSource, /SESSION_READ_QUOTA_EXCEEDED/);
    assert.match(sessionSource, /inFlightSessionLoadsByUid/);
  }],
  ["operational auth bootstrap exposes diagnostics without sensitive identifiers", () => {
    const source = readFileSync(path.resolve(projectRoot, "services/authService.js"), "utf8");
    const diagnosticsSource = source.slice(
      source.indexOf("const authBootstrapDiagnostics"),
      source.indexOf("function readJson"),
    );
    assert.match(source, /PMAuthBootstrapDiagnostics/);
    assert.match(source, /authStateEventCount/);
    assert.match(source, /bootstrapCommitCount/);
    assert.match(source, /bootstrapSkippedNoDiffCount/);
    assert.match(source, /resourceExhaustedCount/);
    assert.match(source, /lastChangedFields/);
    assert.match(source, /maskFirestorePath/);
    assert.equal(/lastUid|lastEmail|lastWorkspaceId|token|password/.test(diagnosticsSource), false);
  }],
  ["operational auth bootstrap dedupes in-flight work and resolves canonical roles read-only", () => {
    const source = readFileSync(path.resolve(projectRoot, "services/authService.js"), "utf8");
    assert.match(source, /authBootstrapInFlightByUid/);
    assert.match(source, /firebaseEnsureUserStructureInternal/);
    assert.match(source, /buildMergePatch/);
    assert.match(source, /canonical-session-read-only/);
    const bootstrapBody = source.slice(
      source.indexOf("async function firebaseEnsureUserStructureInternal"),
      source.indexOf("async function firebaseRegisterDevice"),
    );
    assert.equal(/writeBatch|setDoc|workspace_members|workspaceMembers/.test(bootstrapBody), false);
  }],
  ["operational auth bootstrap has quota backoff and no automatic retry loop", () => {
    const source = readFileSync(path.resolve(projectRoot, "services/authService.js"), "utf8");
    assert.match(source, /AUTH_BOOTSTRAP_BACKOFF_MS/);
    assert.match(source, /isResourceExhaustedError/);
    assert.match(source, /activateAuthBootstrapBackoff/);
    assert.match(source, /bootstrap-skipped-backoff-active/);
    assert.equal(/setTimeout\s*\([^)]*firebaseEnsureUserStructure/.test(source), false);
  }],
  ["admin standalone restores Firebase auth without a fresh-load signout", () => {
    const source = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const forceStart = source.indexOf("function forceAdminStandaloneLoginOnFreshLoadV86");
    const forceEnd = source.indexOf("function masterSubjectsV86", forceStart);
    const forceBody = source.slice(forceStart, forceEnd);
    assert.match(forceBody, /freshLoadSignOutBlockedCount/);
    assert.equal(/signOut|clearAdminStandaloneAuthV62|clearBrowserAuthSessionV80|showLoginOnlyV80/.test(forceBody), false);
    assert.match(source, /restoredAdminFirebaseSession = isStandaloneAdminSiteV60\(\) && Boolean\(firebaseAuthUserV159\(\)\)/);
    assert.match(source, /!explicitSession && !restoredAdminFirebaseSession/);
    assert.ok((source.match(/!isStandaloneAdminSiteV60\(\) && !canUseBrowserAuthSessionV80\(\)/g) || []).length >= 2);
  }],
  ["admin profile bootstrap errors keep auth and render a retryable block", () => {
    const source = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const bootstrapStart = source.indexOf("async function bootstrapAdminFirebaseUserV159");
    const bootstrapEnd = source.indexOf("async function retryAdminProfileBootstrapV159", bootstrapStart);
    const bootstrapBody = source.slice(bootstrapStart, bootstrapEnd);
    assert.match(source, /classifyAdminProfileBootstrapErrorV159/);
    assert.match(source, /permission-denied/);
    assert.match(source, /profile-missing/);
    assert.match(source, /계정 정보 접근 권한 오류/);
    assert.match(source, /다시 시도/);
    assert.match(source, /로그아웃/);
    assert.match(bootstrapBody, /adminProfileBootstrapPromiseV159/);
    assert.match(bootstrapBody, /membership\?\.role !== "system_owner"/);
    assert.equal(/signOut|firebaseLogout/.test(bootstrapBody), false);
    assert.match(bootstrapBody, /if \(!firebaseUser\)[\s\S]*showLoginOnlyV80\(\)/);
  }],
  ["admin auth diagnostics expose state without identifiers", () => {
    const source = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const diagnosticsStart = source.indexOf("window.PMAdminAuthDiagnostics =");
    const diagnosticsEnd = source.indexOf("function adminStandaloneRequiresExplicitLoginV62", diagnosticsStart);
    const diagnosticsBody = source.slice(diagnosticsStart, diagnosticsEnd);
    for (const field of [
      "appTarget",
      "authUserPresent",
      "authRestoreCompleted",
      "firebaseSignOutCallCount",
      "explicitLogoutCallCount",
      "freshLoadSignOutBlockedCount",
      "profileBootstrapCount",
      "profileBootstrapResult",
      "profilePermissionDeniedCount",
      "profileMissingCount",
      "loginRendererCount",
      "blockedRendererCount",
      "lastErrorCode",
      "activeRequestCount",
      "lastDurationMs",
    ]) assert.match(source, new RegExp(`\\b${field}\\b`));
    assert.equal(/\buid\b|\bemail\b|token|credential|workspaceId/.test(diagnosticsBody), false);
  }],
  ["missing operational profile is blocked without automatic document creation", () => {
    const source = readFileSync(path.resolve(projectRoot, "services/authService.js"), "utf8");
    const bootstrapStart = source.indexOf("async function firebaseEnsureUserStructureInternal");
    const bootstrapEnd = source.indexOf("async function firebaseRegisterDevice", bootstrapStart);
    const bootstrapBody = source.slice(bootstrapStart, bootstrapEnd);
    assert.match(bootstrapBody, /profileMissingError\.code = "profile-missing"/);
    assert.match(bootstrapBody, /throw profileMissingError/);
    assert.equal(/firebaseCreateBaseUserDocument/.test(bootstrapBody), false);
    const registrationStart = source.indexOf("async function firebaseRegisterWithEmail");
    const registrationEnd = source.indexOf("async function firebaseCreateBaseUserDocument", registrationStart);
    assert.match(source.slice(registrationStart, registrationEnd), /firebaseCreateBaseUserDocument/);
  }],
  ["admin auth P0 cache versions are current", () => {
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    assert.match(indexHtml, /services\/authService\.js\?v=20/);
    assert.match(indexHtml, /app\.js\?v=164/);
    assert.doesNotMatch(indexHtml, /services\/authService\.js\?v=17/);
    assert.doesNotMatch(indexHtml, /app\.js\?v=159/);
  }],
  ["operational auth post-login tasks read before write", () => {
    const source = readFileSync(path.resolve(projectRoot, "services/authService.js"), "utf8");
    assert.match(source, /get login device/);
    assert.match(source, /login-device-no-diff/);
    assert.match(source, /stableAuthDeviceId/);
    assert.match(source, /get welcome notification/);
    assert.match(source, /welcome-notification-existing/);
    assert.match(source, /welcomeNotificationWriteCount/);
    assert.equal(/\|\|\s*`device_\$\{Date\.now\(\)\}`/.test(source), false);
  }],
  ["auth regression comparison covers A through O fixtures", () => {
    const { authRegressionFixtures } = loadTsModule("src/dev-auth-regression/authRegressionFixtures.ts");
    const fixtureNames = authRegressionFixtures.map((fixture) => fixture.name[0]).join("");
    assert.match(fixtureNames, /A/);
    assert.match(fixtureNames, /B/);
    assert.match(fixtureNames, /C/);
    assert.match(fixtureNames, /D/);
    assert.match(fixtureNames, /E/);
    assert.match(fixtureNames, /F/);
    assert.match(fixtureNames, /G/);
    assert.match(fixtureNames, /H/);
    assert.match(fixtureNames, /I/);
    assert.match(fixtureNames, /J/);
    assert.match(fixtureNames, /K/);
    assert.match(fixtureNames, /L/);
    assert.match(fixtureNames, /M/);
    assert.match(fixtureNames, /N/);
    assert.match(fixtureNames, /O/);
  }],
  ["auth regression comparison has no write or automatic signout side effects", () => {
    const { runAuthRegressionComparison } = loadTsModule("src/dev-auth-regression/authRegressionReport.ts");
    const results = runAuthRegressionComparison();
    assert.ok(results.length >= 15);
    for (const result of results) {
      assert.equal(result.legacy.firestoreWrite, false, result.fixtureName);
      assert.equal(result.new.firestoreWrite, false, result.fixtureName);
      assert.equal(result.legacy.automaticSignOut, false, result.fixtureName);
      assert.equal(result.new.automaticSignOut, false, result.fixtureName);
    }
  }],
  ["auth regression comparison keeps active workspace null authenticated", () => {
    const { compareLegacyAndNewAuth } = loadTsModule("src/auth/sessionComparison.ts");
    const result = compareLegacyAndNewAuth({
      name: "active workspace null",
      authUserExists: true,
      userDocumentExists: true,
      userDocument: {
        status: "active",
        globalRole: "user",
        currentWorkspaceId: null,
        disabled: false,
      },
    });
    assert.equal(result.legacy.phase, "authenticated");
    assert.equal(result.new.phase, "authenticated");
    assert.equal(result.new.currentWorkspaceIdPresent, false);
    assert.equal(result.hasCriticalMismatch, false);
  }],
  ["auth regression comparison clears missing workspace consistently", () => {
    const { compareLegacyAndNewAuth } = loadTsModule("src/auth/sessionComparison.ts");
    const result = compareLegacyAndNewAuth({
      name: "workspace missing",
      authUserExists: true,
      userDocumentExists: true,
      userDocument: {
        status: "active",
        globalRole: "user",
        currentWorkspaceId: "deleted-workspace",
        disabled: false,
      },
      workspaceExists: false,
    });
    assert.equal(result.legacy.currentWorkspaceIdPresent, false);
    assert.equal(result.new.currentWorkspaceIdPresent, false);
    assert.equal(result.legacy.currentWorkspaceRole, null);
    assert.equal(result.new.currentWorkspaceRole, null);
    assert.equal(result.legacy.warnings.includes("CURRENT_WORKSPACE_NOT_ACCESSIBLE"), true);
    assert.equal(result.new.warnings.includes("CURRENT_WORKSPACE_NOT_ACCESSIBLE"), true);
    assert.equal(result.hasHighMismatch, false);
    assert.equal(result.hasCriticalMismatch, false);
  }],
  ["auth regression comparison clears workspace without membership consistently", () => {
    const { compareLegacyAndNewAuth } = loadTsModule("src/auth/sessionComparison.ts");
    const result = compareLegacyAndNewAuth({
      name: "membership missing",
      authUserExists: true,
      userDocumentExists: true,
      userDocument: {
        status: "active",
        globalRole: "user",
        currentWorkspaceId: "workspace-main",
        disabled: false,
      },
      workspaceExists: true,
    });
    assert.equal(result.legacy.currentWorkspaceIdPresent, false);
    assert.equal(result.new.currentWorkspaceIdPresent, false);
    assert.equal(result.legacy.warnings.includes("MEMBERSHIP_MISSING"), true);
    assert.equal(result.new.warnings.includes("MEMBERSHIP_MISSING"), true);
    assert.equal(result.legacy.warnings.includes("CURRENT_WORKSPACE_NOT_ACCESSIBLE"), true);
    assert.equal(result.new.warnings.includes("CURRENT_WORKSPACE_NOT_ACCESSIBLE"), true);
    assert.equal(result.hasHighMismatch, false);
  }],
  ["auth regression comparison ignores stale local workspace without clearing storage", () => {
    const { compareLegacyAndNewAuth } = loadTsModule("src/auth/sessionComparison.ts");
    const result = compareLegacyAndNewAuth({
      name: "stale local workspace",
      authUserExists: true,
      userDocumentExists: true,
      userDocument: {
        status: "active",
        globalRole: "user",
        currentWorkspaceId: null,
        disabled: false,
      },
      localWorkspaceId: "stale-local-workspace",
      workspaceExists: false,
    });
    assert.equal(result.legacy.currentWorkspaceIdPresent, false);
    assert.equal(result.new.currentWorkspaceIdPresent, false);
    assert.equal(result.legacy.membershipSource, "none");
    assert.equal(result.new.membershipSource, "none");
    assert.equal(result.legacy.firestoreWrite, false);
    assert.equal(result.new.firestoreWrite, false);
    assert.equal(result.hasHighMismatch, false);
  }],
  ["auth regression comparison treats system owner as global role not workspace role", () => {
    const { compareLegacyAndNewAuth } = loadTsModule("src/auth/sessionComparison.ts");
    const result = compareLegacyAndNewAuth({
      name: "system owner workspace null",
      authUserExists: true,
      userDocumentExists: true,
      systemOwnerDocumentExists: true,
      userDocument: {
        status: "active",
        globalRole: "user",
        role: "system_owner",
        currentWorkspaceId: null,
      },
    });
    assert.equal(result.new.globalRole, "system_owner");
    assert.equal(result.new.isSystemOwner, true);
    assert.equal(result.new.currentWorkspaceRole, null);
    assert.equal(result.new.warnings.includes("GLOBAL_ROLE_MISMATCH"), true);
  }],
  ["auth regression comparison prioritizes canonical membership over legacy membership", () => {
    const { compareLegacyAndNewAuth } = loadTsModule("src/auth/sessionComparison.ts");
    const result = compareLegacyAndNewAuth({
      name: "canonical priority",
      authUserExists: true,
      userDocumentExists: true,
      userDocument: {
        status: "active",
        globalRole: "user",
        currentWorkspaceId: "workspace-main",
      },
      workspaceExists: true,
      canonicalMembership: {
        uid: "u",
        workspaceId: "workspace-main",
        role: "teacher",
        status: "active",
      },
      legacyMembership: {
        uid: "u",
        workspaceId: "workspace-main",
        role: "viewer",
        status: "active",
      },
    });
    assert.equal(result.new.membershipSource, "canonical");
    assert.equal(result.new.currentWorkspaceRole, "teacher");
    assert.equal(result.hasCriticalMismatch, false);
  }],
  ["auth regression comparison reports quota and permission errors safely", () => {
    const { compareLegacyAndNewAuth } = loadTsModule("src/auth/sessionComparison.ts");
    for (const errorKind of ["permission-denied", "resource-exhausted", "network-error"]) {
      const result = compareLegacyAndNewAuth({
        name: errorKind,
        authUserExists: true,
        userDocumentExists: true,
        userDocument: {
          status: "active",
          globalRole: "user",
          currentWorkspaceId: "workspace-main",
        },
        legacyError: errorKind,
        newError: errorKind,
      });
      assert.equal(result.new.phase, "error");
      assert.equal(result.new.destination, "safe-error");
      assert.equal(result.new.automaticSignOut, false);
      assert.equal(result.new.firestoreWrite, false);
    }
  }],
  ["auth regression comparison source imports no Firebase write APIs", () => {
    const files = [
      "src/auth/sessionComparison.ts",
      "src/dev-auth-regression/authRegressionFixtures.ts",
      "src/dev-auth-regression/authRegressionReport.ts",
      "src/dev-auth-regression/main.tsx",
    ];
    const forbidden = /\b(setDoc|updateDoc|addDoc|deleteDoc|writeBatch|runTransaction|signOut\s*\(|onAuthStateChanged)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["auth regression preview is standalone and production build blocked", () => {
    const html = readFileSync(path.resolve(projectRoot, "auth-regression-preview.html"), "utf8");
    const viteConfig = readFileSync(path.resolve(projectRoot, "vite.config.js"), "utf8");
    assert.match(html, /auth-regression-root/);
    assert.match(html, /src\/dev-auth-regression\/main\.tsx/);
    assert.doesNotMatch(viteConfig, /authRegressionPreview/);
    assert.doesNotMatch(viteConfig, /auth-regression-preview\.html/);
    assert.equal(html.includes("app.js"), false);
    assert.equal(html.includes("services/authService.js"), false);
  }],
  ["app-next auth provider configures google popup without firestore writes", () => {
    const providerSource = readFileSync(path.resolve(projectRoot, "src/auth/AuthProvider.tsx"), "utf8");
    assert.match(providerSource, /GoogleAuthProvider/);
    assert.match(providerSource, /signInWithPopup\(auth, provider\)/);
    assert.match(providerSource, /prompt: "select_account"/);
    assert.equal(/\b(setDoc|updateDoc|addDoc|writeBatch|runTransaction)\b/.test(providerSource), false);
    assert.equal(providerSource.includes("window.location"), false);
  }],
  ["app-next build input is registered without touching static app scripts", () => {
    const viteConfig = readFileSync(path.resolve(projectRoot, "vite.config.js"), "utf8");
    assert.match(viteConfig, /app-next\.html/);
    assert.equal(readFileSync(path.resolve(projectRoot, "services/workspaceDataService.js"), "utf8").includes("appNext"), false);
  }],
  ["app-next devices read policy allows active user without workspace", () => {
    const policy = appNextLoginDevicesUtils.appNextDeviceReadPolicy({
      phase: "authenticated",
      session: {
        uid: "user-1",
        email: "user@example.test",
        displayName: "User",
        emailVerified: true,
        status: "active",
        globalRole: "user",
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
        isSystemOwner: false,
        isAuthenticated: true,
        warnings: [],
      },
    });
    assert.equal(policy.canRead, true);
    assert.equal(policy.reason, "active");
  }],
  ["app-next devices read policy blocks signed out and account action", () => {
    assert.equal(appNextLoginDevicesUtils.appNextDeviceReadPolicy({
      phase: "signed_out",
      session: null,
    }).reason, "signed-out");
    assert.equal(appNextLoginDevicesUtils.appNextDeviceReadPolicy({
      phase: "account_action_required",
      session: {
        uid: "user-1",
        email: "user@example.test",
        displayName: "User",
        emailVerified: false,
        status: "pending",
        globalRole: "user",
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
        isSystemOwner: false,
        isAuthenticated: true,
        warnings: [],
      },
    }).reason, "account-action-required");
  }],
  ["app-next devices read policy allows system owner", () => {
    const policy = appNextLoginDevicesUtils.appNextDeviceReadPolicy({
      phase: "authenticated",
      session: {
        uid: "owner-1",
        email: "owner@example.test",
        displayName: "Owner",
        emailVerified: true,
        status: "active",
        globalRole: "system_owner",
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
        isSystemOwner: true,
        isAuthenticated: true,
        warnings: [],
      },
    });
    assert.equal(policy.canRead, true);
  }],
  ["app-next devices normalize one current device", () => {
    const [device] = appNextLoginDevicesUtils.normalizeAppNextDeviceRecords([
      {
        id: "device_abcdef",
        deviceId: "device_abcdef",
        uid: "user-1",
        workspaceId: null,
        deviceName: "Windows PC",
        deviceType: "desktop",
        browser: "Mozilla/5.0 Chrome/120",
        os: "Win32",
        lastLoginAt: "2026-06-16T10:00:00.000Z",
        lastActiveAt: "2026-06-16T11:00:00.000Z",
      },
    ], {
      uid: "user-1",
      currentDeviceId: "device_abcdef",
    });
    assert.equal(device.maskedId, "...cdef");
    assert.equal(device.isCurrentDevice, true);
    assert.equal(device.browser, "Chrome");
    assert.equal(device.os, "Windows");
  }],
  ["app-next devices normalize one current session id", () => {
    const [device] = appNextLoginDevicesUtils.normalizeAppNextDeviceRecords([
      {
        id: "doc-1",
        sessionId: "session_abcdef",
        uid: "user-1",
        lastActiveAt: "2026-06-16T11:00:00.000Z",
      },
    ], {
      uid: "user-1",
      currentSessionId: "session_abcdef",
    });
    assert.equal(device.isCurrentDevice, true);
    assert.equal(device.currentMatchReason, "exact-id");
  }],
  ["app-next devices ignore stored isCurrentDevice without exact id", () => {
    const devices = appNextLoginDevicesUtils.normalizeAppNextDeviceRecords([
      {
        id: "device-a",
        deviceId: "device-a",
        uid: "user-1",
        isCurrentDevice: true,
        lastActiveAt: "2026-06-16T11:00:00.000Z",
      },
      {
        id: "device-b",
        deviceId: "device-b",
        uid: "user-1",
        isCurrentDevice: true,
        lastActiveAt: "2026-06-16T12:00:00.000Z",
      },
    ], {
      uid: "user-1",
    });
    assert.equal(devices.filter((device) => device.isCurrentDevice).length, 0);
    assert.equal(devices.every((device) => device.currentMatchReason === "no-exact-id"), true);
  }],
  ["app-next devices do not infer current from matching user agent", () => {
    const devices = appNextLoginDevicesUtils.normalizeAppNextDeviceRecords([
      {
        id: "device-a",
        deviceId: "device-a",
        uid: "user-1",
        browser: "Mozilla/5.0 Chrome/120",
        os: "Win32",
      },
      {
        id: "device-b",
        deviceId: "device-b",
        uid: "user-1",
        browser: "Mozilla/5.0 Chrome/120",
        os: "Win32",
      },
    ], {
      uid: "user-1",
      currentDeviceId: "missing-device",
    });
    assert.equal(devices.filter((device) => device.isCurrentDevice).length, 0);
  }],
  ["app-next devices duplicate exact id resolves newest only", () => {
    const devices = appNextLoginDevicesUtils.normalizeAppNextDeviceRecords([
      {
        id: "doc-old",
        deviceId: "same-device",
        uid: "user-1",
        lastActiveAt: "2026-06-16T09:00:00.000Z",
      },
      {
        id: "doc-new",
        deviceId: "same-device",
        uid: "user-1",
        lastActiveAt: "2026-06-16T12:00:00.000Z",
      },
    ], {
      uid: "user-1",
      currentDeviceId: "same-device",
    });
    assert.equal(devices.length, 2);
    assert.equal(devices.filter((device) => device.isCurrentDevice).length, 1);
    assert.equal(devices[0].isCurrentDevice, true);
    assert.equal(devices[0].currentMatchReason, "exact-id");
    assert.equal(devices[1].currentMatchReason, "duplicate-exact-id-resolved");
  }],
  ["app-next devices multiple ids keep at most one current", () => {
    const devices = appNextLoginDevicesUtils.normalizeAppNextDeviceRecords([
      {
        id: "device-a",
        deviceId: "device-a",
        uid: "user-1",
        lastActiveAt: "2026-06-16T12:00:00.000Z",
      },
      {
        id: "device-b",
        deviceId: "device-b",
        uid: "user-1",
        lastActiveAt: "2026-06-16T13:00:00.000Z",
      },
    ], {
      uid: "user-1",
      currentDeviceId: "device-a",
    });
    assert.equal(devices.filter((device) => device.isCurrentDevice).length, 1);
    assert.equal(devices.find((device) => device.maskedId === "...ce-a")?.isCurrentDevice, true);
  }],
  ["app-next devices normalize several devices sorted newest first", () => {
    const devices = appNextLoginDevicesUtils.normalizeAppNextDeviceRecords([
      {
        id: "old-1111",
        uid: "user-1",
        lastActiveAt: "2026-06-16T09:00:00.000Z",
      },
      {
        id: "new-2222",
        uid: "user-1",
        lastActiveAt: "2026-06-16T12:00:00.000Z",
      },
    ], {
      uid: "user-1",
    });
    assert.equal(devices.length, 2);
    assert.equal(devices[0].maskedId, "...2222");
  }],
  ["app-next devices exclude other uid data", () => {
    const devices = appNextLoginDevicesUtils.normalizeAppNextDeviceRecords([
      {
        id: "other-1",
        uid: "other-user",
      },
      {
        id: "self-1",
        uid: "user-1",
      },
    ], {
      uid: "user-1",
    });
    assert.equal(devices.length, 1);
    assert.equal(devices[0].maskedId, "...lf-1");
  }],
  ["app-next devices mask ip and identifiers", () => {
    assert.equal(appNextLoginDevicesUtils.maskAppNextIpAddress("123.45.67.89"), "123.45.xxx.xxx");
    assert.equal(appNextLoginDevicesUtils.maskAppNextDeviceIdentifier("session_abcdef"), "...cdef");
  }],
  ["app-next devices local fallback parses without writes", () => {
    const devices = appNextLoginDevicesUtils.parseAppNextLocalFallbackDevices(JSON.stringify([
      {
        deviceId: "device_local_1234",
        uid: "user-1",
        browser: "Firefox/100",
        os: "Linux",
      },
    ]), {
      uid: "user-1",
    });
    assert.equal(devices.length, 1);
    assert.equal(devices[0].browser, "Firefox");
  }],
  ["app-next devices detects permission denied", () => {
    assert.equal(appNextLoginDevicesUtils.isAppNextDevicePermissionDenied({
      code: "permission-denied",
    }), true);
    assert.equal(appNextLoginDevicesUtils.isAppNextDevicePermissionDenied({
      message: "Missing or insufficient permissions.",
    }), true);
  }],
  ["app-next devices imports only Firestore read APIs", () => {
    const files = [
      "src/app-next/AppNextLoginDevices.tsx",
      "src/app-next/appNextLoginDevicesService.ts",
      "src/app-next/appNextLoginDevicesUtils.ts",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction|onSnapshot)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["app-next devices service queries current uid only", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/appNextLoginDevicesService.ts"), "utf8");
    assert.match(source, /where\("uid", "==", uid\)/);
    assert.equal(source.includes('where("workspaceId"'), false);
  }],
  ["app-next devices has no logout or session deletion buttons", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextLoginDevices.tsx"), "utf8");
    assert.equal(/requestLogout|logoutDevice|deleteDevice|deleteSession|revoke/i.test(source), false);
    assert.equal(/\bsignOut\s*\(/.test(source), false);
  }],
  ["app-next notifications read policy allows active user without workspace", () => {
    const policy = appNextNotificationsUtils.appNextNotificationReadPolicy({
      phase: "authenticated",
      session: {
        uid: "user-1",
        email: "user@example.test",
        displayName: "User",
        emailVerified: true,
        status: "active",
        globalRole: "user",
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
        isSystemOwner: false,
        isAuthenticated: true,
        warnings: [],
      },
    });
    assert.equal(policy.canRead, true);
    assert.equal(policy.queryScope, "uid-only");
  }],
  ["app-next notifications read policy uses workspace filtered display when workspace exists", () => {
    const policy = appNextNotificationsUtils.appNextNotificationReadPolicy({
      phase: "authenticated",
      session: {
        uid: "user-1",
        email: "user@example.test",
        displayName: "User",
        emailVerified: true,
        status: "active",
        globalRole: "user",
        currentWorkspaceId: "workspace-1",
        currentWorkspaceRole: "normal",
        isSystemOwner: false,
        isAuthenticated: true,
        warnings: [],
      },
    });
    assert.equal(policy.canRead, true);
    assert.equal(policy.queryScope, "uid-workspace-filtered");
  }],
  ["app-next notifications read policy blocks signed out and account action", () => {
    assert.equal(appNextNotificationsUtils.appNextNotificationReadPolicy({
      phase: "signed_out",
      session: null,
    }).reason, "signed-out");
    assert.equal(appNextNotificationsUtils.appNextNotificationReadPolicy({
      phase: "account_action_required",
      session: {
        uid: "user-1",
        email: "user@example.test",
        displayName: "User",
        emailVerified: false,
        status: "pending",
        globalRole: "user",
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
        isSystemOwner: false,
        isAuthenticated: true,
        warnings: [],
      },
    }).reason, "account-action-required");
  }],
  ["app-next notifications system owner reads only own notifications", () => {
    const records = appNextNotificationsUtils.normalizeAppNextNotificationRecords([
      {
        id: "owner-1",
        uid: "owner-1",
        title: "Owner",
      },
      {
        id: "other-1",
        uid: "other-user",
        title: "Other",
      },
    ], {
      uid: "owner-1",
    });
    assert.equal(records.length, 1);
    assert.equal(records[0].title, "Owner");
  }],
  ["app-next notifications normalize private and workspace records", () => {
    const records = appNextNotificationsUtils.normalizeAppNextNotificationRecords([
      {
        id: "private-1",
        uid: "user-1",
        title: "Private",
        message: "<b>Hello</b>",
        read: false,
        createdAt: "2026-06-16T10:00:00.000Z",
      },
      {
        id: "workspace-1",
        uid: "user-1",
        workspaceId: "workspace-1",
        title: "Workspace",
        isRead: true,
        createdAt: "2026-06-16T11:00:00.000Z",
      },
    ], {
      uid: "user-1",
      currentWorkspaceId: "workspace-1",
    });
    assert.equal(records.length, 2);
    assert.equal(records[0].title, "Workspace");
    assert.ok(records[0].readLabel);
    assert.equal(records[1].messageSummary, "Hello");
  }],
  ["app-next notifications workspace null excludes workspace records", () => {
    const records = appNextNotificationsUtils.normalizeAppNextNotificationRecords([
      {
        id: "workspace-1",
        uid: "user-1",
        workspaceId: "workspace-1",
        title: "Workspace",
      },
      {
        id: "private-1",
        uid: "user-1",
        workspaceId: null,
        title: "Private",
      },
    ], {
      uid: "user-1",
      currentWorkspaceId: null,
    });
    assert.equal(records.length, 1);
    assert.equal(records[0].title, "Private");
  }],
  ["app-next notifications sort newest first and limit count", () => {
    const records = appNextNotificationsUtils.normalizeAppNextNotificationRecords([
      {
        id: "old-1",
        uid: "user-1",
        title: "Old",
        createdAt: "2026-06-16T09:00:00.000Z",
      },
      {
        id: "new-1",
        uid: "user-1",
        title: "New",
        createdAt: "2026-06-16T12:00:00.000Z",
      },
    ], {
      uid: "user-1",
      maxCount: 1,
    });
    assert.equal(records.length, 1);
    assert.equal(records[0].title, "New");
  }],
  ["app-next notifications local fallback parses without writes", () => {
    const records = appNextNotificationsUtils.parseAppNextLocalFallbackNotifications(JSON.stringify([
      {
        notificationId: "local-1",
        uid: "user-1",
        title: "Local",
      },
    ]), {
      uid: "user-1",
    });
    assert.equal(records.length, 1);
    assert.equal(records[0].title, "Local");
  }],
  ["app-next notifications detects permission and index errors", () => {
    assert.equal(appNextNotificationsUtils.isAppNextNotificationPermissionDenied({
      code: "permission-denied",
    }), true);
    assert.equal(appNextNotificationsUtils.isAppNextNotificationIndexError({
      code: "failed-precondition",
    }), true);
  }],
  ["app-next notifications imports only Firestore read APIs", () => {
    const files = [
      "src/app-next/AppNextNotifications.tsx",
      "src/app-next/appNextNotificationsService.ts",
      "src/app-next/appNextNotificationsUtils.ts",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction|onSnapshot)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["app-next notifications service queries current uid and limits reads", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/appNextNotificationsService.ts"), "utf8");
    assert.match(source, /where\("uid", "==", uid\)/);
    assert.match(source, /limit\(maxCount\)/);
    assert.equal(source.includes("orderBy"), false);
  }],
  ["app-next notifications has no read or delete action buttons", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextNotifications.tsx"), "utf8");
    assert.equal(/markRead|markAsRead|deleteNotification|removeNotification|readAt|updateDoc|deleteDoc/i.test(source), false);
    assert.equal(/\bsignOut\s*\(/.test(source), false);
  }],
  ["app-next workspace notices read policy blocks workspace null", () => {
    const policy = appNextWorkspaceNoticesUtils.appNextWorkspaceNoticeReadPolicy({
      phase: "authenticated",
      session: makeSession({
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
    });
    assert.equal(policy.canRead, false);
    assert.equal(policy.reason, "workspace-missing");
    assert.equal(policy.workspacePresent, false);
  }],
  ["app-next workspace notices read policy allows active workspace member", () => {
    const policy = appNextWorkspaceNoticesUtils.appNextWorkspaceNoticeReadPolicy({
      phase: "authenticated",
      session: makeSession({
        currentWorkspaceId: "workspace-1",
        currentWorkspaceRole: "viewer",
      }),
    });
    assert.equal(policy.canRead, true);
    assert.equal(policy.workspacePresent, true);
    assert.equal(policy.workspaceRole, "viewer");
  }],
  ["app-next workspace notices system owner does not read without workspace", () => {
    const policy = appNextWorkspaceNoticesUtils.appNextWorkspaceNoticeReadPolicy({
      phase: "authenticated",
      session: makeSession({
        globalRole: "system_owner",
        isSystemOwner: true,
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
    });
    assert.equal(policy.canRead, false);
    assert.equal(policy.reason, "workspace-missing");
  }],
  ["app-next workspace notices system owner reads selected workspace only", () => {
    const result = appNextWorkspaceNoticesUtils.normalizeAppNextWorkspaceNoticeRecords([
      {
        id: "notice-1",
        workspaceId: "workspace-1",
        title: "Selected",
      },
      {
        id: "notice-2",
        workspaceId: "workspace-2",
        title: "Other",
      },
    ], {
      workspaceId: "workspace-1",
    });
    const { records } = result;
    assert.equal(records.length, 1);
    assert.equal(records[0].title, "Selected");
    assert.equal(result.excludedReasons["workspace-mismatch"], 1);
  }],
  ["app-next notice create role policy follows active membership Rules", () => {
    for (const role of ["super_manager", "manager", "teacher", "normal"]) {
      const policy = appNextWorkspaceNoticeCrudUtils.appNextWorkspaceNoticeWritePolicy({
        phase: "authenticated",
        session: makeSession({ currentWorkspaceId: "wsA", currentWorkspaceRole: role }),
      });
      assert.equal(policy.canCreate, true, role);
      assert.equal(policy.workspaceId, "wsA");
    }

    for (const role of ["viewer", "print_account"]) {
      const policy = appNextWorkspaceNoticeCrudUtils.appNextWorkspaceNoticeWritePolicy({
        phase: "authenticated",
        session: makeSession({ currentWorkspaceId: "wsA", currentWorkspaceRole: role }),
      });
      assert.equal(policy.canCreate, false, role);
      assert.equal(policy.canManageAll, false, role);
    }
  }],
  ["app-next notice owner and manager can manage all managed notices while authors manage only theirs", () => {
    const policyFor = (role, uid = "writer", isSystemOwner = false) => appNextWorkspaceNoticeCrudUtils.appNextWorkspaceNoticeWritePolicy({
      phase: "authenticated",
      session: makeSession({
        uid,
        currentWorkspaceId: "wsA",
        currentWorkspaceRole: role,
        globalRole: isSystemOwner ? "system_owner" : "user",
        isSystemOwner,
      }),
    });
    for (const role of ["super_manager", "manager"]) {
      assert.equal(appNextWorkspaceNoticeCrudUtils.canManageAppNextWorkspaceNotice(policyFor(role), "another-user"), true);
    }
    const teacher = policyFor("teacher");
    assert.equal(appNextWorkspaceNoticeCrudUtils.canManageAppNextWorkspaceNotice(teacher, "writer"), true);
    assert.equal(appNextWorkspaceNoticeCrudUtils.canManageAppNextWorkspaceNotice(teacher, "another-user"), false);
    assert.equal(appNextWorkspaceNoticeCrudUtils.canManageAppNextWorkspaceNotice(policyFor("normal"), "writer"), true);
    assert.equal(appNextWorkspaceNoticeCrudUtils.canManageAppNextWorkspaceNotice(policyFor("viewer"), "writer"), false);
    assert.equal(appNextWorkspaceNoticeCrudUtils.canManageAppNextWorkspaceNotice(policyFor(null, "owner", true), "another-user"), true);
    assert.equal(policyFor(null, "owner", true).canCreate, true);
  }],
  ["app-next notice writes fail closed for inactive and workspace-less sessions", () => {
    for (const session of [
      makeSession({ status: "pending", currentWorkspaceId: "wsA", currentWorkspaceRole: "manager" }),
      makeSession({ currentWorkspaceId: null, currentWorkspaceRole: "manager" }),
      makeSession({ currentWorkspaceId: "wsA", currentWorkspaceRole: "manager" }),
    ]) {
      const policy = appNextWorkspaceNoticeCrudUtils.appNextWorkspaceNoticeWritePolicy({
        phase: session.status === "pending" ? "account_action_required" : session.currentWorkspaceId ? "error" : "authenticated",
        session,
      });
      assert.equal(policy.canCreate, false);
      assert.equal(policy.canManageAll, false);
    }
  }],
  ["app-next notice draft validation trims and bounds fields", () => {
    assert.equal(appNextWorkspaceNoticeCrudUtils.validateAppNextWorkspaceNoticeDraft({ title: " ", content: "body" }), "제목을 입력해 주세요.");
    assert.equal(appNextWorkspaceNoticeCrudUtils.validateAppNextWorkspaceNoticeDraft({ title: "title", content: " " }), "내용을 입력해 주세요.");
    assert.equal(appNextWorkspaceNoticeCrudUtils.validateAppNextWorkspaceNoticeDraft({ title: "t".repeat(121), content: "body" }), "제목은 120자 이내로 입력해 주세요.");
    assert.equal(appNextWorkspaceNoticeCrudUtils.validateAppNextWorkspaceNoticeDraft({ title: "title", content: "x".repeat(5001) }), "내용은 5,000자 이내로 입력해 주세요.");
    assert.equal(appNextWorkspaceNoticeCrudUtils.validateAppNextWorkspaceNoticeDraft({ title: " title ", content: " body " }), null);
  }],
  ["app-next notice write errors classify injected network and server-confirmation failures", () => {
    const unavailable = Object.assign(new Error("demo Firestore unavailable"), { code: "firestore/unavailable" });
    const unconfirmed = Object.assign(new Error("server response did not match"), { code: "app-next-write-unconfirmed" });

    assert.match(appNextWorkspaceNoticeCrudUtils.appNextWorkspaceNoticeWriteErrorMessage(unavailable, "create"), /네트워크 오류/);
    assert.match(appNextWorkspaceNoticeCrudUtils.appNextWorkspaceNoticeWriteErrorMessage(unconfirmed, "update"), /서버에서 확인하지 못했습니다/);
  }],
  ["app-next workspace notices blocks pending rejected and disabled states", () => {
    for (const status of ["pending", "rejected", "disabled"]) {
      const policy = appNextWorkspaceNoticesUtils.appNextWorkspaceNoticeReadPolicy({
        phase: "account_action_required",
        session: makeSession({
          status,
          currentWorkspaceId: "workspace-1",
          currentWorkspaceRole: "normal",
        }),
      });
      assert.equal(policy.canRead, false);
      assert.equal(policy.reason, status);
    }
  }],
  ["app-next workspace notices normalizes one notice", () => {
    const { records } = appNextWorkspaceNoticesUtils.normalizeAppNextWorkspaceNoticeRecords([
      {
        id: "notice-1",
        workspaceId: "workspace-1",
        title: "怨듭? ?쒕ぉ",
        content: "<b>怨듭? ?댁슜</b>",
        source: "?숆탳",
        priority: "high",
        createdAt: "2026-06-16T10:00:00.000Z",
      },
    ], {
      workspaceId: "workspace-1",
    });
    const [notice] = records;
    assert.ok(notice.title);
    assert.ok(notice.summary);
    assert.ok(notice.detailText);
    assert.ok(notice.categoryLabel);
    assert.ok(notice.priorityLabel);
  }],
  ["app-next workspace notices keeps firestore return order like legacy store", () => {
    const { records, sortFieldUsed } = appNextWorkspaceNoticesUtils.normalizeAppNextWorkspaceNoticeRecords([
      {
        id: "new-normal",
        workspaceId: "workspace-1",
        title: "New",
        createdAt: "2026-06-16T12:00:00.000Z",
      },
      {
        id: "old-pinned",
        workspaceId: "workspace-1",
        title: "Pinned",
        pinned: true,
        createdAt: "2026-06-16T09:00:00.000Z",
      },
    ], {
      workspaceId: "workspace-1",
    });
    assert.equal(records[0].title, "Pinned");
    assert.equal(records[1].title, "New");
    assert.equal(sortFieldUsed, "legacy-workspace-notice-order");
  }],
  ["app-next workspace notices classifies mixed schemas", () => {
    const result = appNextWorkspaceNoticesUtils.normalizeAppNextWorkspaceNoticeRecords([
      {
        id: "modern",
        workspaceId: "workspace-1",
        title: "Modern",
        content: "Modern body",
        createdFrom: "system_admin",
        scope: "workspace",
        status: "active",
        pinned: false,
        authorRole: "system_owner",
        priority: "normal",
      },
      {
        id: "school",
        workspaceId: "workspace-1",
        noticeDate: "2026-06-19",
        title: "School",
        visibility: "public",
        importance: "high",
        deadline: "2026-06-30",
        memo: "School memo",
        content: "School content",
        source: "school",
        subject: "subject",
      },
      {
        id: "academy",
        workspaceId: "workspace-1",
        notice_date: "2026-06-18",
        title: "Academy",
        importance: "normal",
        source: "academy",
        content: "Academy content",
      },
      {
        id: "system",
        workspaceId: "workspace-1",
        title: "System",
        source: "system",
        content: "System content",
      },
      {
        id: "unknown",
        workspaceId: "workspace-1",
        title: "Unknown",
      },
    ], {
      workspaceId: "workspace-1",
    });

    assert.equal(result.schemaKindCounts.modern_workspace_notice, 1);
    assert.equal(result.schemaKindCounts.legacy_school_notice, 1);
    assert.equal(result.schemaKindCounts.legacy_academy_notice, 1);
    assert.equal(result.schemaKindCounts.system_notice_reference, 1);
    assert.equal(result.schemaKindCounts.unknown_notice_schema, 1);
    assert.equal(result.unknownSchemaCount, 1);

    const byId = Object.fromEntries(result.records.map((record) => [record.noticeKey, record]));
    assert.equal(byId.modern.schemaKind, "modern_workspace_notice");
    assert.ok(byId.modern.categoryLabel);
    assert.equal(byId.school.schemaKind, "legacy_school_notice");
    assert.ok(byId.school.categoryLabel);
    assert.equal(byId.school.summary, "School content");
    assert.equal(byId.school.detailText, "School content");
    assert.ok(byId.school.priorityLabel);
    assert.equal(byId.school.publishedAt, "2026-06-19");
    assert.equal(byId.academy.schemaKind, "legacy_academy_notice");
    assert.equal(byId.system.schemaKind, "system_notice_reference");
    assert.equal(byId.unknown.schemaKind, "unknown_notice_schema");
    assert.equal(result.schemaSequence.length, 5);
    assert.equal(
      JSON.stringify(result.schemaSequence.map((item) => item.schemaKind).sort()),
      JSON.stringify([
        "legacy_academy_notice",
        "legacy_school_notice",
        "modern_workspace_notice",
        "system_notice_reference",
        "unknown_notice_schema",
      ]),
    );
    assert.equal("noticeKey" in result.schemaSequence[0], false);
    assert.equal("title" in result.schemaSequence[0], false);
  }],
  ["app-next workspace notices masks unsafe author identifiers", () => {
    const { records } = appNextWorkspaceNoticesUtils.normalizeAppNextWorkspaceNoticeRecords([
      {
        id: "name-author",
        workspaceId: "workspace-1",
        title: "Name author",
        authorName: "源誘쇱?",
      },
      {
        id: "email-author",
        workspaceId: "workspace-1",
        title: "Email author",
        author: "person@example.com",
      },
      {
        id: "uid-author",
        workspaceId: "workspace-1",
        title: "UID author",
        created_by: "abcdefghijklmnopqrstuvwx",
      },
    ], {
      workspaceId: "workspace-1",
    });
    const byId = Object.fromEntries(records.map((record) => [record.noticeKey, record]));
    assert.ok(byId["name-author"].authorLabel);
    assert.equal(byId["email-author"].authorLabel, null);
    assert.equal(byId["uid-author"].authorLabel, null);
  }],
  ["app-next workspace notices filters hidden expired and wrong workspace", () => {
    const result = appNextWorkspaceNoticesUtils.normalizeAppNextWorkspaceNoticeRecords([
      {
        id: "visible",
        workspaceId: "workspace-1",
        title: "Visible",
        expiresAt: "2999-01-01T00:00:00.000Z",
      },
      {
        id: "archived",
        workspaceId: "workspace-1",
        title: "Archived",
        status: "archived",
      },
      {
        id: "expired",
        workspaceId: "workspace-1",
        title: "Expired",
        expiresAt: "2000-01-01T00:00:00.000Z",
      },
      {
        id: "other",
        workspaceId: "workspace-2",
        title: "Other",
      },
    ], {
      workspaceId: "workspace-1",
    });
    const { records } = result;
    assert.equal(records.length, 1);
    assert.equal(records[0].title, "Visible");
    assert.equal(result.excludedReasons["status-archived"], 1);
    assert.equal(result.excludedReasons.expired, 1);
    assert.equal(result.excludedReasons["workspace-mismatch"], 1);
  }],
  ["app-next workspace notices follows legacy filter for visible false and inactive", () => {
    const { records } = appNextWorkspaceNoticesUtils.normalizeAppNextWorkspaceNoticeRecords([
      {
        id: "visible-false",
        workspaceId: "workspace-1",
        title: "Visible False",
        visible: false,
      },
      {
        id: "inactive",
        workspaceId: "workspace-1",
        title: "Inactive",
        status: "inactive",
      },
    ], {
      workspaceId: "workspace-1",
    });
    assert.equal(records.length, 2);
    assert.equal(records[0].title, "Visible False");
    assert.equal(records[1].title, "Inactive");
  }],
  ["app-next workspace notices maps legacy content and author fields", () => {
    const { records, authorFieldUsed, contentFieldUsed } = appNextWorkspaceNoticesUtils.normalizeAppNextWorkspaceNoticeRecords([
      {
        id: "memo-only",
        workspaceId: "workspace-1",
        title: "Memo",
        memo: "硫붾え ?댁슜",
        createdByName: "源誘쇱?",
      },
      {
        id: "uid-only",
        workspaceId: "workspace-1",
        title: "UID",
        message: "硫붿떆吏 ?댁슜",
        author: "abcdefghijklmnopqrstuvwx",
      },
    ], {
      workspaceId: "workspace-1",
    });
    assert.ok(records[0].summary);
    assert.ok(records[0].authorLabel);
    assert.ok(records[1].summary);
    assert.equal(records[1].authorLabel, null);
    assert.match(authorFieldUsed, /createdByName/);
    assert.match(contentFieldUsed, /memo/);
  }],
  ["app-next workspace notices detects safe error categories", () => {
    assert.equal(appNextWorkspaceNoticesUtils.isAppNextWorkspaceNoticePermissionDenied({
      code: "permission-denied",
    }), true);
    assert.equal(appNextWorkspaceNoticesUtils.isAppNextWorkspaceNoticeQuotaExceeded({
      code: "resource-exhausted",
    }), true);
    assert.equal(appNextWorkspaceNoticesUtils.isAppNextWorkspaceNoticeIndexError({
      code: "failed-precondition",
    }), true);
    assert.equal(appNextWorkspaceNoticesUtils.isAppNextWorkspaceNoticeNetworkError({
      code: "unavailable",
    }), true);
  }],
  ["app-next workspace notices imports only Firestore one-time read APIs", () => {
    const files = [
      "src/app-next/AppNextWorkspaceNotices.tsx",
      "src/app-next/appNextWorkspaceNoticesService.ts",
      "src/app-next/appNextWorkspaceNoticesUtils.ts",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction|onSnapshot)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["app-next workspace notices service queries current workspace without server sort or limit", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/appNextWorkspaceNoticesService.ts"), "utf8");
    assert.match(source, /collection\(getFirebaseDb\(\), collections\.workspaces, workspaceId, "notices"\)/);
    assert.match(source, /getDocsFromServer/);
    assert.match(source, /requestMode === "server"/);
    assert.match(source, /requestMode === "clear-memory-and-server"/);
    assert.match(source, /snapshot\.metadata\.fromCache/);
    assert.match(source, /snapshot\.metadata\.hasPendingWrites/);
    assert.equal(source.includes("limit("), false);
    assert.equal(source.includes("orderBy"), false);
    assert.equal(source.includes("where("), false);
  }],
  ["app-next notice CRUD service scopes paths and verifies server state after each write", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/appNextWorkspaceNoticeCrudService.ts"), "utf8");
    assert.match(source, /collection\(getFirebaseDb\(\), "workspaces", input\.workspaceId, "notices"\)/);
    assert.match(source, /appNextManaged: true/);
    assert.match(source, /getDocFromServer\(ref\)/);
    assert.match(source, /await updateDoc\(ref/);
    assert.match(source, /await deleteDoc\(ref\)/);
    assert.match(source, /assertConfirmedNotice/);
    assert.equal(source.includes("writeBatch"), false);
    assert.equal(source.includes("runTransaction"), false);
  }],
  ["app-next workspace notices has no read receipt or sign out actions", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextWorkspaceNotices.tsx"), "utf8");
    assert.equal(/markRead|markAsRead|readAt|lastViewedAt|viewCount|updateDoc|deleteDoc/i.test(source), false);
    assert.equal(/\bsignOut\s*\(/.test(source), false);
  }],
  ["app-next workspace notices detail button uses document id state and no form submit", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextWorkspaceNotices.tsx"), "utf8");
    assert.match(source, /expandedNoticeKey === notice\.noticeKey/);
    assert.match(source, /key=\{notice\.noticeKey\}/);
    assert.match(source, /type="button"/);
    assert.ok(source);
  }],
  ["app-next workspace notices exposes read-only deletion investigation diagnostics", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextWorkspaceNotices.tsx"), "utf8");
    assert.match(source, /loadWorkspaceNotices\("server"\)/);
    assert.match(source, /loadWorkspaceNotices\("clear-memory-and-server"\)/);
    assert.match(source, /resetNoticeState\(\)/);
    assert.match(source, /lastRequestedReadMode/);
    assert.match(source, /lastCompletedReadMode/);
    assert.match(source, /lastReadStartedAt/);
    assert.match(source, /lastReadCompletedAt/);
    assert.match(source, /fromCache/);
    assert.match(source, /pendingWrites/);
    assert.match(source, /server-failed/);
    assert.match(source, /currentWorkspaceFingerprint/);
    assert.match(source, /schema\/source sequence/);
    assert.match(source, /noticeReadCount/);
    assert.match(source, /noticeCreateCount/);
    assert.match(source, /noticeDeleteCount/);
    assert.match(source, /lastNoticeWriteReason/);
  }],
  ["app-next workspace notices exposes workspace resolution diagnostics", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextWorkspaceNotices.tsx"), "utf8");
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    assert.match(source, /workspaceResolutionDiagnostics/);
    assert.match(source, /serverCurrentWorkspacePresent/);
    assert.match(source, /serverCurrentWorkspaceDocumentExists/);
    assert.match(source, /canonicalMembershipExists/);
    assert.match(source, /canonicalMembershipStatus/);
    assert.match(source, /canonicalMembershipRole/);
    assert.match(source, /legacyMembershipExists/);
    assert.match(source, /legacyMembershipStatus/);
    assert.match(source, /legacyMembershipRole/);
    assert.match(source, /isSystemOwnerResolved/);
    assert.match(source, /systemOwnerWorkspaceAccessAllowed/);
    assert.match(source, /workspaceResolutionFailureKind/);
    assert.match(diagnosticsSource, /server-workspace-rejected/);
    assert.match(diagnosticsSource, /workspace-document-missing/);
    assert.match(diagnosticsSource, /membership-inaccessible/);
    assert.match(diagnosticsSource, /system-owner-validation-error/);
  }],
  ["app-next timetable route is a RequireAuth read-only consumer", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    const routeSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextRouteUtils.ts"), "utf8");
    const dashboardSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextDashboardReadOnly.tsx"), "utf8");
    assert.match(appSource, /AppNextTimetableReadOnly/);
    assert.match(appSource, /activeTab === "timetable-readonly"/);
    assert.match(appSource, /<RequireAuth[\s\S]*?<AppNextTimetableReadOnly/);
    assert.match(routeSource, /"timetable-readonly"/);
    assert.match(dashboardSource, /onNavigate\("timetable-readonly"\)/);
  }],
  ["app-next timetable read policy allows route but blocks data without workspace", () => {
    const policy = appNextTimetableReadonlyUtils.appNextTimetableReadPolicy({
      phase: "authenticated",
      session: makeSession({
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
    });
    assert.equal(policy.routeAllowed, true);
    assert.equal(policy.canRead, false);
    assert.equal(policy.reason, "workspace-missing");
    assert.equal(policy.hasWorkspace, false);
  }],
  ["app-next timetable read policy allows active workspace users only", () => {
    const active = appNextTimetableReadonlyUtils.appNextTimetableReadPolicy({
      phase: "authenticated",
      session: makeSession({
        currentWorkspaceId: "workspace-1",
        currentWorkspaceRole: "viewer",
      }),
    });
    assert.equal(active.routeAllowed, true);
    assert.equal(active.canRead, true);
    assert.equal(active.workspaceRoleCategory, "viewer");

    for (const status of ["pending", "rejected", "disabled"]) {
      const inactive = appNextTimetableReadonlyUtils.appNextTimetableReadPolicy({
        phase: "account_action_required",
        session: makeSession({
          status,
          currentWorkspaceId: "workspace-1",
          currentWorkspaceRole: "normal",
        }),
      });
      assert.equal(inactive.routeAllowed, false);
      assert.equal(inactive.canRead, false);
      assert.equal(inactive.reason, status);
    }
  }],
  ["app-next timetable preserves system owner as global role", () => {
    const policy = appNextTimetableReadonlyUtils.appNextTimetableReadPolicy({
      phase: "authenticated",
      session: makeSession({
        globalRole: "system_owner",
        isSystemOwner: true,
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
    });
    assert.equal(policy.globalRoleCategory, "system_owner");
    assert.equal(policy.workspaceRoleCategory, "none");
    assert.equal(policy.routeAllowed, true);
    assert.equal(policy.canRead, false);
  }],
  ["app-next timetable normalizes rows with duplicates and orphan exclusion", () => {
    const normalized = appNextTimetableReadonlyUtils.normalizeAppNextTimetableStore({
      timetableSets: [
        {
          id: "regular-set",
          name: "정규 시간표",
          kind: "regular",
          visiblePeriodCount: 2,
        },
        {
          id: "after-set",
          name: "방과후 시간표",
          kind: "afterschool",
        },
      ],
      periodTimes: [
        {
          id: "common-1",
          period: "1교시",
          startTime: "08:40",
          endTime: "09:25",
        },
        {
          id: "set-1",
          setId: "regular-set",
          period: "1교시",
          startTime: "09:00",
          endTime: "09:50",
        },
        {
          id: "common-2",
          period: "2교시",
          startTime: "10:00",
          endTime: "10:50",
        },
      ],
      timetable: [
        {
          id: "row-2",
          setId: "regular-set",
          day: "월요일",
          period: "2교시",
          subject: "수학",
        },
        {
          id: "row-1",
          setId: "regular-set",
          day: "월",
          period: "1교시",
          subject: "국어",
          teacher: "김선생",
          room: "101",
        },
        {
          id: "row-dup",
          setId: "regular-set",
          day: "월",
          period: "01교시",
          subject: "사회",
        },
        {
          id: "after-row",
          setId: "after-set",
          day: "화",
          period: "1교시",
          subject: "방과후",
        },
        {
          id: "orphan-row",
          setId: "deleted-set",
          day: "월",
          period: "1교시",
          subject: "삭제된 시간표",
        },
      ],
    }, {
      requestedSetId: "regular-set",
      now: new Date("2026-07-20T00:00:00+09:00"),
    });

    assert.equal(normalized.activeSetId, "regular-set");
    assert.equal(normalized.regularCells.length, 3);
    assert.equal(normalized.afterschoolCells.length, 1);
    assert.equal(normalized.orphanRowsExcluded, 1);
    assert.equal(normalized.periods[0].time, "09:00-09:50");
    assert.equal(normalized.periods[1].time, "10:00-10:50");
    assert.equal(normalized.duplicateGroups.length, 1);
    assert.equal(normalized.duplicateCellItemCount, 2);
    assert.equal(normalized.todayWeekday, "월");
    assert.equal(normalized.todayCells.length, 3);
  }],
  ["app-next timetable defaults weekly table to regular set before afterschool set", () => {
    const normalized = appNextTimetableReadonlyUtils.normalizeAppNextTimetableStore({
      timetableSets: [
        {
          id: "after-set",
          name: "방과후 시간표",
          type: "방과후",
        },
        {
          id: "school",
          name: "학교수업 시간표",
          type: "학교수업",
        },
      ],
      timetable: [
        {
          id: "after-row",
          setId: "after-set",
          day: "월",
          period: "1교시",
          subject: "방과후",
        },
        {
          id: "school-row",
          setId: "school",
          day: "월",
          period: "1교시",
          subject: "국어",
          teacher: "김선생",
          room: "101",
        },
      ],
      periodTimes: [],
    });
    assert.equal(normalized.activeSetId, "school");
    assert.equal(normalized.regularCells.length, 1);
    assert.equal(normalized.regularCells[0].subject, "국어");
    assert.equal(normalized.afterschoolCells.length, 1);
  }],
  ["app-next timetable supports operational school rows without explicit set id", () => {
    const normalized = appNextTimetableReadonlyUtils.normalizeAppNextTimetableStore({
      timetableSets: [
        {
          id: "school",
          name: "학교수업",
          type: "학교수업",
        },
      ],
      timetable: [
        {
          id: "legacy-school-row",
          day: "화",
          period: "3교시",
          subject: "과학",
          teacher: "이선생",
          room: "과학실",
        },
      ],
      periodTimes: [
        {
          period: "3교시",
          time: "10:40-11:25",
        },
      ],
    });
    assert.equal(normalized.activeSetId, "school");
    assert.equal(normalized.missingSetRowsIncluded, 1);
    assert.equal(normalized.orphanRowsExcluded, 0);
    assert.equal(normalized.regularCells.length, 1);
    assert.equal(normalized.regularCells[0].day, "화");
    assert.equal(normalized.regularCells[0].period, "3교시");
    assert.equal(normalized.regularCells[0].subject, "과학");
    assert.equal(normalized.regularCells[0].teacher, "이선생");
    assert.equal(normalized.regularCells[0].room, "과학실");
    assert.equal(normalized.afterschoolCells.length, 0);
  }],
  ["app-next timetable invalid selection does not mutate fallback set", () => {
    const normalized = appNextTimetableReadonlyUtils.normalizeAppNextTimetableStore({
      timetableSets: [
        {
          id: "set-a",
          name: "A 시간표",
        },
      ],
      timetable: [
        {
          id: "row-a",
          setId: "set-a",
          day: "월",
          period: "1교시",
          subject: "국어",
        },
      ],
      periodTimes: [],
    }, {
      requestedSetId: "deleted-set",
    });
    assert.equal(normalized.activeSetId, "");
    assert.equal(normalized.activeSetMissing, true);
    assert.equal(normalized.regularCells.length, 0);
  }],
  ["app-next timetable row without set id is excluded unless school compatibility applies", () => {
    const normalized = appNextTimetableReadonlyUtils.normalizeAppNextTimetableStore({
      timetableSets: [
        {
          id: "set-a",
          name: "A 시간표",
        },
      ],
      timetable: [
        {
          id: "legacy-row",
          day: "월",
          period: "1교시",
          subject: "레거시",
        },
      ],
      periodTimes: [],
    }, {
      requestedSetId: "set-a",
    });
    assert.equal(normalized.orphanRowsExcluded, 1);
    assert.equal(normalized.regularCells.length, 0);
  }],
  ["app-next timetable service is one-time read-only and canonical workspace scoped", () => {
    const serviceSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextTimetableReadonlyService.ts"), "utf8");
    const componentSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextTimetableReadOnly.tsx"), "utf8");
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction|onSnapshot|getDocsFromServer)\b/;
    assert.match(serviceSource, /collection\(getFirebaseDb\(\), collections\.workspaces, workspaceId, key\)/);
    assert.match(serviceSource, /getDocs\(/);
    assert.match(serviceSource, /"timetable"/);
    assert.match(serviceSource, /"timetableSets"/);
    assert.match(serviceSource, /"periodTimes"/);
    assert.match(componentSource, /sessionStorage\.getItem\("pm-timetable-set"\)/);
    assert.match(componentSource, /requestedSetId/);
    assert.equal(forbidden.test(serviceSource), false);
    assert.equal(forbidden.test(componentSource), false);
    assert.equal(/\bsignOut\s*\(/.test(componentSource), false);
  }],
  ["app-next timetable diagnostics are privacy-safe zero-write counters", () => {
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    const componentSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextTimetableReadOnly.tsx"), "utf8");
    assert.match(diagnosticsSource, /AppNextTimetableDiagnosticsSnapshot/);
    assert.match(diagnosticsSource, /PMAppNextTimetableDiagnostics/);
    assert.match(diagnosticsSource, /recordAppNextTimetableDiagnostics/);
    assert.match(componentSource, /timetableWriteAttemptCount:\s*0/);
    assert.match(componentSource, /timetableListenerStartCount:\s*0/);
    assert.match(componentSource, /timetableActiveListenerCount:\s*0/);
    const interfaceBlock = diagnosticsSource.match(/AppNextTimetableDiagnosticsSnapshot[\s\S]*?}\n/)?.[0] || "";
    assert.equal(/\b(uid|email|workspaceId|documentId|path|token)\b/i.test(interfaceBlock), false);
  }],
  ["app-next timetable in-flight reuse is not reported as duplicate loader execution", () => {
    const componentSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextTimetableReadOnly.tsx"), "utf8");
    const inFlightReuseBlock = componentSource.match(/if \(\(existingRequest \|\| inFlightRef\.current\)[\s\S]*?return;\n    }/)?.[0] || "";
    assert.match(inFlightReuseBlock, /existingRequest/);
    assert.equal(/setDuplicateLoadDetected\(true\)/.test(inFlightReuseBlock), false);
    assert.equal(/duplicateLoadDetected:\s*true/.test(inFlightReuseBlock), false);
    assert.match(componentSource, /timetableLoadCount \+= 1/);
    assert.match(componentSource, /timetableReadCount \+= 3/);
  }],
  ["app-next timetable route matrix is workspace-null safe", () => {
    const result = appNextRouteUtils.resolveAppNextRoute({
      hash: "#/timetable-readonly",
      state: "active",
    });
    assert.equal(result.currentRoute, "timetable-readonly");
    assert.equal(result.isProtectedRoute, true);

    const matrix = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
      requestedRoute: "timetable-readonly",
      currentRoute: "timetable-readonly",
      state: "active",
      session: makeSession({
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
      requireAuthEnabled: true,
      protectedRouteEnabled: true,
      requireWorkspaceRoleEnabled: true,
    });
    assert.equal(matrix.finalDecision, "ALLOW_ROUTE_WITH_DATA_BLOCKED");
    assert.equal(matrix.directUrlAllowed, true);
    assert.equal(matrix.workspaceRequired, true);
  }],
  ["app-next timetable does not modify operational static app files", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const htmlSource = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    assert.equal(appSource.includes("AppNextTimetableReadOnly"), false);
    assert.equal(appSource.includes("#/timetable-readonly"), false);
    assert.equal(htmlSource.includes("AppNextTimetableReadOnly"), false);
  }],
  ["app-next schedules route is a RequireAuth read-only consumer", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    const routeSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextRouteUtils.ts"), "utf8");
    const dashboardSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextDashboardReadOnly.tsx"), "utf8");
    assert.match(appSource, /AppNextSchedulesReadOnly/);
    assert.match(appSource, /activeTab === "schedules-readonly"/);
    assert.match(appSource, /<RequireAuth[\s\S]*?<AppNextSchedulesReadOnly/);
    assert.match(routeSource, /"schedules-readonly"/);
    assert.match(dashboardSource, /onNavigate\("schedules-readonly"\)/);
  }],
  ["app-next schedules read policy allows route but blocks data without workspace", () => {
    const policy = appNextSchedulesReadonlyUtils.appNextScheduleReadPolicy({
      phase: "authenticated",
      session: makeSession({
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
    });
    assert.equal(policy.routeAllowed, true);
    assert.equal(policy.canRead, false);
    assert.equal(policy.reason, "workspace-missing");
    assert.equal(policy.hasWorkspace, false);
  }],
  ["app-next schedules preserves system owner as global role", () => {
    const policy = appNextSchedulesReadonlyUtils.appNextScheduleReadPolicy({
      phase: "authenticated",
      session: makeSession({
        globalRole: "system_owner",
        isSystemOwner: true,
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
    });
    assert.equal(policy.globalRoleCategory, "system_owner");
    assert.equal(policy.workspaceRoleCategory, "none");
    assert.equal(policy.routeAllowed, true);
    assert.equal(policy.canRead, false);
  }],
  ["app-next schedules normalizes operational fields into today upcoming past completed buckets", () => {
    const normalized = appNextSchedulesReadonlyUtils.normalizeAppNextSchedulesStore({
      schedules: [
        {
          id: "today-1",
          title: "오늘 수업",
          date: "2026-07-23",
          start_time: "09:00",
          end_time: "10:00",
          type: "수업",
          importance: "높음",
          status: "예정",
        },
        {
          id: "future-1",
          title: "다음 시험",
          date: "2026-07-24",
          type: "시험",
          status: "예정",
        },
        {
          id: "done-1",
          title: "완료 과제",
          date: "2026-07-20",
          status: "완료",
        },
        {
          id: "past-1",
          title: "지난 일정",
          date: "2026-07-21",
          status: "예정",
        },
        {
          id: "hidden-1",
          title: "삭제 일정",
          date: "2026-07-23",
          deleted: true,
        },
        {
          id: "invalid-1",
          title: "날짜 오류",
          date: "not-a-date",
        },
      ],
    }, {
      now: new Date("2026-07-23T08:00:00+09:00"),
    });
    assert.equal(normalized.records.length, 6);
    assert.equal(normalized.visibleRecords.length, 5);
    assert.equal(normalized.todayRecords.length, 1);
    assert.equal(normalized.upcomingRecords.length, 1);
    assert.equal(normalized.completedRecords.length, 1);
    assert.equal(normalized.pastRecords.length, 1);
    assert.equal(normalized.hiddenRecords.length, 1);
    assert.equal(normalized.invalidRecords.length, 1);
    assert.equal(normalized.allDayRecords.length, 4);
    assert.equal(normalized.timedRecords.length, 1);
    assert.equal(normalized.todayRecords[0].timeLabel, "09:00~10:00");
  }],
  ["app-next schedules filters are client-side and preserve normalized records", () => {
    const normalized = appNextSchedulesReadonlyUtils.normalizeAppNextSchedulesStore({
      schedules: [
        { title: "A", date: "2026-07-23", type: "학교", importance: "높음" },
        { title: "B", date: "2026-07-24", type: "학원", importance: "보통" },
        { title: "C", date: "2026-07-25", type: "학교", importance: "낮음" },
      ],
    }, {
      now: new Date("2026-07-23T00:00:00+09:00"),
    });
    const filtered = appNextSchedulesReadonlyUtils.applyAppNextScheduleFilters(normalized, {
      bucket: "upcoming",
      type: "학교",
      importance: "",
      fromDate: "2026-07-24",
      toDate: "2026-07-26",
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].title, "C");
    assert.equal(normalized.visibleRecords.length, 3);
    assert.ok(normalized.typeOptions.includes("학교"));
    assert.ok(normalized.typeOptions.includes("시험"));
    assert.ok(normalized.typeOptions.includes("학원"));
    assert.ok(normalized.importanceOptions.includes("높음"));
    assert.ok(normalized.importanceOptions.includes("보통"));
    assert.ok(normalized.importanceOptions.includes("낮음"));
    assert.equal(appNextSchedulesReadonlyUtils.appNextScheduleFilterSignature({
      bucket: "upcoming",
      type: "학교",
      importance: "",
      fromDate: "2026-07-24",
      toDate: "2026-07-26",
    }), "upcoming|학교|all-importance|2026-07-24|2026-07-26");
  }],
  ["app-next schedules service is one-time read-only and workspace scoped", () => {
    const serviceSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextSchedulesReadonlyService.ts"), "utf8");
    const componentSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextSchedulesReadOnly.tsx"), "utf8");
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction|onSnapshot)\b/;
    assert.match(serviceSource, /collection\(getFirebaseDb\(\), collections\.workspaces, workspaceId, "schedules"\)/);
    assert.match(serviceSource, /getDocs\(/);
    assert.match(serviceSource, /getDocsFromServer\(/);
    assert.match(serviceSource, /readMode\??:\s*"default"\s*\|\s*"server"/);
    assert.equal(forbidden.test(serviceSource), false);
    assert.equal(forbidden.test(componentSource), false);
    assert.equal(/\bsignOut\s*\(/.test(componentSource), false);
    assert.match(componentSource, /scheduleReadCount \+= 1/);
  }],
  ["app-next schedules diagnostics preserve write counts and remain listener-free", () => {
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    const componentSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextSchedulesReadOnly.tsx"), "utf8");
    assert.match(diagnosticsSource, /AppNextSchedulesDiagnosticsSnapshot/);
    assert.match(diagnosticsSource, /PMAppNextSchedulesDiagnostics/);
    assert.match(diagnosticsSource, /recordAppNextSchedulesDiagnostics/);
    assert.match(componentSource, /scheduleWriteAttemptCount: getAppNextSchedulesDiagnostics\(\).scheduleWriteAttemptCount/);
    assert.match(componentSource, /scheduleListenerStartCount:\s*0/);
    assert.match(componentSource, /scheduleActiveListenerCount:\s*0/);
    assert.match(diagnosticsSource, /detailPanelOpen/);
    assert.match(diagnosticsSource, /selectedSchedulePresent/);
    assert.match(diagnosticsSource, /manualRefreshCount/);
    assert.match(diagnosticsSource, /cacheInvalidationCount/);
    assert.match(diagnosticsSource, /forceReloadCount/);
    assert.match(diagnosticsSource, /selectedScheduleMatchCount/);
    assert.match(diagnosticsSource, /detailSelectionMismatchDetected/);
    assert.match(diagnosticsSource, /scheduleRawReadCount/);
    assert.match(diagnosticsSource, /lastScheduleReadMode/);
    assert.match(diagnosticsSource, /lastScheduleSourceCollection/);
    assert.match(diagnosticsSource, /lastScheduleFromCache/);
    assert.match(diagnosticsSource, /lastSchedulePendingWrites/);
    assert.match(diagnosticsSource, /filterStatusOptionCount/);
    assert.match(diagnosticsSource, /filterTypeOptionCount/);
    assert.match(diagnosticsSource, /filterImportanceOptionCount/);
    const interfaceBlock = diagnosticsSource.match(/AppNextSchedulesDiagnosticsSnapshot[\s\S]*?}\n/)?.[0] || "";
    assert.equal(/\b(uid|email|workspaceId|documentId|path|token)\b/i.test(interfaceBlock), false);
  }],
  ["app-next schedules in-flight reuse is not reported as duplicate loader execution", () => {
    const componentSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextSchedulesReadOnly.tsx"), "utf8");
    assert.match(componentSource, /const existingRequest = schedulesInFlight\.get\(cacheKey\)/);
    assert.match(componentSource, /if \(existingRequest \|\| inFlightRef\.current\)/);
    assert.match(componentSource, /duplicateLoadDetected:\s*false/);
    assert.equal(/setDuplicateLoadDetected\(true\)/.test(componentSource), false);
    assert.match(componentSource, /scheduleLoadCount \+= 1/);
    assert.match(componentSource, /scheduleReadCount \+= 1/);
  }],
  ["app-next schedules manual refresh invalidates cache and uses server read without listener", () => {
    const componentSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextSchedulesReadOnly.tsx"), "utf8");
    assert.match(componentSource, /manualRefreshCount \+= 1/);
    assert.match(componentSource, /cacheInvalidationCount \+= schedulesCache\.has\(cacheKey\) \? 1 : 0/);
    assert.match(componentSource, /forceReloadCount \+= 1/);
    assert.match(componentSource, /schedulesCache\.delete\(cacheKey\)/);
    assert.match(componentSource, /readMode: forceRefresh \? "server" : "default"/);
    assert.equal(/\bonSnapshot\s*\(/.test(componentSource), false);
  }],
  ["app-next schedules detail view is opened inline without exposing ids", () => {
    const componentSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextSchedulesReadOnly.tsx"), "utf8");
    assert.match(componentSource, /selectedSchedule/);
    assert.match(componentSource, /detailPanelOpen: Boolean\(selectedSchedule\)/);
    assert.match(componentSource, /selectedSchedulePresent: Boolean\(selectedSchedule\)/);
    assert.match(componentSource, /selectedScheduleMatchCount/);
    assert.match(componentSource, /detailSelectionMismatchDetected/);
    assert.match(componentSource, /className="app-next-schedule-detail inline"/);
    assert.match(componentSource, /event\.preventDefault\(\)/);
    assert.match(componentSource, /event\.stopPropagation\(\)/);
    assert.match(componentSource, /data-schedule-card=\{cardKey\}/);
    assert.equal(/href="#"/.test(componentSource), false);
    assert.equal(/scrollIntoView/.test(componentSource), false);
    assert.equal(/window\.location\.hash/.test(componentSource), false);
    assert.equal(/<section className="app-next-panel app-next-schedule-detail">/.test(componentSource), false);
    assert.equal(/selectedSchedule\.(id|documentId|workspaceId|uid)/.test(componentSource), false);
  }],
  ["app-next schedules stable detail selection survives duplicate titles and filtering", () => {
    const normalized = appNextSchedulesReadonlyUtils.normalizeAppNextSchedulesStore({
      schedules: [
        {
          id: "doc-secret-a",
          title: "같은 제목",
          date: "2026-07-23",
          start_time: "09:00",
          type: "학교",
        },
        {
          id: "doc-secret-b",
          title: "같은 제목",
          date: "2026-07-23",
          start_time: "10:00",
          type: "학교",
        },
        {
          title: "같은 제목",
          date: "2026-07-24",
          start_time: "09:00",
          type: "학원",
        },
      ],
    }, {
      now: new Date("2026-07-23T00:00:00+09:00"),
    });
    assert.equal(new Set(normalized.visibleRecords.map((row) => row.stableKey)).size, 3);
    assert.equal(normalized.visibleRecords.some((row) => row.stableKey.includes("doc-secret")), false);
    const schoolRows = appNextSchedulesReadonlyUtils.applyAppNextScheduleFilters(normalized, {
      ...appNextSchedulesReadonlyUtils.APP_NEXT_EMPTY_SCHEDULE_FILTER,
      type: "학교",
    });
    assert.equal(schoolRows.length, 2);
    assert.equal(schoolRows.every((row) => row.title === "같은 제목"), true);
  }],
  ["app-next schedules operational fixture remains visible after server refresh normalization", () => {
    const normalized = appNextSchedulesReadonlyUtils.normalizeAppNextSchedulesStore({
      schedules: [
        {
          id: 123,
          title: "운영 새 일정",
          date: "2026-07-23",
          start_time: "18:30",
          end_time: "19:30",
          type: "기타",
          importance: "보통",
          status: "예정",
          memo: "운영 화면 saveEditor fixture",
          created_by: "masked@example.com",
        },
      ],
    }, {
      now: new Date("2026-07-23T00:00:00+09:00"),
    });
    assert.equal(normalized.records.length, 1);
    assert.equal(normalized.visibleRecords.length, 1);
    assert.equal(normalized.hiddenRecords.length, 0);
    assert.equal(normalized.invalidRecords.length, 0);
    assert.equal(normalized.todayRecords.length, 1);
  }],
  ["operational collection editor only creates confirm password fields through an explicit allowlist", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    assert.match(appSource, /CONFIRM_PASSWORD_REQUIRED_COLLECTIONS_V122 = new Set\(\[\]\)/);
    assert.match(appSource, /shouldShowEditorConfirmPasswordV122/);
    assert.match(appSource, /shouldValidateEditorConfirmPasswordV122/);
    assert.equal(/if \(id\) editorFields\.append\(inputNodeV4\("_confirm_password"/.test(appSource), false);
    assert.equal(/if \(id\) \{\s*editorFields\.insertAdjacentHTML\("beforeend", `[^`]*_confirm_password/.test(appSource), false);
    assert.equal(/removeNoticeEditorPasswordFieldV122/.test(appSource), false);
    assert.equal(/openEditorV7NoticePasswordV122/.test(appSource), false);
    assert.match(appSource, /if \(shouldShowEditorConfirmPasswordV122\(key, id\)\) editorFields\.append\(inputNodeV4\("_confirm_password"/);
    const noticeSubmitSource = appSource.slice(
      appSource.indexOf("async function saveEditorWithNoticeServerRefreshV116"),
      appSource.indexOf("try {\n  const editorFormElV116")
    );
    assert.notEqual(noticeSubmitSource.length, 0);
    const noticeBranchStart = noticeSubmitSource.indexOf('if (editing.key !== "notices")');
    const noticeBranchEnd = noticeSubmitSource.indexOf('const workspaceId = await resolveCanonicalCurrentWorkspaceIdV116("notice-editor-submit"');
    const noticeBranchSource = noticeSubmitSource.slice(noticeBranchStart, noticeBranchEnd);
    assert.notEqual(noticeBranchSource.length, 0);
    assert.equal(/verifyCurrentPasswordV78/.test(noticeBranchSource), false);
    assert.match(noticeSubmitSource, /delete payload\._confirm_password/);
    const scheduleSaveFunctionSource = appSource.slice(
      appSource.indexOf("async function saveScheduleEditorWithServerConfirmV121"),
      appSource.indexOf("async function saveEditorWithNoticeServerRefreshV116")
    );
    assert.notEqual(scheduleSaveFunctionSource.length, 0);
    assert.match(scheduleSaveFunctionSource, /shouldValidateEditorConfirmPasswordV122\(editorSnapshot\.key, editorSnapshot\.id\)/);
  }],
  ["operational schedules use canonical server-confirmed save instead of optimistic success", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const serviceSource = readFileSync(path.resolve(projectRoot, "services/workspaceDataService.js"), "utf8");
    assert.match(appSource, /saveScheduleEditorWithServerConfirmV121/);
    assert.match(appSource, /prepareScheduleServerSaveV121/);
    assert.match(appSource, /resolveCanonicalCurrentWorkspaceIdV116\("schedule-save"/);
    assert.match(appSource, /scheduleCollectionV121\(runtime\.db, workspaceId\)\.doc\(docId\)/);
    assert.match(appSource, /ref\.get\(\{ source: "server" \}\)/);
    assert.match(appSource, /if \(!result\?\.confirmed\)/);
    assert.match(appSource, /confirmedRows\.unshift\(result\.row\)/);
    assert.match(appSource, /saveStore\(\{ skipRemote: true, syncReason: "schedule-server-confirmed" \}\)/);
    assert.match(appSource, /editing\.key === "schedules"/);
    assert.match(appSource, /schedule-sync-not-started/);
    assert.match(appSource, /schedule-workspace-mismatch/);
    assert.match(appSource, /checkSaveReadiness\?\.\(canonicalWorkspaceId/);
    assert.doesNotMatch(appSource, /sync\.workspaceId !== canonicalWorkspaceId/);
    assert.doesNotMatch(appSource, /Boolean\(sync\.workspaceId\)/);
    assert.match(serviceSource, /scheduleSaveAttemptCount/);
    assert.match(serviceSource, /scheduleSaveBlockedCount/);
    assert.match(serviceSource, /scheduleServerConfirmSuccessCount/);
    assert.match(serviceSource, /lastScheduleWorkspaceMatchesCanonical/);
    assert.match(serviceSource, /pendingScheduleCount/);
    assert.match(serviceSource, /function saveReadiness\(workspaceId, options = \{\}\)/);
    assert.match(serviceSource, /lastSaveReadinessReason/);
    assert.match(serviceSource, /lastSaveReadinessSafetyBlocked/);
  }],
  ["operational notices use operational safety write gate before direct Firestore writes", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const serviceSource = readFileSync(path.resolve(projectRoot, "services/workspaceDataService.js"), "utf8");
    assert.match(appSource, /function checkNoticeOperationalWriteAllowedV127\(action = "write"\)/);
    assert.match(appSource, /APP_PATCH_VERSION_V127/);
    assert.match(appSource, /PMNoticeOperationalWriteGateV127/);
    assert.match(appSource, /noticeWriteGateVersion:\s*"V127"/);
    assert.match(appSource, /noticeWriteGateInstalled:\s*true/);
    assert.match(appSource, /PMOperationalSafety\?\.isWriteBlocked\?\.\(\)/);
    assert.match(appSource, /notice-operational-write-blocked/);
    assert.match(appSource, /NOTICE_WRITE_BLOCKED_SAVE_MESSAGE_V127/);
    assert.match(appSource, /NOTICE_WRITE_BLOCKED_DELETE_MESSAGE_V127/);
    const noticeSaveSource = appSource.slice(
      appSource.indexOf("saveNoticeDirectToFirestoreV52 = async function saveNoticeDirectToFirestoreV115"),
      appSource.indexOf("async function saveEditorWithNoticeServerRefreshV115")
    );
    assert.notEqual(noticeSaveSource.length, 0);
    assert.ok(
      noticeSaveSource.indexOf("checkNoticeOperationalWriteAllowedV127(writeAction)") <
        noticeSaveSource.indexOf(".doc(docId).set(payload, { merge: true })"),
      "notice save write gate must run before Firestore set"
    );
    const noticeDeleteSource = appSource.slice(
      appSource.indexOf("deleteWorkspaceNoticeRemoteV112 = async function deleteWorkspaceNoticeRemoteV113"),
      appSource.indexOf("deleteWorkspaceNoticeIdsRemoteV112 = async function deleteWorkspaceNoticeIdsRemoteV113")
    );
    assert.notEqual(noticeDeleteSource.length, 0);
    assert.ok(
      noticeDeleteSource.indexOf('checkNoticeOperationalWriteAllowedV127("delete")') <
        noticeDeleteSource.indexOf(".doc(id).delete()"),
      "notice delete write gate must run before Firestore delete"
    );
    const noticeBulkDeleteSource = appSource.slice(
      appSource.indexOf("deleteWorkspaceNoticeIdsRemoteV112 = async function deleteWorkspaceNoticeIdsRemoteV113"),
      appSource.indexOf("const renderNoticesSplitBeforeV113")
    );
    assert.notEqual(noticeBulkDeleteSource.length, 0);
    assert.ok(
      noticeBulkDeleteSource.indexOf('checkNoticeOperationalWriteAllowedV127("bulk-delete")') <
        noticeBulkDeleteSource.indexOf("batch.commit()"),
      "notice bulk delete write gate must run before batch commit"
    );
    const finalSaveWrapperSource = appSource.slice(
      appSource.indexOf("saveNoticeDirectToFirestoreV52 = async function saveNoticeDirectToFirestoreV127"),
      appSource.indexOf("deleteWorkspaceNoticeRemoteV112 = async function deleteWorkspaceNoticeRemoteV127")
    );
    assert.notEqual(finalSaveWrapperSource.length, 0);
    assert.ok(
      finalSaveWrapperSource.indexOf("blockNoticeWriteIfNeededV127(action") <
        finalSaveWrapperSource.indexOf("saveNoticeDirectToFirestoreBeforeV127.apply"),
      "final notice save wrapper must block before calling prior wrappers"
    );
    const finalDeleteWrapperSource = appSource.slice(
      appSource.indexOf("deleteWorkspaceNoticeRemoteV112 = async function deleteWorkspaceNoticeRemoteV127"),
      appSource.indexOf("deleteWorkspaceNoticeIdsRemoteV112 = async function deleteWorkspaceNoticeIdsRemoteV127")
    );
    assert.notEqual(finalDeleteWrapperSource.length, 0);
    assert.ok(
      finalDeleteWrapperSource.indexOf('blockNoticeWriteIfNeededV127("delete")') <
        finalDeleteWrapperSource.indexOf("deleteWorkspaceNoticeRemoteBeforeV127.apply"),
      "final notice delete wrapper must block before requested/confirmed counters in prior wrappers"
    );
    const finalBulkDeleteWrapperSource = appSource.slice(
      appSource.indexOf("deleteWorkspaceNoticeIdsRemoteV112 = async function deleteWorkspaceNoticeIdsRemoteV127"),
      appSource.indexOf("window.PMNoticeOperationalWriteGateV127")
    );
    assert.notEqual(finalBulkDeleteWrapperSource.length, 0);
    assert.ok(
      finalBulkDeleteWrapperSource.indexOf('blockNoticeWriteIfNeededV127("bulk-delete")') <
        finalBulkDeleteWrapperSource.indexOf("deleteWorkspaceNoticeIdsRemoteBeforeV127.apply"),
      "final notice bulk delete wrapper must block before prior batch path"
    );
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
      assert.match(appSource, new RegExp(field));
      assert.match(serviceSource, new RegExp(field));
    }
    assert.match(serviceSource, /noticeBootstrapCreateBlockedCount/);
    assert.match(serviceSource, /notice-empty-remote-bootstrap-blocked/);
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    assert.match(indexHtml, /services\/workspaceDataService\.js\?v=10/);
    assert.match(indexHtml, /app\.js\?v=164/);
  }],
  ["operational schedule editor save blocks duplicate clicks and avoids stale editing state", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const serviceSource = readFileSync(path.resolve(projectRoot, "services/workspaceDataService.js"), "utf8");
    const scheduleSaveFunctionSource = appSource.slice(
      appSource.indexOf("async function saveScheduleEditorWithServerConfirmV121"),
      appSource.indexOf("async function saveEditorWithNoticeServerRefreshV116")
    );
    assert.notEqual(scheduleSaveFunctionSource.length, 0);
    assert.match(appSource, /let scheduleEditorSaveInFlightV121 = false/);
    assert.match(appSource, /scheduleEditorSubmitButtonV121/);
    assert.match(appSource, /setScheduleEditorSaveUiV121\(true, "validating"\)/);
    assert.match(appSource, /setScheduleEditorSaveUiV121\(false\)/);
    assert.match(scheduleSaveFunctionSource, /scheduleEditorSaveClickCount/);
    assert.match(scheduleSaveFunctionSource, /scheduleEditorSaveDuplicateClickBlockedCount/);
    assert.match(scheduleSaveFunctionSource, /scheduleEditorSaveAcceptedCount/);
    assert.match(scheduleSaveFunctionSource, /const editorSnapshot = \{/);
    assert.match(scheduleSaveFunctionSource, /id: editing\.id \?\? null/);
    assert.match(scheduleSaveFunctionSource, /const isUpdate = editorSnapshot\.id !== null/);
    assert.match(scheduleSaveFunctionSource, /const rowId = isUpdate \? editorSnapshot\.id : Date\.now\(\)/);
    assert.match(scheduleSaveFunctionSource, /String\(item\.id\) === String\(rowId\)/);
    assert.equal(/if \(editing\.id\)/.test(scheduleSaveFunctionSource), false);
    assert.equal(/rows\.unshift\(\{ id: Date\.now\(\)/.test(scheduleSaveFunctionSource), false);
    assert.match(serviceSource, /scheduleEditorSaveClickCount/);
    assert.match(serviceSource, /scheduleEditorSaveAcceptedCount/);
    assert.match(serviceSource, /scheduleEditorSaveDuplicateClickBlockedCount/);
    assert.match(serviceSource, /scheduleEditorSaveInFlight/);
    assert.match(serviceSource, /scheduleEditorPostConfirmFailureCount/);
    assert.match(serviceSource, /lastScheduleEditorErrorCode/);
  }],
  ["operational workspace sync starts from canonical workspace after login only", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const serviceSource = readFileSync(path.resolve(projectRoot, "services/workspaceDataService.js"), "utf8");
    assert.match(appSource, /APP_PATCH_VERSION_V121/);
    assert.match(appSource, /ensureCanonicalWorkspaceDataSyncV121/);
    assert.match(appSource, /resolveCanonicalCurrentWorkspaceIdV116\(`workspace-sync:\$\{reason\}`/);
    assert.match(appSource, /applyCanonicalWorkspaceToOperationalStoreV121/);
    assert.match(appSource, /window\.PMWorkspaceDataService\?\.start\?\.\(\{/);
    assert.match(appSource, /canonicalWorkspaceId:\s*workspaceId/);
    assert.match(appSource, /reason,\s*\n\s*uid:/);
    assert.match(appSource, /completeLoginV34 = function completeLoginV121/);
    assert.match(appSource, /scheduleCanonicalWorkspaceDataSyncStartV121\("complete-login"/);
    assert.match(appSource, /operationalWorkspaceSyncStartedWorkspaceV121 === canonicalWorkspaceId/);
    assert.match(appSource, /duplicateStartPreventedCount/);
    assert.match(appSource, /clearSessionStateV36 = function clearSessionStateV121/);
    assert.match(appSource, /PMOperationalWorkspaceSyncDiagnostics/);
    const scheduleSaveFunctionSource = appSource.slice(
      appSource.indexOf("async function saveScheduleEditorWithServerConfirmV121"),
      appSource.indexOf("async function saveEditorWithNoticeServerRefreshV116")
    );
    assert.notEqual(scheduleSaveFunctionSource.length, 0);
    assert.equal(/PMWorkspaceDataService\?\.start/.test(scheduleSaveFunctionSource), false);
    assert.match(serviceSource, /startAttemptCount/);
    assert.match(serviceSource, /startSuccessCount/);
    assert.match(serviceSource, /startBlockedCount/);
    assert.match(serviceSource, /activeListenerPathCount/);
    assert.match(serviceSource, /workspaceMatchesCanonical/);
  }],
  ["app-next schedules filter options include canonical and actual data values", () => {
    const utilsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextSchedulesReadonlyUtils.ts"), "utf8");
    const componentSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextSchedulesReadOnly.tsx"), "utf8");
    assert.match(utilsSource, /CANONICAL_SCHEDULE_TYPES/);
    assert.match(utilsSource, /CANONICAL_SCHEDULE_IMPORTANCE/);
    assert.match(componentSource, /SCHEDULE_STATUS_OPTIONS/);
    assert.match(componentSource, /dateRangeInvalid/);
    assert.match(componentSource, /시작일이 종료일보다 늦습니다/);
  }],
  ["app-next schedules route matrix is workspace-null safe", () => {
    const result = appNextRouteUtils.resolveAppNextRoute({
      hash: "#/schedules-readonly",
      state: "active",
    });
    assert.equal(result.currentRoute, "schedules-readonly");
    assert.equal(result.isProtectedRoute, true);
    const matrix = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
      requestedRoute: "schedules-readonly",
      currentRoute: "schedules-readonly",
      state: "active",
      session: makeSession({
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
      requireAuthEnabled: true,
      protectedRouteEnabled: true,
      requireWorkspaceRoleEnabled: true,
    });
    assert.equal(matrix.finalDecision, "ALLOW_ROUTE_WITH_DATA_BLOCKED");
    assert.equal(matrix.directUrlAllowed, true);
    assert.equal(matrix.workspaceRequired, true);
  }],
  ["app-next schedules does not modify operational static app files", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const htmlSource = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    assert.equal(appSource.includes("AppNextSchedulesReadOnly"), false);
    assert.equal(appSource.includes("#/schedules-readonly"), false);
    assert.equal(htmlSource.includes("AppNextSchedulesReadOnly"), false);
  }],
  ["workspace parent recovery dry-run page is standalone and development gated", () => {
    const html = readFileSync(path.resolve(projectRoot, "workspace-parent-recovery.html"), "utf8");
    const main = readFileSync(path.resolve(projectRoot, "src/dev-recovery/main.tsx"), "utf8");
    const app = readFileSync(path.resolve(projectRoot, "src/dev-recovery/WorkspaceParentRecoveryApp.tsx"), "utf8");
    const viteConfig = readFileSync(path.resolve(projectRoot, "vite.config.js"), "utf8");
    assert.match(html, /src\/dev-recovery\/main\.tsx/);
    assert.match(main, /AuthProvider/);
    assert.match(app, /import\.meta\.env\.DEV/);
    assert.match(app, /isDevelopmentHost/);
    assert.equal(viteConfig.includes("workspace-parent-recovery.html"), false);
  }],
  ["workspace parent recovery uses shared firebase app auth and waits auth restore", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-recovery/WorkspaceParentRecoveryApp.tsx"), "utf8");
    assert.match(source, /from "..\/lib\/firebase"/);
    assert.match(source, /getApps/);
    assert.match(source, /app\.name/);
    assert.match(source, /auth\.currentUser/);
    assert.match(source, /authStateReady/);
    assert.match(source, /onAuthStateChanged/);
    assert.match(source, /waitForRecoveryAuthInitialState/);
    assert.equal(source.includes("initializeApp"), false);
    assert.equal(source.includes("getAuth("), false);
    assert.equal(/\bsignOut\s*\(/.test(source), false);
  }],
  ["workspace parent recovery exposes auth restoration and gate diagnostics", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-recovery/WorkspaceParentRecoveryApp.tsx"), "utf8");
    for (const token of [
      "authInitializationState",
      "authObserverInitialCallbackReceived",
      "authCurrentUserPresent",
      "authPersistenceRestoreCompleted",
      "firebaseAppName",
      "firebaseAppCount",
      "firebaseProjectFingerprint",
      "authUserFingerprint",
      "appSessionLoaded",
      "reloadSessionRequestedCount",
      "reloadSessionCompletedCount",
      "googlePopupResult",
      "coopWarningDisposition",
      "sessionGateFailureKind",
      "usersCurrentWorkspacePresent",
      "targetWorkspaceFingerprint",
    ]) {
      assert.match(source, new RegExp(token));
    }
  }],
  ["workspace parent recovery supports dev google login and safe reload", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-recovery/WorkspaceParentRecoveryApp.tsx"), "utf8");
    assert.match(source, /signInWithGoogle/);
    assert.match(source, /handleGoogleLogin/);
    assert.match(source, /Google sign-in/);
    assert.match(source, /handleReloadSession/);
    assert.match(source, /reloadSession/);
    assert.match(source, /Google sign-in was cancelled/);
    assert.match(source, /recoveryCoopWarningDisposition/);
  }],
  ["workspace parent recovery execution is blocked by default after completed recovery", () => {
    const service = readFileSync(path.resolve(projectRoot, "src/dev-recovery/workspaceParentRecoveryService.ts"), "utf8");
    const app = readFileSync(path.resolve(projectRoot, "src/dev-recovery/WorkspaceParentRecoveryApp.tsx"), "utf8");
    const utils = readFileSync(path.resolve(projectRoot, "src/dev-recovery/workspaceParentRecoveryUtils.ts"), "utf8");
    assert.match(service, /runTransaction/);
    assert.match(service, /maxAttempts:\s*1/);
    assert.match(service, /transaction\.set/);
    assert.match(service, /getDocFromServer\(parentRef\)/);
    assert.match(service, /executeWorkspaceParentRecoveryOnce/);
    assert.match(utils, /ALLOW_REAL_RECOVERY:\s*boolean\s*=\s*false/);
    assert.match(utils, /VITE_ALLOW_REAL_WORKSPACE_PARENT_RECOVERY/);
    assert.match(app, /isRealRecoveryExecutionEnabled/);
    assert.match(app, /RECOVERY_EXECUTION_SESSION_KEY/);
    assert.match(app, /executionLocked/);
    assert.match(app, /window\.location\.hostname === "127\.0\.0\.1"/);
    assert.match(app, /parent restore:/);
    assert.match(app, /recoveryReceiptServerVerified/);
    assert.equal(/\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|onSnapshot)\b/.test(service), false);
    assert.equal(/\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction|onSnapshot|serverTimestamp)\b/.test(app), false);
    assert.equal(/\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction|onSnapshot)\b/.test(utils), false);
    assert.equal(/import\s+\{[^}]*serverTimestamp/.test(utils), false);
  }],
  ["workspace parent recovery dry-run result shape forbids writes and moves", () => {
    assert.equal(workspaceParentRecoveryUtils.ALLOW_REAL_RECOVERY, false);
    assert.equal(workspaceParentRecoveryUtils.isRealRecoveryExecutionEnabled({
      isDevelopment: true,
      envFlag: true,
    }), false);
    assert.equal(workspaceParentRecoveryUtils.isDevelopmentHost("127.0.0.1"), true);
    assert.equal(workspaceParentRecoveryUtils.isDevelopmentHost("localhost"), true);
    assert.equal(workspaceParentRecoveryUtils.isDevelopmentHost("example.com"), false);
    assert.equal(workspaceParentRecoveryUtils.hasChildData([
      { name: "notices", count: 0 },
      { name: "timetable", count: 2 },
    ]), true);
    assert.equal(workspaceParentRecoveryUtils.hasChildData([
      { name: "notices", count: 0 },
    ]), false);
    assert.throws(() => workspaceParentRecoveryUtils.executeRecovery(), /disabled/);
  }],
  ["workspace parent recovery execution gate remains disabled after completed recovery", () => {
    const base = {
      isDevelopment: true,
      isLocalHost: true,
      authenticated: true,
      status: "active",
      isSystemOwner: true,
      sameFirebaseProject: true,
      targetWorkspaceMatchesUsersCurrentWorkspace: true,
      parentWorkspaceExists: false,
      childDataExists: true,
      canonicalMembershipExists: true,
      confirmedWorkspaceName: "김민준 workspace",
      confirmedDisplayName: "김민준 workspace",
      payloadPreviewConfirmed: true,
      confirmationPhrase: workspaceParentRecoveryUtils.REAL_RECOVERY_CONFIRMATION_PHRASE,
      realRecoveryEnabled: false,
    };
    assert.equal(workspaceParentRecoveryUtils.canExecuteRealRecovery(base), false);
    assert.ok(workspaceParentRecoveryUtils.recoveryExecutionGateFailureReasons(base).includes("real-recovery-flag-disabled"));
    assert.equal(workspaceParentRecoveryUtils.recoveryExecutionGateFailureReasons({
      ...base,
      realRecoveryEnabled: false,
    }).join(","), "real-recovery-flag-disabled");
    assert.ok(workspaceParentRecoveryUtils.recoveryExecutionGateFailureReasons({
      ...base,
      confirmationPhrase: "WRONG",
    }).includes("confirmation-phrase-mismatch"));
    assert.ok(workspaceParentRecoveryUtils.recoveryExecutionGateFailureReasons({
      ...base,
      parentWorkspaceExists: true,
    }).includes("parent-workspace-already-exists"));
    assert.ok(workspaceParentRecoveryUtils.recoveryExecutionGateFailureReasons({
      ...base,
      canonicalMembershipExists: false,
    }).includes("canonical-membership-missing"));
  }],
  ["workspace parent recovery session gate blocks unsafe states", () => {
    const base = {
      authReady: true,
      phase: "authenticated",
      status: "active",
      authUserPresent: true,
      appSessionLoaded: true,
      isSystemOwner: true,
      currentWorkspaceId: "workspace-1",
      targetWorkspaceFingerprint: "abcd1234",
      expectedWorkspaceFingerprint: "abcd1234",
      writeApiDisabled: true,
      sessionErrorPresent: false,
    };

    assert.equal(workspaceParentRecoveryUtils.recoverySessionGateFailureKind({
      ...base,
      authReady: false,
    }), "auth-initializing");
    assert.equal(workspaceParentRecoveryUtils.recoverySessionGateFailureKind({
      ...base,
      phase: "signed_out",
      authUserPresent: false,
    }), "signed-out");
    assert.equal(workspaceParentRecoveryUtils.recoverySessionGateFailureKind({
      ...base,
      phase: "error",
      sessionErrorPresent: true,
    }), "session-load-failed");
    assert.equal(workspaceParentRecoveryUtils.recoverySessionGateFailureKind({
      ...base,
      status: "pending",
    }), "inactive-user");
    assert.equal(workspaceParentRecoveryUtils.recoverySessionGateFailureKind({
      ...base,
      isSystemOwner: false,
    }), "not-system-owner");
    assert.equal(workspaceParentRecoveryUtils.recoverySessionGateFailureKind({
      ...base,
      currentWorkspaceId: null,
    }), "missing-current-workspace");
    assert.equal(workspaceParentRecoveryUtils.recoverySessionGateFailureKind({
      ...base,
      targetWorkspaceFingerprint: "11112222",
    }), "target-workspace-mismatch");
    assert.equal(workspaceParentRecoveryUtils.recoverySessionGateFailureKind(base), "none");
    assert.equal(workspaceParentRecoveryUtils.recoverySessionGateFailureKind({
      ...base,
      writeApiDisabled: false,
    }), "none");
    assert.equal(workspaceParentRecoveryUtils.canRunRecoveryDryRun(base), true);
  }],
  ["workspace parent recovery classifies coop warning as benign only after success", () => {
    assert.equal(workspaceParentRecoveryUtils.recoveryCoopWarningDisposition({
      googlePopupResult: "success",
      authUserPresentAfterPopup: true,
      sessionResolvedAfterPopup: true,
    }), "benign-after-success");
    assert.equal(workspaceParentRecoveryUtils.recoveryCoopWarningDisposition({
      googlePopupResult: "success",
      authUserPresentAfterPopup: false,
      sessionResolvedAfterPopup: false,
    }), "needs-investigation");
    assert.equal(workspaceParentRecoveryUtils.recoveryCoopWarningDisposition({
      googlePopupResult: "failed",
      authUserPresentAfterPopup: false,
      sessionResolvedAfterPopup: false,
    }), "none");
  }],
  ["workspace parent recovery dry-run service reads required evidence only", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/dev-recovery/workspaceParentRecoveryService.ts"), "utf8");
    assert.match(source, /users/);
    assert.match(source, /systemOwners/);
    assert.match(source, /workspace_members/);
    assert.match(source, /workspaceMembers/);
    assert.match(source, /readRecoverySessionGateEvidence/);
    assert.match(source, /usersCurrentWorkspacePresent/);
    assert.match(source, /getCountFromServer/);
    assert.match(source, /RECOVERY_CHILD_COLLECTIONS/);
    assert.match(source, /runWorkspaceParentRecoveryPreflight/);
    assert.match(source, /parentRecoveryRequired/);
    assert.match(source, /membershipRecoveryRequired/);
    assert.match(source, /membershipWillBeModified:\s*false/);
    assert.match(source, /estimatedParentWriteCount/);
    assert.match(source, /estimatedMembershipWriteCount/);
    assert.match(source, /estimatedTotalWriteCount/);
    assert.match(source, /readyForParentRecovery/);
    assert.match(source, /parentPayloadPreview/);
    assert.match(source, /sameFirebaseProject/);
    assert.match(source, /appNextFirebaseProjectFingerprint/);
    assert.match(source, /createdAtEvidenceFound/);
    assert.match(source, /createdAtEvidenceSourceKind/);
    assert.match(source, /createdAtWillBeIncluded/);
    assert.match(source, /child-document-createdAt-reference-only/);
    assert.match(source, /includeInParentPayload:\s*false/);
    assert.match(source, /serverReadSucceededAfterWrite/);
    assert.match(source, /parentWorkspaceExistsAfterWrite/);
    assert.match(source, /workspaceFingerprintMatches/);
    assert.match(source, /ownerFingerprintMatches/);
    assert.match(source, /usersCurrentWorkspaceUnchanged/);
    assert.match(source, /canonicalMembershipUnchanged/);
    assert.match(source, /legacyMembershipUnchanged/);
    assert.match(source, /childCountsUnchanged/);
    assert.match(source, /usersCurrentWorkspaceWillChange:\s*false/);
    assert.match(source, /childCollectionsWillMove:\s*false/);
    assert.match(source, /rulesWillChange:\s*false/);
    assert.match(source, /writeExecuted:\s*false/);
  }],
  ["app-next routes expose account devices notifications and protected workspace notices", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    const mainSource = readFileSync(path.resolve(projectRoot, "src/app-next/main.tsx"), "utf8");
    assert.match(source, /AppNextLoginDevices/);
    assert.match(source, /AppNextNotifications/);
    assert.match(source, /AppNextWorkspaceNotices/);
    assert.match(source, /<RequireAuth/);
    assert.match(source, /useExistingAuthProvider/);
    assert.match(source, /resolveAppNextRoute/);
    assert.match(mainSource, /BrowserRouter/);
    assert.equal(source.includes("createBrowserRouter"), false);
  }],
  ["app-next production route tree has actual ProtectedRoute admin-preview consumer", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    assert.match(source, /<ProtectedRoute/);
    assert.match(source, /menuKey="admin"/);
    assert.match(source, /defaultNewAuth/);
    assert.match(source, /useExistingAuthProvider/);
    assert.match(source, /AppNextAdminAccessPreview/);
    assert.match(source, /handleProtectedRouteSnapshot/);
  }],
  ["app-next production route tree has actual RequireWorkspaceRole workspace-preview consumer", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    assert.match(source, /activeTab === "workspace-preview"[\s\S]*<RequireAuth[\s\S]*<ProtectedRoute[\s\S]*<RequireWorkspaceRole[\s\S]*<AppNextWorkspaceAccessPreview/);
    assert.match(source, /allowedRoles=\{APP_NEXT_WORKSPACE_PREVIEW_ALLOWED_ROLES\}/);
    assert.match(source, /allowSystemOwnerBypass/);
    assert.match(source, /requireWorkspace/);
    assert.match(source, /useExistingAuthProvider/);
    assert.match(source, /defaultNewAuth/);
    assert.match(source, /handleRequireWorkspaceRoleSnapshot/);
  }],
  ["app-next RequireWorkspaceRole consumer reuses existing providers", () => {
    const bridgeSource = readFileSync(path.resolve(projectRoot, "src/auth/legacy/guards/NewAuthRequireWorkspaceRoleBridge.tsx"), "utf8");
    const guardSource = readFileSync(path.resolve(projectRoot, "src/components/guards/RequireWorkspaceRole.tsx"), "utf8");
    assert.match(bridgeSource, /wrapProviders/);
    assert.match(bridgeSource, /if \(!wrapProviders\)/);
    assert.match(guardSource, /useExistingAuthProvider/);
    assert.match(guardSource, /wrapProviders=\{!useExistingAuthProvider\}/);
  }],
  ["app-next admin-preview mounts RequireAuth before ProtectedRoute", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    assert.match(source, /activeTab === "admin-preview"[\s\S]*<RequireAuth[\s\S]*<ProtectedRoute/);
    assert.match(source, /routeDecision\.currentRoute === "admin-preview" && protectedRouteEnabled/);
    assert.match(source, /onSnapshot=\{handleRequireAuthSnapshot\}[\s\S]*onSnapshot=\{handleProtectedRouteSnapshot\}/);
  }],
  ["app-next workspace-preview mounts RequireAuth ProtectedRoute then RequireWorkspaceRole", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    assert.match(source, /activeTab === "workspace-preview"[\s\S]*<RequireAuth[\s\S]*<ProtectedRoute[\s\S]*<RequireWorkspaceRole/);
    assert.match(source, /routeDecision\.currentRoute === "workspace-preview" && protectedRouteEnabled && requireWorkspaceRoleEnabled/);
    assert.match(source, /onSnapshot=\{handleRequireAuthSnapshot\}[\s\S]*onSnapshot=\{handleProtectedRouteSnapshot\}[\s\S]*onSnapshot=\{handleRequireWorkspaceRoleSnapshot\}/);
  }],
  ["app-next route diagnostics UI avoids auto-subscribe render loops", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    assert.equal(diagnosticsSource.includes("subscribeAppNextDiagnostics"), false);
    assert.equal(diagnosticsSource.includes("notifyAppNextDiagnosticsSubscribers"), false);
    assert.equal(appSource.includes("subscribeAppNextDiagnostics"), false);
    assert.match(appSource, /routeDiagnosticsView/);
    assert.match(appSource, /handleRefreshRouteDiagnostics/);
    assert.equal(appSource.includes("getAppNextRouteDiagnostics().currentRoute"), false);
  }],
  ["app-next html declares existing svg favicon to prevent favicon ico 404", () => {
    const source = readFileSync(path.resolve(projectRoot, "app-next.html"), "utf8");
    assert.match(source, /rel="icon"/);
    assert.match(source, /href="\/favicon\.svg"/);
  }],
  ["app-next route resolver handles auth states without redirect loops", () => {
    const activeNotices = appNextRouteUtils.resolveAppNextRoute({
      hash: "#/notices",
      state: "active",
    });
    assert.equal(activeNotices.requestedRoute, "notices");
    assert.equal(activeNotices.currentRoute, "notices");
    assert.equal(activeNotices.fallbackReason, "none");
    assert.equal(activeNotices.isProtectedRoute, true);
    const activeSettings = appNextRouteUtils.resolveAppNextRoute({
      hash: "#/settings-readonly",
      state: "active",
    });
    assert.equal(activeSettings.requestedRoute, "settings-readonly");
    assert.equal(activeSettings.currentRoute, "settings-readonly");
    assert.equal(activeSettings.isProtectedRoute, true);
    assert.equal(appNextRouteUtils.resolveAppNextRoute({
      hash: "#/notices",
      state: "signed_out",
    }).currentRoute, "login");
    assert.equal(appNextRouteUtils.resolveAppNextRoute({
      hash: "#/notices",
      state: "pending",
    }).currentRoute, "pending");
    assert.equal(appNextRouteUtils.resolveAppNextRoute({
      hash: "#/notices",
      state: "rejected",
    }).currentRoute, "rejected");
    assert.equal(appNextRouteUtils.resolveAppNextRoute({
      hash: "#/notices",
      state: "disabled",
    }).currentRoute, "disabled");
    assert.equal(appNextRouteUtils.resolveAppNextRoute({
      hash: "#/missing",
      state: "active",
    }).fallbackReason, "unknown-route");
    assert.equal(appNextRouteUtils.resolveAppNextRoute({
      hash: "#/admin-preview",
      state: "active",
    }).currentRoute, "admin-preview");
    const activeWorkspacePreview = appNextRouteUtils.resolveAppNextRoute({
      hash: "#/workspace-preview",
      state: "active",
    });
    assert.equal(activeWorkspacePreview.currentRoute, "workspace-preview");
    assert.equal(activeWorkspacePreview.isProtectedRoute, true);
    assert.equal(appNextRouteUtils.resolveAppNextRoute({
      hash: "#/workspace-required",
      state: "active",
    }).currentRoute, "workspace-required");
    assert.equal(appNextRouteUtils.resolveAppNextRoute({
      hash: "#/access-denied",
      state: "active",
    }).currentRoute, "access-denied");
  }],
  ["app-next canonical route matrix fixes route guard policy", () => {
    const activeSession = makeSession({
      currentWorkspaceId: "workspace-1",
      currentWorkspaceRole: "teacher",
    });
    const matrix = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
      requestedRoute: "workspace-preview",
      currentRoute: "workspace-preview",
      state: "active",
      session: activeSession,
      requireAuthEnabled: true,
      protectedRouteEnabled: true,
      requireWorkspaceRoleEnabled: true,
    });
    assert.equal(matrix.requiresAuth, true);
    assert.equal(matrix.requiresProtectedRoute, true);
    assert.equal(matrix.requiresWorkspaceRole, true);
    assert.equal(matrix.requireAuthDecision, "AUTHENTICATED_ACTIVE");
    assert.equal(matrix.protectedRouteDecision, "ALLOWED_PROTECTED_ROUTE");
    assert.equal(matrix.requireWorkspaceRoleDecision, "ALLOWED_WORKSPACE_ROLE");
    assert.equal(matrix.finalDecision, "ALLOW_ROUTE");
    assert.equal(matrix.directUrlAllowed, true);
    assert.equal(matrix.protectedChildRenderAllowed, true);
    assert.equal(matrix.policyMismatchDetected, false);
    assert.equal(matrix.requiredWorkspaceRoles.join(","), "super_manager,manager,teacher");
  }],
  ["app-next route matrix blocks protected child before role preview renders", () => {
    const matrix = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
      requestedRoute: "workspace-preview",
      currentRoute: "workspace-preview",
      state: "active",
      session: makeSession({
        currentWorkspaceId: "workspace-1",
        currentWorkspaceRole: "normal",
      }),
      requireAuthEnabled: true,
      protectedRouteEnabled: true,
      requireWorkspaceRoleEnabled: true,
    });
    assert.equal(matrix.finalDecision, "WORKSPACE_ROLE_NOT_ALLOWED");
    assert.equal(matrix.directUrlAllowed, false);
    assert.equal(matrix.menuVisible, false);
    assert.equal(matrix.protectedChildRenderAllowed, false);
    assert.equal(matrix.policyMismatchDetected, false);
  }],
  ["app-next route matrix handles system owner workspace exception", () => {
    const withWorkspace = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
      requestedRoute: "workspace-preview",
      currentRoute: "workspace-preview",
      state: "active",
      session: makeSession({
        globalRole: "system_owner",
        currentWorkspaceId: "workspace-1",
        currentWorkspaceRole: null,
        isSystemOwner: true,
      }),
      requireAuthEnabled: true,
      protectedRouteEnabled: true,
      requireWorkspaceRoleEnabled: true,
    });
    assert.equal(withWorkspace.requireWorkspaceRoleDecision, "SYSTEM_OWNER_EXPLICIT_ALLOW");
    assert.equal(withWorkspace.finalDecision, "ALLOW_ROUTE");
    assert.equal(withWorkspace.workspaceRoleCategory, "none");

    const withoutWorkspace = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
      requestedRoute: "workspace-preview",
      currentRoute: "workspace-preview",
      state: "active",
      session: makeSession({
        globalRole: "system_owner",
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
        isSystemOwner: true,
      }),
      requireAuthEnabled: true,
      protectedRouteEnabled: true,
      requireWorkspaceRoleEnabled: true,
    });
    assert.equal(withoutWorkspace.requireWorkspaceRoleDecision, "NO_WORKSPACE");
    assert.equal(withoutWorkspace.finalDecision, "NO_WORKSPACE");
    assert.equal(withoutWorkspace.directUrlAllowed, false);
  }],
  ["app-next route matrix handles account status and workspace-null notices", () => {
    const signedOut = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
      requestedRoute: "login",
      currentRoute: "login",
      state: "signed_out",
      session: null,
      requireAuthEnabled: true,
      protectedRouteEnabled: true,
      requireWorkspaceRoleEnabled: true,
    });
    assert.equal(signedOut.finalDecision, "SHOW_LOGIN");

    for (const [state, route] of [
      ["pending", "pending"],
      ["rejected", "rejected"],
      ["disabled", "disabled"],
      ["error", "error"],
    ]) {
      const matrix = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
        requestedRoute: route,
        currentRoute: route,
        state,
        session: makeSession({ status: state === "error" ? "active" : state }),
        requireAuthEnabled: true,
        protectedRouteEnabled: true,
        requireWorkspaceRoleEnabled: true,
      });
      assert.equal(matrix.finalDecision, "SHOW_ACCOUNT_STATUS");
    }

    const notices = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
      requestedRoute: "notices",
      currentRoute: "notices",
      state: "active",
      session: makeSession({
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
      requireAuthEnabled: true,
      protectedRouteEnabled: true,
      requireWorkspaceRoleEnabled: true,
    });
    assert.equal(notices.finalDecision, "ALLOW_ROUTE_WITH_DATA_BLOCKED");
  }],
  ["app-next route matrix keeps flag rollback explicit", () => {
    const requireAuthOff = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
      requestedRoute: "notices",
      currentRoute: "notices",
      state: "active",
      session: makeSession({ currentWorkspaceId: "workspace-1" }),
      requireAuthEnabled: false,
      protectedRouteEnabled: true,
      requireWorkspaceRoleEnabled: true,
    });
    assert.equal(requireAuthOff.finalDecision, "REQUIRE_AUTH_FLAG_OFF");

    const protectedOff = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
      requestedRoute: "admin-preview",
      currentRoute: "admin-preview",
      state: "active",
      session: makeSession({
        currentWorkspaceId: "workspace-1",
        currentWorkspaceRole: "manager",
      }),
      requireAuthEnabled: true,
      protectedRouteEnabled: false,
      requireWorkspaceRoleEnabled: true,
    });
    assert.equal(protectedOff.finalDecision, "PROTECTED_ROUTE_FLAG_OFF");

    const workspaceRoleOff = appNextRouteUtils.appNextAuthRouteMatrixSnapshot({
      requestedRoute: "workspace-preview",
      currentRoute: "workspace-preview",
      state: "active",
      session: makeSession({
        currentWorkspaceId: "workspace-1",
        currentWorkspaceRole: "teacher",
      }),
      requireAuthEnabled: true,
      protectedRouteEnabled: true,
      requireWorkspaceRoleEnabled: false,
    });
    assert.equal(workspaceRoleOff.finalDecision, "REQUIRE_WORKSPACE_ROLE_FLAG_OFF");
  }],
  ["app-next admin preview menu policy matches ProtectedRoute route policy", () => {
    assert.equal(appNextRouteUtils.canShowAppNextAdminPreview(makeSession({
      globalRole: "system_owner",
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: true,
    })), true);
    assert.equal(appNextRouteUtils.canShowAppNextAdminPreview(makeSession({
      currentWorkspaceId: "workspace-1",
      currentWorkspaceRole: "super_manager",
    })), true);
    assert.equal(appNextRouteUtils.canShowAppNextAdminPreview(makeSession({
      currentWorkspaceId: "workspace-1",
      currentWorkspaceRole: "manager",
    })), true);
    for (const role of ["teacher", "normal", "viewer", "print_account"]) {
      assert.equal(appNextRouteUtils.canShowAppNextAdminPreview(makeSession({
        currentWorkspaceId: "workspace-1",
        currentWorkspaceRole: role,
      })), false);
    }
    assert.equal(appNextRouteUtils.canShowAppNextAdminPreview(makeSession({
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
    })), false);
  }],
  ["app-next workspace preview menu policy matches RequireWorkspaceRole policy", () => {
    assert.equal(appNextRouteUtils.canShowAppNextWorkspacePreview(makeSession({
      globalRole: "system_owner",
      currentWorkspaceId: "workspace-1",
      currentWorkspaceRole: null,
      isSystemOwner: true,
    })), true);
    assert.equal(appNextRouteUtils.canShowAppNextWorkspacePreview(makeSession({
      globalRole: "system_owner",
      currentWorkspaceId: null,
      currentWorkspaceRole: null,
      isSystemOwner: true,
    })), false);
    for (const role of ["super_manager", "manager", "teacher"]) {
      assert.equal(appNextRouteUtils.canShowAppNextWorkspacePreview(makeSession({
        currentWorkspaceId: "workspace-1",
        currentWorkspaceRole: role,
      })), true, role);
    }
    for (const role of ["normal", "viewer", "print_account", null, "admin"]) {
      assert.equal(appNextRouteUtils.canShowAppNextWorkspacePreview(makeSession({
        currentWorkspaceId: role ? "workspace-1" : "workspace-1",
        currentWorkspaceRole: role,
      })), false, String(role));
    }
    assert.equal(appNextRouteUtils.canShowAppNextWorkspacePreview(makeSession({
      currentWorkspaceId: null,
      currentWorkspaceRole: "teacher",
    })), false);
  }],
  ["app-next workspace preview policy snapshot is privacy safe", () => {
    const systemOwnerPolicy = appNextRouteUtils.appNextWorkspacePreviewPolicySnapshot(makeSession({
      globalRole: "system_owner",
      currentWorkspaceId: "workspace-1",
      currentWorkspaceRole: null,
      isSystemOwner: true,
    }));
    assert.equal(systemOwnerPolicy.accessAllowed, true);
    assert.equal(systemOwnerPolicy.workspacePresent, true);
    assert.equal(systemOwnerPolicy.decision, "SYSTEM_OWNER_EXPLICIT_ALLOW");
    assert.equal(systemOwnerPolicy.requiredWorkspaceRoles.join(","), "super_manager,manager,teacher");

    const blockedPolicy = appNextRouteUtils.appNextWorkspacePreviewPolicySnapshot(makeSession({
      currentWorkspaceId: null,
      currentWorkspaceRole: "teacher",
    }));
    assert.equal(blockedPolicy.accessAllowed, false);
    assert.equal(blockedPolicy.decision, "NO_WORKSPACE");
    assert.equal(JSON.stringify(blockedPolicy).includes("workspace-1"), false);
    assert.equal(JSON.stringify(blockedPolicy).includes("user-1@example.test"), false);
  }],
  ["ProtectedRoute admin policy allows only canonical admin roles", () => {
    const allowedFixtures = [
      { globalRole: "system_owner", currentWorkspaceId: null, currentWorkspaceRole: null, isSystemOwner: true },
      { globalRole: "user", currentWorkspaceId: "workspace-1", currentWorkspaceRole: "super_manager", isSystemOwner: false },
      { globalRole: "user", currentWorkspaceId: "workspace-1", currentWorkspaceRole: "manager", isSystemOwner: false },
    ];
    for (const fixture of allowedFixtures) {
      const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
        phase: "authenticated",
        loading: false,
        isAuthenticated: true,
        status: "active",
        error: null,
        menuKey: "admin",
        ...fixture,
      });
      assert.equal(decision.allow, true);
    }

    for (const role of ["teacher", "normal", "viewer", "print_account", null]) {
      const decision = protectedRouteBridgeUtils.decideProtectedRouteAccess({
        phase: "authenticated",
        loading: false,
        isAuthenticated: true,
        status: "active",
        globalRole: "user",
        currentWorkspaceId: role ? "workspace-1" : null,
        currentWorkspaceRole: role,
        isSystemOwner: false,
        error: null,
        menuKey: "admin",
      });
      assert.equal(decision.allow, false);
    }
  }],
  ["app-next ProtectedRoute flag defaults new only for app-next opt-in", () => {
    assert.equal(protectedRouteBridgeUtils.resolveNewAuthProtectedRouteFlag({
      search: "",
      envValue: undefined,
      isDev: true,
    }), false);
    assert.equal(protectedRouteBridgeUtils.resolveNewAuthProtectedRouteFlag({
      search: "",
      envValue: undefined,
      isDev: true,
      defaultEnabled: true,
    }), true);
    assert.equal(protectedRouteBridgeUtils.resolveNewAuthProtectedRouteFlag({
      search: "?newAuthProtectedRoute=off",
      envValue: undefined,
      isDev: true,
      defaultEnabled: true,
    }), false);
    assert.equal(protectedRouteBridgeUtils.resolveNewAuthProtectedRouteFlag({
      search: "?newAuthProtectedRoute=off",
      envValue: undefined,
      isDev: false,
      defaultEnabled: true,
    }), true);
  }],
  ["app-next RequireWorkspaceRole flag defaults new only for app-next opt-in", () => {
    assert.equal(workspaceRoleBridgeUtils.resolveNewAuthRequireWorkspaceRoleFlag({
      search: "",
      envValue: undefined,
      isDev: true,
    }), false);
    assert.equal(workspaceRoleBridgeUtils.resolveNewAuthRequireWorkspaceRoleFlag({
      search: "",
      envValue: undefined,
      isDev: true,
      defaultEnabled: true,
    }), true);
    assert.equal(workspaceRoleBridgeUtils.resolveNewAuthRequireWorkspaceRoleFlag({
      search: "?newAuthRequireWorkspaceRole=off",
      envValue: undefined,
      isDev: true,
      defaultEnabled: true,
    }), false);
    assert.equal(workspaceRoleBridgeUtils.resolveNewAuthRequireWorkspaceRoleFlag({
      search: "?newAuthRequireWorkspaceRole=off",
      envValue: undefined,
      isDev: false,
      defaultEnabled: true,
    }), true);
    assert.equal(workspaceRoleBridgeUtils.resolveNewAuthRequireWorkspaceRoleFlag({
      search: "",
      envValue: "false",
      isDev: true,
      defaultEnabled: true,
    }), false);
  }],
  ["app-next admin preview is read-only and imports no Firebase APIs", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextAdminAccessPreview.tsx"), "utf8");
    for (const forbidden of ["getDoc", "getDocs", "onSnapshot", "addDoc", "setDoc", "updateDoc", "deleteDoc", "signOut"]) {
      assert.equal(source.includes(forbidden), false);
    }
    assert.match(source, /Firestore read/);
    assert.match(source, /Firestore write/);
  }],
  ["app-next workspace preview is read-only and imports no Firebase APIs", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextWorkspaceAccessPreview.tsx"), "utf8");
    for (const forbidden of ["getDoc", "getDocs", "onSnapshot", "addDoc", "setDoc", "updateDoc", "deleteDoc", "signOut", "firebase"]) {
      assert.equal(source.includes(forbidden), false);
    }
    assert.match(source, /Firestore read count/);
    assert.match(source, /Firestore write count/);
    assert.match(source, /This page does not open real workspace data/);
  }],
  ["ProtectedRoute diagnostics API is available and privacy-safe", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/auth/legacy/guards/protectedRouteBridgeUtils.ts"), "utf8");
    assert.match(source, /PMProtectedRouteDiagnostics/);
    assert.match(source, /firestoreReadCount/);
    assert.match(source, /firestoreWriteAttemptCount/);
    assert.match(source, /policyMismatchDetected/);
    assert.match(source, /safeRoleCategory/);
    assert.equal(source.includes("email"), false);
    assert.equal(source.includes("token"), false);
  }],
  ["RequireWorkspaceRole diagnostics API is available and privacy-safe", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/auth/legacy/guards/workspaceRoleBridgeUtils.ts"), "utf8");
    assert.match(source, /PMRequireWorkspaceRoleDiagnostics/);
    assert.match(source, /firestoreReadCount/);
    assert.match(source, /firestoreWriteAttemptCount/);
    assert.match(source, /workspaceListenerCount/);
    assert.match(source, /policyMismatchDetected/);
    assert.match(source, /safeRoleCategory/);
    assert.equal(source.includes("email"), false);
    assert.equal(source.includes("token"), false);

    workspaceRoleBridgeUtils.recordRequireWorkspaceRoleBridgeSnapshot({
      mode: "new",
      currentRoute: "workspace-preview",
      requestedRoute: "workspace-preview",
      phase: "authenticated",
      loading: false,
      isAuthenticated: true,
      status: "active",
      globalRole: "user",
      currentWorkspaceRole: "teacher",
      isSystemOwner: false,
      hasCurrentWorkspaceId: true,
      allowedRoles: ["super_manager", "manager", "teacher"],
      requireWorkspace: true,
      allowSystemOwnerBypass: true,
      menuVisible: true,
      warnings: [],
      decision: {
        state: "allow",
        allow: true,
        reason: "WORKSPACE_ROLE_ALLOWED",
        expectedDestination: null,
      },
      childrenRendered: true,
      expectedDestination: null,
      redirectAttempted: false,
      automaticSignOutOccurred: false,
      authListenerCount: 1,
      workspaceListenerCount: 0,
      firestoreReadCount: 0,
      firestoreWriteAttemptCount: 0,
    });
    const snapshot = workspaceRoleBridgeUtils.getRequireWorkspaceRoleDiagnosticsSnapshot();
    assert.equal(snapshot.providerMode, "new");
    assert.equal(snapshot.currentRoute, "workspace-preview");
    assert.equal(snapshot.accessAllowed, true);
    assert.equal(snapshot.hasWorkspace, true);
    assert.equal(snapshot.workspaceRoleCategory, "teacher");
    assert.equal(snapshot.globalRoleCategory, "user");
    assert.equal(snapshot.allowSystemOwner, true);
    assert.equal(snapshot.workspaceListenerCount, 0);
    assert.equal(snapshot.firestoreReadCount, 0);
    assert.equal(snapshot.firestoreWriteAttemptCount, 0);
    assert.equal(JSON.stringify(snapshot).includes("workspace-1"), false);
    assert.equal(JSON.stringify(snapshot).includes("user-1@example.test"), false);
  }],
  ["RequireAuth can consume an existing app-next AuthProvider without duplicate providers", () => {
    const requireAuthSource = readFileSync(path.resolve(projectRoot, "src/components/guards/RequireAuth.tsx"), "utf8");
    const bridgeSource = readFileSync(path.resolve(projectRoot, "src/auth/legacy/guards/NewAuthRequireAuthBridge.tsx"), "utf8");
    assert.match(requireAuthSource, /useExistingAuthProvider/);
    assert.match(requireAuthSource, /wrapProviders=\{!useExistingAuthProvider\}/);
    assert.match(bridgeSource, /wrapProviders = true/);
    assert.match(bridgeSource, /if \(!wrapProviders\)/);
  }],
  ["app-next exposes route and notice diagnostics without sensitive identifiers", () => {
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    assert.match(diagnosticsSource, /PMAppNextRouteDiagnostics/);
    assert.match(diagnosticsSource, /PMAppNextNoticeDiagnostics/);
    assert.match(diagnosticsSource, /PMAppNextAuthRouteMatrixDiagnostics/);
    assert.match(diagnosticsSource, /fetchedCount/);
    assert.match(diagnosticsSource, /visibleCount/);
    assert.match(diagnosticsSource, /writeAttemptCount:\s*0/);
    assert.match(diagnosticsSource, /workspaceMasked/);
  }],
  ["app-next auth route matrix diagnostics are privacy safe and guard-read-only", () => {
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    const appSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    assert.match(diagnosticsSource, /AppNextAuthRouteMatrixDiagnosticsSnapshot/);
    assert.match(diagnosticsSource, /getAppNextAuthRouteMatrixDiagnostics/);
    assert.match(diagnosticsSource, /recordAppNextAuthRouteMatrixDiagnostics/);
    assert.match(appSource, /recordAppNextAuthRouteMatrixDiagnostics/);
    assert.match(appSource, /routeMatrix\.firestoreReadCount/);
    assert.match(appSource, /routeMatrix\.firestoreWriteAttemptCount/);
    assert.match(appSource, /routeMatrix\.workspaceListenerCount/);
    assert.equal(diagnosticsSource.includes("token"), false);
  }],
  ["app-next protected notices pilot keeps operational route storage untouched", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    const routeSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextRouteUtils.ts"), "utf8");
    assert.equal(source.includes("pm-current-page-v1"), false);
    assert.equal(routeSource.includes("pm-current-page-v1"), false);
    assert.equal(appNextRouteUtils.appNextRouteHash("notices"), "#/notices");
  }],
  ["app-next workspace notices remain one-time read-only with no listener or write API", () => {
    const componentSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextWorkspaceNotices.tsx"), "utf8");
    const serviceSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextWorkspaceNoticesService.ts"), "utf8");
    assert.match(serviceSource, /getDocs/);
    assert.match(serviceSource, /getDocsFromServer/);
    assert.equal(serviceSource.includes("onSnapshot"), false);
    assert.equal(serviceSource.includes("addDoc"), false);
    assert.equal(serviceSource.includes("setDoc"), false);
    assert.equal(serviceSource.includes("updateDoc"), false);
    assert.equal(serviceSource.includes("deleteDoc"), false);
    assert.match(componentSource, /listenerCount:\s*0/);
    assert.match(componentSource, /writeApiImported:\s*true/);
  }],
  ["app-next dashboard is an actual RequireAuth consumer", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    assert.match(source, /AppNextDashboardReadOnly/);
    assert.match(source, /routeDecision\.currentRoute === "dashboard"/);
    assert.match(source, /activeTab === "dashboard"/);
    assert.match(source, /<RequireAuth[\s\S]*?<AppNextDashboardReadOnly/);
    assert.match(source, /handleRoute\("account"\)/);
  }],
  ["app-next dashboard policy allows active null workspace without notice read", () => {
    const policy = appNextDashboardUtils.appNextDashboardPolicy({
      phase: "authenticated",
      session: makeSession({
        status: "active",
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
    });
    assert.equal(policy.routeAllowed, true);
    assert.equal(policy.noticeSummaryAllowed, false);
    assert.equal(policy.hasWorkspace, false);
    assert.equal(policy.reason, "active");
  }],
  ["app-next dashboard policy blocks inactive states before child data read", () => {
    for (const status of ["pending", "rejected", "disabled"]) {
      const policy = appNextDashboardUtils.appNextDashboardPolicy({
        phase: "account_action_required",
        session: makeSession({
          status,
          currentWorkspaceId: "workspace-1",
          currentWorkspaceRole: "normal",
        }),
      });
      assert.equal(policy.routeAllowed, false);
      assert.equal(policy.noticeSummaryAllowed, false);
      assert.equal(policy.reason, status);
    }
  }],
  ["app-next dashboard keeps system owner global role separate", () => {
    const policy = appNextDashboardUtils.appNextDashboardPolicy({
      phase: "authenticated",
      session: makeSession({
        status: "active",
        globalRole: "system_owner",
        isSystemOwner: true,
        currentWorkspaceId: null,
        currentWorkspaceRole: null,
      }),
    });
    assert.equal(policy.routeAllowed, true);
    assert.equal(policy.globalRoleCategory, "system_owner");
    assert.equal(policy.workspaceRoleCategory, "none");
    assert.equal(policy.isSystemOwner, true);
  }],
  ["app-next dashboard notice summary uses first three normalized notices", () => {
    const normalized = appNextWorkspaceNoticesUtils.normalizeAppNextWorkspaceNoticeRecords([
      {
        id: "newest",
        workspaceId: "workspace-1",
        title: "Newest",
        createdAt: "2026-06-18T09:00:00.000Z",
      },
      {
        id: "pinned-old",
        workspaceId: "workspace-1",
        title: "Pinned old",
        pinned: true,
        createdAt: "2026-06-01T09:00:00.000Z",
      },
      {
        id: "middle",
        workspaceId: "workspace-1",
        title: "Middle",
        createdAt: "2026-06-17T09:00:00.000Z",
      },
      {
        id: "hidden",
        workspaceId: "workspace-1",
        title: "Hidden",
        status: "hidden",
      },
      {
        id: "old",
        workspaceId: "workspace-1",
        title: "Old",
        createdAt: "2026-06-16T09:00:00.000Z",
      },
    ], {
      workspaceId: "workspace-1",
    });
    const summary = appNextDashboardUtils.summarizeAppNextDashboardNotices(normalized.records, 3);
    assert.equal(summary.visibleCount, 4);
    assert.equal(summary.summaryCount, 3);
    assert.equal(JSON.stringify(summary.recent.map((notice) => notice.title)), JSON.stringify([
      "Pinned old",
      "Newest",
      "Middle",
    ]));
  }],
  ["app-next dashboard files are read-only and listener-free", () => {
    const files = [
      "src/app-next/AppNextDashboardReadOnly.tsx",
      "src/app-next/appNextDashboardUtils.ts",
    ];
    const forbidden = /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction|onSnapshot|serverTimestamp)\b/;
    for (const file of files) {
      assert.equal(forbidden.test(readFileSync(path.resolve(projectRoot, file), "utf8")), false, file);
    }
  }],
  ["app-next dashboard diagnostics expose zero-write counters without sensitive fields", () => {
    const diagnosticsSource = readFileSync(path.resolve(projectRoot, "src/app-next/appNextDiagnostics.ts"), "utf8");
    const dashboardSource = readFileSync(path.resolve(projectRoot, "src/app-next/AppNextDashboardReadOnly.tsx"), "utf8");
    assert.match(diagnosticsSource, /AppNextDashboardDiagnosticsSnapshot/);
    assert.match(diagnosticsSource, /PMAppNextDashboardDiagnostics/);
    assert.match(diagnosticsSource, /recordAppNextDashboardDiagnostics/);
    assert.match(dashboardSource, /dashboardWriteAttemptCount:\s*0/);
    assert.match(dashboardSource, /dashboardActiveListenerCount:\s*0/);
    assert.match(dashboardSource, /workspaceListenerCount:\s*0/);
    assert.equal(/uid|email|workspaceId|documentId|token/i.test(
      diagnosticsSource.match(/AppNextDashboardDiagnosticsSnapshot[\s\S]*?}\n/)?.[0] || "",
    ), false);
  }],
  ["app-next dashboard does not modify operational static app files", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const htmlSource = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    assert.match(appSource, /function renderDashboardV8\(\)/);
    assert.match(appSource, /function visibleNotices\(\)/);
    assert.match(htmlSource, /app\.js\?v=164/);
    assert.equal(appSource.includes("AppNextDashboardReadOnly"), false);
    assert.equal(htmlSource.includes("AppNextDashboardReadOnly"), false);
  }],
  ["owner preview V128 hides sensitive UI fields but keeps selector values possible", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v128 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V128"));
    assert.match(v128, /SENSITIVE_DISPLAY_FIELD_RE_V128/);
    assert.match(v128, /redactDisplayRowV128/);
    assert.match(v128, /showViewerV128/);
    assert.match(v128, /simpleRowsTableV128/);
    assert.match(v128, /dashboardRowsV128/);
    assert.match(v128, /studentDisplayNameV128/);
    assert.match(v128, /등록된 학생이 없습니다/);
    assert.equal(/option\([^)]*uid/i.test(v128), false);
  }],
  ["owner preview V128 confirms attendance writes before local success", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v128 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V128"));
    assert.match(v128, /attendanceSaveClickCount/);
    assert.match(v128, /attendanceSaveAttemptCount/);
    assert.match(v128, /attendanceServerConfirmSuccessCount/);
    assert.match(v128, /attendanceServerConfirmFailureCount/);
    assert.match(v128, /saveAttendanceDirectToFirestoreV128/);
    assert.match(v128, /\.collection\("attendance"\)\.doc\(docId\)/);
    assert.match(v128, /ref\.get\(\{\s*source:\s*"server"\s*\}\)/);
    assert.match(v128, /saveStore\(\{\s*skipRemote:\s*true,\s*syncReason:\s*"attendance-server-confirmed"/);
  }],
  ["owner preview V128 aligns attendance filter enum values", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v128 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V128"));
    assert.match(v128, /normalizeAttendanceStatusV128/);
    assert.match(v128, /if \(text === "완료"\) return "처리 완료"/);
    assert.match(v128, /if \(text === "출석"\) return "정상"/);
    assert.match(v128, /\["정상", "확인 필요", "처리 완료"\]/);
  }],
  ["owner preview V129 blocks user-facing identifiers in detail and quick display paths", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v129 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V129"));
    assert.match(v129, /INTERNAL_DISPLAY_FIELD_KEYS_V129/);
    for (const field of ["studentuid", "owneruid", "authoruid", "authoremail", "authorrole", "workspaceid", "documentid", "setid", "programid", "sourcetype", "createdbyuid", "updatedbyuid"]) {
      assert.match(v129, new RegExp(`"${field}"`));
    }
    assert.match(v129, /collectionDisplayRowV129/);
    assert.match(v129, /showViewerV129/);
    assert.match(v129, /simpleRowsTableV129/);
    assert.match(v129, /dashboardRowsV129/);
    assert.match(v129, /sanitizeUserFacingElementV129/);
    assert.match(v129, /RAW_IDENTIFIER_VALUE_RE_V129/);
  }],
  ["owner preview V129 keeps student select values but resolves visible labels", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v129 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V129"));
    assert.match(v129, /function studentCandidatesV129/);
    assert.match(v129, /function studentDisplayNameV129/);
    assert.match(v129, /function sanitizeStudentSelectV129/);
    assert.match(v129, /item\.textContent = studentDisplayNameV129\(item\.value\)/);
    assert.match(v129, /option\("", "등록된 학생이 없습니다"\)/);
    assert.doesNotMatch(v129.match(/function sanitizeStudentSelectV129[\s\S]*?function guardRequiredStudentSelectionV129/)?.[0] || "", /item\.value\s*=[^=]/);
  }],
  ["owner preview V129 normalizes attendance filters without mutating stored rows", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v129 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V129"));
    assert.match(v129, /ATTENDANCE_STATUS_OPTIONS_V129 = \["전체", "정상", "지각", "결석", "조퇴", "인정", "처리 완료"\]/);
    assert.match(v129, /출석:\s*"정상"/);
    assert.match(v129, /완료:\s*"처리 완료"/);
    assert.match(v129, /sessionStorage\.removeItem\("filter:attendance:status"\)/);
    assert.match(v129, /normalizeAttendanceStatusV129\(row\.status \|\| row\.state \|\| ""\)/);
    assert.doesNotMatch(v129.match(/filteredRowsV7 = function filteredRowsV129[\s\S]*?function createdAtTextV129/)?.[0] || "", /row\.status\s*=/);
  }],
  ["owner preview V129 removes system notice email from dashboard display only", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v129 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V129"));
    assert.match(v129, /renderDashboardV129/);
    assert.match(v129, /systemNoticeEmailHiddenCount/);
    assert.match(v129, /userDisplayNameV129/);
    assert.match(v129, /authorEmail/);
    assert.doesNotMatch(v129, /row\.authorEmail\s*=/);
  }],
  ["owner preview V129 records integrated-unconfigured mode instead of treating main as personal", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v129 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V129"));
    assert.match(v129, /ownerPreviewModeSnapshotV129/);
    assert.match(v129, /mode:\s*"integrated-unconfigured"/);
    assert.doesNotMatch(v129, /mode:\s*"personal"/);
  }],
  ["owner preview V130 exposes user-facing identifier diagnostics without raw samples", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v130 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V130"));
    assert.match(v130, /PMUserFacingIdentifierDiagnostics/);
    for (const field of [
      "visibleUidLikeCount",
      "visibleInternalLabelCount",
      "lastVisibleIdentifierSurface",
      "maskedSampleLength",
      "optionValueOnlyCount",
    ]) assert.match(v130, new RegExp(field));
    assert.doesNotMatch(v130.match(/window\.PMUserFacingIdentifierDiagnostics[\s\S]*?};/)?.[0] || "", /rawSample|uidValue|workspaceIdValue|emailValue/);
  }],
  ["owner preview V130 removes student UID labels while preserving option values", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v130 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V130"));
    assert.match(v130, /sanitizeStudentFieldLabelV130/);
    assert.match(v130, /sanitizeStudentSelectV130/);
    assert.match(v130, /return key\.includes\("target"\) \? "대상 학생" : "학생"/);
    assert.match(v130, /item\.textContent = USER_VISIBLE_IDENTIFIER_RE_V130\.test\(label\) \? "학생" : label/);
    assert.doesNotMatch(v130.match(/function sanitizeStudentSelectV130[\s\S]*?const inputNodeV4BeforeV130/)?.[0] || "", /item\.value\s*=/);
  }],
  ["owner preview V130 shows system notices as system administrator without email or UID", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v130 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V130"));
    assert.match(v130, /function noticeAuthorLabelV130/);
    assert.match(v130, /authorRole.*system_owner/s);
    assert.match(v130, /시스템 관리자/);
    assert.match(v130, /authorEmail:\s*""/);
    assert.match(v130, /authorUid:\s*""/);
    assert.doesNotMatch(v130.match(/function noticeAuthorLabelV130[\s\S]*?if \(typeof userDisplayNameV129/)?.[0] || "", /row\.authorEmail|row\.authorUid/);
  }],
  ["owner preview V130 uses attendance date type and status selects without mutating rows", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v130 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V130"));
    assert.match(v130, /ATTENDANCE_STATUS_OPTIONS_V130 = \["상태 전체", "정상", "지각", "결석", "조퇴", "인정", "처리 완료"\]/);
    assert.match(v130, /attendanceSelectV130\("date", "날짜"/);
    assert.match(v130, /attendanceSelectV130\("type", "유형"/);
    assert.match(v130, /출석:\s*"정상"/);
    assert.match(v130, /완료:\s*"처리 완료"/);
    assert.doesNotMatch(v130.match(/filteredRowsV7 = function filteredRowsV130[\s\S]*?function quickTimetablePeriodOptionsV130/)?.[0] || "", /row\.(status|type|date)\s*=/);
  }],
  ["owner preview V130 quick timetable starts blank and saves set plus first class row", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v130 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V130"));
    assert.match(v130, /function quickTimetableDialogV130/);
    assert.match(v130, /quickTimetableSubjectV130/);
    assert.match(v130, /quickTimetableTeacherV130/);
    assert.match(v130, /quickTimetableRoomV130/);
    assert.match(v130, /quickTimetableSeatV130/);
    assert.match(v130, /startDate\.value > endDate\.value/);
    assert.match(v130, /linkedType !== type/);
    assert.match(v130, /store\.timetableSets\.push\(setRow\)/);
    assert.match(v130, /store\.timetable\.push\(classRow\)/);
    assert.match(v130, /syncKeys:\s*\["timetableSets", "timetable"\]/);
    assert.match(v130, /quick-timetable-set-and-row-create-v130/);
    const quickBody = v130.match(/function quickTimetableDialogV130[\s\S]*?openQuickCreateV70 = function openQuickCreateV130/)?.[0] || "";
    assert.doesNotMatch(quickBody, /name\.value\s*=\s*[^=]/);
  }],
  ["owner preview V130 quick timetable view is weekly and hides internal IDs", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v130 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V130"));
    const controls = v130.match(/quickTimetableControlsV9 = function quickTimetableControlsV130[\s\S]*?};/)?.[0] || "";
    assert.match(controls, /quickTimetableModeControlV104/);
    assert.doesNotMatch(controls, /quickTimetableDay|daySelect/);
    assert.match(v130, /function renderQuickTimetableListV130/);
    assert.match(v130, /renderQuickTimetableGridV104\(wrap, state\)/);
    assert.match(v130, /시간표/);
    const listBody = v130.match(/function renderQuickTimetableListV130[\s\S]*?quickTimetableViewV100/)?.[0] || "";
    assert.doesNotMatch(listBody, /createdAt|registration|programCreatedAt|sourceType|documentId/);
    assert.equal(listBody.includes("programId"), false);
  }],
  ["owner preview V130 school board integration avoids direct external fetch and documents future proxy work", () => {
    const schoolSource = readFileSync(path.resolve(projectRoot, "services/schoolIntegrationService.js"), "utf8");
    const docsSource = readFileSync(path.resolve(projectRoot, "docs/school-neis-multi-school-requirements.md"), "utf8");
    assert.match(schoolSource, /schoolDirectExternalFetchBlockedCount/);
    assert.match(schoolSource, /schoolProxyCooldownHitCount/);
    assert.doesNotMatch(schoolSource, /fetch\(requestUrl/);
    assert.match(schoolSource, /school-proxy-unavailable/);
    assert.match(docsSource, /REQ-SCHOOL-NEIS-MULTI-SCHOOL/);
    assert.match(docsSource, /Browser clients must not fetch/);
  }],
  ["owner preview V128 handles missing school proxy without write or retry loop", () => {
    const schoolSource = readFileSync(path.resolve(projectRoot, "services/schoolIntegrationService.js"), "utf8");
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    assert.match(schoolSource, /schoolProxyConfigured/);
    assert.match(schoolSource, /schoolProxyRequestCount/);
    assert.match(schoolSource, /schoolProxyUnavailableCount/);
    assert.match(schoolSource, /lastSchoolProxyReason/);
    assert.match(schoolSource, /school-proxy-not-configured/);
    assert.match(schoolSource, /school-proxy-cooldown/);
    assert.match(appSource, /학교 게시판 연동 서버가 아직 설정되지 않았습니다/);
    assert.equal(/\b(setDoc|updateDoc|deleteDoc|writeBatch)\b/.test(schoolSource), false);
  }],
  ["owner preview V131 finalizes system notice author display without exposing identity", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v131 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V131"));
    assert.match(v131, /function noticeAuthorLabelV131/);
    assert.match(v131, /systemNoticeAuthorTextV131/);
    assert.match(v131, /시스템 관리자/);
    assert.match(v131, /authorRole.*system_owner/s);
    assert.match(v131, /authorEmail:\s*""/);
    assert.match(v131, /authorUid:\s*""/);
    const labelBody = v131.match(/function noticeAuthorLabelV131[\s\S]*?const renderNoticeCardsBeforeV131/)?.[0] || "";
    assert.doesNotMatch(labelBody, /row\.authorEmail|row\.authorUid|row\.email/);
    assert.match(v131, /const category = row\.source \|\| row\.category \|\| row\.type \|\| "일반"/);
  }],
  ["owner preview V131 attendance type filter uses canonical editor options rather than current rows", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v131 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V131"));
    assert.match(v131, /function attendanceTypeOptionsFromEditorV131/);
    assert.match(v131, /fieldsForV6\("attendance"\)/);
    assert.match(v131, /store\.settings\?\.masterData\?\.attendanceTypes/);
    for (const label of ["등교", "하교", "지각", "조퇴", "결석"]) assert.match(v131, new RegExp(label));
    const filterBody = v131.match(/filteredRowsV7 = function filteredRowsV131[\s\S]*?async function saveAttendanceDirectToFirestoreV131/)?.[0] || "";
    assert.match(filterBody, /const validTypes = new Set\(attendanceTypeOptionsFromEditorV131\(\)\)/);
    assert.doesNotMatch(filterBody, /row\.(type|date|status)\s*=/);
  }],
  ["owner preview V131 attendance saves normalized dates only after server confirm", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v131 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V131"));
    assert.match(v131, /function normalizeAttendanceDateV131/);
    assert.match(v131, /attendance-\$\{date\}-\$\{Date\.now\(\)\}/);
    assert.match(v131, /attendanceServerConfirmAttemptCount/);
    assert.match(v131, /ref\.set\(payload, \{\s*merge:\s*true\s*\}\)/);
    assert.match(v131, /ref\.get\(\{\s*source:\s*"server"\s*\}\)/);
    assert.match(v131, /confirmed\.metadata\?\.hasPendingWrites/);
    assert.match(v131, /attendance-safety-write-blocked/);
    assert.match(v131, /saveStore\(\{\s*skipRemote:\s*true,\s*syncReason:\s*"attendance-server-confirmed-v131"/);
  }],
  ["owner preview V131 quick timetable lets general and school save without forced program source", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v131 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V131"));
    const quickBody = v131.match(/function quickTimetableDialogV131[\s\S]*?openQuickCreateV70 = function openQuickCreateV131/)?.[0] || "";
    assert.match(v131, /function quickTimetableSourceTypeForSaveV131/);
    assert.match(v131, /if \(!isProgramTimetableTypeV131\(type\)\) return ""/);
    assert.match(quickBody, /programType\.value = ""/);
    assert.match(quickBody, /programType\.disabled = true/);
    assert.match(quickBody, /if \(requiresProgram\) \{/);
    assert.match(quickBody, /Object\.assign\(setRow/);
    assert.match(quickBody, /Object\.assign\(classRow/);
    assert.match(quickBody, /store\.timetableSets\.push\(setRow\)/);
    assert.match(quickBody, /store\.timetable\.push\(classRow\)/);
    assert.match(quickBody, /save\.disabled = true/);
    assert.match(quickBody, /quickTimetableDuplicateClickBlockedCount/);
    assert.match(quickBody, /store\.timetableSets = store\.timetableSets\.filter/);
    assert.match(quickBody, /store\.timetable = store\.timetable\.filter/);
    assert.match(quickBody, /quick-timetable-set-and-row-create-v131/);
  }],
  ["owner preview V132 attendance prevents false success until server write confirm and list refresh", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v132 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V132"));
    assert.match(v132, /attendanceActiveSubmitPath:\s*"editorForm-capture-v132"/);
    assert.match(v132, /attendanceServerWriteAttemptCount/);
    assert.match(v132, /ref\.set\(payload,\s*\{\s*merge:\s*true\s*\}\)/);
    assert.match(v132, /ref\.get\(\{\s*source:\s*"server"\s*\}\)/);
    assert.match(v132, /refreshAttendanceListFromServerV132/);
    assert.match(v132, /collection\("attendance"\)\.get\(\{\s*source:\s*"server"\s*\}\)/);
    assert.match(v132, /attendanceFalseSuccessPreventedCount/);
    assert.match(v132, /attendance-server-list-confirm-failed/);
    assert.match(v132, /saveStore\(\{\s*skipRemote:\s*true,\s*syncReason:\s*"attendance-server-confirmed-v132"/);
    assert.match(v132, /removeEventListener\("submit",\s*saveEditorWithAttendanceServerConfirmV131,\s*true\)/);
    assert.match(v132, /addEventListener\("submit",\s*saveEditorWithAttendanceServerConfirmV132,\s*true\)/);
  }],
  ["owner preview V132 quick timetable uses one program selector and server batch confirm", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v132 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V132"));
    const quickBody = v132.match(/function quickTimetableDialogV132[\s\S]*?openQuickCreateV70 = function openQuickCreateV132/)?.[0] || "";
    assert.match(quickBody, /const program = document\.createElement\("select"\)/);
    assert.doesNotMatch(quickBody, /const programType = document\.createElement\("select"\)/);
    assert.match(quickBody, /programField\.hidden = !needsProgram/);
    assert.match(quickBody, /if \(requiresProgram\) \{/);
    const setRowBody = quickBody.match(/const setRow = \{[\s\S]*?\};/)?.[0] || "";
    const classRowBody = quickBody.match(/const classRow = \{[\s\S]*?\};/)?.[0] || "";
    assert.doesNotMatch(setRowBody, /programId|sourceType/);
    assert.doesNotMatch(classRowBody, /programId|sourceType/);
    assert.match(v132, /activePeriodRowsForQuickTimetableV132/);
    assert.doesNotMatch(v132.match(/function activePeriodRowsForQuickTimetableV132[\s\S]*?async function quickTimetableRuntimeV132/)?.[0] || "", /store\.settings\?\.timetablePeriods|for \(let index = 1/);
    assert.match(v132, /const batch = runtime\.db\.batch\(\)/);
    assert.match(v132, /batch\.set\(setRef/);
    assert.match(v132, /batch\.set\(rowRef/);
    assert.match(v132, /await batch\.commit\(\)/);
    assert.match(v132, /setRef\.get\(\{\s*source:\s*"server"\s*\}\)/);
    assert.match(v132, /rowRef\.get\(\{\s*source:\s*"server"\s*\}\)/);
    assert.match(v132, /quickTimetablePartialWriteDetectedCount/);
    assert.match(v132, /saveStore\(\{\s*skipRemote:\s*true,\s*syncReason:\s*"quick-timetable-server-confirmed-v132"/);
  }],
  ["owner preview V132 system notice footer is final sanitized author plus date", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v132 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V132"));
    assert.match(v132, /function formatSystemNoticeDateV132/);
    assert.match(v132, /systemNoticeStaleDataPreservedCount/);
    assert.match(v132, /systemNoticeEmptyConfirmedCount/);
    assert.match(v132, /systemNoticeFooterSanitizedCount/);
    assert.match(v132, /renderingSystemNoticePanelV132/);
    assert.match(v132, /renderNoticesSplitV81 = function renderNoticesSplitV132/);
    assert.match(v132, /meta\.textContent = \[systemNoticeAuthorTextV131\(\), date\]/);
    const renderBody = v132.match(/renderNoticeCardsV81 = function renderNoticeCardsV132[\s\S]*?function schoolBoardRowsFromProxyPayloadV132/)?.[0] || "";
    assert.doesNotMatch(renderBody, /row\.source \|\| row\.category \|\| row\.type/);
  }],
  ["owner preview V132 school proxy requires JSON and service worker bypass", () => {
    const schoolSource = readFileSync(path.resolve(projectRoot, "services/schoolIntegrationService.js"), "utf8");
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const swSource = readFileSync(path.resolve(projectRoot, "service-worker.js"), "utf8");
    const v132 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V132"));
    assert.match(schoolSource, /function fetchProxyPayload/);
    assert.match(schoolSource, /Accept:\s*"application\/json"/);
    assert.match(schoolSource, /contentType\.includes\("application\/json"\)/);
    assert.match(schoolSource, /school-proxy-content-type-html/);
    assert.match(schoolSource, /fetchProxyPayload,/);
    assert.match(v132, /fetchBoardOwnerPreviewV132/);
    assert.match(v132, /schoolBoardRowsFromProxyPayloadV132/);
    assert.match(v132, /Array\.isArray\(payload\?\.items\)/);
    assert.match(v132, /payload\?\.html/);
    assert.match(swSource, /url\.pathname\.startsWith\("\/api\/"\)/);
    assert.match(swSource, /firestore\.googleapis\.com/);
    assert.doesNotMatch(swSource, /caches\.open|respondWith/);
  }],
  ["owner preview V133 quick timetable final active path uses filtered program and active period resolvers", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v133 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V133"));
    const quickBody = v133.match(/function quickTimetableDialogV133[\s\S]*?openQuickCreateV70 = function openQuickCreateV133/)?.[0] || "";
    assert.match(v133, /activeQuickTimetableRenderPath:\s*"openQuickCreateV70->quickTimetableDialogV133"/);
    assert.match(v133, /activeQuickTimetableSubmitPath:\s*"quickTimetableDialogV133-save-click"/);
    assert.match(v133, /function programRowsForQuickTimetableV133/);
    assert.match(v133, /cfg\?\.programs/);
    assert.match(v133, /store\[cfg\.programs\]/);
    assert.match(v133, /filter\(isActiveProgramRowV133\)/);
    assert.match(v133, /function activePeriodRowsForQuickTimetableV133/);
    assert.match(v133, /periodsForTimetableSetV103\(activeSet\)/);
    assert.doesNotMatch(v133.match(/function activePeriodRowsForQuickTimetableV133[\s\S]*?let quickTimetableSaveInFlightV133/)?.[0] || "", /store\.settings\?\.timetablePeriods|for \(let index = 1/);
    assert.match(quickBody, /programField\.hidden = !needsProgram \|\| programs\.length === 0/);
    assert.match(quickBody, /등록된 연결 프로그램이 없습니다/);
    assert.match(quickBody, /이 시간표에 활성화된 교시가 없습니다/);
    assert.match(quickBody, /save\.disabled = \(needsProgram && programs\.length === 0\) \|\| periodRows\.length === 0/);
    assert.doesNotMatch(quickBody, /quickTimetableProgramTypeV133|const programType = document\.createElement/);
  }],
  ["owner preview V133 quick timetable preserves payload policy and server-confirm success only", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v133 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V133"));
    const quickBody = v133.match(/function quickTimetableDialogV133[\s\S]*?openQuickCreateV70 = function openQuickCreateV133/)?.[0] || "";
    const setRowBody = quickBody.match(/const setRow = \{[\s\S]*?\};/)?.[0] || "";
    const classRowBody = quickBody.match(/const classRow = \{[\s\S]*?\};/)?.[0] || "";
    assert.doesNotMatch(setRowBody, /programId|sourceType/);
    assert.doesNotMatch(classRowBody, /programId|sourceType/);
    assert.match(quickBody, /if \(requiresProgram\) \{/);
    assert.match(quickBody, /Object\.assign\(setRow,\s*\{ sourceType, programId/);
    assert.match(quickBody, /saveQuickTimetableRemoteV132/);
    assert.match(quickBody, /showMessage\("시간표 저장 완료"/);
    assert.match(quickBody, /quickTimetableSaveInFlightV133/);
    assert.match(quickBody, /lastQuickTimetableSaveResult = "server-confirmed"/);
    assert.match(quickBody, /quickTimetableSaveFailureCount/);
  }],
  ["owner preview V133 normalizes actual dashboard system notice footer path", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v133 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V133"));
    assert.match(v133, /renderSystemNoticesPanelBeforeV133/);
    assert.match(v133, /renderSystemNoticesPanelV54 = function renderSystemNoticesPanelV133/);
    assert.match(v133, /querySelectorAll\?\.\("\.system-notice-item"\)/);
    assert.match(v133, /footer\.textContent = \[systemNoticeAuthorTextV131\(\), date\]/);
    assert.match(v133, /systemNoticeFooterNormalizedCount/);
    const panelBody = v133.match(/renderSystemNoticesPanelV54 = function renderSystemNoticesPanelV133[\s\S]*?const workspaceDiagnosticsBeforeV133/)?.[0] || "";
    assert.doesNotMatch(panelBody, /notice\.priority \|\| "normal"|createdByEmail|authorUid|authorEmail/);
  }],
  ["owner preview V133 exposes official diagnostics aliases without raw identifiers", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v133 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V133"));
    for (const field of [
      "attendanceCollectionRefreshSuccessCount",
      "lastAttendanceSaveResult",
      "quickTimetableSaveSuccessCount",
      "quickTimetableProgramOptionCount",
      "quickTimetableActivePeriodCount",
      "lastQuickTimetableSaveResult",
      "systemNoticeFooterNormalizedCount",
      "systemNoticeStalePreservedCount",
      "lastSystemNoticeRenderResult",
      "schoolProxyAttemptCount",
      "schoolProxySuccessCount",
      "schoolProxyFailureCount",
      "lastSchoolProxyResult"
    ]) assert.match(v133, new RegExp(field));
    assert.match(v133, /window\.PMWorkspaceDataService\.diagnostics = function diagnosticsV133/);
    const publicBody = v133.match(/function ownerPreviewPublicDiagnosticsV133[\s\S]*?function isActiveProgramRowV133/)?.[0] || "";
    assert.doesNotMatch(publicBody, /uid|email|workspaceId|programId|documentId/i);
  }],
  ["owner preview V134 quick timetable display labels reject numeric and identifier-only program labels", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v134 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V134"));
    assert.match(v134, /function quickTimetableProgramDisplayLabelV134/);
    assert.match(v134, /\["title", "name", "programName", "lectureName", "className", "courseName"\]/);
    assert.match(v134, /looksLikeInternalProgramLabelV134/);
    assert.match(v134, /\^\\d\+\$/);
    assert.match(v134, /이름 미등록 프로그램/);
    assert.match(v134, /quickTimetableProgramInvalidLabelCount/);
  }],
  ["owner preview V134 quick timetable program options are deduped and visible-label only", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v134 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V134"));
    const resolverBody = v134.match(/function programRowsForQuickTimetableV134[\s\S]*?function activePeriodRowsForQuickTimetableV134/)?.[0] || "";
    assert.match(resolverBody, /programConfigV26\(type\)/);
    assert.match(resolverBody, /store\[cfg\.programs\]/);
    assert.match(resolverBody, /filter\(isActiveProgramRowV133\)/);
    assert.match(resolverBody, /quickTimetableProgramIdentityV134/);
    assert.match(resolverBody, /labelIdentity/);
    assert.match(resolverBody, /quickTimetableProgramRawCount/);
    assert.match(resolverBody, /quickTimetableProgramVisibleCount/);
    assert.match(resolverBody, /quickTimetableProgramDeduplicatedCount/);
  }],
  ["owner preview V134 quick timetable autofills class fields without changing timetable name", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v134 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V134"));
    const quickBody = v134.match(/function quickTimetableDialogV134[\s\S]*?openQuickCreateV70 = function openQuickCreateV134/)?.[0] || "";
    assert.match(quickBody, /program\.addEventListener\("change", \(\) => refreshProgramAndPeriodState\(\{ autofill: true \}\)\)/);
    assert.match(quickBody, /subject\.value = selectedProgram\.name/);
    assert.match(quickBody, /if \(!teacher\.value && selectedProgram\.teacher\) teacher\.value = selectedProgram\.teacher/);
    assert.match(quickBody, /if \(!room\.value && selectedProgram\.room\) room\.value = selectedProgram\.room/);
    assert.match(quickBody, /quickTimetableClassNameAutofillCount/);
    assert.doesNotMatch(quickBody, /name\.value = selectedProgram|name\.value = linkedProgram|name\.value = program/);
  }],
  ["owner preview V134 quick timetable preserves non-program payload and blocks unavailable program or periods", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v134 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V134"));
    const quickBody = v134.match(/function quickTimetableDialogV134[\s\S]*?openQuickCreateV70 = function openQuickCreateV134/)?.[0] || "";
    const setRowBody = quickBody.match(/const setRow = \{[\s\S]*?\};/)?.[0] || "";
    const classRowBody = quickBody.match(/const classRow = \{[\s\S]*?\};/)?.[0] || "";
    assert.doesNotMatch(setRowBody, /programId|sourceType|programType|linkedProgramId/);
    assert.doesNotMatch(classRowBody, /programId|sourceType|programType|linkedProgramId/);
    assert.match(quickBody, /program\.required = needsProgram/);
    assert.match(quickBody, /program\.disabled = !needsProgram \|\| programs\.length === 0/);
    assert.match(quickBody, /save\.disabled = \(needsProgram && programs\.length === 0\) \|\| periodRows\.length === 0/);
    assert.match(quickBody, /if \(requiresProgram\) \{/);
  }],
  ["owner preview V134 quick timetable uses active period sources without hardcoded period generation", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v134 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V134"));
    const periodBody = v134.match(/function activePeriodRowsForQuickTimetableV134[\s\S]*?function selectedQuickTimetableProgramV134/)?.[0] || "";
    assert.match(periodBody, /periodsForTimetableSetV103\(activeSet\)/);
    assert.match(periodBody, /commonPeriodRowsV110\(\)/);
    assert.doesNotMatch(periodBody, /for \(let number = 1|store\.settings\?\.timetablePeriods|TIMETABLE_DEFAULT_VISIBLE_PERIOD_COUNT/);
  }],
  ["owner preview V134 quick timetable exposes save confirm and rollback diagnostics", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v134 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V134"));
    const quickBody = v134.match(/function quickTimetableDialogV134[\s\S]*?openQuickCreateV70 = function openQuickCreateV134/)?.[0] || "";
    assert.match(quickBody, /quickTimetableSaveAttemptCount \+= 1/);
    assert.match(quickBody, /quickTimetableDuplicateClickBlockedCount \+= 1/);
    assert.match(quickBody, /await saveQuickTimetableRemoteV132/);
    assert.match(quickBody, /quickTimetableSetServerConfirmSuccessCount/);
    assert.match(quickBody, /quickTimetableRowServerConfirmSuccessCount/);
    assert.match(quickBody, /quickTimetableRollbackCount \+= 1/);
    assert.match(quickBody, /lastQuickTimetableSaveResult = "server-confirmed"/);
  }],
  ["owner preview V134 public diagnostics include required quick timetable counters safely", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v134 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V134"));
    for (const field of [
      "quickTimetableSaveAttemptCount",
      "quickTimetableSaveSuccessCount",
      "quickTimetableSaveFailureCount",
      "quickTimetableDuplicateClickBlockedCount",
      "quickTimetableSetServerConfirmSuccessCount",
      "quickTimetableRowServerConfirmSuccessCount",
      "quickTimetableRollbackCount",
      "lastQuickTimetableSaveResult",
      "lastQuickTimetableSaveType",
      "quickTimetableActivePeriodCount",
      "quickTimetableProgramRawCount",
      "quickTimetableProgramVisibleCount",
      "quickTimetableProgramDeduplicatedCount",
      "quickTimetableProgramInvalidLabelCount",
      "quickTimetableClassNameAutofillCount"
    ]) assert.match(v134, new RegExp(field));
    assert.match(v134, /window\.PMWorkspaceDataService\.diagnostics = function diagnosticsV134/);
  }],
  ["owner preview V135 quick timetable uses existing set row-only architecture", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v135 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V135"));
    const quickBody = v135.match(/function quickTimetableDialogV135[\s\S]*?openQuickCreateV70 = function openQuickCreateV135/)?.[0] || "";
    const saveBody = v135.match(/async function saveQuickTimetableRowRemoteV135[\s\S]*?let quickTimetableSaveInFlightV135/)?.[0] || "";
    assert.match(v135, /activeQuickTimetableRenderPath: "openQuickCreateV70->quickTimetableDialogV135"/);
    assert.match(v135, /openQuickCreateV70 = function openQuickCreateV135/);
    assert.match(quickBody, /quickTimetableExistingSetV135/);
    assert.doesNotMatch(quickBody, /quickTimetableNameV135|quickTimetableStartV135|quickTimetableEndV135/);
    assert.doesNotMatch(quickBody, /const setRow = \{|store\.timetableSets\.push|confirmed\.setRow/);
    assert.match(saveBody, /\.collection\("timetableSets"\)\.doc\(String\(selectedSet\.id\)\)/);
    assert.match(saveBody, /\.collection\("timetable"\)\.doc\(String\(classRow\.id\)\)/);
    assert.match(saveBody, /rowRef\.set\(rowPayload, \{ merge: true \}\)/);
    assert.doesNotMatch(saveBody, /batch\.set\(setRef|batch\.commit\(\)|setRef\.set/);
  }],
  ["owner preview V135 timetable set creation stays in timetable management path", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v135 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V135"));
    const addBody = v135.match(/addTimetableSetV29 = function addTimetableSetV135[\s\S]*?function editTimetableSetMetadataV135/)?.[0] || "";
    const editBody = v135.match(/function editTimetableSetMetadataV135[\s\S]*?function timetableSetSortValueV135/)?.[0] || "";
    assert.match(addBody, /분류를 입력하세요/);
    assert.match(addBody, /시작일\(선택, YYYY-MM-DD\)/);
    assert.match(addBody, /종료일\(선택, YYYY-MM-DD\)/);
    assert.match(addBody, /상태를 입력하세요/);
    assert.match(addBody, /kind/);
    assert.match(addBody, /visiblePeriodCount/);
    assert.match(addBody, /syncReason: "timetable-set-create-v135"/);
    assert.match(editBody, /syncReason: "timetable-set-metadata-edit-v135"/);
  }],
  ["owner preview V135 quick timetable filters category set options and period scope", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v135 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V135"));
    const selectableBody = v135.match(/function selectableTimetableSetsForQuickV135[\s\S]*?function timetableSetDisplayNameV135/)?.[0] || "";
    const periodsBody = v135.match(/function periodsForQuickTimetableSetV135[\s\S]*?function selectedTimetableSetForQuickV135/)?.[0] || "";
    assert.match(v135, /TIMETABLE_KIND_LABELS_V135/);
    assert.match(v135, /school: "학교"/);
    assert.match(v135, /general: "기타"/);
    assert.match(v135, /specialLectures: "특강"/);
    assert.match(v135, /clubs: "동아리"/);
    assert.match(selectableBody, /timetableSetKindV135\(set\) === wantedKind/);
    assert.match(selectableBody, /\["ended", "archived"\]\.includes\(status\)/);
    assert.match(periodsBody, /periodsForTimetableSetV103\(setId\)/);
    assert.doesNotMatch(periodsBody, /commonPeriodRowsV110|for \(let number = 1|TIMETABLE_DEFAULT_VISIBLE_PERIOD_COUNT/);
  }],
  ["owner preview V135 quick timetable payload policy prevents false success", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v135 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V135"));
    const quickBody = v135.match(/function quickTimetableDialogV135[\s\S]*?openQuickCreateV70 = function openQuickCreateV135/)?.[0] || "";
    const classRowBody = quickBody.match(/const classRow = \{[\s\S]*?\};/)?.[0] || "";
    assert.doesNotMatch(classRowBody, /programId|sourceType/);
    assert.match(quickBody, /if \(isProgramTimetableTypeV131\?\.\(kind\)\) \{/);
    assert.match(quickBody, /classRow\.sourceType = kind/);
    assert.match(quickBody, /classRow\.programId = set\.programId \|\| ""/);
    assert.match(quickBody, /quickTimetableSaveInFlightV135/);
    assert.match(quickBody, /quickTimetableDuplicateClickBlockedCount \+= 1/);
    assert.match(quickBody, /quickTimetableRollbackCount \+= 1/);
    assert.match(quickBody, /quickTimetableFalseSuccessPreventedCount \+= 1/);
    assert.match(quickBody, /lastQuickTimetableSaveResult = "server-confirmed-row-only"/);
  }],
  ["owner preview V135 ended timetable lifecycle panel is display-sort only and delete-safe", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v135 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V135"));
    const panelBody = v135.match(/function timetableEndedManagementPanelV135[\s\S]*?const renderTimetableBeforeV135/)?.[0] || "";
    assert.match(panelBody, /종료된 시간표/);
    assert.match(panelBody, /sortedTimetableSetsV135/);
    assert.match(panelBody, /timetableReactivateAttemptCount/);
    assert.match(panelBody, /timetableDuplicateAttemptCount/);
    assert.match(panelBody, /hasLinkedDataForTimetableSetV135\(set\)/);
    assert.match(panelBody, /timetableDeleteBlockedByLinkedDataCount/);
    assert.match(panelBody, /실제 삭제 대신 보관/);
    assert.doesNotMatch(panelBody, /attendance\.push|assignments\.push|exams\.push|delete\(\)/);
  }],
  ["owner preview V135 public diagnostics expose architecture counters without raw identifiers", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v135 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V135"));
    const publicBody = v135.match(/function ownerPreviewPublicDiagnosticsV135[\s\S]*?const workspaceDiagnosticsBeforeV135/)?.[0] || "";
    for (const field of [
      "quickTimetableExistingSetOptionCount",
      "quickTimetableSelectedSetIdMasked",
      "quickTimetableActivePeriodCount",
      "quickTimetableSaveAttemptCount",
      "quickTimetableSaveSuccessCount",
      "quickTimetableSaveFailureCount",
      "quickTimetableDuplicateClickBlockedCount",
      "quickTimetableServerConfirmSuccessCount",
      "quickTimetableServerConfirmFailureCount",
      "quickTimetableFalseSuccessPreventedCount",
      "timetableEndedCount",
      "timetableArchivedCount",
      "timetableReactivateAttemptCount",
      "timetableReactivateSuccessCount",
      "timetableDuplicateAttemptCount",
      "timetableDuplicateSuccessCount",
      "timetableDeleteBlockedByLinkedDataCount",
      "timetableVisibleIdentifierCount"
    ]) assert.match(publicBody, new RegExp(field));
    assert.match(v135, /window\.PMWorkspaceDataService\.diagnostics = function diagnosticsV135/);
    assert.doesNotMatch(publicBody, /\bworkspaceId\b|\buid\b|\bemail\b|\bprogramId\b|\bsetId\b/);
  }],
  ["owner preview V136 timetable management uses full screens and no raw prompt lifecycle UI", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v136 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V136"));
    const navBody = v136.match(/function timetableManagementNavV136[\s\S]*?function timetableSetSummaryCardV136/)?.[0] || "";
    const editorBody = v136.match(/function openTimetableSetEditorDialogV136[\s\S]*?async function reactivateTimetableSetV136/)?.[0] || "";
    assert.match(v136, /APP_PATCH_VERSION_V136/);
    assert.match(navBody, /\+ 시간표 추가/);
    assert.match(navBody, /현재 시간표 관리/);
    assert.match(navBody, /종료된 시간표/);
    assert.match(navBody, /보관된 시간표/);
    assert.match(v136, /renderCurrentTimetableManagementScreenV136/);
    assert.match(v136, /renderEndedTimetableScreenV136/);
    assert.match(v136, /renderArchivedTimetableScreenV136/);
    assert.match(v136, /removeLegacyTimetableInlineManagementV136/);
    assert.match(v136, /\.timetable-ended-panel-v135/);
    assert.doesNotMatch(editorBody, /\bprompt\s*\(|\bconfirm\s*\(/);
  }],
  ["owner preview V136 timetable lifecycle displays Korean status labels and blocks past-ended creation", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v136 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V136"));
    const validationBody = v136.match(/function validateTimetableDateRangeV136[\s\S]*?function timetableSetDisplayNameV136/)?.[0] || "";
    const editorBody = v136.match(/function openTimetableSetEditorDialogV136[\s\S]*?async function reactivateTimetableSetV136/)?.[0] || "";
    assert.match(v136, /active: "사용 중"/);
    assert.match(v136, /scheduled: "시작 예정"/);
    assert.match(v136, /ended: "종료됨"/);
    assert.match(v136, /archived: "보관됨"/);
    assert.match(v136, /TIMETABLE_PAST_END_BLOCK_MESSAGE_V136/);
    assert.match(validationBody, /normalizedEndDate < normalizedStartDate/);
    assert.match(validationBody, /normalizedEndDate < todayDateStringV136\(\)/);
    assert.match(validationBody, /timetablePastEndCreateBlockedCount \+= 1/);
    assert.match(editorBody, /appendTimetableStatusOptionsV136/);
    assert.match(editorBody, /makeField\("표시 상태"/);
    assert.doesNotMatch(editorBody, /active \/ scheduled|active \/ scheduled \/ ended \/ archived/);
  }],
  ["owner preview V136 current ended archived screens enforce lifecycle separation", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v136 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V136"));
    const lifecycleBody = v136.match(/function timetableSetLifecycleStatusV136[\s\S]*?function validateTimetableDateRangeV136/)?.[0] || "";
    const currentBody = v136.match(/function currentTimetableSetsForManagementV136[\s\S]*?function activeTimetableSetForManagementV136/)?.[0] || "";
    const quickBody = v136.match(/selectableTimetableSetsForQuickV135 = function selectableTimetableSetsForQuickV136[\s\S]*?const addTimetableSetBeforeV136/)?.[0] || "";
    assert.match(lifecycleBody, /explicit === "archived"/);
    assert.match(lifecycleBody, /return "ended"/);
    assert.match(lifecycleBody, /timetableLifecycleStatusFromDatesV136/);
    assert.match(v136, /endValue < todayValue/);
    assert.match(currentBody, /status === "active" \|\| status === "scheduled"/);
    assert.match(v136, /timetableSetsForManagementV136\("ended"\)/);
    assert.match(v136, /timetableSetsForManagementV136\("archived"\)/);
    assert.match(quickBody, /lifecycle === "active" \|\| lifecycle === "scheduled"/);
  }],
  ["owner preview V136 reactivation copy archive and delete policies are server-confirmed", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v136 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V136"));
    const reactivateBody = v136.match(/async function reactivateTimetableSetV136[\s\S]*?function copyTimetableSetV136/)?.[0] || "";
    const copyBody = v136.match(/function copyTimetableSetV136[\s\S]*?async function archiveTimetableSetV136/)?.[0] || "";
    const deleteBody = v136.match(/async function deleteEmptyTimetableSetRemoteV136[\s\S]*?async function clearTimetableRowsRemoteV136/)?.[0] || "";
    const policyBody = v136.match(/async function deleteTimetableSetWithPolicyV136[\s\S]*?async function clearCurrentTimetableRowsV136/)?.[0] || "";
    assert.match(reactivateBody, /startDate: start/);
    assert.match(reactivateBody, /status: "active"/);
    assert.match(reactivateBody, /saveTimetableSetRemoteV136/);
    assert.match(reactivateBody, /timetableReactivateSuccessCount \+= 1/);
    assert.match(copyBody, /시간표 세트와 수업 행만 복사합니다/);
    assert.match(copyBody, /sourceRows = timetableRowsForSetV136/);
    assert.match(copyBody, /timetableRowRefV136\(runtime, rowId\)/);
    assert.doesNotMatch(copyBody, /attendance\.push|assignments\.push|exams\.push|applications\.push|studentRecords\.push/);
    assert.match(v136, /보관함으로 이동/);
    assert.match(v136, /보관 해제/);
    assert.match(deleteBody, /isSystemOwnerForTimetableManagementV136/);
    assert.match(deleteBody, /hasLinkedDataForTimetableSetV136/);
    assert.match(deleteBody, /ref\.delete\(\)/);
    assert.match(deleteBody, /snap\.exists/);
    assert.match(policyBody, /TIMETABLE_LINKED_DELETE_BLOCK_MESSAGE_V136/);
    assert.match(policyBody, /customConfirmDialogV136/);
  }],
  ["owner preview V136 diagnostics expose management counters without raw identifiers", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v136 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V136"));
    const publicBody = v136.match(/function ownerPreviewPublicDiagnosticsV136[\s\S]*?const workspaceDiagnosticsBeforeV136/)?.[0] || "";
    for (const field of [
      "timetableManagementOpenCount",
      "endedTimetableOpenCount",
      "archivedTimetableOpenCount",
      "timetableExpiredDisplayCount",
      "timetablePastEndCreateBlockedCount",
      "timetableReactivateAttemptCount",
      "timetableReactivateSuccessCount",
      "timetableReactivateFailureCount",
      "timetableCopyAttemptCount",
      "timetableCopySuccessCount",
      "timetableArchiveCount",
      "timetableUnarchiveCount",
      "timetableDeleteBlockedLinkedDataCount",
      "timetableEmptySetDeleteSuccessCount",
      "timetableVisibleIdentifierCount"
    ]) assert.match(publicBody, new RegExp(field));
    assert.match(v136, /window\.PMWorkspaceDataService\.diagnostics = function diagnosticsV136/);
    assert.match(v136, /recordVisibleTimetableIdentifiersV136/);
    assert.doesNotMatch(publicBody, /\bworkspaceId\b|\buid\b|\bemail\b|\bprogramId\b|\bsetId\b/);
  }],
  ["owner preview V136.1 returns management screens to the timetable main view without navigation side effects", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v136 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V136"));
    const navBody = v136.match(/function navigateTimetableManagementV136[\s\S]*?function timetableManagementNavV136/)?.[0] || "";
    assert.match(navBody, /TIMETABLE_MANAGEMENT_MODE_KEY_V136/);
    assert.match(navBody, /sessionStorage\.removeItem/);
    assert.match(navBody, /renderTimetableV29/);
    assert.match(navBody, /timetableMainNavigationClickCount/);
    assert.doesNotMatch(navBody, /location\.|window\.location|history\./);
  }],
  ["owner preview V136.1 accepts optional end dates and keeps lifecycle date-derived", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v136 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V136"));
    const validationBody = v136.match(/function validateTimetableDateRangeV136[\s\S]*?function timetableSetDisplayNameV136/)?.[0] || "";
    const lifecycleBody = v136.match(/function timetableSetLifecycleStatusV136[\s\S]*?function validateTimetableDateRangeV136/)?.[0] || "";
    assert.match(v136, /function timetableDateRangeV136/);
    assert.match(validationBody, /if \(!String\(endDate \?\? ""\)\.trim\(\)\)/);
    assert.match(validationBody, /normalizedEndDate < normalizedStartDate/);
    assert.match(validationBody, /normalizedEndDate < todayDateStringV136\(\)/);
    assert.match(v136, /applyTimetableDateConstraintsV136/);
    assert.doesNotMatch(lifecycleBody, /explicit === "scheduled"/);
  }],
  ["owner preview V136.1 separates unarchive from reactivation and resolves the restored view by dates", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v136 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V136"));
    const archiveBody = v136.match(/async function archiveTimetableSetV136[\s\S]*?async function deleteTimetableSetWithPolicyV136/)?.[0] || "";
    assert.match(archiveBody, /timetableLifecycleStatusFromDatesV136/);
    assert.match(archiveBody, /timetableUnarchiveAttemptCount/);
    assert.match(archiveBody, /timetableUnarchiveSuccessCount/);
    assert.match(archiveBody, /restoredStatus === "ended" \? "ended" : "current"/);
    assert.doesNotMatch(archiveBody, /startDate:\s*todayDateStringV136/);
  }],
  ["owner preview B9.2 normalizes lifecycle date input before it reaches a date control", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v136 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V136"));
    const normalizer = v136.match(/function normalizeTimetableDateInputV136[\s\S]*?function validDateStringV136/)?.[0] || "";
    const rangeBody = v136.match(/function timetableDateRangeV136[\s\S]*?function timetableLifecycleStatusFromDatesV136/)?.[0] || "";
    assert.match(normalizer, /raw\.match\(/);
    assert.match(normalizer, /timetableDateTrailingSeparatorFixedCount/);
    assert.match(normalizer, /local\.getDate\(\) !== day/);
    assert.match(rangeBody, /normalizeTimetableDateInputV136\(set\.startDate/);
    assert.match(rangeBody, /normalizeTimetableDateInputV136\(set\.endDate/);
  }],
  ["owner preview B9.2 uses one optional-end-date validator for create edit copy and reactivation", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v136 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V136"));
    const editorBody = v136.match(/function openTimetableSetEditorDialogV136[\s\S]*?async function reactivateTimetableSetV136/)?.[0] || "";
    const reactivateBody = v136.match(/async function reactivateTimetableSetV136[\s\S]*?function copyTimetableSetV136/)?.[0] || "";
    const copyBody = v136.match(/function copyTimetableSetV136[\s\S]*?async function archiveTimetableSetV136/)?.[0] || "";
    assert.match(editorBody, /validateTimetableDateRangeV136/);
    assert.match(reactivateBody, /validateTimetableDateRangeV136/);
    assert.match(copyBody, /validateTimetableDateRangeV136/);
    assert.match(v136, /endDateInput\.max = ""/);
    assert.match(v136, /timetableEndDateClearedAfterStartChangeCount/);
  }],
  ["owner preview V131 school board import separates proxy format network and valid-empty states", () => {
    const schoolSource = readFileSync(path.resolve(projectRoot, "services/schoolIntegrationService.js"), "utf8");
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v131 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V131"));
    assert.match(schoolSource, /looksLikeBoardResponse/);
    assert.match(schoolSource, /school-board-format-invalid/);
    assert.match(schoolSource, /school-board-network-failed/);
    assert.match(schoolSource, /school-proxy-not-configured/);
    assert.doesNotMatch(schoolSource, /fetch\(requestUrl/);
    assert.match(v131, /fetchBoardOwnerPreviewV131/);
    assert.match(v131, /schoolBoardUserMessageV131/);
    assert.match(v131, /새로운 학교 공지가 없습니다/);
    assert.match(v131, /학교 게시판 연동 서버가 아직 설정되지 않았습니다/);
    assert.match(v131, /학교 게시판 응답을 확인할 수 없습니다/);
    assert.match(v131, /학교 게시판 연결에 실패했습니다/);
  }],
  ["owner preview V137 learning management uses canonical references and server-confirmed writes", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v137 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V137"));
    assert.match(v137, /APP_PATCH_VERSION_V137/);
    assert.match(v137, /LEARNING_MANAGEMENT_KEYS_V137/);
    assert.match(v137, /learningSelectSpecV137/);
    assert.match(v137, /선생님을 선택하세요/);
    assert.match(v137, /multi-select-ref/);
    assert.match(v137, /learningTeacherEmailV137/);
    assert.match(v137, /attachmentMode/);
    assert.match(v137, /external-google-drive-not-configured/);
    assert.match(v137, /learningSafeUrlV137/);
    assert.match(v137, /noopener noreferrer/);
    assert.match(v137, /lesson-record-detail/);
    assert.match(v137, /assignmentSubmissions/);
    assert.match(v137, /LEARNING_BULK_DELETE_BATCH_SIZE_V137 = 400/);
    assert.match(v137, /resolveCanonicalCurrentWorkspaceIdV116/);
    assert.match(v137, /checkSaveReadiness/);
    assert.match(v137, /get\(\{ source: "server" \}\)/);
    assert.match(v137, /learning-write-blocked/);
    assert.doesNotMatch(v137, /Drive OAuth.*success/i);
  }],
  ["owner preview V137.1 learning repairs refresh materials, preserve delete cleanup, and retain canonical subject names", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v137 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V137"));
    assert.match(v137, /refreshLearningCollectionFromServerV137/);
    assert.match(v137, /learning-material-list-refresh-missing/);
    assert.match(v137, /현재 필터 조건 때문에 목록에는 표시되지 않습니다/);
    assert.match(v137, /learningCanonicalSubjectRowsV137/);
    assert.match(v137, /learningReferenceRefreshCount/);
    assert.match(v137, /numeric, symbolic, or non-Korean names/);
    assert.match(v137, /docs\.forEach\(\(doc\) => window\.PMWorkspaceDataService\?\.discardPendingRow/);
    assert.match(v137, /lessonRecordBulkDeleteConfirmedRemainingCount/);
    assert.match(v137, /firestoreListen400Count/);
    assert.match(v137, /firestoreListenerRestartCount/);
    assert.match(v137, /lastFirestoreListenerErrorCode/);
  }],
  ["owner preview V137.2 uses canonical subject-id chips, lesson suppression, and public diagnostics", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v137 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V137"));
    assert.match(v137, /learning-subject-picker-v137/);
    assert.match(v137, /연결할 과목을 선택하세요/);
    assert.match(v137, /optionValue/);
    assert.match(v137, /canonicalIds\.has\(id\)/);
    assert.match(v137, /subjectReferenceRefreshCount/);
    assert.match(v137, /teacherReferenceRefreshCount/);
    assert.match(v137, /referenceFilterRefreshCount/);
    assert.match(v137, /ownerPreviewLearningManagementPublicDiagnosticsV137/);
    assert.match(v137, /lessonRecordSuppressions/);
    assert.match(v137, /learningAutoLessonSuppressionKeysV137/);
    assert.match(appSource, /timetable-generated/);
    assert.match(v137, /lesson-suppression-server-confirm-failed/);
    assert.match(v137, /원본 시간표는 유지됩니다/);
    assert.doesNotMatch(v137, /collection\("timetable"\)\.doc\([^)]*\)\.delete/);
  }],
  ["owner preview teacher editor restores the selected document without creating a duplicate", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v137 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V137"));
    assert.match(v137, /async function openTeacherEditorV137/);
    assert.match(v137, /String\(item\.id\) === String\(id\)/);
    assert.match(v137, /collection\("teachers"\)\.doc\(String\(id\)\)\.get\(\{ source: "server" \}\)/);
    assert.match(v137, /수정할 선생님 정보를 불러오지 못했습니다/);
    assert.match(v137, /mode: "edit"/);
    assert.match(v137, /editingDocumentId: String\(row\.id\)/);
    assert.match(v137, /originalTeacherSnapshot/);
    assert.match(v137, /setLearningSubjectRowV137/);
    assert.match(v137, /learningTeacherSubjectSnapshotNamesV137/);
    assert.match(v137, /row\.name \|\| row\.teacherName/);
    assert.match(v137, /row\.type \|\| row\.teacherType/);
    assert.match(v137, /row\.memo \|\| row\.notes/);
    assert.match(v137, /const id = String\(editing\.id \|\| `\$\{key\}-\$\{Date\.now\(\)\}`\)/);
  }],
  ["owner preview learning expansion validates fields and keeps attachments metadata-only", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v137 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V137"));
    assert.match(v137, /LEARNING_REQUIRED_FIELDS_V137/);
    assert.match(v137, /validateLearningRequiredFieldsV137\(key, editorForm\)/);
    assert.match(v137, /learning-required-field-missing/);
    assert.match(v137, /supplementaryMaterials/);
    assert.match(v137, /보조교재 추가/);
    assert.match(v137, /attachment-list/);
    assert.match(v137, /picker\.multiple = true/);
    assert.match(v137, /local-reselect-required/);
    assert.match(v137, /setLearningStructuredRowsV137/);
    assert.match(v137, /Google Drive 연동은 아직 연결되지 않았습니다/);
    assert.match(v137, /learning-link-invalid/);
    assert.match(v137, /exam-schedule-year-date-mismatch/);
    assert.match(v137, /finalBody/);
    assert.match(v137, /showTeacherViewerV137/);
    assert.match(v137, /LEARNING_BULK_DELETE_KEYS_V137/);
    assert.doesNotMatch(v137, /readAsDataURL\(/);
    assert.doesNotMatch(v137, /file:\/\//);
  }],
  ["owner preview learning final repair keeps validation local and detail views identifier-safe", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v137 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V137"));
    assert.match(v137, /APP_PATCH_VERSION_V137 = "v137\.4/);
    assert.match(v137, /records: \["activity"\]/);
    assert.match(v137, /validationBlockedCount/);
    assert.match(v137, /lastLearningValidationResult = "validation-blocked"/);
    assert.match(v137, /payload\.subjectIds = ids/);
    assert.doesNotMatch(v137, /payload\.subjectIds = JSON\.stringify\(ids\)/);
    assert.match(v137, /teacherSubjectUpdateAttemptCount/);
    assert.match(v137, /showLearningViewerV137/);
    assert.match(v137, /learningSupplementaryMaterialsV137\(row\)\.forEach/);
    assert.match(v137, /learningExamLifecycleStateV137/);
    assert.match(v137, /learning-exam-tab-v137/);
    assert.match(v137, /openRecordEditorV137/);
    assert.match(v137, /name === "location"/);
  }],
  ["owner preview learning closure blocks duplicate subject picks, preserves first record save, and computes exam lifecycle locally", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v137 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V137"));
    assert.match(v137, /pickOption\.disabled = selected\.has\(id\)/);
    assert.match(v137, /if \(selected\.has\(id\)\)/);
    assert.match(v137, /이미 선택된 과목입니다/);
    assert.match(v137, /payload\.subjectIds = ids/);
    assert.match(v137, /prepareRecordEditorValidationV137/);
    assert.match(v137, /editorForm\.noValidate = true/);
    assert.match(v137, /learningEditorSaveInFlightV137/);
    assert.match(v137, /recordSaveAttemptCount/);
    assert.match(v137, /learningAttachmentTypeLabelV137/);
    assert.match(v137, /learningAttachmentSizeLabelV137/);
    assert.match(v137, /이 기기에서 다시 선택해야 합니다/);
    assert.doesNotMatch(v137, /item\.size \? `\$\{item\.size\} bytes`/);
    assert.match(v137, /learningLocalDatePartsV137/);
    assert.match(v137, /row\.end_date \|\| row\.endDate \|\| row\.examDate \|\| row\.date \|\| row\.startDate/);
    assert.match(v137, /now\.getTime\(\) >= endAt\.getTime\(\)/);
    assert.match(v137, /examDate\.getTime\(\) < todayStart\.getTime\(\)/);
    assert.match(v137, /row\.completed === true \|\| row\.ended === true \|\| row\.closed === true/);
  }],
  ["record editor first submit keeps only activity required and binds one server-confirm path", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const start = appSource.indexOf("function prepareRecordEditorValidationV137");
    const v137 = appSource.slice(start, start + 2200);
    assert.match(v137, /editorForm\.querySelectorAll\("\[required\]"\)/);
    assert.match(v137, /control\.name === "activity"/);
    assert.match(v137, /submit\.formNoValidate = true/);
    assert.match(v137, /function bindRecordEditorSubmitV137/);
    assert.match(appSource, /bindRecordEditorSubmitV137\(\);/);
    assert.match(v137, /removeEventListener\("submit", saveLearningEditorWithServerConfirmV137, true\)/);
  }],
  ["Batch 10C core keeps assessment writes server-confirmed and listener free", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v138 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V138"));
    assert.match(v138, /assessmentPlans/);
    assert.match(v138, /assessmentResults/);
    assert.match(v138, /achievementPolicies/);
    assert.match(v138, /get\(\{ source: "server" \}\)/);
    assert.match(v138, /assessment-server-confirm-failed/);
    assert.match(v138, /activeListenerCount: 0/);
    assert.match(v138, /auditLogWriteCount: 0/);
    assert.doesNotMatch(v138, /onSnapshot/);
    assert.doesNotMatch(v138, /Google Drive 저장됨/);
  }],
  ["Batch 10D portfolio core uses the existing metadata editor with server-confirmed save", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v137 = appSource.slice(appSource.indexOf("const LEARNING_MANAGEMENT_KEYS_V137"), appSource.indexOf("const APP_PATCH_VERSION_V138"));
    assert.match(v137, /"portfolios"/);
    assert.match(v137, /portfolios: \["title"\]/);
    assert.match(v137, /set\(row, \{ merge: true \}\)/);
    assert.match(v137, /get\(\{ source: "server" \}\)/);
    assert.doesNotMatch(v137, /readAsDataURL\(/);
  }],
  ["Batch 10C pure calculations enforce score, rank, achievement, and grade preview policy", () => {
    const source = readFileSync(path.resolve(projectRoot, "services/examGradeService.js"), "utf8");
    const context = { globalThis: {} };
    vm.runInNewContext(source, context, { filename: "examGradeService.js" });
    const service = context.globalThis.PMExamGradeService;
    assert.ok(service);
    assert.equal(service.calculateAssessmentScore({ rawScore: 50, maxScore: 100, weight: 30 }).weightedScore, 15);
    assert.equal(service.calculateAssessmentScore({ rawScore: 101, maxScore: 100 }).code, "score-exceeds-max");
    assert.deepEqual(service.calculateRanks([{ id: "a", score: 90 }, { id: "b", score: 90 }, { id: "c", score: 80 }], "competition").map((row) => row.rank), [1, 1, 3]);
    assert.deepEqual(service.calculateRanks([{ id: "a", score: 90 }, { id: "b", score: 90 }, { id: "c", score: 80 }], "dense").map((row) => row.rank), [1, 1, 2]);
    const policy = { id: "policy", name: "구간", scoreSource: "rawScore", version: 1, thresholds: [{ label: "A", minimumScore: 51, order: 1 }, { label: "B", minimumScore: 41, order: 2 }, { label: "C", minimumScore: 31, order: 3 }, { label: "D", minimumScore: 21, order: 4 }, { label: "E", minimumScore: null, fallback: true, order: 5 }] };
    assert.equal(service.calculateAchievement(policy, { rawScore: 51 }).calculatedAchievement, "A");
    assert.equal(service.calculateAchievement(policy, { rawScore: 50 }).calculatedAchievement, "B");
    assert.equal(service.calculateAchievement(policy, { rawScore: 20 }).calculatedAchievement, "E");
    assert.equal(service.previewFiveGrade([{ score: 90 }, { score: 80 }, { score: 70 }]).requiresConfirmation, true);
    assert.equal(service.validateAchievementPolicy({ ...policy, thresholds: [{ label: "A", minimumScore: 51 }, { label: "A", minimumScore: null, fallback: true }] }).ok, false);
    assert.match(service.buildCsv([{ key: "title", label: "title" }], [{ title: "=1+1" }]), /"'=1\+1"/);
  }],
  ["Batch 10C/10D operational UI defaults to the grade list and keeps destructive actions reauthenticated", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v139 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V139"));
    assert.match(v139, /\["list",/);
    assert.match(v139, /return .*\? tab : "list"/);
    assert.match(v139, /function requestSensitiveDeleteV139/);
    assert.match(v139, /requirePassword\(async/);
    assert.match(v139, /deleteExamGradeRowsWithServerConfirmV139/);
    assert.match(v139, /deletePortfolioRowsWithServerConfirmV139/);
    assert.match(v139, /get\(\{ source: "server" \}\)/);
    assert.match(v139, /activeListenerCount: 0/);
    assert.doesNotMatch(v139, /onSnapshot/);
  }],
  ["Batch 10D portfolio UI normalizes legacy links without Drive upload or hidden password fields", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v139 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V139"));
    assert.match(v139, /normalizePortfolioUrlV139/);
    assert.match(v139, /learningStructuredRowsV137\(linkField\?\.value\)/);
    assert.match(v139, /legacyUrls = \[row\.file_link, row\.image_link, row\.video_link, row\.result_link\]/);
    assert.match(v139, /\["attachments", "파일 첨부", "attachment-list"\]/);
    assert.doesNotMatch(v139, /readAsDataURL\(/);
    assert.doesNotMatch(v139, /drive\.googleapis\.com/);
  }],
  ["Portfolio deletion is isolated, reauthenticated, and server-confirmed", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const start = appSource.indexOf("async function deletePortfolioRowsWithServerConfirmV139");
    const end = appSource.indexOf("function requestPortfolioDeleteV139", start);
    const portfolioDelete = appSource.slice(start, end);
    const requestStart = appSource.indexOf("function requestPortfolioDeleteV139");
    const requestEnd = appSource.indexOf("window.PMPortfolioDeleteDiagnostics", requestStart);
    const requestDelete = appSource.slice(requestStart, requestEnd);
    assert.ok(start >= 0 && end > start);
    assert.doesNotMatch(portfolioDelete, /examGradeRowsV139|examGradeDeleteInFlightV139|assessmentResults|examQuestions|studentAnswers/);
    assert.match(portfolioDelete, /portfolioRowsV139\(\)/);
    assert.match(portfolioDelete, /collection\("portfolios"\)/);
    assert.match(portfolioDelete, /get\(\{ source: "server" \}\)/);
    assert.match(portfolioDelete, /delete-server-confirmed/);
    assert.match(portfolioDelete, /refreshing/);
    assert.match(portfolioDelete, /selection-cleared/);
    assert.match(portfolioDelete, /portfolioSelectionV139\.clear\(\)/);
    assert.match(requestDelete, /requirePassword\(async/);
    assert.match(requestDelete, /reauth-started/);
    assert.match(requestDelete, /reauth-confirmed/);
    assert.match(appSource, /requestPortfolioDeleteV139\("포트폴리오 선택", \[\.\.\.portfolioSelectionV139\]\)/);
    assert.match(appSource, /requestPortfolioDeleteV139\("현재 워크스페이스 포트폴리오 전체", rows\.map/);
    assert.match(appSource, /requestPortfolioDeleteV139\("포트폴리오", \[row\.id\]\)/);
    assert.match(portfolioDelete, /삭제 처리 중 알 수 없는 오류가 발생했습니다\. 삭제 여부를 확인한 뒤 다시 시도해 주세요\./);
  }],
  ["Batch 10C/10D final active path renders the operational exam and portfolio views", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v140 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V140"));
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    assert.match(indexHtml, /id="pm-exam-grade-service" src="services\/examGradeService\.js\?v=2"/);
    assert.match(v140, /renderPage = function renderPageV140/);
    assert.match(v140, /key === "portfolios"/);
    assert.match(v140, /renderPortfolioV139\(\)/);
    assert.match(v140, /queueMicrotask/);
    assert.match(v140, /canonicalPortfolioAttachmentsV140/);
    assert.match(v140, /sizeBytes/);
    assert.doesNotMatch(v140, /localAttachmentKey/);
    assert.doesNotMatch(v140, /onSnapshot/);
  }],
  ["Batch 10C final dispatcher keeps exam schedules separate from the advanced exam grade shell", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    const v148 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V148"));
    assert.match(indexHtml, /app\.js\?v=164/);
    assert.match(v148, /renderPage = function renderPageV148/);
    assert.match(v148, /key === "exams" && currentPage === "exams"/);
    assert.match(v148, /renderExamsV6\(\)/);
    assert.match(appSource, /key === "examSchedules"\) return renderCollectionV7\("examSchedules"\)/);
    assert.match(appSource, /\["list",/);
    assert.match(appSource, /\["plans",/);
    assert.match(appSource, /\["assessments",/);
    assert.match(appSource, /\["entry",/);
    assert.match(appSource, /\["summary",/);
    assert.match(appSource, /\["grades",/);
    assert.match(appSource, /\["policies",/);
    assert.match(appSource, /\["questions",/);
    assert.match(appSource, /\["answers",/);
    assert.match(appSource, /\["analysis",/);
    assert.match(appSource, /\["export",/);
  }],
  ["Batch 10C/10D guided UI keeps portfolio metadata private and exposes safe mode states", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const v149 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V149"));
    const portfolioViewer = v149.slice(v149.indexOf("function showPortfolioViewerV149"), v149.indexOf("function examGradeStartGuideV149"));
    assert.match(v149, /appVersion: APP_PATCH_VERSION_V149/);
    assert.match(portfolioViewer, /파일 정보만 저장됨/);
    assert.match(portfolioViewer, /다른 기기에서는 파일을 다시 선택해야 합니다/);
    assert.match(portfolioViewer, /등록된 자료 링크가 없습니다/);
    assert.match(portfolioViewer, /첨부된 파일이 없습니다/);
    assert.doesNotMatch(portfolioViewer, /JSON\.stringify|metadata-only|needsReselection|localAttachmentKey/);
    assert.match(v149, /function examGradeStartGuideV149/);
    assert.match(v149, /1\. 과목과 담당 교사를 먼저 등록/);
    assert.match(v149, /function examGradeStudentAdapterV149/);
    assert.match(v149, /source: "unavailable"/);
    assert.match(v149, /student-selector-empty-v156/);
    assert.match(v149, /function examGradePolicyTabV149/);
    assert.match(v149, /현재 워크스페이스 전체/);
    assert.match(v149, /특정 반\/그룹·과목/);
    assert.match(v149, /백분율 점수/);
    assert.match(v149, /A 최소 점수/);
    assert.match(v149, /function examGradeExportTabV149/);
    assert.match(v149, /Microsoft Excel 또는 Google Sheets/);
    assert.match(v149, /전용 XLSX 파일 내려받기는 현재 제공하지 않습니다/);
  }],
  ["Batch 10E keeps operation mode server-confirmed, owner-only, and data-preserving", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const adminSource = readFileSync(path.resolve(projectRoot, "services/systemAdminService.js"), "utf8");
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    const v150 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V150"));
    assert.match(indexHtml, /app\.js\?v=164/);
    assert.match(indexHtml, /systemAdminService\.js\?v=20/);
    assert.match(v150, /function renderOperationModeAdminV153/);
    assert.match(v150, /function isSystemOwnerV150/);
    assert.match(v150, /requirePassword\(async/);
    assert.match(v150, /operation-mode-data-preservation-failed/);
    assert.match(v150, /function examGradeModeContractV150/);
    assert.match(v150, /ASSESSMENT_PLAN_STATUS_OPTIONS_V150/);
    assert.match(v150, /function examGradeCreateApprovalV150/);
    assert.doesNotMatch(v150, /onSnapshot/);
    assert.match(adminSource, /async function changeWorkspaceOperationMode/);
    assert.match(adminSource, /operationModeCounts/);
    assert.match(adminSource, /batch\.set\(workspaceRef/);
    assert.match(adminSource, /batch\.set\(historyRef/);
    assert.match(adminSource, /operation-mode-server-confirm-failed/);
    assert.match(adminSource, /dataPreserved: true/);
  }],
  ["P0 V153 keeps operation-mode entry finite, read-only, and retryable", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const adminSource = readFileSync(path.resolve(projectRoot, "services/systemAdminService.js"), "utf8");
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    const start = appSource.indexOf('const APP_PATCH_VERSION_V153 = "v153.0 - 2026-07-30"');
    const end = appSource.indexOf("const ownerPreviewModeSnapshotBeforeV150", start);
    assert.ok(start >= 0 && end > start);
    const v153 = appSource.slice(start, end);
    assert.match(indexHtml, /app\.js\?v=164/);
    assert.match(indexHtml, /systemAdminService\.js\?v=20/);
    assert.match(indexHtml, /examGradeService\.js\?v=2/);
    assert.equal((v153.match(/function renderOperationModeAdminV153/g) || []).length, 1);
    assert.match(v153, /renderSystemOwnerConsoleV54 = function renderSystemOwnerConsoleV153/);
    assert.match(v153, /if \(!isSystemOwnerV150\(\)\)/);
    assert.match(v153, /operationModeWorkspaceRowsV153/);
    assert.match(v153, /operationModeCanonicalWorkspaceIdV153/);
    assert.match(v153, /getWorkspaceById/);
    assert.match(v153, /변경할 수 있는 워크스페이스가 없습니다/);
    assert.match(v153, /워크스페이스 정보를 불러오지 못했습니다/);
    assert.match(v153, /currentRequestPromise/);
    assert.match(v153, /requestToken/);
    assert.match(v153, /activeRequestCount:\s*0/);
    assert.match(v153, /operationModeEntryStateV153\.isLoading = false/);
    assert.match(v153, /다시 시도/);
    assert.match(v153, /변경 이력 보기/);
    assert.match(v153, /historyLoadCount \+= 1/);
    assert.doesNotMatch(v153, /loadOperationModeHistoryV150\(\)\.then/);
    assert.doesNotMatch(v153, /operationModeCounts|onSnapshot|setInterval/);
    assert.match(v153, /window\.PMModeDiagnostics/);
    assert.match(v153, /snapshot: \(\) => \(\{ \.\.\.operationModeDiagnosticsV153 \}\)/);
    const readerStart = adminSource.indexOf("async function getWorkspaceById");
    const readerEnd = adminSource.indexOf("async function isSystemOwner", readerStart);
    assert.ok(readerStart >= 0 && readerEnd > readerStart);
    const reader = adminSource.slice(readerStart, readerEnd);
    assert.match(reader, /\.collection\("workspaces"\)\.doc\(targetId\)\.get\(\{ source: "server" \}\)/);
    assert.doesNotMatch(reader, /\.set\(|\.update\(|\.delete\(|onSnapshot|setInterval/);
  }],
  ["Batch 10G routes menus and history through one operation-mode UI contract", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    const packageJson = readFileSync(path.resolve(projectRoot, "package.json"), "utf8");
    const firebaseConfigGenerator = readFileSync(path.resolve(projectRoot, "scripts/generate-firebase-config.mjs"), "utf8");
    const resolverStart = appSource.indexOf("function normalizeOperationModeV154");
    const resolverEnd = appSource.indexOf("\nfunction operationModeWorkspaceIdV154", resolverStart);
    assert.ok(resolverStart >= 0 && resolverEnd > resolverStart);
    const resolver = vm.runInNewContext(`(() => {
      ${appSource.slice(resolverStart, resolverEnd)}
      return resolveOperationModeUiV154;
    })()`);
    const features = [
      "dashboard", "notices", "materials", "portfolios", "systemOwner",
      "people", "teachers", "timetable", "attendance", "exams", "records",
      "schoolNotices", "budget", "subjects", "assignments", "lessons",
      "academic", "afterschool", "specialLectures", "clubs", "print"
    ];
    const school = resolver({ appTarget: "main", operationMode: "school", globalRole: "user", workspaceRole: "teacher", availableFeatures: features });
    assert.equal(school.normalizedMode, "school");
    ["dashboard", "notices", "people", "teachers", "timetable", "attendance", "exams", "records"].forEach((key) => assert.ok(school.visibleMenuIds.includes(key)));
    assert.ok(school.visibleMenuIds.includes("budget"));
    const academy = resolver({ appTarget: "main", operationMode: "academy", globalRole: "user", workspaceRole: "manager", availableFeatures: features });
    ["people", "teachers", "attendance", "exams", "records"].forEach((key) => assert.ok(academy.visibleMenuIds.includes(key)));
    assert.ok(academy.hiddenMenuIds.includes("schoolNotices"));
    assert.ok(academy.hiddenMenuIds.includes("budget"));
    const personal = resolver({ appTarget: "main", operationMode: "personal", globalRole: "user", workspaceRole: "normal", availableFeatures: features });
    ["dashboard", "notices", "materials", "portfolios", "subjects", "assignments", "exams", "records"].forEach((key) => assert.ok(personal.visibleMenuIds.includes(key)));
    ["people", "teachers", "timetable", "attendance", "budget"].forEach((key) => assert.ok(personal.hiddenMenuIds.includes(key)));
    const unconfigured = resolver({ appTarget: "main", operationMode: "unexpected-mode", globalRole: "user", workspaceRole: "normal", availableFeatures: features });
    assert.equal(unconfigured.normalizedMode, "integrated_unconfigured");
    ["dashboard", "notices", "materials", "portfolios"].forEach((key) => assert.ok(unconfigured.visibleMenuIds.includes(key)));
    ["people", "teachers", "timetable", "attendance", "exams"].forEach((key) => assert.ok(unconfigured.hiddenMenuIds.includes(key)));
    const owner = resolver({ appTarget: "main", operationMode: "integrated-unconfigured", globalRole: "system_owner", workspaceRole: "", availableFeatures: features });
    assert.ok(owner.visibleMenuIds.includes("systemOwner"));
    const adminPersonal = resolver({ appTarget: "admin-standalone", operationMode: "personal", globalRole: "system_owner", workspaceRole: "", availableFeatures: features });
    const adminSchool = resolver({ appTarget: "admin-standalone", operationMode: "school", globalRole: "system_owner", workspaceRole: "", availableFeatures: features });
    const adminAcademy = resolver({ appTarget: "admin-standalone", operationMode: "academy", globalRole: "system_owner", workspaceRole: "", availableFeatures: features });
    const adminUnconfigured = resolver({ appTarget: "admin-standalone", operationMode: "integrated-unconfigured", globalRole: "system_owner", workspaceRole: "", availableFeatures: features });
    [adminPersonal, adminSchool, adminAcademy, adminUnconfigured].forEach((result) => {
      assert.equal(result.visibleMenuIds.join(","), "systemOwner");
      assert.ok(result.systemManagementMenuIds.includes("operation-mode"));
      assert.ok(result.systemManagementMenuIds.includes("user-permissions"));
      assert.ok(result.systemManagementMenuIds.includes("audit-logs"));
    });
    ["subjects", "assignments", "records"].forEach((key) => assert.ok(adminPersonal.workspaceFeatureMenuIds.includes(key)));
    ["people", "teachers", "timetable", "attendance", "academic"].forEach((key) => assert.ok(adminSchool.workspaceFeatureMenuIds.includes(key)));
    ["people", "teachers", "lessons", "attendance"].forEach((key) => assert.ok(adminAcademy.workspaceFeatureMenuIds.includes(key)));
    assert.equal(adminUnconfigured.workspaceFeatureMenuIds.length, 0);
    assert.equal(adminSchool.modeLabel, school.modeLabel);
    assert.equal(adminSchool.modeDescription, school.modeDescription);
    assert.equal(adminAcademy.modeLabel, academy.modeLabel);
    assert.equal(adminPersonal.modeLabel, personal.modeLabel);
    assert.equal(adminUnconfigured.normalizedMode, unconfigured.normalizedMode);
    assert.notEqual(adminSchool.appTarget, adminSchool.normalizedMode);
    const nonOwnerAdmin = resolver({ appTarget: "admin-standalone", operationMode: "school", globalRole: "user", workspaceRole: "manager", availableFeatures: features });
    assert.equal(nonOwnerAdmin.visibleMenuIds.length, 0);
    assert.equal(nonOwnerAdmin.systemManagementMenuIds.length, 0);
    assert.match(indexHtml, /app\.js\?v=164/);
    assert.match(appSource, /const APP_PATCH_VERSION_V154 = "v154\.0 - 2026-07-31"/);
    assert.match(appSource, /return operationModeUiForCurrentUserV154\(available\)\.visibleMenuIds/);
    assert.match(appSource, /const modeDecision = operationModeRouteDecisionV154\(key\)/);
    assert.match(appSource, /renderOperationModeDashboardNoticeV154/);
    assert.match(appSource, /modeServerLoadCount \+= 1/);
    assert.match(appSource, /operationModeUiStateV154\.loadPromise/);
    assert.match(appSource, /selectedAdminWorkspaceId/);
    assert.match(appSource, /selectedDifferentWorkspace/);
    assert.match(appSource, /metadataVerifiedWorkspaceId/);
    assert.match(appSource, /candidate\.source === "workspace-metadata"/);
    assert.match(appSource, /workspaceId === operationModeCanonicalWorkspaceIdV154\(\)/);
    assert.match(appSource, /PMSystemAdminService\?\.getWorkspaceById/);
    assert.doesNotMatch(appSource.slice(appSource.indexOf("function operationModeCandidateV154"), appSource.indexOf("function invalidateOperationModeUiV154")), /localStorage/);
    assert.match(appSource, /appTarget: normalizedAppTarget/);
    assert.match(appSource, /admin-standalone-system-menu-only/);
    assert.match(appSource, /renderAdminStandaloneOperationModePanelV154/);
    assert.match(appSource, /syncAdminStandaloneOperationModePanelV154/);
    assert.match(appSource, /window\.PMSystemAdminService\?\.changeWorkspaceOperationMode/);
    assert.equal((appSource.match(/changeWorkspaceOperationMode\?\.\(payload\)/g) || []).length, 1);
    assert.equal((indexHtml.match(/src="app\.js\?v=164"/g) || []).length, 1);
    assert.equal((indexHtml.match(/src="services\/systemAdminService\.js\?v=20"/g) || []).length, 1);
    assert.match(packageJson, /"build:admin":\s*"tsc --noEmit && vite build --outDir dist-admin"/);
    assert.match(packageJson, /"postbuild:admin":\s*"[^"]*--exclude-runtime-env[^"]*--target admin-standalone[^"]*dist-admin\/pm-env\.js"/);
    assert.match(firebaseConfigGenerator, /const appTarget = cli\.target \|\| "main"/);
    assert.doesNotMatch(firebaseConfigGenerator, /npm_lifecycle_event|inferredAppTarget/);
    assert.match(firebaseConfigGenerator, /window\.PM_APP_TARGET/);
    assert.match(appSource, /historyLoadCount \+= 1/);
    assert.doesNotMatch(appSource.slice(appSource.indexOf("function populateOperationModeAdminV153"), appSource.indexOf("function renderOperationModeAdminV153")), /loadOperationModeHistoryV150\(true\).*renderSystemOwnerConsole/);
    assert.match(appSource, /operationModeHistoryTimeLabelV154\(row\)/);
    assert.match(appSource, /operationModeActorLabelV154\(row\)/);
    assert.match(appSource, /row\.serverConfirmed === true && row\.dataPreserved === true/);
    const historyStart = appSource.indexOf("function operationModeHistoryMillisV154");
    const historyEnd = appSource.indexOf("\nasync function loadOperationModeHistoryV150", historyStart);
    const historyContext = { currentUser: { uid: "owner-current" } };
    vm.runInNewContext(`${appSource.slice(historyStart, historyEnd)}
      result = {
        missingTime: operationModeHistoryTimeLabelV154({}),
        namedActor: operationModeActorLabelV154({ actorDisplayName: "관리자" }),
        currentActor: operationModeActorLabelV154({ actorUid: "owner-current" }),
        missingActor: operationModeActorLabelV154({}),
        maskedEmail: operationModeActorLabelV154({ actorEmail: "owner@example.test" })
      };`, historyContext);
    assert.equal(historyContext.result.missingTime, "시각 확인 불가");
    assert.equal(historyContext.result.namedActor, "관리자");
    assert.equal(historyContext.result.currentActor, "시스템 소유자");
    assert.equal(historyContext.result.missingActor, "확인되지 않은 사용자");
    assert.equal(historyContext.result.maskedEmail, "o***@example.test");
    assert.doesNotMatch(historyContext.result.maskedEmail, /owner@example\.test/);
    assert.doesNotMatch(appSource.slice(resolverStart, appSource.indexOf("async function loadOperationModeHistoryV150", resolverStart)), /onSnapshot|setInterval/);
    assert.match(appSource, /snapshot: \(\) => \(\{ \.\.\.operationModeDiagnosticsV153 \}\)/);
  }],
  ["Batch 10E extends grade editing with server-confirmed audit, scoped policy, and CSV preview", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    const v151 = appSource.slice(appSource.indexOf("const APP_PATCH_VERSION_V151"));
    assert.match(indexHtml, /app\.js\?v=164/);
    assert.match(v151, /function examGradeAuditPayloadV151/);
    assert.match(v151, /gradeAuditLogs/);
    assert.match(v151, /batch\.set\(auditRef/);
    assert.match(v151, /function examGradePlanTabV151/);
    assert.match(v151, /review_requested/);
    assert.match(v151, /function examGradeAssessmentTabV151/);
    assert.match(v151, /subjectFilter/);
    assert.match(v151, /function examGradePolicyScopeNeedsV151/);
    assert.match(v151, /academic-year-term-subject/);
    assert.match(v151, /function examGradeParseCsvV151/);
    assert.match(v151, /학생 식별값/);
    assert.doesNotMatch(v151, /onSnapshot/);
  }],
  ["Batch 10H provides a workspace-scoped read-only canonical student roster adapter", async () => {
    const serviceSource = readFileSync(path.resolve(projectRoot, "services/studentRosterService.js"), "utf8");
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    const context = { console };
    vm.runInNewContext(serviceSource, context, { filename: "studentRosterService.js" });
    const service = context.PMStudentRosterService;
    assert.ok(service);
    assert.equal(context.PMStudentRosterDiagnostics.snapshot().sensitiveValueDetected, false);

    let releaseCanonical;
    let canonicalReads = 0;
    const canonicalFetch = () => {
      canonicalReads += 1;
      return new Promise((resolve) => { releaseCanonical = resolve; });
    };
    const canonicalOptions = {
      workspaceId: "workspace-a",
      operationMode: "school",
      authorized: true,
      people: [{ id: "legacy-student", role: "student", name: "Legacy Student" }],
      fetchStudents: canonicalFetch
    };
    const firstLoad = service.loadStudentRoster(canonicalOptions);
    const reusedLoad = service.loadStudentRoster(canonicalOptions);
    assert.strictEqual(firstLoad, reusedLoad);
    releaseCanonical([
      { id: "student-2", displayName: "Beta", grade: "2", className: "1", studentNumber: "2", authUid: "optional-auth-link" },
      { id: "student-1", displayName: "Alpha", grade: "1", className: "2", studentNumber: "10" },
      { id: "student-inactive", displayName: "Inactive", active: false },
      { id: "student-deleted", displayName: "Deleted", deleted: true },
      { id: "student-other-workspace", displayName: "Other", workspaceId: "workspace-b" }
    ]);
    const canonical = await firstLoad;
    assert.equal(canonicalReads, 1);
    assert.equal(canonical.source, "students");
    assert.equal(canonical.canonicalCount, 2);
    assert.equal(canonical.fallbackCount, 0);
    assert.equal(canonical.rows.length, 2);
    assert.equal(canonical.rows[0].studentId, "student-1");
    assert.equal(canonical.rows.every((row) => row.canonical === true && row.writable === false), true);
    assert.equal(canonical.rows.some((row) => row.legacySourceId === "legacy-student"), false);
    assert.equal(canonical.rows[1].authUid, "optional-auth-link");
    assert.equal(service.canUseStudentForWrite(canonical.rows[0]), false);
    assert.equal(service.resolveStudentSelection(canonical.rows[0].key, { workspaceId: "workspace-a" }).studentId, "student-1");
    assert.equal(service.resolveStudentSelection(canonical.rows[0].studentId, { workspaceId: "workspace-b" }), null);
    const cachedCanonical = await service.loadStudentRoster(canonicalOptions);
    assert.strictEqual(cachedCanonical, canonical);
    assert.equal(canonicalReads, 1);

    service.invalidateStudentRosterForWorkspace("workspace-a");
    const fallback = await service.loadStudentRoster({
      workspaceId: "workspace-a",
      operationMode: "academy",
      authorized: true,
      fetchStudents: async () => [],
      people: [
        { id: "person-student-role", role: "student", name: "Role Student", studentNo: "100" },
        { id: "person-student-flag", isStudent: true, name: "Flag Student" },
        { id: "person-friend", role: "student", relationship: "friend", name: "Friend" },
        { id: "person-family", isStudent: true, relationship: "가족", name: "Family" },
        { id: "person-teacher", role: "teacher", isStudent: true, name: "Teacher" },
        { id: "person-manager", role: "manager", isStudent: true, name: "Manager" },
        { id: "person-uncertain", name: "Uncertain", grade: "3" },
        { id: "person-inactive", role: "student", active: false, name: "Inactive" },
        { id: "person-deleted", role: "student", deleted: true, name: "Deleted" },
        { id: "person-other-workspace", role: "student", workspaceId: "workspace-b", name: "Other" }
      ]
    });
    assert.equal(fallback.source, "people_fallback");
    assert.equal(fallback.canonicalCount, 0);
    assert.equal(fallback.fallbackCount, 2);
    assert.equal(fallback.rows.every((row) => row.studentId === null && row.writable === false && row.canonical === false), true);
    assert.equal(fallback.rows.every((row) => row.key.startsWith("legacy-person:")), true);
    assert.equal(fallback.rows.some((row) => ["Role Student", "Flag Student"].includes(row.studentId)), false);
    assert.equal(service.canUseStudentForWrite(fallback.rows[0]), false);

    let unauthorizedReads = 0;
    await assert.rejects(() => service.loadStudentRoster({
      workspaceId: "workspace-unauthorized",
      operationMode: "school",
      authorized: false,
      people: [{ id: "fallback", role: "student" }],
      fetchStudents: async () => { unauthorizedReads += 1; return []; }
    }), (error) => error.code === "STUDENT_ROSTER_PERMISSION_DENIED");
    assert.equal(unauthorizedReads, 0);

    await assert.rejects(() => service.loadStudentRoster({
      workspaceId: "workspace-denied",
      operationMode: "school",
      authorized: true,
      people: [{ id: "must-not-fallback", role: "student" }],
      fetchStudents: async () => { throw Object.assign(new Error("denied"), { code: "permission-denied" }); }
    }), (error) => error.code === "STUDENT_ROSTER_PERMISSION_DENIED");
    assert.equal(service.getCachedStudentRoster("workspace-denied"), null);

    let blockedModeReads = 0;
    const personal = await service.loadStudentRoster({
      workspaceId: "workspace-personal",
      operationMode: "personal",
      authorized: true,
      fetchStudents: async () => { blockedModeReads += 1; return []; }
    });
    const unconfigured = await service.loadStudentRoster({
      workspaceId: "workspace-unconfigured",
      operationMode: "integrated_unconfigured",
      authorized: true,
      fetchStudents: async () => { blockedModeReads += 1; return []; }
    });
    assert.equal(personal.source, "blocked");
    assert.equal(unconfigured.source, "blocked");
    assert.equal(blockedModeReads, 0);

    let workspaceAReads = 0;
    let workspaceBReads = 0;
    service.clearStudentRosterCache();
    await service.loadStudentRoster({
      workspaceId: "workspace-a",
      operationMode: "school",
      authorized: true,
      fetchStudents: async () => { workspaceAReads += 1; return [{ id: "student-a", displayName: "A" }]; }
    });
    await service.loadStudentRoster({
      workspaceId: "workspace-b",
      operationMode: "academy",
      authorized: true,
      fetchStudents: async () => { workspaceBReads += 1; return [{ id: "student-b", displayName: "B" }]; }
    });
    assert.equal(workspaceAReads, 1);
    assert.equal(workspaceBReads, 1);
    assert.equal(service.getCachedStudentRoster("workspace-a").rows[0].studentId, "student-a");
    assert.equal(service.getCachedStudentRoster("workspace-b").rows[0].studentId, "student-b");

    const diagnosticsJson = JSON.stringify(context.PMStudentRosterDiagnostics.snapshot());
    assert.doesNotMatch(diagnosticsJson, /Role Student|Flag Student|optional-auth-link|student-a|student-b|@/);
    assert.doesNotMatch(serviceSource, /onSnapshot|localStorage|sessionStorage|addDoc|setDoc|updateDoc|deleteDoc|writeBatch/);
    assert.equal((indexHtml.match(/services\/studentRosterService\.js\?v=2/g) || []).length, 1);
    assert.ok(indexHtml.indexOf("services/studentRosterService.js?v=2") < indexHtml.indexOf("app.js?v=164"));
    assert.equal((indexHtml.match(/app\.js\?v=164/g) || []).length, 1);
    assert.match(appSource, /const APP_PATCH_VERSION_V155 = "v155\.0 - 2026-07-31"/);
    assert.match(appSource, /PMStudentRosterService\?\.getCachedStudentRoster/);
    assert.match(appSource, /PMStudentRosterService\?\.resolveStudentSelection/);
    assert.match(appSource, /PMStudentRosterService\?\.canUseStudentForWrite/);
    assert.match(appSource, /delete payload\.studentSelectionKey/);
    assert.match(appSource, /STUDENT_ROSTER_LEGACY_READ_ONLY/);
    assert.match(appSource, /STUDENT_ROSTER_WRITE_BLOCKED/);
    assert.match(appSource, /invalidateStudentRosterForWorkspace/);
    assert.match(appSource, /function resolveOperationModeUiV154/);
    assert.match(appSource, /function requestPortfolioDeleteV139/);
    const v155Source = appSource.slice(appSource.indexOf("// Batch 10H adds"));
    assert.doesNotMatch(v155Source, /onSnapshot|setInterval|currentUser\?\.uid|currentUser\.uid/);
  }],
  ["Batch 10H2 resolves school mode before roster UI and keeps unconfigured APIs request-free", async () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const rosterSource = readFileSync(path.resolve(projectRoot, "services/studentRosterService.js"), "utf8");
    const schoolSource = readFileSync(path.resolve(projectRoot, "services/schoolIntegrationService.js"), "utf8");
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    const manifestSource = readFileSync(path.resolve(projectRoot, "shared/ownerPreviewReleaseManifest.js"), "utf8");

    assert.match(appSource, /return ensureOperationModeLoadedV154\(\)\.then\(\(resolvedMode\)/);
    assert.match(appSource, /metadataVerifiedWorkspaceId === workspaceId/);
    assert.match(appSource, /sameStoreWorkspace \? store\?\.settings\?\.operationMode : ""/);
    assert.match(appSource, /sameCanonicalWorkspace \? authWorkspaceStateV36\?\.operationMode : ""/);
    assert.match(appSource, /operationModeSource/);
    assert.match(appSource, /workspaceModeMismatchDetected/);
    assert.match(appSource, /requestedWorkspaceFingerprint/);
    assert.match(appSource, /resolvedWorkspaceFingerprint/);
    assert.match(rosterSource, /normalizedOperationMode/);
    assert.match(rosterSource, /appTarget/);

    const makeFieldStart = appSource.indexOf("function makeField(labelText, id, element)");
    const makeFieldEnd = appSource.indexOf("function makeTextField", makeFieldStart);
    const invalidEvents = [];
    const makeField = vm.runInNewContext(`(() => {
      const window = { PMSchoolUiDiagnostics: { recordInvalidField: () => invalidEvents.push("invalid") } };
      const document = { createElement: (tag) => ({ tagName: String(tag).toUpperCase(), dataset: {}, append() {} }) };
      const invalidEvents = globalThis.invalidEvents;
      ${appSource.slice(makeFieldStart, makeFieldEnd)}
      return makeField;
    })()`, { invalidEvents });
    const invalidField = makeField("invalid", "bad", undefined);
    assert.equal(invalidField.dataset.errorCode, "SCHOOL_SYNC_FIELD_DESCRIPTOR_INVALID");
    assert.deepEqual(invalidEvents, ["invalid"]);
    assert.match(appSource, /makeField\("동기화 연도\/월", "schoolSyncRangeFieldV64", rangeControls\)/);
    assert.match(appSource, /makeField\("자동 동기화", "schoolAutoSyncFieldV64", autoSyncControl\)/);

    assert.match(appSource, /function renderSchoolDashboardV156/);
    assert.match(appSource, /학교 운영 대시보드/);
    assert.match(appSource, /function renderStudentManagementV156/);
    assert.match(appSource, /students: \["학", "학생관리"\]/);
    assert.match(appSource, /\["students", "subjects", "teachers"/);
    assert.match(appSource, /\["portfolios", "records"\]\.includes\(key\)/);
    assert.match(appSource, /fields\.filter\(\(\[name\]\) => !\["targetStudentId", "studentSelectionKey"\]\.includes\(name\)\)/);
    assert.match(appSource, /등록된 학생이 없습니다/);
    assert.match(appSource, /임시 학생 목록 · 읽기 전용/);
    const v156Source = appSource.slice(appSource.indexOf("// Batch 10H2 repairs"), appSource.indexOf("// Batch 10H2B closes"));
    assert.doesNotMatch(v156Source, /currentUser\?\.uid|currentUser\.uid|onSnapshot/);
    assert.match(manifestSource, /operationalFeature\("students"/);

    let fetchCount = 0;
    const schoolContext = {
      window: {},
      location: { origin: "http://127.0.0.1:2801", protocol: "http:", hostname: "127.0.0.1" },
      fetch: async () => { fetchCount += 1; throw new Error("unexpected fetch"); },
      URL,
      console,
      setTimeout,
      clearTimeout
    };
    schoolContext.globalThis = schoolContext;
    vm.runInNewContext(schoolSource, schoolContext, { filename: "schoolIntegrationService.js" });
    await assert.rejects(
      () => schoolContext.window.PMSchoolIntegrationService.fetchProxyPayload("https://example.com/board"),
      (error) => error.code === "school-proxy-not-configured"
    );
    assert.equal(fetchCount, 0);
    const proxyDiagnostics = schoolContext.window.PMSchoolIntegrationService.diagnostics();
    assert.equal(proxyDiagnostics.schoolProxyConfigured, false);
    assert.equal(proxyDiagnostics.schoolProxyRequestSent, false);
    assert.equal(proxyDiagnostics.schoolProxyRequestCount, 0);
    assert.doesNotMatch(schoolSource, /isLocalDevelopment\(\)/);
    assert.equal((indexHtml.match(/services\/schoolIntegrationService\.js\?v=6/g) || []).length, 1);
    assert.equal((indexHtml.match(/services\/studentRosterService\.js\?v=2/g) || []).length, 1);
    assert.equal((indexHtml.match(/app\.js\?v=164/g) || []).length, 1);
  }],
  ["Batch 10H2B keeps school filters read-only and closes teacher mutation UI", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    const v157 = appSource.slice(appSource.indexOf("// Batch 10H2B closes"));

    assert.match(v157, /const APP_PATCH_VERSION_V157 = "v157\.0 - 2026-08-03"/);
    assert.match(appSource, /학교 운영 대시보드/);
    assert.match(v157, /학년도/);
    assert.match(v157, /이름·학번 검색/);
    assert.match(v157, /내 담당만 보기/);
    assert.match(v157, /내 담임반만 보기/);
    assert.match(v157, /내 담당 과목만 보기/);
    assert.match(v157, /내 과목만 보기/);
    assert.match(v157, /내 담당반만 보기/);
    assert.match(v157, /담당 과목·반 배치가 아직 연결되지 않았습니다/);
    assert.match(v157, /filterStateStorage: "memory"/);
    assert.match(v157, /serverReadCount: 0/);
    assert.match(v157, /firestoreWriteAttemptCount: 0/);
    assert.match(v157, /activeListenerCount: 0/);
    assert.doesNotMatch(v157, /sessionStorage\.getItem\(`learning-filter|sessionStorage\.setItem\(`learning-filter/);
    assert.doesNotMatch(v157, /authorUid|createdByUid/);
    assert.match(v157, /assignedTeacherUid/);
    assert.match(v157, /subjectTeacherUid/);
    assert.match(v157, /homeroomTeacherUid/);
    assert.match(v157, /classTeacherUid/);
    assert.match(v157, /attended: "응시"/);
    assert.match(v157, /submitted: "제출"/);
    assert.match(v157, /not_submitted: "미제출"/);
    assert.match(v157, /people_fallback: "임시 학생 명부"/);
    assert.match(v157, /\["portfolios", "records"\]\.includes\(key\) && role === "teacher"/);
    assert.doesNotMatch(v157, /user\.extraPermissions\?\.timetable_manager === true/);
    assert.match(v157, /if \(!\["manager", "teacher"\]\.includes\(role\)\) return true;\s*return false;/);
    assert.match(v157, /시간표 담당 권한이 없어 읽기 전용으로 표시됩니다/);
    const scopeStart = v157.indexOf("function schoolReadScopeMatchesV157");
    const scopeEnd = v157.indexOf("function schoolReadFilteredRowsV157", scopeStart);
    const scopeMatches = vm.runInNewContext(`(() => { ${v157.slice(scopeStart, scopeEnd)} return schoolReadScopeMatchesV157; })()`);
    const assignment = {
      uid: "teacher-current",
      subjectIds: new Set(["subject-assigned"]),
      classIds: new Set(["class-assigned"]),
      homeroomClassIds: new Set(["class-home"]),
      departmentIds: new Set(["department-assigned"])
    };
    assert.equal(scopeMatches({ subjectId: "subject-assigned" }, "subjects", assignment), true);
    assert.equal(scopeMatches({ classId: "class-home" }, "homeroom", assignment), true);
    assert.equal(scopeMatches({ classTeacherUid: "teacher-current" }, "assignedClasses", assignment), true);
    assert.equal(scopeMatches({ authorUid: "teacher-current" }, "assigned", assignment), false);
    assert.match(v157, /store\.settings\.appVersion = APP_PATCH_VERSION_V157/);
    assert.equal((indexHtml.match(/app\.js\?v=164/g) || []).length, 1);
    assert.equal((indexHtml.match(/studentRosterService\.js\?v=2/g) || []).length, 1);
    assert.equal((indexHtml.match(/schoolIntegrationService\.js\?v=6/g) || []).length, 1);
    assert.equal((indexHtml.match(/systemAdminService\.js\?v=20/g) || []).length, 1);
    assert.equal((indexHtml.match(/examGradeService\.js\?v=2/g) || []).length, 1);
  }],
  ["Batch 10H2C resolves a same-workspace dashboard name without exposing it in diagnostics", () => {
    const appSource = readFileSync(path.resolve(projectRoot, "app.js"), "utf8");
    const indexHtml = readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
    const v158 = appSource.slice(appSource.indexOf("// Batch 10H2C uses"));
    const resolverStart = v158.indexOf("function isWorkspaceDisplayNameCandidateV158");
    const resolverEnd = v158.indexOf("function schoolWorkspaceMetadataV158", resolverStart);
    const resolveName = vm.runInNewContext(`(() => { ${v158.slice(resolverStart, resolverEnd)} return resolveWorkspaceDisplayNameV158; })()`);

    const displayName = resolveName({ displayName: "School A" }, { workspaceId: "workspace-a", user: {} });
    assert.equal(displayName.value, "School A");
    assert.equal(displayName.source, "displayName");
    assert.equal(displayName.resolved, true);
    assert.equal(displayName.fallbackUsed, false);
    assert.equal(resolveName({ name: "Academy A" }, { workspaceId: "workspace-a", user: {} }).source, "name");
    assert.equal(resolveName({ schoolName: "Campus A" }, { workspaceId: "workspace-a", user: {} }).source, "schoolName");
    assert.equal(resolveName({ name: "현재 워크스페이스" }, { workspaceId: "workspace-a", user: {} }).value, "이름 미설정");
    assert.equal(resolveName({ name: "workspace-a" }, { workspaceId: "workspace-a", user: {} }).value, "이름 미설정");
    assert.equal(resolveName({ name: "user-a" }, { workspaceId: "workspace-a", user: { uid: "user-a" } }).value, "이름 미설정");
    assert.match(v158, /String\(cached\?\.id \|\| cached\?\.workspaceId \|\| ""\) === target/);
    assert.match(v158, /workspaceDisplayNameResolved/);
    assert.match(v158, /workspaceDisplayNameSource/);
    assert.match(v158, /workspaceDisplayNameFallbackUsed/);
    assert.match(v158, /workspaceFingerprint/);
    assert.doesNotMatch(v158, /workspaceDisplayName:\s*resolved\.value/);
    assert.doesNotMatch(v158, /addDoc|setDoc|updateDoc|deleteDoc|writeBatch|onSnapshot|fetch\(/);
    assert.match(v158, /const APP_PATCH_VERSION_V158 = "v158\.0 - 2026-08-04"/);
    assert.match(v158, /store\.settings\.appVersion = APP_PATCH_VERSION_V158/);
    assert.equal((indexHtml.match(/app\.js\?v=164/g) || []).length, 1);
    assert.equal((indexHtml.match(/studentRosterService\.js\?v=2/g) || []).length, 1);
    assert.equal((indexHtml.match(/schoolIntegrationService\.js\?v=6/g) || []).length, 1);
    assert.equal((indexHtml.match(/systemAdminService\.js\?v=20/g) || []).length, 1);
    assert.equal((indexHtml.match(/examGradeService\.js\?v=2/g) || []).length, 1);
  }],
  ["Batch 10H2 Docker development is loopback-only and excludes local secrets", () => {
    const dockerfile = readFileSync(path.resolve(projectRoot, "Dockerfile.dev"), "utf8");
    const compose = readFileSync(path.resolve(projectRoot, "compose.dev.yaml"), "utf8");
    const dockerignore = readFileSync(path.resolve(projectRoot, ".dockerignore"), "utf8");
    const mainStart = readFileSync(path.resolve(projectRoot, "docker/start-main.sh"), "utf8");
    const adminStart = readFileSync(path.resolve(projectRoot, "docker/start-admin.sh"), "utf8");

    assert.match(dockerfile, /FROM node:24-bookworm-slim/);
    assert.match(dockerfile, /RUN npm ci/);
    assert.match(dockerfile, /USER node/);
    assert.doesNotMatch(dockerfile, /COPY\s+\.\s+\./);
    assert.doesNotMatch(dockerfile, /firebase-adminsdk|service-account|\.env/);
    assert.match(compose, /0\.0\.0\.0:3000:3000/);
    assert.match(compose, /0\.0\.0\.0:2801:2801/);
    assert.match(compose, /no-new-privileges:true/);
    assert.match(compose, /cap_drop:\s*\n\s*- ALL/);
    assert.doesNotMatch(compose, /privileged:|network_mode:\s*host|\/var\/run\/docker\.sock/);
    assert.doesNotMatch(compose, /volumes:/);
    assert.match(compose, /action: sync/);
    assert.match(compose, /action: rebuild/);
    assert.match(dockerignore, /^\*\*$/m);
    assert.match(dockerignore, /\*firebase-adminsdk\*\.json/);
    assert.match(dockerignore, /\*service-account\*\.json/);
    assert.match(dockerignore, /firestore\.rules\.console-current/);
    assert.match(dockerignore, /firestore\.rules\.next/);
    assert.match(mainStart, /VITE_APP_TARGET=main/);
    assert.match(mainStart, /--host 0\.0\.0\.0 --port 3000 --strictPort/);
    assert.match(adminStart, /VITE_APP_TARGET=admin-standalone/);
    assert.match(adminStart, /npm run build:admin/);
    assert.match(adminStart, /scripts\/static-preview\.cjs/);
  }],
];

for (const [name, test] of tests) {
  await test();
  console.log(`ok - ${name}`);
}

console.log(`${tests.length} auth module tests passed.`);
