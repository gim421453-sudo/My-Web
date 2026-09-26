import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { trustedCreateWorkspaceBootstrapApplication } from "../src/adminApplications/adminApplicationIngress.js";
import { trustedRedeemInvitation } from "../src/invitations/invitationOperations.js";
import { hashHighEntropyInvitationCode } from "../src/invitations/invitationFoundation.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { sha256Canonical } from "../src/operations/operationContract.js";
import { trustedCreateUserProfile } from "../src/profiles/userProfileOperations.js";
import { getTrustedAdminAuth } from "../src/runtime/adminApp.js";
import { getTrustedAdminFirestore } from "../src/runtime/adminFirestore.js";
import { trustedRemoveWorkspaceMember } from "../src/workspaceMembers/workspaceMemberOperations.js";
import {
  trustedApproveWorkspaceJoinRequest,
  trustedRejectWorkspaceJoinRequest,
  trustedSubmitWorkspaceJoinRequest,
} from "../src/workspaceJoinRequests/workspaceJoinRequestOperations.js";
import { fixtureActor } from "./support/authzFixtures.js";

const suffix = randomUUID();
const firestore = getTrustedAdminFirestore().firestore;
const auth = getTrustedAdminAuth({ env: { ...process.env, FUNCTIONS_EMULATOR: "true" } }).auth;
const cleanupPaths = new Set<string>();
const cleanupAuthUids = new Set<string>();
const ownerUid = `fixture-join-owner-${suffix}`;

function track(path: string): string {
  cleanupPaths.add(path);
  return path;
}

function normalizedTarget(target: Record<string, unknown>) {
  return { ...target, workspaceId: target.workspaceId ?? null };
}

function trackOperation(actorUid: string, input: { idempotencyKey: string; operation: string; target: Record<string, unknown> }) {
  const target = normalizedTarget(input.target);
  const scopeHash = sha256Canonical({ actorUid, idempotencyKey: input.idempotencyKey });
  const operationIdHash = sha256Canonical({
    actorUid,
    idempotencyKey: input.idempotencyKey,
    operation: input.operation,
    target,
  });
  track(`trustedOperationIdempotency/${scopeHash}`);
  track(`securityAuditLogs/${operationIdHash}`);
  return operationIdHash;
}

function submitInput(code: string, key: string) {
  return {
    operation: "workspace_join.create",
    idempotencyKey: key,
    target: { kind: "workspace_join", id: "submit", workspaceId: null },
    payload: { code },
  } as const;
}

function decisionInput(operation: "workspace_join.approve" | "workspace_join.reject", requestId: string, key: string) {
  return {
    operation,
    idempotencyKey: key,
    target: { kind: "workspace_join_request", id: requestId, workspaceId: null },
    payload: {},
  } as const;
}

function redeemInput(code: string, key: string) {
  return {
    operation: "invitation.redeem",
    idempotencyKey: key,
    target: { kind: "invitation_code", id: "redeem", workspaceId: null },
    payload: { code },
  } as const;
}

async function seedOwner() {
  await firestore.doc(track(`systemOwners/${ownerUid}`)).set({
    schemaVersion: 1,
    uid: ownerUid,
    status: "active",
    source: "system_bootstrap",
  });
}

async function seedProfile(uid: string, status = "pending") {
  await firestore.doc(track(`users/${uid}`)).set({ uid, status, disabled: false, active: true });
}

async function seedScenario(label: string, maxUses = 2) {
  const applicantUid = `fixture-join-${label}-${suffix}`;
  const workspaceId = `fixture-workspace-${label}-${suffix}`;
  const invitationId = `fixture-invitation-${label}-${suffix}`;
  const code = sha256Canonical({ label, suffix }).slice(0, 32);
  const codeHash = hashHighEntropyInvitationCode(code);
  const now = Timestamp.now();
  await seedProfile(applicantUid);
  await firestore.doc(track(`workspaces/${workspaceId}`)).set({ workspaceId, status: "active" });
  await firestore.doc(track(`authorityInvitations/${invitationId}`)).set({
    schemaVersion: 1,
    invitationId,
    workspaceId,
    targetRole: "teacher",
    status: "active",
    createdByUid: ownerUid,
    codeHash,
    secretVersion: "fixture_v1",
    maxUses,
    usedCount: 0,
    expiresAt: Timestamp.fromMillis(now.toMillis() + 3_600_000),
    createdAt: now,
    updatedAt: now,
  });
  await firestore.doc(track(`invitationCodeIndex/${codeHash}`)).set({ schemaVersion: 1, invitationId });
  track(`authorityInvitations/${invitationId}/redemptions/${applicantUid}`);
  track(`workspaces/${workspaceId}/members/${applicantUid}`);
  const pendingKey = sha256Canonical({ applicantUid, workspaceId, requestType: "WORKSPACE_JOIN" });
  track(`workspaceJoinRequestPendingKeys/${pendingKey}`);
  return { applicantUid, workspaceId, invitationId, code };
}

