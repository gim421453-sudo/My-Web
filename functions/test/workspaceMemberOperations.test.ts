import assert from "node:assert/strict";
import test from "node:test";
import { OperationError } from "../src/operations/operationErrors.js";
import { sha256Canonical } from "../src/operations/operationContract.js";
import {
  trustedRemoveWorkspaceMember,
  trustedSetWorkspaceMemberStatus,
  trustedUpdateWorkspaceMemberRole,
} from "../src/workspaceMembers/workspaceMemberOperations.js";
import type { WorkspaceRole } from "../src/authz/authorizationTypes.js";
import { fixtureActor, membershipV1, ownerV1 } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

const WORKSPACE = "fixture-member-workspace";
const OWNER = "fixture-member-owner";
const ACTOR = "fixture-member-actor";
const TARGET = "fixture-member-target";
const OTHER_ADMIN = "fixture-member-other-admin";
const NOW = new Date("2026-08-13T00:00:00.000Z");

function member(uid: string, role: WorkspaceRole, overrides: Record<string, unknown> = {}) {
  return membershipV1(role, { uid, workspaceId: WORKSPACE, ...overrides });
}

function baseFixtures(extra: Record<string, Readonly<Record<string, unknown>>> = {}) {
  return {
    [`systemOwners/${OWNER}`]: ownerV1({ uid: OWNER }),
    [`workspaces/${WORKSPACE}`]: { workspaceId: WORKSPACE, status: "active" },
    [`workspaces/${WORKSPACE}/members/${TARGET}`]: member(TARGET, "teacher"),
    ...extra,
  };
}

function ownerRunner(extra: Record<string, Readonly<Record<string, unknown>>> = {}) {
  return new MemoryTransactionRunner(baseFixtures(extra), NOW);
}

function memberRunner(actorRole: WorkspaceRole, targetRole: WorkspaceRole = "teacher") {
  return new MemoryTransactionRunner({
    [`workspaces/${WORKSPACE}`]: { workspaceId: WORKSPACE, status: "active" },
    [`workspaces/${WORKSPACE}/members/${ACTOR}`]: member(ACTOR, actorRole),
    [`workspaces/${WORKSPACE}/members/${TARGET}`]: member(TARGET, targetRole),
  }, NOW);
}

function roleInput(newRole: unknown, key = "fixture-member-role-update-0001") {
  return {
    operation: "workspace_member.role.update",
    idempotencyKey: key,
    target: { kind: "workspace_member", id: TARGET, workspaceId: WORKSPACE },
    payload: { newRole },
  };
}

function statusInput(status: unknown, key = "fixture-member-status-update-0001") {
  return {
    operation: "workspace_member.status.set",
    idempotencyKey: key,
    target: { kind: "workspace_member", id: TARGET, workspaceId: WORKSPACE },
    payload: { status },
  };
}

function removeInput(key = "fixture-member-remove-0001") {
  return {
    operation: "workspace_member.remove",
    idempotencyKey: key,
    target: { kind: "workspace_member", id: TARGET, workspaceId: WORKSPACE },
    payload: {},
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => (
    error instanceof OperationError && error.code === code
  ));
}

test("system owner updates a canonical active member role", async () => {
  const runner = ownerRunner();
  const result = await trustedUpdateWorkspaceMemberRole(fixtureActor(OWNER), roleInput("manager"), { runner });
  assert.equal(result.result.role, "manager");
  assert.equal(result.result.workspaceId, WORKSPACE);
  assert.equal(result.result.sessionRefreshRequired, true);
  assert.equal(runner.store.get(`workspaces/${WORKSPACE}/members/${TARGET}`)?.role, "manager");
});

test("super manager updates a subordinate role", async () => {
  const runner = memberRunner("super_manager");
  assert.equal((await trustedUpdateWorkspaceMemberRole(
    fixtureActor(ACTOR), roleInput("manager"), { runner },
  )).result.role, "manager");
});

test("manager updates only subordinate roles", async () => {
  const runner = memberRunner("manager");
  assert.equal((await trustedUpdateWorkspaceMemberRole(
    fixtureActor(ACTOR), roleInput("viewer"), { runner },
  )).result.role, "viewer");
});

test("manager cannot manage or create manager and super manager authority", async () => {
  await expectCode(trustedUpdateWorkspaceMemberRole(
    fixtureActor(ACTOR), roleInput("teacher"), { runner: memberRunner("manager", "manager") },
  ), "FORBIDDEN");
  await expectCode(trustedUpdateWorkspaceMemberRole(
    fixtureActor(ACTOR), roleInput("manager"), { runner: memberRunner("manager") },
  ), "FORBIDDEN");
  await expectCode(trustedUpdateWorkspaceMemberRole(
    fixtureActor(ACTOR), roleInput("super_manager"), { runner: memberRunner("manager") },
  ), "FORBIDDEN");
});

