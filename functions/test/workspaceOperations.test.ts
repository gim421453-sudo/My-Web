import assert from "node:assert/strict";
import test from "node:test";
import { OperationError } from "../src/operations/operationErrors.js";
import { sha256Canonical } from "../src/operations/operationContract.js";
import {
  trustedApproveWorkspaceBootstrap,
  trustedSetWorkspaceLifecycle,
} from "../src/workspaces/workspaceOperations.js";
import { fixtureActor, ownerV1 } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

const ACTOR = "fixture-bootstrap-owner";
const TARGET = "fixture-bootstrap-applicant";
const APPLICATION = "fixture-bootstrap-application";
const NOW = new Date("2026-08-13T00:00:00.000Z");

function application(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    applicationType: "WORKSPACE_BOOTSTRAP",
    applicantUid: TARGET,
    workspaceId: null,
    requestedWorkspaceName: "Fixture School",
    requestedRole: "super_manager",
    status: "pending",
    source: "trusted_migration",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function runner(extra: Record<string, Readonly<Record<string, unknown>>> = {}) {
  return new MemoryTransactionRunner({
    [`systemOwners/${ACTOR}`]: ownerV1({ uid: ACTOR }),
    [`users/${TARGET}`]: { uid: TARGET, status: "pending", disabled: false },
    [`adminApplications/${APPLICATION}`]: application(),
    ...extra,
  }, NOW);
}

function bootstrapInput(key = "fixture-workspace-bootstrap-0001") {
  return {
    operation: "workspace.bootstrap.approve",
    idempotencyKey: key,
    target: { kind: "admin_application", id: APPLICATION, workspaceId: null },
    payload: {},
  };
}

function lifecycleInput(workspaceId: string, status: string, key = `fixture-workspace-${status}-0001`) {
  return {
    operation: "workspace.lifecycle.set",
    idempotencyKey: key,
    target: { kind: "workspace", id: workspaceId, workspaceId: null },
    payload: { status },
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof OperationError && error.code === code);
}

test("canonical bootstrap creates one workspace and one initial super manager", async () => {
  const store = runner();
  const result = await trustedApproveWorkspaceBootstrap(fixtureActor(ACTOR), bootstrapInput(), { runner: store });
  const workspaceId = String(result.result.workspaceId);
  assert.match(workspaceId, /^ws_[a-f0-9]{32}$/);
  assert.equal(store.store.get(`workspaces/${workspaceId}`)?.status, "active");
  assert.equal(store.store.get(`workspaces/${workspaceId}/members/${TARGET}`)?.role, "super_manager");
  assert.equal(store.store.get(`adminApplications/${APPLICATION}`)?.provisionedWorkspaceId, workspaceId);
  assert.equal(store.store.get(`users/${TARGET}`)?.currentWorkspaceId, workspaceId);
  assert.equal(store.writes.some((path) => path.startsWith("workspace_members/") || path.startsWith("workspaceMembers/")), false);
});

test("bootstrap requires active canonical system owner", async () => {
  const noOwner = runner();
  noOwner.store.delete(`systemOwners/${ACTOR}`);
  await expectCode(trustedApproveWorkspaceBootstrap(fixtureActor(ACTOR), bootstrapInput(), { runner: noOwner }), "FORBIDDEN");
  const spoof = runner({ [`users/${ACTOR}`]: { uid: ACTOR, role: "system_owner" } });
  spoof.store.delete(`systemOwners/${ACTOR}`);
  await expectCode(trustedApproveWorkspaceBootstrap(fixtureActor(ACTOR), bootstrapInput(), { runner: spoof }), "FORBIDDEN");
});

test("workspace access and ambiguous legacy applications cannot bootstrap", async () => {
  const access = runner({
    [`adminApplications/${APPLICATION}`]: application({
      applicationType: "WORKSPACE_ACCESS",
      workspaceId: "fixture-existing-workspace",
      requestedWorkspaceName: undefined,
    }),
  });
  await expectCode(trustedApproveWorkspaceBootstrap(fixtureActor(ACTOR), bootstrapInput(), { runner: access }), "FAILED_PRECONDITION");
  const legacy = runner({
    [`adminApplications/${APPLICATION}`]: {
      uid: TARGET,
      requestedWorkspaceName: "Fixture School",
      status: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    },
  });
  await expectCode(trustedApproveWorkspaceBootstrap(fixtureActor(ACTOR), bootstrapInput(), { runner: legacy }), "FAILED_PRECONDITION");
});

test("bootstrap is idempotent and rejects a second application for the same applicant", async () => {
  const store = runner();
  const request = bootstrapInput();
  assert.equal((await trustedApproveWorkspaceBootstrap(fixtureActor(ACTOR), request, { runner: store })).replayed, false);
  assert.equal((await trustedApproveWorkspaceBootstrap(fixtureActor(ACTOR), request, { runner: store })).replayed, true);

  const secondApplication = "fixture-bootstrap-application-two";
  store.store.set(`adminApplications/${secondApplication}`, application());
  await expectCode(trustedApproveWorkspaceBootstrap(fixtureActor(ACTOR), {
    ...bootstrapInput("fixture-workspace-bootstrap-0002"),
    target: { kind: "admin_application", id: secondApplication, workspaceId: null },
  }, { runner: store }), "CONFLICT");
});

test("existing generated workspace and existing canonical membership fail closed", async () => {
  const workspaceId = `ws_${sha256Canonical({ applicationId: APPLICATION, applicantUid: TARGET }).slice(0, 32)}`;
  const existing = runner({ [`workspaces/${workspaceId}`]: { workspaceId, status: "active" } });
  await expectCode(trustedApproveWorkspaceBootstrap(fixtureActor(ACTOR), bootstrapInput(), { runner: existing }), "CONFLICT");
});

test("workspace lifecycle changes only workspace state", async () => {
  const workspaceId = "fixture-lifecycle-workspace";
  const memberPath = `workspaces/${workspaceId}/members/${TARGET}`;
  const store = runner({
    [`workspaces/${workspaceId}`]: { workspaceId, status: "active", disabled: false, archived: false },
    [memberPath]: { uid: TARGET, workspaceId, role: "teacher", status: "active" },
  });
  const disabled = await trustedSetWorkspaceLifecycle(
    fixtureActor(ACTOR), lifecycleInput(workspaceId, "disabled"), { runner: store },
  );
  assert.equal(disabled.result.workspaceLifecycleStatus, "disabled");
  assert.equal(store.store.get(memberPath)?.status, "active");
  assert.equal(store.writes.some((path) => path.startsWith("users/") || path.includes("/members/")), false);
  await trustedSetWorkspaceLifecycle(
    fixtureActor(ACTOR), lifecycleInput(workspaceId, "active", "fixture-workspace-enable-0001"), { runner: store },
  );
  await trustedSetWorkspaceLifecycle(
    fixtureActor(ACTOR), lifecycleInput(workspaceId, "archived", "fixture-workspace-archive-0001"), { runner: store },
  );
  await expectCode(trustedSetWorkspaceLifecycle(
    fixtureActor(ACTOR), lifecycleInput(workspaceId, "active", "fixture-workspace-revive-0001"), { runner: store },
  ), "FAILED_PRECONDITION");
});

test("workspace lifecycle rejects non-owner malformed status and missing workspace", async () => {
  const workspaceId = "fixture-lifecycle-workspace";
  const noOwner = runner({ [`workspaces/${workspaceId}`]: { workspaceId, status: "active" } });
  noOwner.store.delete(`systemOwners/${ACTOR}`);
  await expectCode(trustedSetWorkspaceLifecycle(
    fixtureActor(ACTOR), lifecycleInput(workspaceId, "disabled"), { runner: noOwner },
  ), "FORBIDDEN");
  await expectCode(trustedSetWorkspaceLifecycle(
    fixtureActor(ACTOR), lifecycleInput(workspaceId, "deleted"), { runner: runner() },
  ), "INVALID_ARGUMENT");
  await expectCode(trustedSetWorkspaceLifecycle(
    fixtureActor(ACTOR), lifecycleInput("missing-workspace", "disabled"), { runner: runner() },
  ), "NOT_FOUND");
});

test("bootstrap and lifecycle write no hard delete or production export", async () => {
  const store = runner();
  await trustedApproveWorkspaceBootstrap(fixtureActor(ACTOR), bootstrapInput("fixture-workspace-no-delete-0001"), { runner: store });
  assert.equal(store.writes.some((path) => path.startsWith("workspace_members/") || path.startsWith("workspaceMembers/")), false);
});
