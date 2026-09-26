import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import vm from "node:vm";

const trustedSource = readFileSync(new URL("../services/trustedBackendService.js", import.meta.url), "utf8");
const invitationSource = readFileSync(new URL("../services/invitationService.js", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("../services/systemAdminService.js", import.meta.url), "utf8");
const authSource = readFileSync(new URL("../services/authService.js", import.meta.url), "utf8");
const sessionServiceSource = readFileSync(new URL("../src/auth/sessionService.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const productionEntrySource = readFileSync(new URL("../functions/src/index.ts", import.meta.url), "utf8");

const tests = [];
function test(name, run) {
  tests.push([name, run]);
}

function functionSource(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start + 1) : source.length;
  assert.ok(start >= 0 && end > start, `Missing function source: ${name}`);
  return source.slice(start, end);
}

function lastFunctionSource(source, name, nextName) {
  const start = source.lastIndexOf(`function ${name}`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start + 1) : source.length;
  assert.ok(start >= 0 && end > start, `Missing final function source: ${name}`);
  return source.slice(start, end);
}

function operationData(operation) {
  if (operation === "admin_application.create") {
    return { result: { status: "completed", applicationStatus: "pending", created: true, role: "normal" } };
  }
  if (operation === "workspace.bootstrap.application.create") {
    return { result: { status: "completed", applicationStatus: "pending", created: true, role: "super_manager" } };
  }
  if (operation === "user_profile.create") {
    return { result: { status: "completed", exists: true, created: true, schemaVersion: 1 } };
  }
  if (operation === "workspace_join.create") {
    return {
      result: {
        status: "completed",
        applicationStatus: "pending",
        created: true,
        role: "normal",
        workspaceId: "workspace-safe-id",
        invitationId: "invitation-safe-id",
        joinRequestId: "join-request-safe-id"
      }
    };
  }
  if (operation === "workspace_join.approve") {
    return {
      result: {
        status: "completed",
        memberPresent: true,
        membershipStatus: "active",
        role: "normal",
        workspaceId: "workspace-safe-id"
      }
    };
  }
  if (operation === "workspace_join.reject") {
    return { result: { status: "completed", applicationStatus: "rejected", updated: true } };
  }
  if (operation === "admin_application.approve") {
    return { result: { status: "completed", applicationStatus: "approved", memberPresent: true, role: "normal" } };
  }
  if (operation === "admin_application.reject") {
    return { result: { status: "completed", applicationStatus: "rejected" } };
  }
  if (operation === "invitation.create") {
    return {
      invitationId: "invitation-safe-id",
      invitationCode: "AbCdEfGhIjKlMnOpQrStUvWxYz012345",
      result: { status: "completed", invitationStatus: "active", role: "normal", maxUses: 1, usedCount: 0 }
    };
  }
  if (operation === "invitation.revoke") {
    return { result: { status: "completed", invitationStatus: "revoked", maxUses: 1, usedCount: 0 } };
  }
  if (operation === "invitation.redeem") {
    return {
      result: {
        status: "completed",
        invitationStatus: "consumed",
        role: "normal",
        maxUses: 1,
        usedCount: 1,
        memberPresent: true,
        workspaceId: "workspace-safe-id"
      }
    };
  }
  if (operation === "workspace_member.role.update") {
    return {
      result: {
        status: "completed",
        memberPresent: true,
        workspaceId: "workspace-safe-id",
        role: "manager",
        membershipStatus: "active",
        sessionRefreshRequired: true
      }
    };
  }
  if (operation === "workspace_member.status.set") {
    return {
      result: {
        status: "completed",
        memberPresent: true,
        workspaceId: "workspace-safe-id",
        role: "teacher",
        membershipStatus: "disabled",
        sessionRefreshRequired: true
      }
    };
  }
  if (operation === "workspace_member.remove") {
    return {
      result: {
        status: "completed",
        memberPresent: true,
        removed: true,
        workspaceId: "workspace-safe-id",
        role: "teacher",
        membershipStatus: "inactive",
        sessionRefreshRequired: true
      }
    };
  }
  if (operation === "user_account.disable") {
    return {
      result: {
        status: "completed",
        accountDisabled: true,
        accountLifecycleStatus: "disabled",
        sessionInvalidated: true,
        signOutRequired: true,
        userProfileUpdated: true
      }
    };
  }
  if (operation === "user_account.enable") {
    return {
      result: {
        status: "completed",
        accountDisabled: false,
        accountLifecycleStatus: "active",
        sessionInvalidated: false,
        signOutRequired: false,
        userProfileUpdated: true
      }
    };
  }
  if (operation === "workspace.bootstrap.approve") {
    return {
      result: {
        status: "completed",
        applicationStatus: "approved",
        workspacePresent: true,
        memberPresent: true,
        workspaceId: "workspace-safe-id",
        role: "super_manager",
        sessionRefreshRequired: true
      }
    };
  }
  if (operation === "workspace.lifecycle.set") {
    return {
      result: {
        status: "completed",
        workspacePresent: true,
        workspaceId: "workspace-safe-id",
        workspaceLifecycleStatus: "disabled"
      }
    };
  }
  if (operation === "workspace.operation_mode.set") {
    return {
      result: {
        status: "completed",
        workspaceId: "workspace-safe-id",
        previousMode: "personal",
        nextMode: "school",
        operationModeVersion: 4,
        dataPreserved: true
      }
    };
  }
  throw new Error(`Unknown fixture operation: ${operation}`);
}

function readData(operation) {
  const rows = {
    "management.admin_applications.list": [{ applicationId: "application-1", classification: "CANONICAL", status: "pending" }],
    "management.workspace_join_requests.list": [{ requestId: "join-request-1", workspaceId: "workspace-safe-id", applicantUid: "member-safe-id", requestedRole: "normal", status: "pending" }],
    "management.workspace_members.list": [{ uid: "member-safe-id", workspaceId: "workspace-safe-id", role: "normal", status: "active", active: true, disabled: false }],
    "management.invitations.list": [{ invitationId: "invitation-safe-id", workspaceId: "workspace-safe-id", targetRole: "normal", status: "active", maxUses: 1, usedCount: 0 }],
    "management.owner_workspaces.list": [{ workspaceId: "workspace-safe-id", name: "Fixture School", status: "active", operationMode: "school", operationModeVersion: 3 }],
    "management.users.list": [{ uid: "member-safe-id", email: "member@example.invalid", displayName: "Member", status: "active", currentWorkspaceId: "workspace-safe-id" }]
  }[operation];
  if (!rows) throw new Error(`Unknown fixture read: ${operation}`);
  return { items: rows, nextCursor: null };
}

function successTransport(records = []) {
  return {
    async invokeTrustedOperation(operation, envelope, context) {
      records.push({ operation, envelope, requestId: context.requestId });
      return { ok: true, requestId: context.requestId, data: operationData(operation) };
    },
    async invokeTrustedRead(operation, envelope, context) {
      records.push({ operation, envelope, requestId: context.requestId, read: true });
      return { ok: true, requestId: context.requestId, data: readData(operation) };
    }
  };
}

function makeContext({ enabled = false, transport = null, runtime = null } = {}) {
  const logs = [];
  const localStorageWrites = [];
  const context = vm.createContext({
    AbortController,
    TextEncoder,
    Uint8Array,
    clearTimeout,
    crypto: webcrypto,
    setTimeout,
    console: {
      error: (...args) => logs.push(["error", ...args]),
      info: (...args) => logs.push(["info", ...args]),
      log: (...args) => logs.push(["log", ...args]),
      warn: (...args) => logs.push(["warn", ...args])
    }
  });
  context.window = context;
  context.globalThis = context;
  vm.runInContext(`window.PMTrustedBackendAuthorityConfig = Object.freeze({
    TRUSTED_BACKEND_AUTHORITY_ENABLED: ${enabled ? "true" : "false"}
  });`, context);
  context.PMTrustedBackendTransport = transport;
  context.PMFirebaseRuntime = runtime;
  context.PMRoleSecurityPolicy = {
    WORKSPACE_ROLES: ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"],
    canGrantRole: () => true,
    canManageRole: () => true,
    forbiddenPayloadKeys: () => []
  };
  context.localStorage = {
    getItem: () => null,
    setItem: (...args) => localStorageWrites.push(args)
  };
  vm.runInContext(trustedSource, context, { filename: "trustedBackendService.js" });
  return { context, logs, localStorageWrites };
}

function loadIntegrated(options = {}) {
  const fixture = makeContext(options);
  vm.runInContext(invitationSource, fixture.context, { filename: "invitationService.js" });
  vm.runInContext(adminSource, fixture.context, { filename: "systemAdminService.js" });
  return fixture;
}

function loadAuthStateService(options = {}, persisted = {}) {
  const fixture = makeContext(options);
  const storage = new Map(Object.entries(persisted));
  fixture.context.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value))
  };
  fixture.context.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
  vm.runInContext(authSource, fixture.context, { filename: "authService.js" });
  return { ...fixture, storage };
}

