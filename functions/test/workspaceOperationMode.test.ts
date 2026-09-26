import assert from "node:assert/strict";
import test from "node:test";
import { OperationError } from "../src/operations/operationErrors.js";
import { trustedSetWorkspaceOperationMode } from "../src/workspaces/workspaceOperationMode.js";
import { fixtureActor, ownerV1 } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

const ACTOR = "fixture-mode-owner";
const WORKSPACE = "fixture-mode-workspace";

function runner(owner = ownerV1({ uid: ACTOR }), workspace: Record<string, unknown> = {}) {
  return new MemoryTransactionRunner({
    [`systemOwners/${ACTOR}`]: owner,
    [`workspaces/${WORKSPACE}`]: {
      schemaVersion: 1,
      workspaceId: WORKSPACE,
      status: "active",
      disabled: false,
      archived: false,
      operationMode: "personal",
      operationModeVersion: 3,
      ...workspace,
    },
  }, "fixture-now");
}

function input(
  key = "fixture-operation-mode-change-0001",
  payload: Record<string, unknown> = {},
) {
  return {
    operation: "workspace.operation_mode.set",
    idempotencyKey: key,
    target: { kind: "workspace", id: WORKSPACE, workspaceId: null },
    payload: { expectedMode: "personal", newMode: "school", reason: "school rollout", ...payload },
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof OperationError && error.code === code);
}

test("operation mode updates a minimal workspace field set with audit and idempotency", async () => {
  const store = runner();
  const result = await trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), input(), { runner: store });
  assert.equal(result.result.previousMode, "personal");
  assert.equal(result.result.nextMode, "school");
  assert.equal(result.result.operationModeVersion, 4);
  assert.equal(store.store.get(`workspaces/${WORKSPACE}`)?.operationMode, "school");
  assert.equal(store.store.get(`workspaces/${WORKSPACE}`)?.operationModeVersion, 4);
  assert.equal(store.writes.some((path) => path.startsWith("adminLogs/")), false);
  assert.equal(store.writes.some((path) => path.startsWith("securityAuditLogs/")), true);
  assert.equal(store.writes.some((path) => path.startsWith("trustedOperationIdempotency/")), true);
});

test("operation mode requires active canonical system owner and ignores spoof sources", async () => {
  const missingOwner = runner();
  missingOwner.store.delete(`systemOwners/${ACTOR}`);
  missingOwner.store.set(`users/${ACTOR}`, { uid: ACTOR, role: "system_owner" });
  missingOwner.store.set(`workspace_members/${WORKSPACE}_${ACTOR}`, {
    uid: ACTOR, workspaceId: WORKSPACE, role: "super_manager", status: "active",
  });
  await expectCode(trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), input(), { runner: missingOwner }), "FORBIDDEN");

  const inactive = runner(ownerV1({ uid: ACTOR, status: "disabled" }));
  await expectCode(trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), input(), { runner: inactive }), "FORBIDDEN");
});

test("operation mode rejects arbitrary, case-variant, scoped and unknown-field input", async () => {
  for (const newMode of ["maintenance", "SCHOOL", "school-mode"]) {
    await expectCode(trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), input(undefined, { newMode }), {
      runner: runner(),
    }), "INVALID_ARGUMENT");
  }
  await expectCode(trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), {
    ...input(),
    target: { kind: "workspace", id: WORKSPACE, workspaceId: WORKSPACE },
  }, { runner: runner() }), "INVALID_ARGUMENT");
  await expectCode(trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), input(undefined, { actorUid: ACTOR }), {
    runner: runner(),
  }), "INVALID_ARGUMENT");
});

test("operation mode uses stale-current-mode and lifecycle preconditions", async () => {
  await expectCode(trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), input(undefined, {
    expectedMode: "academy",
  }), { runner: runner() }), "FAILED_PRECONDITION");
  await expectCode(trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), input(), {
    runner: runner(ownerV1({ uid: ACTOR }), { status: "disabled", disabled: true }),
  }), "FAILED_PRECONDITION");
  await expectCode(trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), input(), {
    runner: runner(ownerV1({ uid: ACTOR }), { operationMode: "unknown-legacy-mode" }),
  }), "FAILED_PRECONDITION");
});

test("operation mode replay is stable and competing stale update cannot win", async () => {
  const store = runner();
  const first = input();
  assert.equal((await trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), first, { runner: store })).replayed, false);
  assert.equal((await trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), first, { runner: store })).replayed, true);
  await expectCode(trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), input(
    "fixture-operation-mode-change-0002",
    { newMode: "academy" },
  ), { runner: store }), "FAILED_PRECONDITION");
  assert.equal(store.store.get(`workspaces/${WORKSPACE}`)?.operationMode, "school");
});

test("operation mode failure commits no workspace, audit, or idempotency write", async () => {
  const store = runner();
  await expectCode(trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), input(undefined, {
    expectedMode: "academy",
  }), { runner: store }), "FAILED_PRECONDITION");
  assert.deepEqual(store.writes, []);
  assert.equal(store.store.get(`workspaces/${WORKSPACE}`)?.operationMode, "personal");
});

test("active owner retains the narrow recovery path back to unconfigured mode", async () => {
  const store = runner(ownerV1({ uid: ACTOR }), { operationMode: "emergency" });
  store.store.set(`workspaces/${WORKSPACE}`, {
    workspaceId: WORKSPACE,
    status: "active",
    disabled: false,
    archived: false,
    operationMode: "school",
    operationModeVersion: 1,
  });
  const result = await trustedSetWorkspaceOperationMode(fixtureActor(ACTOR), input(
    "fixture-operation-mode-recovery-0001",
    { expectedMode: "school", newMode: "integrated_unconfigured", reason: "recover presentation routing" },
  ), { runner: store });
  assert.equal(result.result.nextMode, "integrated_unconfigured");
});
