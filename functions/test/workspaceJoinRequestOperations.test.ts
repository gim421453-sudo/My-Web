import assert from "node:assert/strict";
import test from "node:test";
import { hashHighEntropyInvitationCode } from "../src/invitations/invitationFoundation.js";
import { OperationError } from "../src/operations/operationErrors.js";
import {
  trustedApproveWorkspaceJoinRequest,
  trustedRejectWorkspaceJoinRequest,
  trustedSubmitWorkspaceJoinRequest,
} from "../src/workspaceJoinRequests/workspaceJoinRequestOperations.js";
import { fixtureActor, membershipV1, ownerV1 } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

const APPLICANT = "fixture-join-applicant";
const OWNER = "fixture-join-owner";
const WORKSPACE = "fixture-join-workspace";
const INVITATION = "fixture-join-invitation";
const CODE = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const NOW = new Date("2026-08-13T00:00:00.000Z");

function baseFixtures() {
  const codeHash = hashHighEntropyInvitationCode(CODE);
  return {
    [`users/${APPLICANT}`]: { uid: APPLICANT, status: "pending", disabled: false },
    [`systemOwners/${OWNER}`]: ownerV1({ uid: OWNER }),
    [`workspaces/${WORKSPACE}`]: { workspaceId: WORKSPACE, status: "active" },
    [`authorityInvitations/${INVITATION}`]: {
      schemaVersion: 1,
      invitationId: INVITATION,
      workspaceId: WORKSPACE,
      targetRole: "teacher",
      status: "active",
      createdByUid: OWNER,
      codeHash,
      secretVersion: "v1",
      maxUses: 2,
      usedCount: 0,
      expiresAt: new Date("2026-08-14T00:00:00.000Z"),
      createdAt: NOW,
      updatedAt: NOW,
    },
    [`invitationCodeIndex/${codeHash}`]: { schemaVersion: 1, invitationId: INVITATION },
  };
}

function submitInput(key = "fixture-join-submit-0001", payload: Record<string, unknown> = { code: CODE }) {
  return {
    operation: "workspace_join.create",
    idempotencyKey: key,
    target: { kind: "workspace_join", id: "submit", workspaceId: null },
    payload,
  };
}

function decisionInput(operation: "workspace_join.approve" | "workspace_join.reject", requestId: string, key: string) {
  return {
    operation,
    idempotencyKey: key,
    target: { kind: "workspace_join_request", id: requestId, workspaceId: null },
    payload: {},
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof OperationError && error.code === code);
}

function joinRequestId(runner: MemoryTransactionRunner): string {
  const path = [...runner.store.keys()].find((item) => item.startsWith("workspaceJoinRequests/"));
  assert.ok(path);
  return path.split("/")[1] || "";
}

test("trusted join submit creates one canonical request without profile or membership writes", async () => {
  const runner = new MemoryTransactionRunner(baseFixtures(), NOW);
  const result = await trustedSubmitWorkspaceJoinRequest(fixtureActor(APPLICANT), submitInput(), { runner });
  assert.equal(result.result.applicationStatus, "pending");
  assert.equal(result.result.invitationId, INVITATION);
  assert.equal(result.result.joinRequestId, joinRequestId(runner));
  const request = runner.store.get(`workspaceJoinRequests/${joinRequestId(runner)}`);
  assert.equal(request?.applicantUid, APPLICANT);
  assert.equal(request?.requestedRole, "teacher");
  assert.equal(request?.inviteCode, undefined);
  assert.equal(runner.writes.some((path) => path === `users/${APPLICANT}` || path.includes("/members/")), false);
  assert.equal(runner.writes.some((path) => path.startsWith("workspace_members/") || path.startsWith("workspaceMembers/")), false);
});

for (const [label, payload] of [
  ["applicant uid", { code: CODE, applicantUid: "forged-user" }],
  ["role", { code: CODE, requestedRole: "super_manager" }],
  ["status", { code: CODE, status: "approved" }],
  ["source", { code: CODE, source: "legacy" }],
] as const) {
  test(`join ${label} injection is rejected`, async () => {
    await expectCode(trustedSubmitWorkspaceJoinRequest(fixtureActor(APPLICANT), submitInput(undefined, payload), {
      runner: new MemoryTransactionRunner(baseFixtures(), NOW),
    }), "INVALID_ARGUMENT");
  });
}

test("duplicate pending join is blocked across idempotency keys", async () => {
  const runner = new MemoryTransactionRunner(baseFixtures(), NOW);
  await trustedSubmitWorkspaceJoinRequest(fixtureActor(APPLICANT), submitInput("fixture-join-submit-0001"), { runner });
  await expectCode(trustedSubmitWorkspaceJoinRequest(
    fixtureActor(APPLICANT),
    submitInput("fixture-join-submit-0002"),
    { runner },
  ), "CONFLICT");
  assert.equal([...runner.store.keys()].filter((path) => path.startsWith("workspaceJoinRequests/")).length, 1);
});

