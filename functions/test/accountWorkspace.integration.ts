import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import {
  trustedDisableUserAccount,
} from "../src/accounts/accountLifecycleOperations.js";
import { createTrustedAuthAdmin } from "../src/accounts/trustedAuthAdmin.js";
import { getTrustedAdminAuth } from "../src/runtime/adminApp.js";
import { getTrustedAdminFirestore } from "../src/runtime/adminFirestore.js";
import { sha256Canonical } from "../src/operations/operationContract.js";
import { trustedRejectAdminApplication } from "../src/adminApplications/adminApplicationOperations.js";
import { trustedApproveWorkspaceBootstrap } from "../src/workspaces/workspaceOperations.js";
import { fixtureActor } from "./support/authzFixtures.js";

const suffix = randomUUID();
const firestore = getTrustedAdminFirestore().firestore;
const auth = getTrustedAdminAuth({
  env: { ...process.env, FUNCTIONS_EMULATOR: "true" },
}).auth;
const trustedAuthAdmin = createTrustedAuthAdmin(auth);
const cleanupPaths = new Set<string>();
const cleanupAuthUids = new Set<string>();

function track(path: string): string {
  cleanupPaths.add(path);
  return path;
}

function operationPaths(
  actorUid: string,
  operation: string,
  idempotencyKey: string,
  target: Readonly<{ kind: string; id: string; workspaceId: null }>,
): void {
  const scopeHash = sha256Canonical({ actorUid, idempotencyKey });
  const operationIdHash = sha256Canonical({ actorUid, idempotencyKey, operation, target });
  track(`trustedOperationIdempotency/${scopeHash}`);
  track(`securityAuditLogs/${operationIdHash}`);
  if (operation.startsWith("user_account.")) {
    track(`accountLifecycleOperations/${scopeHash}`);
    track(`accountLifecycleStates/${target.id}`);
  }
}

function accountInput(operation: "user_account.disable", targetUid: string, key: string) {
  return {
    operation,
    idempotencyKey: key,
    target: { kind: "user_account", id: targetUid, workspaceId: null },
    payload: { reasonCode: "security_test" },
  } as const;
}

function bootstrapInput(applicationId: string, key: string) {
  return {
    operation: "workspace.bootstrap.approve",
    idempotencyKey: key,
    target: { kind: "admin_application", id: applicationId, workspaceId: null },
    payload: {},
  } as const;
}

function rejectInput(applicationId: string, key: string) {
  return {
    operation: "admin_application.reject",
    idempotencyKey: key,
    target: { kind: "admin_application", id: applicationId, workspaceId: null },
    payload: {},
  } as const;
}

async function seedOwner(uid: string): Promise<void> {
  await firestore.doc(track(`systemOwners/${uid}`)).set({
    schemaVersion: 1,
    uid,
    status: "active",
    source: "system_bootstrap",
  });
}

async function seedAuthUser(uid: string): Promise<void> {
  cleanupAuthUids.add(uid);
  await auth.createUser({ uid, disabled: false });
}

async function seedProfile(uid: string, status = "pending"): Promise<void> {
  await firestore.doc(track(`users/${uid}`)).set({ uid, status, disabled: false, active: true });
}

function bootstrapWorkspaceId(applicationId: string, applicantUid: string): string {
  return `ws_${sha256Canonical({ applicationId, applicantUid }).slice(0, 32)}`;
}

async function seedBootstrapApplication(label: string, applicantUid: string) {
  const applicationId = `fixture-bootstrap-${label}-${suffix}`;
  const now = Timestamp.now();
  await firestore.doc(track(`adminApplications/${applicationId}`)).set({
    schemaVersion: 1,
    applicationType: "WORKSPACE_BOOTSTRAP",
    applicantUid,
    workspaceId: null,
    requestedWorkspaceName: `Fixture ${label}`,
    requestedRole: "super_manager",
    status: "pending",
    source: "trusted_migration",
    createdAt: now,
    updatedAt: now,
  });
  const workspaceId = bootstrapWorkspaceId(applicationId, applicantUid);
  track(`workspaces/${workspaceId}`);
  track(`workspaces/${workspaceId}/members/${applicantUid}`);
  track(`workspaceBootstrapKeys/${sha256Canonical({ applicantUid, applicationType: "WORKSPACE_BOOTSTRAP" })}`);
  return { applicationId, workspaceId };
}

