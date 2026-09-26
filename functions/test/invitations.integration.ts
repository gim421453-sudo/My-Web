import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  trustedCreateInvitation,
  trustedRedeemInvitation,
  trustedRevokeInvitation,
} from "../src/invitations/invitationOperations.js";
import {
  createHmacInvitationSecretProvider,
  hashHighEntropyInvitationCode,
} from "../src/invitations/invitationFoundation.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { sha256Canonical } from "../src/operations/operationContract.js";
import { getTrustedAdminFirestore } from "../src/runtime/adminFirestore.js";
import { fixtureActor } from "./support/authzFixtures.js";

const suffix = randomUUID();
const firestore = getTrustedAdminFirestore().firestore;
const ownerUid = `fixture-invite-owner-${suffix}`;
const workspaceId = `fixture-invite-workspace-${suffix}`;
const cleanupPaths = new Set<string>();
const provider = createHmacInvitationSecretProvider(
  { fixture_v1: "fixture-integration-invitation-secret-longer-than-thirty-two-bytes" },
  "fixture_v1",
);

function createInput(idempotencyKey: string, maxUses = 1) {
  return {
    operation: "invitation.create",
    idempotencyKey,
    target: { kind: "workspace", id: workspaceId },
    payload: { targetRole: "normal", expiresInSeconds: 3_600, maxUses },
  };
}

function redeemInput(code: string, idempotencyKey: string) {
  return {
    operation: "invitation.redeem",
    idempotencyKey,
    target: { kind: "invitation_code", id: "redeem" },
    payload: { code },
  };
}

function revokeInput(invitationId: string, idempotencyKey: string) {
  return {
    operation: "invitation.revoke",
    idempotencyKey,
    target: { kind: "invitation", id: invitationId },
    payload: {},
  };
}

function operationPaths(actorUid: string, input: ReturnType<typeof redeemInput> | ReturnType<typeof revokeInput>) {
  const target = { ...input.target, workspaceId: null };
  return {
    idempotency: `trustedOperationIdempotency/${sha256Canonical({
      actorUid,
      idempotencyKey: input.idempotencyKey,
    })}`,
    audit: `securityAuditLogs/${sha256Canonical({
      actorUid,
      idempotencyKey: input.idempotencyKey,
      operation: input.operation,
      target,
    })}`,
  };
}

function track(path: string): string {
  cleanupPaths.add(path);
  return path;
}

async function seedBase(): Promise<void> {
  const batch = firestore.batch();
  batch.set(firestore.doc(track(`systemOwners/${ownerUid}`)), {
    schemaVersion: 1,
    uid: ownerUid,
    status: "active",
    source: "system_bootstrap",
  });
  batch.set(firestore.doc(track(`workspaces/${workspaceId}`)), {
    workspaceId,
    status: "active",
  });
  await batch.commit();
}

function trackCreate(result: Awaited<ReturnType<typeof trustedCreateInvitation>>): void {
  track(`authorityInvitations/${result.invitationId}`);
  track(`invitationCodeIndex/${hashHighEntropyInvitationCode(result.invitationCode)}`);
}

function trackOperation(actorUid: string, input: ReturnType<typeof redeemInput> | ReturnType<typeof revokeInput>): void {
  const paths = operationPaths(actorUid, input);
  track(paths.idempotency);
  track(paths.audit);
}

function fulfilled(results: readonly PromiseSettledResult<unknown>[]): number {
  return results.filter((result) => result.status === "fulfilled").length;
}