function client(fixture, options = {}) {
  return fixture.context.PMTrustedBackendService.createClient({
    enabled: options.enabled ?? true,
    transport: options.transport ?? fixture.context.PMTrustedBackendTransport,
    cryptoProvider: webcrypto,
    timeoutMs: options.timeoutMs ?? 100
  });
}

function assertSafeError(error, code) {
  assert.equal(error?.code, code);
  assert.equal(String(error?.message || "").includes("/"), false);
  assert.equal(String(error?.message || "").includes("token"), false);
  return true;
}

test("feature flag defaults OFF", () => {
  const fixture = makeContext();
  assert.equal(fixture.context.PMTrustedBackendService.isAuthorityEnabled(), false);
});

test("feature flag accepts only explicit injected true", () => {
  const fixture = makeContext({ enabled: true });
  assert.equal(fixture.context.PMTrustedBackendService.isAuthorityEnabled(), true);
});

test("URL query cannot enable trusted authority", () => {
  const fixture = makeContext();
  fixture.context.location = { search: "?TRUSTED_BACKEND_AUTHORITY_ENABLED=true" };
  assert.equal(fixture.context.PMTrustedBackendService.isAuthorityEnabled(), false);
});

test("localStorage cannot enable trusted authority", () => {
  const fixture = makeContext();
  fixture.context.localStorage.getItem = () => "true";
  assert.equal(fixture.context.PMTrustedBackendService.isAuthorityEnabled(), false);
});

