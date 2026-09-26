import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import {
  trustedApproveAdminApplication,
  trustedRejectAdminApplication,
} from "../src/adminApplications/adminApplicationOperations.js";
import { trustedCreateAdminApplication } from "../src/adminApplications/adminApplicationIngress.js";
import { adminApplicationUniquenessKey } from "../src/adminApplications/adminApplicationContract.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { sha256Canonical } from "../src/operations/operationContract.js";
import { getTrustedAdminFirestore } from "../src/runtime/adminFirestore.js";
import { fixtureActor } from "./support/authzFixtures.js";

type OperationName = "admin_application.approve" | "admin_application.reject";

const suffix = randomUUID();
const firestore = getTrustedAdminFirestore().firestore;
const actorUid = `fixture-owner-${suffix}`;
const actor = fixtureActor(actorUid);
const cleanupPaths = new Set<string>();

function operationInput(
  operation: OperationName,
  applicationId: string,
  idempotencyKey: string,
) {
  return Object.freeze({
    operation,
    idempotencyKey,
    target: Object.freeze({ kind: "admin_application", id: applicationId }),
    payload: Object.freeze({}),
  });
}

function operationPaths(
  operation: OperationName,
  applicationId: string,
  idempotencyKey: string,
  operationActorUid = actorUid,
) {
  const target = { kind: "admin_application", id: applicationId, workspaceId: null };
  return Object.freeze({
    idempotency: `trustedOperationIdempotency/${sha256Canonical({
      actorUid: operationActorUid,
      idempotencyKey,
    })}`,
    audit: `securityAuditLogs/${sha256Canonical({
      actorUid: operationActorUid,
      idempotencyKey,
      operation,
      target,
    })}`,
  });
}

async function seedScenario(label: string) {
  const workspaceId = `fixture-workspace-${label}-${suffix}`;
  const targetUid = `fixture-target-${label}-${suffix}`;
  const applicationId = `fixture-application-${label}-${suffix}`;
  const now = Timestamp.now();
  const documents: Record<string, Record<string, unknown>> = {
    [`systemOwners/${actorUid}`]: {
      schemaVersion: 1,
      uid: actorUid,
      status: "active",
      source: "system_bootstrap",
    },
    [`users/${targetUid}`]: {
      uid: targetUid,
      status: "waiting_approval",
      disabled: false,
    },
    [`workspaces/${workspaceId}`]: {
      workspaceId,
      status: "active",
    },
    [`adminApplications/${applicationId}`]: {
      schemaVersion: 1,
      applicationType: "WORKSPACE_ACCESS",
      source: "trusted_migration",
      applicantUid: targetUid,
      workspaceId,
      requestedRole: "manager",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    },
  };
  const batch = firestore.batch();
  for (const [path, data] of Object.entries(documents)) {
    cleanupPaths.add(path);
    batch.set(firestore.doc(path), data);
  }
  await batch.commit();
  const membershipPath = `workspaces/${workspaceId}/members/${targetUid}`;
  cleanupPaths.add(membershipPath);
  return Object.freeze({ workspaceId, targetUid, applicationId, membershipPath });
}

function successfulCount(results: readonly PromiseSettledResult<unknown>[]): number {
  return results.filter((result) => result.status === "fulfilled").length;
}

function assertConflict(result: PromiseSettledResult<unknown>): void {
  if (result.status === "fulfilled") return;
  assert.ok(result.reason instanceof OperationError);
  assert.equal(result.reason.code, "CONFLICT");
}

async function assertOneCommittedOperation(paths: readonly ReturnType<typeof operationPaths>[]) {
  const snapshots = await Promise.all(paths.flatMap((path) => [
    firestore.doc(path.idempotency).get(),
    firestore.doc(path.audit).get(),
  ]));
  assert.equal(snapshots.filter((snapshot) => snapshot.exists).length, 2);
}

function createInput(workspaceId: string, idempotencyKey: string) {
  return Object.freeze({
    operation: "admin_application.create",
    idempotencyKey,
    target: Object.freeze({ kind: "workspace", id: workspaceId }),
    payload: Object.freeze({ requestedRole: "teacher", reason: "Fixture access request" }),
  });
}

function createPaths(workspaceId: string, idempotencyKey: string, applicantUid: string) {
  const target = { kind: "workspace", id: workspaceId, workspaceId: null };
  const operationIdHash = sha256Canonical({
    actorUid: applicantUid,
    idempotencyKey,
    operation: "admin_application.create",
    target,
  });
  return Object.freeze({
    application: `adminApplications/${operationIdHash}`,
    guard: `adminApplicationPendingKeys/${adminApplicationUniquenessKey(applicantUid, workspaceId)}`,
    idempotency: `trustedOperationIdempotency/${sha256Canonical({
      actorUid: applicantUid,
      idempotencyKey,
    })}`,
    audit: `securityAuditLogs/${operationIdHash}`,
  });
}