function fulfilled(results: readonly PromiseSettledResult<unknown>[]): number {
  return results.filter((result) => result.status === "fulfilled").length;
}

try {
  const ownerA = `fixture-account-owner-a-${suffix}`;
  const ownerB = `fixture-account-owner-b-${suffix}`;
  await Promise.all([seedOwner(ownerA), seedOwner(ownerB)]);
  await Promise.all([seedProfile(ownerA, "active"), seedProfile(ownerB, "active")]);
  await Promise.all([seedAuthUser(ownerA), seedAuthUser(ownerB)]);
  const ownerRaceKeys = [`fixture-owner-disable-a-${suffix}`, `fixture-owner-disable-b-${suffix}`] as const;
  const ownerRaceInputs = [
    accountInput("user_account.disable", ownerB, ownerRaceKeys[0]),
    accountInput("user_account.disable", ownerA, ownerRaceKeys[1]),
  ] as const;
  operationPaths(ownerA, ownerRaceInputs[0].operation, ownerRaceKeys[0], ownerRaceInputs[0].target);
  operationPaths(ownerB, ownerRaceInputs[1].operation, ownerRaceKeys[1], ownerRaceInputs[1].target);
  const ownerRace = await Promise.allSettled([
    trustedDisableUserAccount(fixtureActor(ownerA), ownerRaceInputs[0], { authAdmin: trustedAuthAdmin }),
    trustedDisableUserAccount(fixtureActor(ownerB), ownerRaceInputs[1], { authAdmin: trustedAuthAdmin }),
  ]);
  assert.equal(fulfilled(ownerRace), 1);
  const [ownerASnapshot, ownerBSnapshot, authA, authB] = await Promise.all([
    firestore.doc(`systemOwners/${ownerA}`).get(),
    firestore.doc(`systemOwners/${ownerB}`).get(),
    auth.getUser(ownerA),
    auth.getUser(ownerB),
  ]);
  assert.equal([ownerASnapshot, ownerBSnapshot].filter((entry) => entry.data()?.status === "active").length, 1);
  assert.equal([authA, authB].filter((entry) => entry.disabled).length, 1);

  const bootstrapOwner = ownerASnapshot.data()?.status === "active" ? ownerA : ownerB;
  const bootstrapApplicant = `fixture-bootstrap-applicant-${suffix}`;
  await seedProfile(bootstrapApplicant);
  const bootstrap = await seedBootstrapApplication("same-key", bootstrapApplicant);
  const bootstrapKey = `fixture-bootstrap-same-${suffix}`;
  const sameBootstrapInput = bootstrapInput(bootstrap.applicationId, bootstrapKey);
  operationPaths(bootstrapOwner, sameBootstrapInput.operation, bootstrapKey, sameBootstrapInput.target);
  const sameBootstrapRace = await Promise.allSettled([
    trustedApproveWorkspaceBootstrap(fixtureActor(bootstrapOwner), sameBootstrapInput),
    trustedApproveWorkspaceBootstrap(fixtureActor(bootstrapOwner), sameBootstrapInput),
  ]);
  assert.equal(fulfilled(sameBootstrapRace), 2);
  assert.equal(sameBootstrapRace.filter((result) => result.status === "fulfilled" && result.value.replayed).length, 1);
  assert.equal((await firestore.doc(`workspaces/${bootstrap.workspaceId}`).get()).exists, true);
  assert.equal((await firestore.collection(`workspaces/${bootstrap.workspaceId}/members`).get()).size, 1);

  const rejectApplicant = `fixture-bootstrap-reject-${suffix}`;
  await seedProfile(rejectApplicant);
  const rejectBootstrap = await seedBootstrapApplication("reject-race", rejectApplicant);
  const approveKey = `fixture-bootstrap-approve-${suffix}`;
  const rejectKey = `fixture-bootstrap-reject-${suffix}`;
  const approveRequest = bootstrapInput(rejectBootstrap.applicationId, approveKey);
  const rejectRequest = rejectInput(rejectBootstrap.applicationId, rejectKey);
  operationPaths(bootstrapOwner, approveRequest.operation, approveKey, approveRequest.target);
  operationPaths(bootstrapOwner, rejectRequest.operation, rejectKey, rejectRequest.target);
  const decisionRace = await Promise.allSettled([
    trustedApproveWorkspaceBootstrap(fixtureActor(bootstrapOwner), approveRequest),
    trustedRejectAdminApplication(fixtureActor(bootstrapOwner), rejectRequest),
  ]);
  assert.equal(fulfilled(decisionRace), 1);
  const decidedApplication = (await firestore.doc(`adminApplications/${rejectBootstrap.applicationId}`).get()).data();
  assert.ok(["approved", "rejected"].includes(String(decidedApplication?.status)));
  assert.equal(
    (await firestore.doc(`workspaces/${rejectBootstrap.workspaceId}`).get()).exists,
    decidedApplication?.status === "approved",
  );

  const disabledApplicant = `fixture-bootstrap-disabled-${suffix}`;
  await seedProfile(disabledApplicant);
  await seedAuthUser(disabledApplicant);
  const disableBootstrap = await seedBootstrapApplication("disable-race", disabledApplicant);
  const disableKey = `fixture-bootstrap-disable-user-${suffix}`;
  const userDisableRequest = accountInput("user_account.disable", disabledApplicant, disableKey);
  const bootstrapDisableKey = `fixture-bootstrap-disable-approve-${suffix}`;
  const bootstrapDisableRequest = bootstrapInput(disableBootstrap.applicationId, bootstrapDisableKey);
  operationPaths(bootstrapOwner, userDisableRequest.operation, disableKey, userDisableRequest.target);
  operationPaths(bootstrapOwner, bootstrapDisableRequest.operation, bootstrapDisableKey, bootstrapDisableRequest.target);
  const disableBootstrapRace = await Promise.allSettled([
    trustedDisableUserAccount(
      fixtureActor(bootstrapOwner),
      userDisableRequest,
      { authAdmin: trustedAuthAdmin },
    ),
    trustedApproveWorkspaceBootstrap(fixtureActor(bootstrapOwner), bootstrapDisableRequest),
  ]);
  assert.ok([1, 2].includes(fulfilled(disableBootstrapRace)));
  assert.equal((await auth.getUser(disabledApplicant)).disabled, true);
  const disabledWorkspace = await firestore.doc(`workspaces/${disableBootstrap.workspaceId}`).get();
  if (disabledWorkspace.exists) {
    assert.equal((await firestore.collection(`workspaces/${disableBootstrap.workspaceId}/members`).get()).size, 1);
  }

  console.log(
    "P0-5B2 account/workspace integration passed; owner lockout, bootstrap replay/decision/user-disable races preserved; production access=0",
  );
} finally {
  for (const uid of cleanupAuthUids) {
    await auth.deleteUser(uid).catch(() => undefined);
  }
  const paths = [...cleanupPaths].sort((left, right) => right.split("/").length - left.split("/").length);
  for (let offset = 0; offset < paths.length; offset += 400) {
    const batch = firestore.batch();
    for (const path of paths.slice(offset, offset + 400)) batch.delete(firestore.doc(path));
    await batch.commit();
  }
}