for (const [name, invoke, expected] of [
  ["create application", (api) => api.createAdminApplication({ workspaceId: "workspace-1", requestedRole: "normal", reason: "access" }), "admin_application.create"],
  ["create bootstrap application", (api) => api.createWorkspaceBootstrapApplication({ requestedWorkspaceName: "Fixture School", reason: "setup" }), "workspace.bootstrap.application.create"],
  ["create user profile", (api) => api.createUserProfile({ displayName: "Fixture User" }), "user_profile.create"],
  ["submit workspace join", (api) => api.submitWorkspaceJoinRequest({ code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345" }), "workspace_join.create"],
  ["approve workspace join", (api) => api.approveWorkspaceJoinRequest({ requestId: "join-request-1" }), "workspace_join.approve"],
  ["reject workspace join", (api) => api.rejectWorkspaceJoinRequest({ requestId: "join-request-1" }), "workspace_join.reject"],
  ["approve application", (api) => api.approveAdminApplication({ applicationId: "application-1" }), "admin_application.approve"],
  ["reject application", (api) => api.rejectAdminApplication({ applicationId: "application-1" }), "admin_application.reject"],
  ["create invitation", (api) => api.createInvitation({ workspaceId: "workspace-1", targetRole: "normal", expiresInSeconds: 3600, maxUses: 1 }), "invitation.create"],
  ["revoke invitation", (api) => api.revokeInvitation({ invitationId: "invitation-1" }), "invitation.revoke"],
  ["redeem invitation", (api) => api.redeemInvitation({ code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345" }), "invitation.redeem"]
  , ["update member role", (api) => api.updateWorkspaceMemberRole({ workspaceId: "workspace-safe-id", targetUid: "member-safe-id", newRole: "manager" }), "workspace_member.role.update"]
  , ["set member status", (api) => api.setWorkspaceMemberStatus({ workspaceId: "workspace-safe-id", targetUid: "member-safe-id", status: "disabled" }), "workspace_member.status.set"]
  , ["remove member", (api) => api.removeWorkspaceMember({ workspaceId: "workspace-safe-id", targetUid: "member-safe-id" }), "workspace_member.remove"]
  , ["disable account", (api) => api.disableUserAccount({ targetUid: "member-safe-id" }), "user_account.disable"]
  , ["enable account", (api) => api.enableUserAccount({ targetUid: "member-safe-id" }), "user_account.enable"]
  , ["approve workspace bootstrap", (api) => api.approveWorkspaceBootstrap({ applicationId: "application-1" }), "workspace.bootstrap.approve"]
  , ["set workspace lifecycle", (api) => api.setWorkspaceLifecycle({ workspaceId: "workspace-safe-id", status: "disabled" }), "workspace.lifecycle.set"]
  , ["set workspace operation mode", (api) => api.setWorkspaceOperationMode({ workspaceId: "workspace-safe-id", expectedMode: "personal", newMode: "school", reason: "school rollout" }), "workspace.operation_mode.set"]
]) {
  test(`flag ON ${name} uses adapter operation only`, async () => {
    const records = [];
    const fixture = makeContext({ enabled: true, transport: successTransport(records) });
    await invoke(client(fixture));
    assert.deepEqual(records.map((item) => item.operation), [expected]);
  });
}

for (const [name, invoke, expected] of [
  ["list applications", (api) => api.listAdminApplications({ limit: 25 }), "management.admin_applications.list"],
  ["list joins", (api) => api.listWorkspaceJoinRequests({ limit: 25 }), "management.workspace_join_requests.list"],
  ["list members", (api) => api.listWorkspaceMembers({ workspaceId: "workspace-safe-id", limit: 25 }), "management.workspace_members.list"],
  ["list invitations", (api) => api.listInvitations({ workspaceId: "workspace-safe-id", limit: 25 }), "management.invitations.list"],
  ["list owner workspaces", (api) => api.listOwnerWorkspaces({ limit: 25 }), "management.owner_workspaces.list"],
  ["list management users", (api) => api.listManagementUsers({ limit: 25 }), "management.users.list"]
]) {
  test(`flag ON ${name} uses read transport without idempotency`, async () => {
    const records = [];
    const fixture = makeContext({ enabled: true, transport: successTransport(records) });
    const result = await invoke(client(fixture));
    assert.deepEqual(records.map((item) => item.operation), [expected]);
    assert.equal(Object.prototype.hasOwnProperty.call(records[0].envelope, "idempotencyKey"), false);
    assert.equal(Array.isArray(result.items), true);
  });
}

test("trusted read transport failure has no legacy fallback", async () => {
  let mutationCalls = 0;
  const fixture = makeContext({
    enabled: true,
    transport: {
      invokeTrustedOperation: async () => { mutationCalls += 1; },
      invokeTrustedRead: async (_operation, _envelope, context) => ({ ok: false, code: "FORBIDDEN", requestId: context.requestId })
    }
  });
  await assert.rejects(client(fixture).listOwnerWorkspaces({ limit: 25 }), { code: "FORBIDDEN" });
  assert.equal(mutationCalls, 0);
});

test("trusted read rejects excessive limit, arbitrary cursor and malformed response", async () => {
  const fixture = makeContext({ enabled: true, transport: successTransport() });
  assert.throws(() => client(fixture).listOwnerWorkspaces({ limit: 101 }), { code: "INVALID_ARGUMENT" });
  assert.throws(() => client(fixture).listOwnerWorkspaces({ cursor: "bad!" }), { code: "INVALID_ARGUMENT" });
  const malformedFixture = makeContext({ enabled: true });
  const malformed = client(malformedFixture, {
    transport: {
      invokeTrustedRead: async (_operation, _envelope, context) => ({
        ok: true,
        requestId: context.requestId,
        data: { items: [{ invitationId: "safe", codeHash: "must-not-pass" }], nextCursor: null }
      })
    }
  });
  await assert.rejects(malformed.listInvitations({ workspaceId: "workspace-safe-id" }), { code: "INTERNAL" });
});

test("trusted management snapshot uses canonical read adapters and no Firebase runtime", async () => {
  const records = [];
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(records),
    runtime: { init: async () => { runtimeCalls += 1; throw new Error("legacy runtime called"); } }
  });
  const snapshot = await fixture.context.PMSystemAdminService.loadTrustedManagementSnapshot({ limit: 100 });
  assert.equal(runtimeCalls, 0);
  assert.equal(snapshot.workspaces.length, 1);
  assert.equal(snapshot.workspaceMembers.length, 1);
  assert.equal(snapshot.invitations[0].code, undefined);
  assert.equal(snapshot.adminLogs.length, 0);
  assert.equal(records.every((record) => record.read === true), true);
});

test("trusted mode facade never initializes legacy batch runtime and leaves caller state unchanged on failure", async () => {
  const records = [];
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(records),
    runtime: { init: async () => { runtimeCalls += 1; throw new Error("legacy runtime called"); } }
  });
  const result = await fixture.context.PMSystemAdminService.changeWorkspaceOperationMode({
    workspaceId: "workspace-safe-id",
    expectedMode: "personal",
    operationMode: "school",
    reason: "school rollout"
  });
  assert.equal(runtimeCalls, 0);
  assert.equal(result.nextMode, "school");
  assert.deepEqual(records.map((record) => record.operation), ["workspace.operation_mode.set"]);
});

test("missing transport fails closed", async () => {
  const fixture = makeContext({ enabled: true });
  await assert.rejects(
    client(fixture, { transport: null }).approveAdminApplication({ applicationId: "application-1" }),
    (error) => assertSafeError(error, "INTERNAL")
  );
});

test("transport timeout fails closed", async () => {
  const fixture = makeContext({ enabled: true, transport: { invokeTrustedOperation: () => new Promise(() => {}) } });
  await assert.rejects(
    client(fixture, { timeoutMs: 5 }).rejectAdminApplication({ applicationId: "application-1" }),
    (error) => assertSafeError(error, "INTERNAL")
  );
});

for (const code of [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "INVALID_ARGUMENT",
  "NOT_FOUND",
  "CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "FAILED_PRECONDITION",
  "INTERNAL"
]) {
  test(`${code} maps to safe client error`, async () => {
    const transport = {
      invokeTrustedOperation: async (_operation, _payload, context) => ({ ok: false, code, requestId: context.requestId })
    };
    const fixture = makeContext({ enabled: true, transport });
    await assert.rejects(
      client(fixture).rejectAdminApplication({ applicationId: "application-1" }),
      (error) => assertSafeError(error, code)
    );
  });
}

test("unknown transport error maps to INTERNAL", async () => {
  const fixture = makeContext({
    enabled: true,
    transport: { invokeTrustedOperation: async () => { throw new Error("sensitive raw failure"); } }
  });
  await assert.rejects(
    client(fixture).rejectAdminApplication({ applicationId: "application-1" }),
    (error) => assertSafeError(error, "INTERNAL")
  );
});

test("response without matching requestId fails closed", async () => {
  const fixture = makeContext({
    enabled: true,
    transport: { invokeTrustedOperation: async () => ({ ok: true, requestId: "wrong", data: operationData("admin_application.reject") }) }
  });
  await assert.rejects(client(fixture).rejectAdminApplication({ applicationId: "application-1" }), { code: "INTERNAL" });
});

test("invalid success response fails closed", async () => {
  const fixture = makeContext({
    enabled: true,
    transport: { invokeTrustedOperation: async (_operation, _payload, context) => ({ ok: true, requestId: context.requestId, data: { result: {} } }) }
  });
  await assert.rejects(client(fixture).rejectAdminApplication({ applicationId: "application-1" }), { code: "INTERNAL" });
});

test("redeem response without backend workspace fails closed", async () => {
  const fixture = makeContext({
    enabled: true,
    transport: {
      invokeTrustedOperation: async (_operation, _envelope, context) => ({
        ok: true,
        requestId: context.requestId,
        data: { result: { status: "completed", memberPresent: true, role: "normal" } }
      })
    }
  });
  await assert.rejects(
    client(fixture).redeemInvitation({ code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345" }),
    { code: "INTERNAL" }
  );
});

test("trusted role facade bypasses legacy Firebase and returns server-confirmed summary", async () => {
  let runtimeInitCount = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(),
    runtime: { hasConfig: () => true, init: async () => { runtimeInitCount += 1; } }
  });
  const result = await fixture.context.PMSystemAdminService.updateUserAdminFields({
    user: { uid: "member-safe-id", workspaceId: "workspace-safe-id", role: "teacher" },
    workspaceId: "workspace-safe-id",
    role: "manager"
  });
  assert.equal(runtimeInitCount, 0);
  assert.equal(result.verified, true);
  assert.equal(result.role, "manager");
  assert.equal(result.sessionRefreshRequired, true);
});

test("trusted status and removal facades use adapter only", async () => {
  const records = [];
  const fixture = loadIntegrated({ enabled: true, transport: successTransport(records) });
  await fixture.context.PMSystemAdminService.setWorkspaceMemberStatus({
    workspaceId: "workspace-safe-id",
    targetUid: "member-safe-id",
    status: "disabled"
  });
  await fixture.context.PMSystemAdminService.removeWorkspaceMember({
    workspaceId: "workspace-safe-id",
    targetUid: "member-safe-id"
  });
  assert.deepEqual(records.map((record) => record.operation), [
    "workspace_member.status.set",
    "workspace_member.remove"
  ]);
});

test("trusted member failure performs no local authority mutation", async () => {
  const fixture = loadIntegrated({
    enabled: true,
    transport: {
      invokeTrustedOperation: async (_operation, _envelope, context) => ({
        ok: false,
        code: "FORBIDDEN",
        requestId: context.requestId
      })
    }
  });
  const user = { uid: "member-safe-id", workspaceId: "workspace-safe-id", role: "teacher" };
  await assert.rejects(fixture.context.PMSystemAdminService.updateUserAdminFields({
    user,
    workspaceId: "workspace-safe-id",
    role: "manager"
  }), { code: "FORBIDDEN" });
  assert.equal(user.role, "teacher");
});

test("trusted account facades bypass legacy Firebase and preserve membership inputs", async () => {
  const records = [];
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(records),
    runtime: { init: async () => { runtimeCalls += 1; throw new Error("legacy runtime called"); } }
  });
  const user = { uid: "member-safe-id", role: "teacher", workspaceRole: "teacher", status: "active" };
  const disabled = await fixture.context.PMSystemAdminService.disableUserAccount(user);
  const enabled = await fixture.context.PMSystemAdminService.enableUserAccount(user);
  assert.equal(runtimeCalls, 0);
  assert.equal(disabled.result.signOutRequired, true);
  assert.equal(enabled.result.signOutRequired, false);
  assert.deepEqual(records.map((record) => record.operation), ["user_account.disable", "user_account.enable"]);
  assert.equal(user.role, "teacher");
  assert.equal(user.workspaceRole, "teacher");
  assert.equal(user.status, "active");
});

test("trusted account response with inconsistent signOutRequired fails closed", async () => {
  const fixture = makeContext({
    enabled: true,
    transport: {
      invokeTrustedOperation: async (_operation, _envelope, context) => ({
        ok: true,
        requestId: context.requestId,
        data: {
          result: {
            status: "completed",
            accountDisabled: true,
            accountLifecycleStatus: "disabled",
            sessionInvalidated: true,
            signOutRequired: false,
            userProfileUpdated: true
          }
        }
      })
    }
  });
  await assert.rejects(client(fixture).disableUserAccount({ targetUid: "member-safe-id" }), { code: "INTERNAL" });
});

test("trusted account deletion is deferred before Firebase runtime or transport", async () => {
  const records = [];
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(records),
    runtime: { init: async () => { runtimeCalls += 1; } }
  });
  await assert.rejects(
    fixture.context.PMSystemAdminService.deleteUserFirestoreProfile({ uid: "member-safe-id" }),
    { code: "trusted-account-deletion-deferred" }
  );
  assert.equal(runtimeCalls, 0);
  assert.equal(records.length, 0);
});