async function seedWorkspace(workspaceId: string): Promise<void> {
  const path = `workspaces/${workspaceId}`;
  cleanupPaths.add(path);
  await firestore.doc(path).set({ workspaceId, status: "active" });
}

try {
  const ownerPath = `systemOwners/${actorUid}`;
  cleanupPaths.add(ownerPath);
  await firestore.doc(ownerPath).set({
    schemaVersion: 1,
    uid: actorUid,
    status: "active",
    source: "system_bootstrap",
  });

  const createApplicantUid = `fixture-create-applicant-${suffix}`;
  const createActor = fixtureActor(createApplicantUid);
  const createWorkspaceId = `fixture-create-workspace-${suffix}`;
  await seedWorkspace(createWorkspaceId);
  const createKeys = [`create-race-a-${suffix}`, `create-race-b-${suffix}`] as const;
  const createRacePaths = createKeys.map((key) => createPaths(
    createWorkspaceId,
    key,
    createApplicantUid,
  ));
  createRacePaths.forEach((paths) => Object.values(paths).forEach((path) => cleanupPaths.add(path)));
  const createResults = await Promise.allSettled(createKeys.map((key) => (
    trustedCreateAdminApplication(createActor, createInput(createWorkspaceId, key))
  )));
  assert.equal(successfulCount(createResults), 1);
  createResults.forEach(assertConflict);
  const createdSnapshots = await Promise.all(createRacePaths.map((paths) => (
    firestore.doc(paths.application).get()
  )));
  assert.equal(createdSnapshots.filter((snapshot) => snapshot.exists).length, 1);
  const winningIndex = createdSnapshots.findIndex((snapshot) => snapshot.exists);
  assert.notEqual(winningIndex, -1);
  const winningKey = createKeys[winningIndex];
  const winningSnapshot = createdSnapshots[winningIndex];
  assert.ok(winningKey);
  assert.ok(winningSnapshot);
  const replay = await trustedCreateAdminApplication(
    createActor,
    createInput(createWorkspaceId, winningKey),
  );
  assert.equal(replay.replayed, true);
  const firstCreatePaths = createRacePaths[0];
  assert.ok(firstCreatePaths);
  const guardSnapshot = await firestore.doc(firstCreatePaths.guard).get();
  assert.equal(guardSnapshot.data()?.status, "pending");
  assert.equal(guardSnapshot.data()?.pendingApplicationId, winningSnapshot.id);
  await assertOneCommittedOperation(createRacePaths);

  const atomicApplicantUid = `fixture-atomic-applicant-${suffix}`;
  const atomicActor = fixtureActor(atomicApplicantUid);
  const atomicWorkspaceId = `fixture-atomic-workspace-${suffix}`;
  const atomicKey = `create-atomic-${suffix}`;
  await seedWorkspace(atomicWorkspaceId);
  const atomicPaths = createPaths(atomicWorkspaceId, atomicKey, atomicApplicantUid);
  Object.values(atomicPaths).forEach((path) => cleanupPaths.add(path));
  await firestore.doc(atomicPaths.audit).set({ fixtureCollision: true });
  await assert.rejects(
    trustedCreateAdminApplication(atomicActor, createInput(atomicWorkspaceId, atomicKey)),
    (error: unknown) => error instanceof OperationError && error.code === "INTERNAL",
  );
  assert.equal((await firestore.doc(atomicPaths.application).get()).exists, false);
  assert.equal((await firestore.doc(atomicPaths.guard).get()).exists, false);
  assert.equal((await firestore.doc(atomicPaths.idempotency).get()).exists, false);

  const flowApplicantUid = `fixture-flow-applicant-${suffix}`;
  const flowActor = fixtureActor(flowApplicantUid);
  const flowWorkspaceId = `fixture-flow-workspace-${suffix}`;
  const flowKey = `create-flow-${suffix}`;
  await seedWorkspace(flowWorkspaceId);
  const flowUserPath = `users/${flowApplicantUid}`;
  cleanupPaths.add(flowUserPath);
  await firestore.doc(flowUserPath).set({
    uid: flowApplicantUid,
    status: "waiting_approval",
    disabled: false,
  });
  const flowPaths = createPaths(flowWorkspaceId, flowKey, flowApplicantUid);
  Object.values(flowPaths).forEach((path) => cleanupPaths.add(path));
  await trustedCreateAdminApplication(flowActor, createInput(flowWorkspaceId, flowKey));
  const flowApplicationId = flowPaths.application.split("/")[1];
  assert.ok(flowApplicationId);
  const flowMembershipPath = `workspaces/${flowWorkspaceId}/members/${flowApplicantUid}`;
  cleanupPaths.add(flowMembershipPath);
  const flowApproveKey = `approve-flow-${suffix}`;
  const flowApprovePaths = operationPaths(
    "admin_application.approve",
    flowApplicationId,
    flowApproveKey,
  );
  cleanupPaths.add(flowApprovePaths.idempotency);
  cleanupPaths.add(flowApprovePaths.audit);
  await trustedApproveAdminApplication(
    actor,
    operationInput("admin_application.approve", flowApplicationId, flowApproveKey),
  );
  assert.equal((await firestore.doc(flowMembershipPath).get()).exists, true);
  assert.equal((await firestore.doc(flowPaths.guard).get()).data()?.status, "released");

  const approveRace = await seedScenario("approve-race");
  const approveKeys = [
    `approve-race-a-${suffix}`,
    `approve-race-b-${suffix}`,
  ] as const;
  const approvePaths = approveKeys.map((key) => (
    operationPaths("admin_application.approve", approveRace.applicationId, key)
  ));
  approvePaths.forEach((paths) => {
    cleanupPaths.add(paths.idempotency);
    cleanupPaths.add(paths.audit);
  });
  const approveResults = await Promise.allSettled(approveKeys.map((key) => (
    trustedApproveAdminApplication(
      actor,
      operationInput("admin_application.approve", approveRace.applicationId, key),
    )
  )));
  assert.equal(successfulCount(approveResults), 1);
  approveResults.forEach(assertConflict);
  assert.equal((await firestore.doc(approveRace.membershipPath).get()).exists, true);
  assert.equal((await firestore.doc(`adminApplications/${approveRace.applicationId}`).get()).data()?.status, "approved");
  await assertOneCommittedOperation(approvePaths);

  const decisionRace = await seedScenario("decision-race");
  const approveKey = `decision-approve-${suffix}`;
  const rejectKey = `decision-reject-${suffix}`;
  const decisionOperations = [
    {
      operation: "admin_application.approve" as const,
      key: approveKey,
      call: () => trustedApproveAdminApplication(
        actor,
        operationInput("admin_application.approve", decisionRace.applicationId, approveKey),
      ),
    },
    {
      operation: "admin_application.reject" as const,
      key: rejectKey,
      call: () => trustedRejectAdminApplication(
        actor,
        operationInput("admin_application.reject", decisionRace.applicationId, rejectKey),
      ),
    },
  ];
  const decisionPaths = decisionOperations.map(({ operation, key }) => (
    operationPaths(operation, decisionRace.applicationId, key)
  ));
  decisionPaths.forEach((paths) => {
    cleanupPaths.add(paths.idempotency);
    cleanupPaths.add(paths.audit);
  });
  const decisionResults = await Promise.allSettled(decisionOperations.map(({ call }) => call()));
  assert.equal(successfulCount(decisionResults), 1);
  decisionResults.forEach(assertConflict);
  const finalApplication = await firestore.doc(`adminApplications/${decisionRace.applicationId}`).get();
  assert.ok(["approved", "rejected"].includes(String(finalApplication.data()?.status)));
  const finalMembership = await firestore.doc(decisionRace.membershipPath).get();
  assert.equal(finalMembership.exists, finalApplication.data()?.status === "approved");
  await assertOneCommittedOperation(decisionPaths);

  const rollback = await seedScenario("atomic-rollback");
  const rollbackKey = `atomic-rollback-${suffix}`;
  const rollbackPaths = operationPaths("admin_application.approve", rollback.applicationId, rollbackKey);
  cleanupPaths.add(rollbackPaths.idempotency);
  cleanupPaths.add(rollbackPaths.audit);
  await firestore.doc(rollbackPaths.audit).set({ fixtureCollision: true });
  await assert.rejects(
    trustedApproveAdminApplication(
      actor,
      operationInput("admin_application.approve", rollback.applicationId, rollbackKey),
    ),
    (error: unknown) => error instanceof OperationError && error.code === "INTERNAL",
  );
  assert.equal((await firestore.doc(`users/${rollback.targetUid}`).get()).data()?.status, "waiting_approval");
  assert.equal((await firestore.doc(`adminApplications/${rollback.applicationId}`).get()).data()?.status, "pending");
  assert.equal((await firestore.doc(rollback.membershipPath).get()).exists, false);
  assert.equal((await firestore.doc(rollbackPaths.idempotency).get()).exists, false);
  assert.equal((await firestore.doc(rollbackPaths.audit).get()).data()?.fixtureCollision, true);

  console.log(
    "P0-2B admin application integration passed; create/decision races atomic; legacy writes=0; production access=0",
  );
} finally {
  const paths = [...cleanupPaths].sort((left, right) => right.split("/").length - left.split("/").length);
  for (let offset = 0; offset < paths.length; offset += 400) {
    const batch = firestore.batch();
    for (const path of paths.slice(offset, offset + 400)) batch.delete(firestore.doc(path));
    await batch.commit();
  }
}