function successful(results: readonly PromiseSettledResult<unknown>[]) {
  return results.filter((result) => result.status === "fulfilled").length;
}

function assertConflict(result: PromiseSettledResult<unknown>) {
  if (result.status === "fulfilled") return;
  assert.ok(result.reason instanceof OperationError);
  assert.ok(["CONFLICT", "FAILED_PRECONDITION"].includes(result.reason.code));
}

try {
  await seedOwner();

  const profileUid = `fixture-profile-${suffix}`;
  cleanupAuthUids.add(profileUid);
  await auth.createUser({ uid: profileUid, email: `fixture-${suffix}@example.invalid`, displayName: "Fixture Profile" });
  const profileInput = {
    operation: "user_profile.create",
    idempotencyKey: `fixture-profile-create-${suffix}`,
    target: { kind: "user_profile", id: "self", workspaceId: null },
    payload: { displayName: "Fixture Profile" },
  } as const;
  trackOperation(profileUid, profileInput);
  track(`users/${profileUid}`);
  const profileResult = await trustedCreateUserProfile(fixtureActor(profileUid), profileInput, {
    getAuthUser: (uid) => auth.getUser(uid),
  });
  assert.equal(profileResult.result.created, true);
  const profile = (await firestore.doc(`users/${profileUid}`).get()).data();
  assert.equal(profile?.uid, profileUid);
  assert.equal(profile?.role, undefined);
  assert.equal(profile?.globalRole, undefined);

  const bootstrapUid = `fixture-bootstrap-${suffix}`;
  await seedProfile(bootstrapUid);
  const bootstrapInput = {
    operation: "workspace.bootstrap.application.create",
    idempotencyKey: `fixture-bootstrap-create-${suffix}`,
    target: { kind: "workspace_bootstrap", id: "self", workspaceId: null },
    payload: { requestedWorkspaceName: "Fixture School" },
  } as const;
  const bootstrapApplicationId = trackOperation(bootstrapUid, bootstrapInput);
  track(`adminApplications/${bootstrapApplicationId}`);
  track(`adminApplicationPendingKeys/${sha256Canonical({
    applicantUid: bootstrapUid,
    workspaceId: null,
    applicationType: "WORKSPACE_BOOTSTRAP",
  })}`);
  const bootstrapResults = await Promise.allSettled([
    trustedCreateWorkspaceBootstrapApplication(fixtureActor(bootstrapUid), bootstrapInput),
    trustedCreateWorkspaceBootstrapApplication(fixtureActor(bootstrapUid), {
      ...bootstrapInput,
      idempotencyKey: `fixture-bootstrap-create-race-${suffix}`,
    }),
  ]);
  assert.equal(successful(bootstrapResults), 1);
  bootstrapResults.forEach(assertConflict);

  const submitRace = await seedScenario("submit-race");
  const submitInputs = [
    submitInput(submitRace.code, `fixture-submit-race-a-${suffix}`),
    submitInput(submitRace.code, `fixture-submit-race-b-${suffix}`),
  ] as const;
  const requestIds = submitInputs.map((input) => {
    const requestId = trackOperation(submitRace.applicantUid, input);
    track(`workspaceJoinRequests/${requestId}`);
    return requestId;
  });
  const submitResults = await Promise.allSettled(submitInputs.map((input) => (
    trustedSubmitWorkspaceJoinRequest(fixtureActor(submitRace.applicantUid), input)
  )));
  assert.equal(successful(submitResults), 1);
  submitResults.forEach(assertConflict);
  const requestSnapshots = await Promise.all(requestIds.map((id) => firestore.doc(`workspaceJoinRequests/${id}`).get()));
  assert.equal(requestSnapshots.filter((snapshot) => snapshot.exists).length, 1);
  const requestId = requestIds[requestSnapshots.findIndex((snapshot) => snapshot.exists)];
  assert.ok(requestId);

  const approveInputs = [
    decisionInput("workspace_join.approve", requestId, `fixture-approve-race-a-${suffix}`),
    decisionInput("workspace_join.approve", requestId, `fixture-approve-race-b-${suffix}`),
  ] as const;
  approveInputs.forEach((input) => trackOperation(ownerUid, input));
  const approveResults = await Promise.allSettled(approveInputs.map((input) => (
    trustedApproveWorkspaceJoinRequest(fixtureActor(ownerUid), input)
  )));
  assert.equal(successful(approveResults), 1);
  approveResults.forEach(assertConflict);
  assert.equal((await firestore.doc(`workspaces/${submitRace.workspaceId}/members/${submitRace.applicantUid}`).get()).exists, true);
  assert.equal((await firestore.doc(`authorityInvitations/${submitRace.invitationId}`).get()).data()?.usedCount, 1);

  const decisionRace = await seedScenario("decision-race");
  const decisionSubmit = submitInput(decisionRace.code, `fixture-decision-submit-${suffix}`);
  const decisionRequestId = trackOperation(decisionRace.applicantUid, decisionSubmit);
  track(`workspaceJoinRequests/${decisionRequestId}`);
  await trustedSubmitWorkspaceJoinRequest(fixtureActor(decisionRace.applicantUid), decisionSubmit);
  const decisions = [
    decisionInput("workspace_join.approve", decisionRequestId, `fixture-decision-approve-${suffix}`),
    decisionInput("workspace_join.reject", decisionRequestId, `fixture-decision-reject-${suffix}`),
  ] as const;
  decisions.forEach((input) => trackOperation(ownerUid, input));
  const decisionResults = await Promise.allSettled([
    trustedApproveWorkspaceJoinRequest(fixtureActor(ownerUid), decisions[0]),
    trustedRejectWorkspaceJoinRequest(fixtureActor(ownerUid), decisions[1]),
  ]);
  assert.equal(successful(decisionResults), 1);
  decisionResults.forEach(assertConflict);
  const finalDecision = (await firestore.doc(`workspaceJoinRequests/${decisionRequestId}`).get()).data()?.status;
  assert.ok(["approved", "rejected"].includes(String(finalDecision)));
  assert.equal(
    (await firestore.doc(`workspaces/${decisionRace.workspaceId}/members/${decisionRace.applicantUid}`).get()).exists,
    finalDecision === "approved",
  );

  const redeemRace = await seedScenario("redeem-race");
  const redeemSubmit = submitInput(redeemRace.code, `fixture-redeem-submit-${suffix}`);
  const redeemRequestId = trackOperation(redeemRace.applicantUid, redeemSubmit);
  track(`workspaceJoinRequests/${redeemRequestId}`);
  await trustedSubmitWorkspaceJoinRequest(fixtureActor(redeemRace.applicantUid), redeemSubmit);
  const approveRedeem = decisionInput("workspace_join.approve", redeemRequestId, `fixture-redeem-approve-${suffix}`);
  const directRedeem = redeemInput(redeemRace.code, `fixture-redeem-direct-${suffix}`);
  trackOperation(ownerUid, approveRedeem);
  trackOperation(redeemRace.applicantUid, directRedeem);
  const redeemResults = await Promise.allSettled([
    trustedApproveWorkspaceJoinRequest(fixtureActor(ownerUid), approveRedeem),
    trustedRedeemInvitation(fixtureActor(redeemRace.applicantUid), directRedeem),
  ]);
  assert.equal(successful(redeemResults), 1);
  redeemResults.forEach(assertConflict);
  assert.equal((await firestore.doc(`authorityInvitations/${redeemRace.invitationId}`).get()).data()?.usedCount, 1);

  const removeRace = await seedScenario("remove-race");
  const removeSubmit = submitInput(removeRace.code, `fixture-remove-submit-${suffix}`);
  const removeRequestId = trackOperation(removeRace.applicantUid, removeSubmit);
  track(`workspaceJoinRequests/${removeRequestId}`);
  await trustedSubmitWorkspaceJoinRequest(fixtureActor(removeRace.applicantUid), removeSubmit);
  await firestore.doc(`workspaces/${removeRace.workspaceId}/members/${removeRace.applicantUid}`).set({
    schemaVersion: 1,
    uid: removeRace.applicantUid,
    workspaceId: removeRace.workspaceId,
    role: "teacher",
    status: "active",
    disabled: false,
    active: true,
    source: "trusted_migration",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  const removeApprove = decisionInput("workspace_join.approve", removeRequestId, `fixture-remove-approve-${suffix}`);
  const removeInput = {
    operation: "workspace_member.remove",
    idempotencyKey: `fixture-remove-member-${suffix}`,
    target: { kind: "workspace_member", id: removeRace.applicantUid, workspaceId: removeRace.workspaceId },
    payload: {},
  } as const;
  trackOperation(ownerUid, removeApprove);
  trackOperation(ownerUid, removeInput);
  const removeResults = await Promise.allSettled([
    trustedApproveWorkspaceJoinRequest(fixtureActor(ownerUid), removeApprove),
    trustedRemoveWorkspaceMember(fixtureActor(ownerUid), removeInput),
  ]);
  assert.equal(successful(removeResults), 1);
  removeResults.forEach(assertConflict);
  assert.equal((await firestore.doc(`workspaces/${removeRace.workspaceId}/members/${removeRace.applicantUid}`).get()).data()?.status, "inactive");

  console.log("P0-6A profile join bootstrap integration passed; races atomic; production access=0");
} finally {
  const paths = [...cleanupPaths].sort((left, right) => right.split("/").length - left.split("/").length);
  for (let offset = 0; offset < paths.length; offset += 400) {
    const batch = firestore.batch();
    for (const path of paths.slice(offset, offset + 400)) batch.delete(firestore.doc(path));
    await batch.commit();
  }
  for (const uid of cleanupAuthUids) {
    try { await auth.deleteUser(uid); } catch {}
  }
}