test("trusted canonical workspace bootstrap uses dedicated adapter", async () => {
  const records = [];
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(records),
    runtime: { init: async () => { runtimeCalls += 1; } }
  });
  const application = { id: "application-1", applicationType: "WORKSPACE_BOOTSTRAP" };
  const result = await fixture.context.PMSystemAdminService.approveAdminApplication(application);
  assert.equal(result.result.role, "super_manager");
  assert.equal(runtimeCalls, 0);
  assert.deepEqual(records.map((record) => record.operation), ["workspace.bootstrap.approve"]);
});

test("trusted bootstrap ingress derives applicant and initial role on the backend", async () => {
  const records = [];
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(records),
    runtime: { init: async () => { runtimeCalls += 1; } }
  });
  const result = await fixture.context.PMSystemAdminService.submitAdminApplication({
    user: { uid: "client-user", role: "system_owner" },
    fields: { requestedWorkspaceName: "Fixture School", reason: "setup", requestedRole: "system_owner" }
  });
  assert.equal(result.result.role, "super_manager");
  assert.equal(runtimeCalls, 0);
  assert.deepEqual(records.map((record) => record.operation), ["workspace.bootstrap.application.create"]);
  assert.deepEqual(Object.keys(records[0].envelope.payload).sort(), ["reason", "requestedWorkspaceName"]);
});

test("trusted join submit approve and reject bypass legacy Firebase composite writes", async () => {
  const records = [];
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(records),
    runtime: { init: async () => { runtimeCalls += 1; throw new Error("legacy runtime called"); } }
  });
  await fixture.context.PMSystemAdminService.submitJoinRequest({
    user: { uid: "forged-applicant", role: "system_owner" },
    code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345"
  });
  await fixture.context.PMSystemAdminService.approveJoinRequest({
    id: "join-request-1",
    uid: "forged-target",
    requestedRole: "system_owner"
  }, "system_owner");
  await fixture.context.PMSystemAdminService.rejectJoinRequest({
    id: "join-request-2",
    uid: "forged-target"
  });
  assert.equal(runtimeCalls, 0);
  assert.deepEqual(records.map((record) => record.operation), [
    "workspace_join.create",
    "workspace_join.approve",
    "workspace_join.reject"
  ]);
  assert.deepEqual(Object.keys(records[0].envelope.payload), ["code"]);
  assert.deepEqual(Object.keys(records[1].envelope.payload), []);
  assert.deepEqual(Object.keys(records[2].envelope.payload), []);
});

test("flag ON profile creation reaches trusted ingress before Firebase write code", () => {
  const functionStart = authSource.indexOf("async function firebaseCreateBaseUserDocument");
  const functionEnd = authSource.indexOf("async function firebaseLoginWithEmail", functionStart);
  const body = authSource.slice(functionStart, functionEnd);
  assert.ok(functionStart >= 0 && functionEnd > functionStart);
  assert.ok(body.indexOf("trustedAuthorityRequested()") < body.indexOf("PMFirebaseRuntime?.init?.()"));
  assert.ok(body.indexOf("createUserProfile") < body.indexOf("firestore.setDoc"));
});

test("trusted backend unavailable leaves profile join and bootstrap paths fail closed", async () => {
  const fixture = loadIntegrated({ enabled: true, transport: null });
  await assert.rejects(
    fixture.context.PMTrustedBackendService.createUserProfile({ displayName: "Fixture" }),
    { code: "INTERNAL" }
  );
  await assert.rejects(
    fixture.context.PMSystemAdminService.submitJoinRequest({ code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345" }),
    { code: "INTERNAL" }
  );
  await assert.rejects(
    fixture.context.PMSystemAdminService.submitAdminApplication({
      fields: { requestedWorkspaceName: "Fixture School" }
    }),
    { code: "INTERNAL" }
  );
});

test("trusted ambiguous new-workspace approval fails before transport", async () => {
  const records = [];
  const fixture = loadIntegrated({ enabled: true, transport: successTransport(records) });
  await assert.rejects(
    fixture.context.PMSystemAdminService.approveAdminApplication(
      { id: "application-1", applicationType: "WORKSPACE_ACCESS" },
      { workspaceMode: "new" }
    ),
    { code: "trusted-workspace-bootstrap-application-required" }
  );
  assert.equal(records.length, 0);
});

test("trusted workspace lifecycle facade has no legacy runtime side effect", async () => {
  const records = [];
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(records),
    runtime: { init: async () => { runtimeCalls += 1; } }
  });
  const result = await fixture.context.PMSystemAdminService.setWorkspaceLifecycle({
    workspaceId: "workspace-safe-id",
    status: "disabled"
  });
  assert.equal(result.result.workspaceLifecycleStatus, "disabled");
  assert.equal(runtimeCalls, 0);
  assert.deepEqual(records.map((record) => record.operation), ["workspace.lifecycle.set"]);
});

test("trusted account and workspace failures do not mutate caller state", async () => {
  const fixture = loadIntegrated({
    enabled: true,
    transport: {
      invokeTrustedOperation: async (_operation, _envelope, context) => ({
        ok: false,
        code: "FORBIDDEN",
        requestId: context.requestId
      })
    }
  });
  const user = { uid: "member-safe-id", status: "active" };
  const workspace = { id: "workspace-safe-id", status: "active" };
  await assert.rejects(fixture.context.PMSystemAdminService.disableUserAccount(user), { code: "FORBIDDEN" });
  await assert.rejects(fixture.context.PMSystemAdminService.setWorkspaceLifecycle({
    workspaceId: workspace.id,
    status: "disabled"
  }), { code: "FORBIDDEN" });
  assert.equal(user.status, "active");
  assert.equal(workspace.status, "active");
});

test("membership-only facade remains unavailable in flag OFF rollback mode", async () => {
  const fixture = loadIntegrated({ enabled: false });
  await assert.rejects(fixture.context.PMSystemAdminService.setWorkspaceMemberStatus({
    workspaceId: "workspace-safe-id",
    targetUid: "member-safe-id",
    status: "disabled"
  }), { code: "trusted-membership-operation-disabled" });
});

