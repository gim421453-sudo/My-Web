import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

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
  ["status active creates active status", () => {
    const result = normalization.normalizeAccountStatus({ status: "active" });
    assert.equal(result.status, "active");
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
  ["app-next verify email actions are explicit only", () => {
    const source = readFileSync(path.resolve(projectRoot, "src/app-next/AppNext.tsx"), "utf8");
    assert.match(source, /sendEmailVerification\(firebaseUser\)/);
    assert.match(source, /firebaseUser/);
    assert.match(source, /onClick=\{handleSendVerification\}/);
    assert.match(source, /disabled=\{sendBusy/);
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
    assert.match(noticeSource, /writeApiImported: false/);
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
  ["operational auth bootstrap dedupes in-flight work and skips no-diff commits", () => {
    const source = readFileSync(path.resolve(projectRoot, "services/authService.js"), "utf8");
    assert.match(source, /authBootstrapInFlightByUid/);
    assert.match(source, /firebaseEnsureUserStructureInternal/);
    assert.match(source, /buildMergePatch/);
    assert.match(source, /active-user-structure-no-diff/);
    assert.match(source, /pending-user-structure-no-diff/);
    assert.match(source, /commit user workspace bootstrap/);
  }],
  ["operational auth bootstrap has quota backoff and no automatic retry loop", () => {
    const source = readFileSync(path.resolve(projectRoot, "services/authService.js"), "utf8");
    assert.match(source, /AUTH_BOOTSTRAP_BACKOFF_MS/);
    assert.match(source, /isResourceExhaustedError/);
    assert.match(source, /activateAuthBootstrapBackoff/);
    assert.match(source, /bootstrap-skipped-backoff-active/);
    assert.equal(/setTimeout\s*\([^)]*firebaseEnsureUserStructure/.test(source), false);
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
  ["auth regression preview is standalone and build-registered", () => {
    const html = readFileSync(path.resolve(projectRoot, "auth-regression-preview.html"), "utf8");
    const viteConfig = readFileSync(path.resolve(projectRoot, "vite.config.js"), "utf8");
    assert.match(html, /auth-regression-root/);
    assert.match(html, /src\/dev-auth-regression\/main\.tsx/);
    assert.match(viteConfig, /authRegressionPreview/);
    assert.match(viteConfig, /auth-regression-preview\.html/);
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
    assert.match(componentSource, /writeApiImported:\s*false/);
  }],
];

for (const [name, test] of tests) {
  await test();
  console.log(`ok - ${name}`);
}

console.log(`${tests.length} auth module tests passed.`);
