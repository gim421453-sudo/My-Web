import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGlobalAuthorizationContext,
  buildWorkspaceAuthorizationContext,
  buildWorkspaceAuthorizationContextWithOwnerOverride,
} from "../src/authz/authorizationContext.js";
import {
  AuthorizationError,
  logSafeAuthorizationDecision,
} from "../src/authz/authzErrors.js";
import type { AuthorizationContext } from "../src/authz/authorizationTypes.js";
import {
  requireGlobalSystemOwner,
  requireWorkspaceRole,
  requireWorkspaceRoleOrSystemOwner,
} from "../src/authz/policies.js";
import {
  FIXTURE_WORKSPACE,
  fixtureActor,
  membershipV1,
  ownerV1,
} from "./support/authzFixtures.js";

function mapReader(documents: ReadonlyMap<string, Record<string, unknown>>, onRead: () => void = () => undefined) {
  return Object.freeze({
    async getDocument(pathSegments: readonly string[]) {
      onRead();
      const data = documents.get(pathSegments.join("/"));
      return Object.freeze({ exists: Boolean(data), data });
    },
  });
}

function context(
  owner: AuthorizationContext["global"]["systemOwner"],
  membership: AuthorizationContext["workspace"]["membership"],
  workspaceId: string | null = FIXTURE_WORKSPACE,
): AuthorizationContext {
  return Object.freeze({
    actor: fixtureActor(),
    operation: "fixture.operation",
    global: Object.freeze({ systemOwner: owner }),
    workspace: Object.freeze({
      workspaceId,
      membership,
      role: membership.state === "ACTIVE" ? membership.role : null,
    }),
    capability: Object.freeze({ resolution: "unresolved" }),
    assignment: Object.freeze({ resolution: "unresolved" }),
    resolution: "complete",
  });
}

function expectAuthzCode(run: () => void, code: string): void {
  assert.throws(
    run,
    (error: unknown) => error instanceof AuthorizationError && error.code === code,
  );
}

test("global context performs exactly one owner read", async () => {
  let reads = 0;
  const result = await buildGlobalAuthorizationContext(fixtureActor(), "global.inspect", {
    reader: mapReader(new Map([[`systemOwners/${fixtureActor().uid}`, ownerV1()]]), () => { reads += 1; }),
  });
  assert.equal(reads, 1);
  assert.equal(result.global.systemOwner.state, "ACTIVE");
  assert.equal(result.workspace.membership.state, "UNRESOLVED");
});

test("workspace context performs exactly one membership read", async () => {
  let reads = 0;
  const result = await buildWorkspaceAuthorizationContext(fixtureActor(), "workspace.inspect", FIXTURE_WORKSPACE, {
    reader: mapReader(new Map([[
      `workspaces/${FIXTURE_WORKSPACE}/members/${fixtureActor().uid}`,
      membershipV1(),
    ]]), () => { reads += 1; }),
  });
  assert.equal(reads, 1);
  assert.equal(result.workspace.membership.state, "ACTIVE");
  assert.equal(result.global.systemOwner.state, "UNRESOLVED");
});

test("explicit owner override context performs exactly two reads", async () => {
  let reads = 0;
  const documents = new Map([
    [`systemOwners/${fixtureActor().uid}`, ownerV1()],
    [`workspaces/${FIXTURE_WORKSPACE}/members/${fixtureActor().uid}`, membershipV1()],
  ]);
  const result = await buildWorkspaceAuthorizationContextWithOwnerOverride(
    fixtureActor(),
    "workspace.override",
    FIXTURE_WORKSPACE,
    { reader: mapReader(documents, () => { reads += 1; }) },
  );
  assert.equal(reads, 2);
  assert.equal(result.global.systemOwner.state, "ACTIVE");
  assert.equal(result.workspace.membership.state, "ACTIVE");
});

test("invalid operation is blocked before reads", async () => {
  let reads = 0;
  await assert.rejects(
    buildGlobalAuthorizationContext(fixtureActor(), "invalid operation", {
      reader: mapReader(new Map(), () => { reads += 1; }),
    }),
    (error: unknown) => error instanceof AuthorizationError && error.code === "AUTHZ_CONTEXT_MALFORMED",
  );
  assert.equal(reads, 0);
});

test("invalid workspace path is blocked before reads", async () => {
  let reads = 0;
  await assert.rejects(
    buildWorkspaceAuthorizationContext(fixtureActor(), "workspace.inspect", "bad/path", {
      reader: mapReader(new Map(), () => { reads += 1; }),
    }),
    (error: unknown) => error instanceof AuthorizationError && error.code === "AUTHZ_CONTEXT_MALFORMED",
  );
  assert.equal(reads, 0);
});