test("idempotency keys use Web Crypto and contain no weak fallback", () => {
  const fixture = makeContext({ enabled: true });
  const mutation = client(fixture, { transport: successTransport() }).createLogicalMutationContext("createInvitation");
  assert.match(mutation.idempotencyKey, /^tbk_[a-f0-9]{40}$/);
  assert.doesNotMatch(trustedSource, /Math\.random\(|Date\.now\(.*idempotency/i);
});

test("same logical retry reuses idempotency key", async () => {
  const records = [];
  const fixture = makeContext({ enabled: true, transport: successTransport(records) });
  const api = client(fixture);
  const mutationContext = api.createLogicalMutationContext("revokeInvitation");
  await api.revokeInvitation({ invitationId: "invitation-1" }, { mutationContext });
  await api.revokeInvitation({ invitationId: "invitation-1" }, { mutationContext });
  assert.equal(records[0].envelope.idempotencyKey, records[1].envelope.idempotencyKey);
});

test("new logical operation receives new idempotency key", () => {
  const fixture = makeContext({ enabled: true });
  const api = client(fixture, { transport: successTransport() });
  assert.notEqual(
    api.createLogicalMutationContext("revokeInvitation").idempotencyKey,
    api.createLogicalMutationContext("revokeInvitation").idempotencyKey
  );
});

test("each transport attempt receives a new requestId", async () => {
  const records = [];
  const fixture = makeContext({ enabled: true, transport: successTransport(records) });
  const api = client(fixture);
  const mutationContext = api.createLogicalMutationContext("revokeInvitation");
  await api.revokeInvitation({ invitationId: "invitation-1" }, { mutationContext });
  await api.revokeInvitation({ invitationId: "invitation-1" }, { mutationContext });
  assert.notEqual(records[0].requestId, records[1].requestId);
});

test("requestId and idempotency key are separate identifiers", async () => {
  const records = [];
  const fixture = makeContext({ enabled: true, transport: successTransport(records) });
  await client(fixture).rejectAdminApplication({ applicationId: "application-1" });
  assert.notEqual(records[0].requestId, records[0].envelope.idempotencyKey);
  assert.match(records[0].requestId, /^tbr_/);
  assert.match(records[0].envelope.idempotencyKey, /^tbk_/);
});

test("trusted invitation failure leaves local list unchanged", async () => {
  const transport = {
    invokeTrustedOperation: async (_operation, _payload, context) => ({ ok: false, code: "FORBIDDEN", requestId: context.requestId })
  };
  const fixture = loadIntegrated({ enabled: true, transport, runtime: { init: () => { throw new Error("legacy runtime called"); } } });
  const authState = { invitations: [] };
  await assert.rejects(fixture.context.PMInvitationService.createInvite({
    authState,
    currentUser: {},
    workspaceId: "workspace-1",
    role: "normal",
    expiresHours: 1,
    maxUses: 1,
    reusable: false
  }), { code: "FORBIDDEN" });
  assert.equal(authState.invitations.length, 0);
});

test("trusted approval failure never invokes legacy runtime or success state", async () => {
  let runtimeCalls = 0;
  const transport = {
    invokeTrustedOperation: async (_operation, _payload, context) => ({ ok: false, code: "CONFLICT", requestId: context.requestId })
  };
  const fixture = loadIntegrated({ enabled: true, transport, runtime: { init: () => { runtimeCalls += 1; } } });
  await assert.rejects(fixture.context.PMSystemAdminService.approveAdminApplication({ id: "application-1" }), { code: "CONFLICT" });
  assert.equal(runtimeCalls, 0);
});

test("trusted invitation enters UI cache only after backend success", async () => {
  let release;
  const transport = {
    invokeTrustedOperation(operation, _payload, context) {
      return new Promise((resolve) => {
        release = () => resolve({ ok: true, requestId: context.requestId, data: operationData(operation) });
      });
    }
  };
  const fixture = loadIntegrated({ enabled: true, transport });
  const authState = { invitations: [] };
  const pending = fixture.context.PMInvitationService.createInvite({
    authState,
    currentUser: {},
    workspaceId: "workspace-1",
    role: "normal",
    expiresHours: 1,
    maxUses: 1,
    reusable: false
  });
  await Promise.resolve();
  assert.equal(authState.invitations.length, 0);
  release();
  await pending;
  assert.equal(authState.invitations.length, 1);
});

test("raw invitation code is absent from persisted invite object", async () => {
  const fixture = loadIntegrated({ enabled: true, transport: successTransport() });
  const authState = { invitations: [] };
  const { code } = await fixture.context.PMInvitationService.createInvite({
    authState,
    currentUser: {},
    workspaceId: "workspace-1",
    role: "normal",
    expiresHours: 1,
    maxUses: 1,
    reusable: false
  });
  assert.equal(JSON.stringify(authState).includes(code), false);
  assert.equal(authState.invitations[0].code, undefined);
});

test("trusted operations never write raw code to localStorage", async () => {
  const fixture = loadIntegrated({ enabled: true, transport: successTransport() });
  await fixture.context.PMInvitationService.createInvite({
    authState: { invitations: [] }, currentUser: {}, workspaceId: "workspace-1", role: "normal", expiresHours: 1, maxUses: 1, reusable: false
  });
  assert.equal(fixture.localStorageWrites.length, 0);
});

test("trusted auth state strips synthetic invitation secrets before rehydration and persistence", () => {
  const secret = "TEST-INVITE-SECRET-DO-NOT-PERSIST";
  const persisted = JSON.stringify({
    auth: { currentUserId: "user-safe-id", pendingInviteCodeId: secret },
    users: [{ uid: "user-safe-id", inviteCode: secret, inviteCodeId: secret, pendingInviteCodeId: secret }],
    workspace_members: [{ uid: "user-safe-id", workspaceId: "workspace-safe-id", inviteCode: secret, invitedByEmail: "legacy@example.invalid" }],
    invitations: [{ invitationId: "legacy-invitation", code: secret, codeHash: secret, inviteCodeId: secret }]
  });
  const fixture = loadAuthStateService({ enabled: true }, { "pm:auth:v1": persisted });
  const state = fixture.context.PMAuthService.loadAuthState();
  assert.equal(JSON.stringify(state).includes(secret), false);
  assert.equal(state.users[0].pendingInviteCodeId, undefined);
  assert.equal(state.workspace_members[0].inviteCode, undefined);
  assert.equal(state.invitations[0].code, undefined);
  fixture.context.PMAuthService.saveAuthState(state);
  assert.equal(Array.from(fixture.storage.values()).some((value) => value.includes(secret)), false);
});

test("flag OFF preserves legacy invitation fields for compatibility", () => {
  const secret = "TEST-INVITE-SECRET-DO-NOT-PERSIST";
  const persisted = JSON.stringify({ users: [{ uid: "user-safe-id", pendingInviteCodeId: secret }] });
  const fixture = loadAuthStateService({ enabled: false }, { "pm:auth:v1": persisted });
  assert.equal(fixture.context.PMAuthService.loadAuthState().users[0].pendingInviteCodeId, secret);
});

test("trusted join returns canonical IDs without the submitted invitation secret", async () => {
  const secret = "TEST-INVITE-SECRET-DO-NOT-PERSIST";
  const fixture = loadIntegrated({ enabled: true, transport: successTransport() });
  const result = await fixture.context.PMSystemAdminService.submitJoinRequest({ user: { uid: "user-safe-id" }, code: secret });
  assert.equal(result.result.invitationId, "invitation-safe-id");
  assert.equal(result.result.joinRequestId, "join-request-safe-id");
  assert.equal(JSON.stringify(result).includes(secret), false);
});

test("trusted join fails closed when canonical invitation identifiers are missing", async () => {
  const fixture = loadIntegrated({
    enabled: true,
    transport: {
      invokeTrustedOperation: async (_operation, _payload, context) => ({
        ok: true,
        requestId: context.requestId,
        data: { result: { status: "completed", applicationStatus: "pending", created: true, role: "normal", workspaceId: "workspace-safe-id" } }
      })
    }
  });
  await assert.rejects(
    fixture.context.PMSystemAdminService.submitJoinRequest({ user: { uid: "user-safe-id" }, code: "TEST-INVITE-SECRET-DO-NOT-PERSIST" }),
    { code: "INTERNAL" }
  );
});

test("trusted operations never log raw invitation code", async () => {
  const fixture = loadIntegrated({ enabled: true, transport: successTransport() });
  const { code } = await fixture.context.PMInvitationService.createInvite({
    authState: { invitations: [] }, currentUser: {}, workspaceId: "workspace-1", role: "normal", expiresHours: 1, maxUses: 1, reusable: false
  });
  assert.equal(JSON.stringify(fixture.logs).includes(code), false);
});

test("transport context and logs contain no auth token", async () => {
  const records = [];
  const fixture = makeContext({ enabled: true, transport: successTransport(records) });
  await client(fixture).rejectAdminApplication({ applicationId: "application-1" });
  assert.doesNotMatch(JSON.stringify(records), /token|authorization|bearer/i);
  assert.doesNotMatch(JSON.stringify(fixture.logs), /token|authorization|bearer/i);
});

test("trusted revoke mutates local state only after success", async () => {
  let release;
  const transport = {
    invokeTrustedOperation(operation, _payload, context) {
      return new Promise((resolve) => { release = () => resolve({ ok: true, requestId: context.requestId, data: operationData(operation) }); });
    }
  };
  const fixture = loadIntegrated({ enabled: true, transport });
  const authState = { invitations: [{ invitationId: "invitation-1", status: "active" }] };
  const pending = fixture.context.PMInvitationService.revokeInvite(authState, "invitation-1");
  await Promise.resolve();
  assert.equal(authState.invitations[0].status, "active");
  release();
  await pending;
  assert.equal(authState.invitations[0].status, "revoked");
});

test("trusted redeem failure leaves user and membership state unchanged", async () => {
  const transport = {
    invokeTrustedOperation: async (_operation, _payload, context) => ({ ok: false, code: "NOT_FOUND", requestId: context.requestId })
  };
  const fixture = loadIntegrated({ enabled: true, transport });
  const authState = { workspace_members: [] };
  const user = { uid: "user-1", status: "pending" };
  await assert.rejects(fixture.context.PMInvitationService.acceptInviteCode({
    authState, user, code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345"
  }), { code: "NOT_FOUND" });
  assert.equal(authState.workspace_members.length, 0);
  assert.equal(user.status, "pending");
});

test("trusted redeem applies local membership only after backend success", async () => {
  const fixture = loadIntegrated({ enabled: true, transport: successTransport() });
  const authState = { workspace_members: [] };
  const user = { uid: "user-1", status: "pending" };
  await fixture.context.PMInvitationService.acceptInviteCode({
    authState, user, code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345"
  });
  assert.equal(authState.workspace_members.length, 1);
  assert.equal(user.currentWorkspaceId, "workspace-safe-id");
  assert.equal(user.inviteCode, undefined);
});

test("trusted public acceptRemoteInviteCode routes only through redeem adapter", async () => {
  const records = [];
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(records),
    runtime: { init: async () => { runtimeCalls += 1; throw new Error("legacy runtime called"); } }
  });
  const result = await fixture.context.PMInvitationService.acceptRemoteInviteCode({
    user: { uid: "user-1" },
    code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345"
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].operation, "invitation.redeem");
  assert.equal(runtimeCalls, 0);
  assert.equal(result.member.workspaceId, "workspace-safe-id");
  assert.equal(result.member.inviteCode, undefined);
  assert.equal(result.inviteCodeId, undefined);
});