test("existing canonical membership blocks join submission", async () => {
  const runner = new MemoryTransactionRunner({
    ...baseFixtures(),
    [`workspaces/${WORKSPACE}/members/${APPLICANT}`]: membershipV1("teacher", {
      uid: APPLICANT,
      workspaceId: WORKSPACE,
    }),
  }, NOW);
  await expectCode(trustedSubmitWorkspaceJoinRequest(fixtureActor(APPLICANT), submitInput(), { runner }), "CONFLICT");
});

test("join approval atomically consumes invitation and creates canonical membership", async () => {
  const runner = new MemoryTransactionRunner(baseFixtures(), NOW);
  await trustedSubmitWorkspaceJoinRequest(fixtureActor(APPLICANT), submitInput(), { runner });
  const requestId = joinRequestId(runner);
  const result = await trustedApproveWorkspaceJoinRequest(
    fixtureActor(OWNER),
    decisionInput("workspace_join.approve", requestId, "fixture-join-approve-0001"),
    { runner },
  );
  assert.equal(result.result.memberPresent, true);
  assert.equal(runner.store.get(`workspaces/${WORKSPACE}/members/${APPLICANT}`)?.role, "teacher");
  assert.equal(runner.store.get(`workspaceJoinRequests/${requestId}`)?.status, "approved");
  assert.equal(runner.store.get(`users/${APPLICANT}`)?.status, "active");
  assert.equal(runner.store.get(`authorityInvitations/${INVITATION}`)?.usedCount, 1);
  assert.equal(runner.store.has(`authorityInvitations/${INVITATION}/redemptions/${APPLICANT}`), true);
  assert.equal(runner.writes.some((path) => path.startsWith("workspace_members/") || path.startsWith("workspaceMembers/")), false);
});

test("join rejection changes only request, guard, audit, and idempotency documents", async () => {
  const runner = new MemoryTransactionRunner(baseFixtures(), NOW);
  await trustedSubmitWorkspaceJoinRequest(fixtureActor(APPLICANT), submitInput(), { runner });
  const requestId = joinRequestId(runner);
  runner.writes.length = 0;
  await trustedRejectWorkspaceJoinRequest(
    fixtureActor(OWNER),
    decisionInput("workspace_join.reject", requestId, "fixture-join-reject-0001"),
    { runner },
  );
  assert.equal(runner.store.get(`workspaceJoinRequests/${requestId}`)?.status, "rejected");
  assert.equal(runner.store.get(`users/${APPLICANT}`)?.status, "pending");
  assert.equal(runner.writes.some((path) => path === `users/${APPLICANT}` || path.includes("/members/")), false);
});

test("approve/approve and approve/reject decisions allow one terminal transition", async () => {
  const approveRunner = new MemoryTransactionRunner(baseFixtures(), NOW);
  await trustedSubmitWorkspaceJoinRequest(fixtureActor(APPLICANT), submitInput(), { runner: approveRunner });
  const approveId = joinRequestId(approveRunner);
  await trustedApproveWorkspaceJoinRequest(
    fixtureActor(OWNER),
    decisionInput("workspace_join.approve", approveId, "fixture-join-approve-race-a"),
    { runner: approveRunner },
  );
  await expectCode(trustedApproveWorkspaceJoinRequest(
    fixtureActor(OWNER),
    decisionInput("workspace_join.approve", approveId, "fixture-join-approve-race-b"),
    { runner: approveRunner },
  ), "CONFLICT");

  const mixedRunner = new MemoryTransactionRunner(baseFixtures(), NOW);
  await trustedSubmitWorkspaceJoinRequest(fixtureActor(APPLICANT), submitInput(), { runner: mixedRunner });
  const mixedId = joinRequestId(mixedRunner);
  await trustedRejectWorkspaceJoinRequest(
    fixtureActor(OWNER),
    decisionInput("workspace_join.reject", mixedId, "fixture-join-decision-race-a"),
    { runner: mixedRunner },
  );
  await expectCode(trustedApproveWorkspaceJoinRequest(
    fixtureActor(OWNER),
    decisionInput("workspace_join.approve", mixedId, "fixture-join-decision-race-b"),
    { runner: mixedRunner },
  ), "CONFLICT");
  assert.equal(mixedRunner.store.has(`workspaces/${WORKSPACE}/members/${APPLICANT}`), false);
});

test("non-owner cannot approve or reject join request", async () => {
  const runner = new MemoryTransactionRunner(baseFixtures(), NOW);
  await trustedSubmitWorkspaceJoinRequest(fixtureActor(APPLICANT), submitInput(), { runner });
  const requestId = joinRequestId(runner);
  await expectCode(trustedApproveWorkspaceJoinRequest(
    fixtureActor("fixture-non-owner"),
    decisionInput("workspace_join.approve", requestId, "fixture-join-forbidden-a"),
    { runner },
  ), "FORBIDDEN");
  await expectCode(trustedRejectWorkspaceJoinRequest(
    fixtureActor("fixture-non-owner"),
    decisionInput("workspace_join.reject", requestId, "fixture-join-forbidden-b"),
    { runner },
  ), "FORBIDDEN");
});