test("super manager cannot manage another super manager", async () => {
  await expectCode(trustedSetWorkspaceMemberStatus(
    fixtureActor(ACTOR), statusInput("disabled"), { runner: memberRunner("super_manager", "super_manager") },
  ), "FORBIDDEN");
});

for (const role of ["system_owner", "Teacher", "unknown"]) {
  test(`role update rejects non-canonical role ${role}`, async () => {
    await expectCode(trustedUpdateWorkspaceMemberRole(
      fixtureActor(OWNER), roleInput(role, `fixture-invalid-role-${role}`), { runner: ownerRunner() },
    ), "INVALID_ARGUMENT");
  });
}

test("inactive canonical actor grants no membership authority", async () => {
  const runner = memberRunner("manager");
  runner.store.set(`workspaces/${WORKSPACE}/members/${ACTOR}`, member(ACTOR, "manager", {
    status: "inactive", active: false, disabled: false,
  }));
  await expectCode(trustedUpdateWorkspaceMemberRole(
    fixtureActor(ACTOR), roleInput("viewer"), { runner },
  ), "FORBIDDEN");
});

test("users role and both legacy membership names cannot grant authority", async () => {
  const runner = new MemoryTransactionRunner({
    [`workspaces/${WORKSPACE}`]: { workspaceId: WORKSPACE, status: "active" },
    [`workspaces/${WORKSPACE}/members/${TARGET}`]: member(TARGET, "teacher"),
    [`users/${ACTOR}`]: { uid: ACTOR, role: "system_owner", status: "active" },
    [`workspace_members/${WORKSPACE}_${ACTOR}`]: member(ACTOR, "super_manager"),
    [`workspaceMembers/${WORKSPACE}_${ACTOR}`]: member(ACTOR, "super_manager"),
  }, NOW);
  await expectCode(trustedUpdateWorkspaceMemberRole(
    fixtureActor(ACTOR), roleInput("viewer"), { runner },
  ), "FORBIDDEN");
  assert.equal(runner.reads.some((path) => path.startsWith("users/")), false);
  assert.equal(runner.reads.some((path) => /workspace_?[Mm]embers/.test(path)), false);
});

test("cross-workspace target and missing target fail closed", async () => {
  const mismatch = ownerRunner();
  mismatch.store.set(`workspaces/${WORKSPACE}/members/${TARGET}`, member(TARGET, "teacher", {
    workspaceId: "other-workspace",
  }));
  await expectCode(trustedUpdateWorkspaceMemberRole(
    fixtureActor(OWNER), roleInput("viewer"), { runner: mismatch },
  ), "FAILED_PRECONDITION");
  const missing = ownerRunner();
  missing.store.delete(`workspaces/${WORKSPACE}/members/${TARGET}`);
  await expectCode(trustedUpdateWorkspaceMemberRole(
    fixtureActor(OWNER), roleInput("viewer"), { runner: missing },
  ), "NOT_FOUND");
});

test("self role status and removal mutations are denied", async () => {
  const runner = ownerRunner({
    [`workspaces/${WORKSPACE}/members/${OWNER}`]: member(OWNER, "manager"),
  });
  for (const invoke of [
    () => trustedUpdateWorkspaceMemberRole(fixtureActor(OWNER), {
      ...roleInput("viewer", "fixture-self-role-0001"),
      target: { kind: "workspace_member", id: OWNER, workspaceId: WORKSPACE },
    }, { runner }),
    () => trustedSetWorkspaceMemberStatus(fixtureActor(OWNER), {
      ...statusInput("disabled", "fixture-self-status-0001"),
      target: { kind: "workspace_member", id: OWNER, workspaceId: WORKSPACE },
    }, { runner }),
    () => trustedRemoveWorkspaceMember(fixtureActor(OWNER), {
      ...removeInput("fixture-self-remove-0001"),
      target: { kind: "workspace_member", id: OWNER, workspaceId: WORKSPACE },
    }, { runner }),
  ]) await expectCode(invoke(), "FORBIDDEN");
});

for (const [label, invoke] of [
  ["demotion", (runner: MemoryTransactionRunner) => trustedUpdateWorkspaceMemberRole(
    fixtureActor(OWNER), roleInput("manager", "fixture-last-admin-role-0001"), { runner },
  )],
  ["disable", (runner: MemoryTransactionRunner) => trustedSetWorkspaceMemberStatus(
    fixtureActor(OWNER), statusInput("disabled", "fixture-last-admin-disable-0001"), { runner },
  )],
  ["removal", (runner: MemoryTransactionRunner) => trustedRemoveWorkspaceMember(
    fixtureActor(OWNER), removeInput("fixture-last-admin-remove-0001"), { runner },
  )],
] as const) {
  test(`last active super manager ${label} is denied even for system owner`, async () => {
    const runner = ownerRunner({
      [`workspaces/${WORKSPACE}/members/${TARGET}`]: member(TARGET, "super_manager"),
    });
    await expectCode(invoke(runner), "FAILED_PRECONDITION");
    assert.equal(runner.store.get(`workspaces/${WORKSPACE}/members/${TARGET}`)?.role, "super_manager");
    assert.equal(runner.store.get(`workspaces/${WORKSPACE}/members/${TARGET}`)?.status, "active");
  });
}