test("trusted public acceptRemoteInviteCode fails closed without transport", async () => {
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: null,
    runtime: { init: async () => { runtimeCalls += 1; return null; } }
  });
  await assert.rejects(fixture.context.PMInvitationService.acceptRemoteInviteCode({
    user: { uid: "user-1" }, code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345"
  }), { code: "INTERNAL" });
  assert.equal(runtimeCalls, 0);
});

test("trusted public acceptRemoteInviteCode has no legacy fallback on backend error", async () => {
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: {
      invokeTrustedOperation: async (_operation, _payload, context) => ({ ok: false, code: "NOT_FOUND", requestId: context.requestId })
    },
    runtime: { init: async () => { runtimeCalls += 1; return null; } }
  });
  await assert.rejects(fixture.context.PMInvitationService.acceptRemoteInviteCode({
    user: { uid: "user-1" }, code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345"
  }), { code: "NOT_FOUND" });
  assert.equal(runtimeCalls, 0);
});

test("trusted public acceptRemoteInviteCode rejects malformed success response", async () => {
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: {
      invokeTrustedOperation: async (_operation, _payload, context) => ({
        ok: true,
        requestId: context.requestId,
        data: { result: { status: "completed", memberPresent: false } }
      })
    },
    runtime: { init: async () => { runtimeCalls += 1; return null; } }
  });
  await assert.rejects(fixture.context.PMInvitationService.acceptRemoteInviteCode({
    user: { uid: "user-1" }, code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345"
  }), { code: "INTERNAL" });
  assert.equal(runtimeCalls, 0);
});

test("trusted public redeem persists and logs no raw invitation code", async () => {
  const fixture = loadIntegrated({ enabled: true, transport: successTransport() });
  const code = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
  const user = { uid: "user-1" };
  const result = await fixture.context.PMInvitationService.acceptRemoteInviteCode({ user, code });
  assert.equal(fixture.localStorageWrites.length, 0);
  assert.equal(JSON.stringify(fixture.logs).includes(code), false);
  assert.equal(JSON.stringify(result).includes(code), false);
  assert.equal(JSON.stringify(user).includes(code), false);
});

test("trusted getRemoteInvite is fail closed before direct Firestore read", async () => {
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(),
    runtime: { init: async () => { runtimeCalls += 1; return null; } }
  });
  await assert.rejects(fixture.context.PMInvitationService.getRemoteInvite("PM-ABCD-EFGH"), {
    code: "trusted-preview-unavailable"
  });
  assert.equal(runtimeCalls, 0);
});

test("flag OFF getRemoteInvite preserves legacy Firestore read", async () => {
  const reads = [];
  const firestore = {
    doc: (_db, ...segments) => segments.join("/"),
    getDoc: async (path) => {
      reads.push(path);
      return {
        exists: () => true,
        data: () => ({ workspaceId: "workspace-1", role: "normal", status: "active", maxUses: 1, usedCount: 0 })
      };
    }
  };
  const fixture = loadIntegrated({ enabled: false, runtime: { init: async () => ({ db: {}, sdk: { firestore } }) } });
  const invite = await fixture.context.PMInvitationService.getRemoteInvite("PM-ABCD-EFGH");
  assert.equal(reads[0], "invites/PM-ABCD-EFGH");
  assert.equal(invite.workspaceId, "workspace-1");
});

test("flag OFF acceptRemoteInviteCode preserves legacy batch flow", async () => {
  const reads = [];
  const writes = [];
  let commits = 0;
  const firestore = {
    doc: (_db, ...segments) => segments.join("/"),
    getDoc: async (path) => {
      reads.push(path);
      if (path.startsWith("invites/")) {
        return {
          exists: () => true,
          data: () => ({ workspaceId: "workspace-1", role: "normal", status: "active", maxUses: 1, usedCount: 0 })
        };
      }
      return { exists: () => true, data: () => ({ status: "active" }) };
    },
    serverTimestamp: () => "server-time",
    writeBatch: () => ({
      set: (path) => writes.push(path),
      commit: async () => { commits += 1; }
    })
  };
  const fixture = loadIntegrated({ enabled: false, runtime: { init: async () => ({ db: {}, sdk: { firestore } }) } });
  const result = await fixture.context.PMInvitationService.acceptRemoteInviteCode({
    user: { uid: "user-1", email: "member@example.invalid" },
    code: "PM-ABCD-EFGH"
  });
  assert.equal(reads.includes("invites/PM-ABCD-EFGH"), true);
  assert.equal(writes.some((path) => path.startsWith("workspaceJoinRequests/")), true);
  assert.equal(commits, 1);
  assert.equal(result.pending, true);
});

test("trusted email-target invitation fails closed before transport", async () => {
  const records = [];
  const fixture = loadIntegrated({ enabled: true, transport: successTransport(records) });
  await assert.rejects(fixture.context.PMInvitationService.createInvite({
    authState: { invitations: [] }, currentUser: {}, workspaceId: "workspace-1", role: "normal", email: "target@example.test", expiresHours: 1
  }), { code: "FAILED_PRECONDITION" });
  assert.equal(records.length, 0);
});

test("trusted admin create without canonical workspace fails closed", async () => {
  const records = [];
  const fixture = loadIntegrated({ enabled: true, transport: successTransport(records) });
  await assert.rejects(fixture.context.PMSystemAdminService.submitAdminApplication({
    user: {}, fields: { requestedRole: "normal", reason: "test" }
  }), { code: "INVALID_ARGUMENT" });
  assert.equal(records.length, 0);
});

test("trusted admin create omits an empty optional reason", async () => {
  const records = [];
  const fixture = makeContext({ enabled: true, transport: successTransport(records) });
  await client(fixture).createAdminApplication({
    workspaceId: "workspace-1",
    requestedRole: "normal",
    reason: null
  });
  assert.equal(Object.prototype.hasOwnProperty.call(records[0].envelope.payload, "reason"), false);
});

test("flag OFF preserves legacy invitation write order and local insert", async () => {
  const writes = [];
  const firestore = {
    doc: (_db, ...segments) => segments.join("/"),
    serverTimestamp: () => "server-time",
    setDoc: async (path) => { writes.push(path); }
  };
  const fixture = loadIntegrated({ enabled: false, runtime: { init: async () => ({ db: {}, sdk: { firestore } }) } });
  const authState = { invitations: [] };
  await fixture.context.PMInvitationService.createInvite({
    authState,
    currentUser: { uid: "user-1", workspaceRole: "manager" },
    workspaceId: "workspace-1",
    role: "normal",
    expiresHours: 1,
    maxUses: 1,
    reusable: false
  });
  assert.equal(authState.invitations.length, 1);
  assert.deepEqual(writes.map((path) => path.split("/").filter((segment) => ["invites", "invitations", "inviteCodes"].includes(segment))), [
    ["invites"], ["invitations"], ["inviteCodes"]
  ]);
});

test("flag ON admin operations never initialize legacy Firebase runtime", async () => {
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(),
    runtime: { init: async () => { runtimeCalls += 1; throw new Error("legacy runtime called"); } }
  });
  await fixture.context.PMSystemAdminService.submitAdminApplication({
    user: {}, fields: { workspaceId: "workspace-1", requestedRole: "normal", reason: "test" }
  });
  await fixture.context.PMSystemAdminService.approveAdminApplication({ id: "application-1" });
  await fixture.context.PMSystemAdminService.rejectAdminApplication({ id: "application-1" });
  assert.equal(runtimeCalls, 0);
});