try {
  await seedBase();

  const replayKey = `fixture-create-replay-${suffix}`;
  const replayInput = createInput(replayKey, 2);
  const first = await trustedCreateInvitation(fixtureActor(ownerUid), replayInput, { secretProvider: provider });
  trackCreate(first);
  const replay = await trustedCreateInvitation(fixtureActor(ownerUid), replayInput, { secretProvider: provider });
  assert.equal(replay.replayed, true);
  assert.equal(replay.invitationCode, first.invitationCode);
  assert.equal(replay.invitationId, first.invitationId);
  const storedFirst = await firestore.doc(`authorityInvitations/${first.invitationId}`).get();
  assert.doesNotMatch(JSON.stringify(storedFirst.data()), new RegExp(first.invitationCode));

  const sameUserCreate = await trustedCreateInvitation(
    fixtureActor(ownerUid),
    createInput(`fixture-same-user-create-${suffix}`, 2),
    { secretProvider: provider },
  );
  trackCreate(sameUserCreate);
  const sameUid = `fixture-same-redeemer-${suffix}`;
  const sameInputs = [
    redeemInput(sameUserCreate.invitationCode, `fixture-same-redeem-a-${suffix}`),
    redeemInput(sameUserCreate.invitationCode, `fixture-same-redeem-b-${suffix}`),
  ];
  sameInputs.forEach((input) => trackOperation(sameUid, input));
  track(`workspaces/${workspaceId}/members/${sameUid}`);
  track(`authorityInvitations/${sameUserCreate.invitationId}/redemptions/${sameUid}`);
  const sameRace = await Promise.allSettled(sameInputs.map((input) => (
    trustedRedeemInvitation(fixtureActor(sameUid), input)
  )));
  assert.equal(fulfilled(sameRace), 1);
  assert.equal((await firestore.doc(`authorityInvitations/${sameUserCreate.invitationId}`).get()).data()?.usedCount, 1);

  const finalCreate = await trustedCreateInvitation(
    fixtureActor(ownerUid),
    createInput(`fixture-max-one-create-${suffix}`, 1),
    { secretProvider: provider },
  );
  trackCreate(finalCreate);
  const finalUsers = [`fixture-final-a-${suffix}`, `fixture-final-b-${suffix}`];
  const finalInputs = finalUsers.map((uid, index) => (
    redeemInput(finalCreate.invitationCode, `fixture-final-${index}-${suffix}`)
  ));
  finalUsers.forEach((uid, index) => {
    const input = finalInputs[index];
    assert.ok(input);
    trackOperation(uid, input);
    track(`workspaces/${workspaceId}/members/${uid}`);
    track(`authorityInvitations/${finalCreate.invitationId}/redemptions/${uid}`);
  });
  const finalRace = await Promise.allSettled(finalUsers.map((uid, index) => (
    trustedRedeemInvitation(fixtureActor(uid), finalInputs[index])
  )));
  assert.equal(fulfilled(finalRace), 1);
  const finalInvitation = await firestore.doc(`authorityInvitations/${finalCreate.invitationId}`).get();
  assert.equal(finalInvitation.data()?.usedCount, 1);
  assert.equal(finalInvitation.data()?.status, "consumed");
  const finalMemberships = await Promise.all(finalUsers.map((uid) => (
    firestore.doc(`workspaces/${workspaceId}/members/${uid}`).get()
  )));
  assert.equal(finalMemberships.filter((snapshot) => snapshot.exists).length, 1);

  const lastCreate = await trustedCreateInvitation(
    fixtureActor(ownerUid),
    createInput(`fixture-last-create-${suffix}`, 2),
    { secretProvider: provider },
  );
  trackCreate(lastCreate);
  const firstLastUid = `fixture-last-initial-${suffix}`;
  const firstLastInput = redeemInput(lastCreate.invitationCode, `fixture-last-initial-key-${suffix}`);
  trackOperation(firstLastUid, firstLastInput);
  track(`workspaces/${workspaceId}/members/${firstLastUid}`);
  track(`authorityInvitations/${lastCreate.invitationId}/redemptions/${firstLastUid}`);
  await trustedRedeemInvitation(fixtureActor(firstLastUid), firstLastInput);
  const lastUsers = [`fixture-last-a-${suffix}`, `fixture-last-b-${suffix}`];
  const lastInputs = lastUsers.map((uid, index) => redeemInput(
    lastCreate.invitationCode,
    `fixture-last-${index}-${suffix}`,
  ));
  lastUsers.forEach((uid, index) => {
    const input = lastInputs[index];
    assert.ok(input);
    trackOperation(uid, input);
    track(`workspaces/${workspaceId}/members/${uid}`);
    track(`authorityInvitations/${lastCreate.invitationId}/redemptions/${uid}`);
  });
  const lastRace = await Promise.allSettled(lastUsers.map((uid, index) => (
    trustedRedeemInvitation(fixtureActor(uid), lastInputs[index])
  )));
  assert.equal(fulfilled(lastRace), 1);
  assert.equal((await firestore.doc(`authorityInvitations/${lastCreate.invitationId}`).get()).data()?.usedCount, 2);

  const revokeRaceCreate = await trustedCreateInvitation(
    fixtureActor(ownerUid),
    createInput(`fixture-revoke-race-create-${suffix}`, 2),
    { secretProvider: provider },
  );
  trackCreate(revokeRaceCreate);
  const revokeKey = `fixture-revoke-race-${suffix}`;
  const raceRedeemer = `fixture-revoke-race-user-${suffix}`;
  const revoke = revokeInput(revokeRaceCreate.invitationId, revokeKey);
  const redeem = redeemInput(revokeRaceCreate.invitationCode, `fixture-redeem-race-${suffix}`);
  trackOperation(ownerUid, revoke);
  trackOperation(raceRedeemer, redeem);
  track(`workspaces/${workspaceId}/members/${raceRedeemer}`);
  track(`authorityInvitations/${revokeRaceCreate.invitationId}/redemptions/${raceRedeemer}`);
  const revokeRace = await Promise.allSettled([
    trustedRevokeInvitation(fixtureActor(ownerUid), revoke),
    trustedRedeemInvitation(fixtureActor(raceRedeemer), redeem),
  ]);
  assert.ok([1, 2].includes(fulfilled(revokeRace)));
  const raceInvitation = await firestore.doc(`authorityInvitations/${revokeRaceCreate.invitationId}`).get();
  assert.equal(raceInvitation.data()?.status, "revoked");
  assert.ok([0, 1].includes(Number(raceInvitation.data()?.usedCount)));
  assert.ok(Number(raceInvitation.data()?.usedCount) <= Number(raceInvitation.data()?.maxUses));
  const raceMembership = await firestore.doc(`workspaces/${workspaceId}/members/${raceRedeemer}`).get();
  assert.equal(raceMembership.exists, raceInvitation.data()?.usedCount === 1);

  const rollbackKey = `fixture-rollback-create-${suffix}`;
  const rollbackInput = createInput(rollbackKey, 1);
  const rollbackActor = fixtureActor(ownerUid);
  const rollbackOperationId = sha256Canonical({
    actorUid: ownerUid,
    idempotencyKey: rollbackKey,
    operation: "invitation.create",
    target: { kind: "workspace", id: workspaceId, workspaceId: null },
  });
  track(`securityAuditLogs/${rollbackOperationId}`);
  await firestore.doc(`securityAuditLogs/${rollbackOperationId}`).set({ fixtureCollision: true });
  const rollbackSecret = provider.derive("fixture_v1", rollbackOperationId);
  track(`authorityInvitations/${rollbackOperationId}`);
  track(`invitationCodeIndex/${rollbackSecret.codeHash}`);
  track(`trustedOperationIdempotency/${sha256Canonical({ actorUid: ownerUid, idempotencyKey: rollbackKey })}`);
  await assert.rejects(
    trustedCreateInvitation(rollbackActor, rollbackInput, { secretProvider: provider }),
    (error: unknown) => error instanceof OperationError && error.code === "INTERNAL",
  );
  assert.equal((await firestore.doc(`authorityInvitations/${rollbackOperationId}`).get()).exists, false);
  assert.equal((await firestore.doc(`invitationCodeIndex/${rollbackSecret.codeHash}`).get()).exists, false);

  const legacyCode = "A".repeat(32);
  track(`invites/${legacyCode}`);
  track(`invitations/${legacyCode}`);
  track(`workspaces/${workspaceId}/inviteCodes/${legacyCode}`);
  await firestore.doc(`invites/${legacyCode}`).set({ status: "active", workspaceId });
  await firestore.doc(`invitations/${legacyCode}`).set({ status: "active", workspaceId });
  await firestore.doc(`workspaces/${workspaceId}/inviteCodes/${legacyCode}`).set({ status: "active" });
  await assert.rejects(
    trustedRedeemInvitation(
      fixtureActor(`fixture-legacy-user-${suffix}`),
      redeemInput(legacyCode, `fixture-legacy-redeem-${suffix}`),
    ),
    (error: unknown) => error instanceof OperationError && error.code === "NOT_FOUND",
  );

  console.log(
    "P0-3 invitation integration passed; maxUses atomic; revoke race consistent; legacy writes=0; production access=0",
  );
} finally {
  const paths = [...cleanupPaths].sort((left, right) => right.split("/").length - left.split("/").length);
  for (let offset = 0; offset < paths.length; offset += 400) {
    const batch = firestore.batch();
    for (const path of paths.slice(offset, offset + 400)) batch.delete(firestore.doc(path));
    await batch.commit();
  }
}