test("non-last super manager may be demoted by system owner", async () => {
  const runner = ownerRunner({
    [`workspaces/${WORKSPACE}/members/${TARGET}`]: member(TARGET, "super_manager"),
    [`workspaces/${WORKSPACE}/members/${OTHER_ADMIN}`]: member(OTHER_ADMIN, "super_manager"),
  });
  await trustedUpdateWorkspaceMemberRole(fixtureActor(OWNER), roleInput("manager"), { runner });
  assert.equal(runner.store.get(`workspaces/${WORKSPACE}/members/${TARGET}`)?.role, "manager");
});

test("status state machine disables and re-enables but never revives inactive membership", async () => {
  const runner = ownerRunner();
  const disabled = await trustedSetWorkspaceMemberStatus(
    fixtureActor(OWNER), statusInput("disabled"), { runner },
  );
  assert.equal(disabled.result.membershipStatus, "disabled");
  assert.equal(runner.store.get(`workspaces/${WORKSPACE}/members/${TARGET}`)?.disabled, true);
  const enabled = await trustedSetWorkspaceMemberStatus(
    fixtureActor(OWNER), statusInput("active", "fixture-member-enable-0001"), { runner },
  );
  assert.equal(enabled.result.membershipStatus, "active");
  runner.store.set(`workspaces/${WORKSPACE}/members/${TARGET}`, member(TARGET, "teacher", {
    status: "inactive", active: false, disabled: false,
  }));
  await expectCode(trustedSetWorkspaceMemberStatus(
    fixtureActor(OWNER), statusInput("active", "fixture-member-revive-0001"), { runner },
  ), "FAILED_PRECONDITION");
});

test("remove performs audited soft removal without users or legacy membership writes", async () => {
  const runner = ownerRunner();
  const removed = await trustedRemoveWorkspaceMember(fixtureActor(OWNER), removeInput(), { runner });
  assert.equal(removed.result.removed, true);
  assert.equal(removed.result.membershipStatus, "inactive");
  const stored = runner.store.get(`workspaces/${WORKSPACE}/members/${TARGET}`);
  assert.equal(stored?.status, "inactive");
  assert.equal(stored?.active, false);
  assert.equal(stored?.disabled, false);
  assert.equal(runner.store.has(`users/${TARGET}`), false);
  assert.equal(runner.writes.some((path) => /workspace_?[Mm]embers/.test(path)), false);
  assert.equal([...runner.store.values()].some((data) => data.eventType === "WORKSPACE_MEMBER_REMOVED"), true);
});

test("same idempotency replay is stable and payload mismatch conflicts", async () => {
  const runner = ownerRunner();
  const input = roleInput("viewer");
  assert.equal((await trustedUpdateWorkspaceMemberRole(fixtureActor(OWNER), input, { runner })).replayed, false);
  assert.equal((await trustedUpdateWorkspaceMemberRole(fixtureActor(OWNER), input, { runner })).replayed, true);
  await expectCode(trustedUpdateWorkspaceMemberRole(
    fixtureActor(OWNER), roleInput("normal"), { runner },
  ), "IDEMPOTENCY_CONFLICT");
});

test("completed replay rechecks current canonical actor authority", async () => {
  const runner = ownerRunner();
  const input = roleInput("viewer", "fixture-member-replay-authorization-0001");
  assert.equal((await trustedUpdateWorkspaceMemberRole(
    fixtureActor(OWNER), input, { runner },
  )).replayed, false);
  runner.store.delete(`systemOwners/${OWNER}`);
  await expectCode(trustedUpdateWorkspaceMemberRole(
    fixtureActor(OWNER), input, { runner },
  ), "FORBIDDEN");
});

test("audit collision rolls back membership and completed idempotency", async () => {
  const runner = ownerRunner();
  const input = roleInput("viewer", "fixture-member-audit-collision-0001");
  const target = { ...input.target };
  const operationIdHash = sha256Canonical({
    actorUid: OWNER,
    idempotencyKey: input.idempotencyKey,
    operation: input.operation,
    target,
  });
  const scopeHash = sha256Canonical({ actorUid: OWNER, idempotencyKey: input.idempotencyKey });
  runner.store.set(`securityAuditLogs/${operationIdHash}`, { collision: true });
  await expectCode(trustedUpdateWorkspaceMemberRole(fixtureActor(OWNER), input, { runner }), "INTERNAL");
  assert.equal(runner.store.get(`workspaces/${WORKSPACE}/members/${TARGET}`)?.role, "teacher");
  assert.equal(runner.store.has(`trustedOperationIdempotency/${scopeHash}`), false);
});