test("flag ON invitation operations never initialize legacy Firebase runtime", async () => {
  let runtimeCalls = 0;
  const fixture = loadIntegrated({
    enabled: true,
    transport: successTransport(),
    runtime: { init: async () => { runtimeCalls += 1; throw new Error("legacy runtime called"); } }
  });
  const authState = { invitations: [], workspace_members: [] };
  await fixture.context.PMInvitationService.createInvite({ authState, currentUser: {}, workspaceId: "workspace-1", role: "normal", expiresHours: 1, maxUses: 1, reusable: false });
  await fixture.context.PMInvitationService.revokeInvite(authState, "invitation-safe-id");
  await fixture.context.PMInvitationService.acceptInviteCode({ authState, user: { uid: "user-1" }, code: "AbCdEfGhIjKlMnOpQrStUvWxYz012345" });
  assert.equal(runtimeCalls, 0);
});

for (const [label, pattern] of [
  ["legacy invites", /(?:setDoc|writeBatch).*\binvites\b/s],
  ["legacy invitations", /(?:setDoc|writeBatch).*\binvitations\b/s],
  ["nested inviteCodes", /(?:setDoc|writeBatch).*\binviteCodes\b/s],
  ["legacy membership", /(?:setDoc|writeBatch).*\bworkspace_members\b/s],
  ["nested membership", /(?:setDoc|writeBatch).*collection\(["']members["']\)/s],
  ["adminApplications", /(?:setDoc|writeBatch).*\badminApplications\b/s],
  ["authorityInvitations", /(?:setDoc|writeBatch).*\bauthorityInvitations\b/s],
  ["securityAuditLogs", /(?:setDoc|writeBatch).*\bsecurityAuditLogs\b/s],
  ["idempotency collection", /(?:getDoc|setDoc|writeBatch).*\btrustedOperationIdempotency\b/s]
]) {
  test(`trusted client contains no direct ${label} access`, () => {
    assert.equal(pattern.test(trustedSource), false);
  });
}

test("trusted service loads before authority facades", () => {
  const trustedIndex = indexSource.indexOf("services/trustedBackendService.js");
  assert.ok(trustedIndex > 0);
  assert.ok(trustedIndex < indexSource.indexOf("services/invitationService.js"));
  assert.ok(trustedIndex < indexSource.indexOf("services/systemAdminService.js"));
  assert.equal((indexSource.match(/services\/trustedBackendService\.js\?v=4/g) || []).length, 1);
  assert.equal((indexSource.match(/services\/systemAdminService\.js\?v=20/g) || []).length, 1);
});

test("flag ON management UI routes before legacy listeners and root membership merge", () => {
  const start = appSource.indexOf("function startSystemOwnerRealtimeV54");
  const end = appSource.indexOf("function renderJoinRequestsAdminV54", start);
  const body = appSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(body.indexOf("loadTrustedManagementSnapshot") < body.indexOf("subscribeJoinRequests"));
  assert.ok(body.indexOf("loadTrustedManagementSnapshot") < body.indexOf("subscribeWorkspaceMembers"));
  assert.match(adminSource, /function subscribeWorkspaceMembers[\s\S]*?trustedAuthorityRequested\(\)[\s\S]*?loadTrustedManagementSnapshot/);
  assert.match(adminSource, /async function listWorkspaceMembers[\s\S]*?trustedAuthorityRequested\(\)[\s\S]*?loadTrustedManagementSnapshot/);
});

test("trusted startup and account render never start the global workspace member listener", () => {
  const startup = functionSource(appSource, "startWorkspaceDataSyncV45", "isFirebaseBackedSessionV45");
  const accountRender = lastFunctionSource(appSource, "renderAccountsV17", "workspaceSwitcherV37");
  assert.match(startup, /trustedAuthorityEnabledV6D\(\)[\s\S]*?stopWorkspaceMembersRealtimeV49\(\)[\s\S]*?else startWorkspaceMembersRealtimeV49/);
  assert.match(accountRender, /trustedAuthorityEnabledV6D\(\)[\s\S]*?stopWorkspaceMembersRealtimeV49\(\)[\s\S]*?ensureTrustedWorkspaceMembersReadV6D/);
  assert.match(accountRender, /else \{[\s\S]*?startWorkspaceMembersRealtimeV49/);
});

test("trusted workspace and auth restart paths retain the guarded sync entry", () => {
  const activation = functionSource(appSource, "activateWorkspaceForUserV36", "startWorkspaceDataSyncV45");
  const retryStart = appSource.indexOf("const startWorkspaceDataSyncBeforeV106 = startWorkspaceDataSyncV45");
  const retryEnd = appSource.indexOf("const saveStoreBeforeV106", retryStart);
  const retry = appSource.slice(retryStart, retryEnd);
  assert.match(activation, /startWorkspaceDataSyncV45\(workspaceId\)/);
  assert.ok(retryStart >= 0 && retryEnd > retryStart);
  assert.match(retry, /startWorkspaceDataSyncBeforeV106\(targetWorkspaceId\)/);
  assert.doesNotMatch(retry, /startWorkspaceMembersRealtimeV49/);
});

test("trusted workspace member listener guard runs before Firebase runtime", () => {
  const body = functionSource(appSource, "startWorkspaceMembersRealtimeV49", "applyWorkspaceMembersSnapshotV49");
  assert.ok(body.indexOf("trustedAuthorityEnabledV6D()") < body.indexOf("PMFirebaseRuntime"));
  assert.ok(body.indexOf("stopWorkspaceMembersRealtimeV49()") < body.indexOf('.collection("workspaces")'));
});

test("trusted mode blocks legacy one-shot member read and snapshot merge", () => {
  const refresh = functionSource(appSource, "refreshRemoteWorkspaceMembersV39", "stopWorkspaceMembersRealtimeV49");
  const apply = functionSource(appSource, "applyWorkspaceMembersSnapshotV49", "stopCurrentUserRealtimeV50");
  assert.ok(refresh.indexOf("trustedAuthorityEnabledV6D()") < refresh.indexOf("PMFirebaseRuntime"));
  assert.ok(apply.indexOf("trustedAuthorityEnabledV6D()") < apply.indexOf("authStateV31.workspace_members"));
});

test("trusted member management uses one-time adapter rows without legacy invite fields", () => {
  const loader = functionSource(appSource, "ensureTrustedWorkspaceMembersReadV6D", "usersForCurrentWorkspaceV38");
  const rows = functionSource(appSource, "trustedWorkspaceMemberRowsV6D", "ensureTrustedWorkspaceMembersReadV6D");
  assert.match(loader, /listWorkspaceMembers\(\{ workspaceId: canonicalWorkspaceId, limit: 100 \}\)/);
  assert.doesNotMatch(loader, /PMFirebaseRuntime|onSnapshot|collectionGroup|workspace_members/);
  assert.doesNotMatch(`${loader}\n${rows}`, /inviteCode|inviteCodeId|invitedBy|invitedByEmail/);
  assert.match(rows, /if \(!trustedAuthorityEnabledV6D\(\)\) return \[\]/);
});

test("trusted member management targets canonical session workspace only", () => {
  const resolver = functionSource(appSource, "trustedCurrentWorkspaceIdV6D", "trustedWorkspaceMemberRowsV6D");
  assert.match(resolver, /currentUser\?\.currentWorkspaceId/);
  assert.match(resolver, /authWorkspaceStateV36\.currentWorkspaceId/);
  assert.doesNotMatch(resolver, /workspace_id|store\.workspace_id|PMDataService/);
});

test("safe own-membership session resolver remains available", () => {
  const ownMembership = functionSource(authSource, "findActiveWorkspaceMembership", "firebaseLoginWithGoogle");
  assert.match(ownMembership, /collectionGroup\("members"\)/);
  assert.match(ownMembership, /where\("uid", "==", uid\)/);
  assert.match(ownMembership, /limit\(10\)/);
});

test("AppSession retains canonical nested membership authority", () => {
  assert.match(sessionServiceSource, /repository\.getNestedMembership\(currentWorkspaceId, firebaseUser\.uid\)/);
  assert.match(sessionServiceSource, /currentWorkspaceRole: normalizedMembership\.role/);
  assert.doesNotMatch(sessionServiceSource, /trustedWorkspaceMembersStateV6D/);
});

test("flag OFF retains the legacy workspace member listener implementation", () => {
  const listener = functionSource(appSource, "startWorkspaceMembersRealtimeV49", "applyWorkspaceMembersSnapshotV49");
  assert.match(listener, /\.collection\("workspaces"\)[\s\S]*?\.collection\("members"\)[\s\S]*?\.onSnapshot/);
});

test("invitation public export inventory retains guarded compatibility APIs", () => {
  assert.match(invitationSource, /window\.PMInvitationService = \{[\s\S]*?getRemoteInvite,[\s\S]*?acceptInviteCode,[\s\S]*?acceptRemoteInviteCode,/);
  const preview = functionSource(invitationSource, "getRemoteInvite", "validateInvite");
  const publicRedeem = functionSource(invitationSource, "acceptRemoteInviteCode", "acceptInviteCode");
  assert.ok(preview.indexOf("trustedAuthorityRequested()") < preview.indexOf("PMFirebaseRuntime"));
  assert.ok(publicRedeem.indexOf("trustedAuthorityRequested()") < publicRedeem.indexOf("getRemoteInvite"));
});

test("flag ON operation mode reaches trusted adapter before runtime and legacy batch", () => {
  const start = adminSource.indexOf("async function changeWorkspaceOperationMode");
  const end = adminSource.indexOf("window.PMSystemAdminService", start);
  const body = adminSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(body.indexOf("trustedAuthorityRequested()") < body.indexOf("runtimeRequired()"));
  assert.ok(body.indexOf("setWorkspaceOperationMode") < body.indexOf("runtime.db.batch()"));
  assert.ok(body.indexOf("setWorkspaceOperationMode") < body.indexOf('collection("adminLogs")'));
});

test("trusted management UI does not automatically read adminLogs", () => {
  assert.match(appSource, /loadTrustedManagementSnapshot[\s\S]*?systemOwnerStateV54\.adminLogs = \[\]/);
  assert.match(adminSource, /subscribeAdminLogs:[\s\S]*?trustedAuthorityRequested\(\)[\s\S]*?async \(\) => \[\]/);
});

test("trusted invitation management targets canonical currentWorkspaceId only", () => {
  const start = appSource.indexOf("function ensureTrustedInvitationManagementReadV6B");
  const end = appSource.indexOf("function applySystemOwnerWorkspaceV57", start);
  const body = appSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(body, /currentUser\?\.currentWorkspaceId/);
  assert.doesNotMatch(body, /currentUser\?\.workspaceId|currentUser\?\.workspace_id|store\.workspace_id/);
});

test("trusted invitation management synchronously clears legacy cache before its async read", () => {
  const start = appSource.indexOf("function ensureTrustedInvitationManagementReadV6B");
  const end = appSource.indexOf("function applySystemOwnerWorkspaceV57", start);
  const body = appSource.slice(start, end);
  assert.ok(body.indexOf("sanitizeTrustedInvitationRuntimeStateV6F({ clearInvitationCache: true })")
    < body.indexOf("Promise.resolve("));
  assert.match(body, /\.catch\(\(error\) => \{[\s\S]*?authStateV31\.invitations = \[\]/);
});

test("trusted app sanitizer removes legacy invitation fields from auth, user, member, and invitation caches", () => {
  const sanitizer = functionSource(appSource, "sanitizeTrustedInvitationAuthorityStateV6F", "sanitizeTrustedInvitationRuntimeStateV6F");
  assert.match(sanitizer, /users: Array\.isArray\(state\.users\) \? state\.users\.map\(stripTrustedLegacyInvitationFieldsV6F\)/);
  assert.match(sanitizer, /workspace_members: Array\.isArray\(state\.workspace_members\)/);
  assert.match(sanitizer, /invitations: clearInvitationCache\s*\?\s*\[\]/);
  assert.match(appSource, /"pendingInviteCodeId"/);
  assert.match(appSource, /"inviteCodeId"/);
  assert.match(appSource, /"inviteCode"/);
});

test("trusted UI stores canonical pending IDs and never falls back to the submitted code", () => {
  const registration = functionSource(appSource, "inviteCodeRegisterV37", "accountWithdrawPanelV37");
  const approvalGate = functionSource(appSource, "renderApprovalGateV54", "renderAdminApplicationFormV54");
  assert.match(registration, /if \(trustedAuthorityEnabledV6D\(\)\) \{[\s\S]*?pendingInvitationId[\s\S]*?pendingJoinRequestId[\s\S]*?delete currentUser\.pendingInviteCodeId/);
  assert.match(approvalGate, /if \(trustedAuthorityEnabledV6D\(\)\) \{[\s\S]*?pendingInvitationId[\s\S]*?pendingJoinRequestId[\s\S]*?delete user\.pendingInviteCodeId/);
  assert.match(registration, /\} else \{\s*currentUser\.pendingInviteCodeId = member\.inviteCodeId \|\| member\.inviteCode \|\| code\.value/);
  assert.match(approvalGate, /\} else \{\s*user\.pendingInviteCodeId = result\.inviteCodeId \|\| code\.value/);
});

test("trusted hydration does not copy legacy invitation fields into active user state", () => {
  const finalSync = lastFunctionSource(appSource, "syncFirebaseUserToLocalAuthV33", "setApprovalGateModeV54");
  const currentUserSubscription = functionSource(appSource, "startCurrentUserRealtimeV50", "ensureTrustedInvitationManagementReadV6B");
  assert.match(finalSync, /if \(trustedAuthorityEnabledV6D\(\)\) \{[\s\S]*?delete user\.pendingInviteCodeId[\s\S]*?delete user\.inviteCode[\s\S]*?delete user\.inviteCodeId/);
  assert.match(currentUserSubscription, /if \(trustedAuthorityEnabledV6D\(\)\) \{[\s\S]*?pendingInvitationId[\s\S]*?delete currentUser\.pendingInviteCodeId/);
  assert.match(authSource, /function sanitizeTrustedAuthorityState/);
  assert.match(authSource, /pendingInvitationId/);
});

test("trusted raw-code form input is cleared after successful submit", () => {
  const registration = functionSource(appSource, "inviteCodeRegisterV37", "accountWithdrawPanelV37");
  const approvalGate = functionSource(appSource, "renderApprovalGateV54", "renderAdminApplicationFormV54");
  assert.match(registration, /code\.value = "";/);
  assert.match(approvalGate, /code\.value = "";/);
});

test("production Functions export remains health only", () => {
  assert.match(productionEntrySource, /^export \{ trustedBackendHealth \}/m);
  assert.doesNotMatch(productionEntrySource, /trusted(Create|Approve|Reject|Revoke|Redeem)/);
  assert.doesNotMatch(productionEntrySource, /trusted(Update|Set|Remove)WorkspaceMember/);
  assert.doesNotMatch(productionEntrySource, /trusted(Disable|Enable|Delete)UserAccount/);
  assert.doesNotMatch(productionEntrySource, /trusted(ApproveWorkspaceBootstrap|SetWorkspaceLifecycle)/);
  assert.doesNotMatch(productionEntrySource, /trustedSetWorkspaceOperationMode/);
  assert.doesNotMatch(productionEntrySource, /trustedList/);
});

test("client adapter contains no production endpoint or token transport", () => {
  assert.doesNotMatch(trustedSource, /https?:\/\/|Authorization|Bearer|projectId|fetch\(|XMLHttpRequest/);
});

test("client adapter contains no query or persistent flag source", () => {
  assert.doesNotMatch(trustedSource, /location\.search|URLSearchParams|localStorage|sessionStorage/i);
});

test("app waits for trusted revoke before persisting local auth state", () => {
  assert.match(appSource, /await window\.PMInvitationService\?\.revokeInvite/);
  assert.match(appSource, /catch \(error\)[\s\S]*?초대코드 폐기 실패/);
});

let passed = 0;
for (const [name, run] of tests) {
  try {
    await run();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

console.log(`Trusted backend client adapter tests: ${passed}/${tests.length} passed.`);