test("AuthorizationContext remains capability and assignment unresolved", async () => {
  const result = await buildGlobalAuthorizationContext(fixtureActor(), "global.inspect", {
    reader: mapReader(new Map()),
  });
  assert.equal(result.capability.resolution, "unresolved");
  assert.equal(result.assignment.resolution, "unresolved");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.global), true);
});

test("active owner passes global owner policy", () => {
  assert.doesNotThrow(() => requireGlobalSystemOwner(context(
    { state: "ACTIVE", source: "system_bootstrap" },
    { state: "UNRESOLVED" },
    null,
  )));
});

for (const state of ["NOT_OWNER", "DISABLED", "MIGRATION_REQUIRED"] as const) {
  test(`${state} owner is denied by global owner policy`, () => {
    expectAuthzCode(() => requireGlobalSystemOwner(context({ state }, { state: "UNRESOLVED" }, null)), "AUTHZ_SYSTEM_OWNER_REQUIRED");
  });
}

test("owner read error is not converted to NOT_OWNER", () => {
  expectAuthzCode(
    () => requireGlobalSystemOwner(context({ state: "READ_ERROR" }, { state: "UNRESOLVED" }, null)),
    "AUTHZ_INTERNAL_ERROR",
  );
});

test("active manager passes explicit manager allowlist", () => {
  assert.doesNotThrow(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "ACTIVE", role: "manager", source: "system_bootstrap" },
  ), ["super_manager", "manager"]));
});

test("teacher fails manager-only allowlist", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "ACTIVE", role: "teacher", source: "system_bootstrap" },
  ), ["manager"]), "AUTHZ_ROLE_DENIED");
});

test("numeric role hierarchy is not inferred", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "ACTIVE", role: "super_manager", source: "system_bootstrap" },
  ), ["manager"]), "AUTHZ_ROLE_DENIED");
});

test("system owner does not bypass ordinary workspace role policy", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "ACTIVE", source: "system_bootstrap" },
    { state: "MISSING" },
  ), ["manager"]), "AUTHZ_MEMBERSHIP_MISSING");
});

test("system owner bypasses only explicit owner override policy", () => {
  assert.doesNotThrow(() => requireWorkspaceRoleOrSystemOwner(context(
    { state: "ACTIVE", source: "system_bootstrap" },
    { state: "MISSING" },
  ), ["manager"]));
});

test("ordinary active membership passes explicit owner override policy", () => {
  assert.doesNotThrow(() => requireWorkspaceRoleOrSystemOwner(context(
    { state: "NOT_OWNER" },
    { state: "ACTIVE", role: "manager", source: "system_bootstrap" },
  ), ["manager"]));
});

test("unresolved owner cannot pass owner override policy", () => {
  expectAuthzCode(() => requireWorkspaceRoleOrSystemOwner(context(
    { state: "UNRESOLVED" },
    { state: "ACTIVE", role: "manager", source: "system_bootstrap" },
  ), ["manager"]), "AUTHZ_CONTEXT_REQUIRED");
});

test("unresolved membership cannot pass workspace role policy", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "UNRESOLVED" },
  ), ["manager"]), "AUTHZ_CONTEXT_MALFORMED");
});

test("disabled membership receives a distinct denial", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "DISABLED" },
  ), ["manager"]), "AUTHZ_MEMBERSHIP_DISABLED");
});

test("workspace read error fails closed", () => {
  expectAuthzCode(() => requireWorkspaceRole(context(
    { state: "UNRESOLVED" },
    { state: "READ_ERROR" },
  ), ["manager"]), "AUTHZ_INTERNAL_ERROR");
});

test("safe authorization log excludes actor and workspace identifiers", () => {
  const logs: unknown[] = [];
  logSafeAuthorizationDecision({
    requestId: "fixture-request",
    operation: "workspace.inspect",
    decision: "deny",
    reasonCode: "AUTHZ_ROLE_DENIED",
    emulator: true,
  }, (_label, entry) => logs.push(entry));
  const text = JSON.stringify(logs);
  assert.equal(text.includes(fixtureActor().uid), false);
  assert.equal(text.includes(FIXTURE_WORKSPACE), false);
  assert.equal(text.includes("manager"), false);
});

test("safe authorization log sanitizes caller supplied labels", () => {
  const logs: unknown[] = [];
  logSafeAuthorizationDecision({
    requestId: "fixture-request token-like value",
    operation: "workspace.inspect/fixture-secret",
    decision: "error",
    reasonCode: "AUTHZ_INTERNAL_ERROR",
    emulator: true,
  }, (_label, entry) => logs.push(entry));
  assert.deepEqual(logs, [{
    requestId: "invalid",
    operation: "invalid",
    decision: "error",
    reasonCode: "AUTHZ_INTERNAL_ERROR",
    emulator: true,
  }]);
});
