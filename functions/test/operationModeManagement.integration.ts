import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import {
  trustedListInvitations,
  trustedListOwnerWorkspaces,
  trustedListWorkspaceMembers,
} from "../src/management/managementReadOperations.js";
import { sha256Canonical } from "../src/operations/operationContract.js";
import { getTrustedAdminFirestore } from "../src/runtime/adminFirestore.js";
import { trustedSetWorkspaceOperationMode } from "../src/workspaces/workspaceOperationMode.js";
import { trustedSetWorkspaceLifecycle } from "../src/workspaces/workspaceOperations.js";
import { fixtureActor } from "./support/authzFixtures.js";

const suffix = randomUUID();
const firestore = getTrustedAdminFirestore().firestore;
const cleanupPaths = new Set<string>();

function track(path: string): string {
  cleanupPaths.add(path);
  return path;
}

function trackOperation(actorUid: string, idempotencyKey: string, operation: string, workspaceId: string): void {
  const target = { kind: "workspace", id: workspaceId, workspaceId: null };
  track(`trustedOperationIdempotency/${sha256Canonical({ actorUid, idempotencyKey })}`);
  track(`securityAuditLogs/${sha256Canonical({ actorUid, idempotencyKey, operation, target })}`);
}

function modeInput(workspaceId: string, key: string, expectedMode: string, newMode: string) {
  return {
    operation: "workspace.operation_mode.set",
    idempotencyKey: key,
    target: { kind: "workspace", id: workspaceId, workspaceId: null },
    payload: { expectedMode, newMode, reason: "emulator concurrency verification" },
  };
}

function lifecycleInput(workspaceId: string, key: string) {
  return {
    operation: "workspace.lifecycle.set",
    idempotencyKey: key,
    target: { kind: "workspace", id: workspaceId, workspaceId: null },
    payload: { status: "disabled" },
  };
}

function readInput(operation: string, kind: string, workspaceId: string | null, limit = 25) {
  return {
    operation,
    target: {
      kind,
      id: workspaceId || "all",
      workspaceId,
    },
    payload: { limit },
  };
}

function fulfilled(results: readonly PromiseSettledResult<unknown>[]): number {
  return results.filter((result) => result.status === "fulfilled").length;
}

try {
  const ownerUid = `fixture-mode-owner-${suffix}`;
  const managerUid = `fixture-mode-manager-${suffix}`;
  const memberUid = `fixture-mode-member-${suffix}`;
  const workspaceId = `fixture-mode-workspace-${suffix}`;
  const invitationId = `fixture-mode-invitation-${suffix}`;
  const now = Timestamp.now();

  await Promise.all([
    firestore.doc(track(`systemOwners/${ownerUid}`)).set({
      schemaVersion: 1,
      uid: ownerUid,
      status: "active",
      source: "system_bootstrap",
    }),
    firestore.doc(track(`workspaces/${workspaceId}`)).set({
      workspaceId,
      name: "Mode integration fixture",
      status: "active",
      disabled: false,
      archived: false,
      operationMode: "integrated_unconfigured",
      operationModeVersion: 0,
      createdAt: now,
      updatedAt: now,
    }),
    firestore.doc(track(`workspaces/${workspaceId}/members/${managerUid}`)).set({
      schemaVersion: 1,
      uid: managerUid,
      workspaceId,
      role: "manager",
      status: "active",
      active: true,
      disabled: false,
      source: "system_bootstrap",
      createdAt: now,
      updatedAt: now,
    }),
    firestore.doc(track(`workspaces/${workspaceId}/members/${memberUid}`)).set({
      schemaVersion: 1,
      uid: memberUid,
      workspaceId,
      role: "teacher",
      status: "active",
      active: true,
      disabled: false,
      source: "system_bootstrap",
      createdAt: now,
      updatedAt: now,
    }),
    firestore.doc(track(`authorityInvitations/${invitationId}`)).set({
      schemaVersion: 1,
      workspaceId,
      targetRole: "teacher",
      status: "active",
      maxUses: 3,
      usedCount: 0,
      codeHash: "fixture-secret-hash-must-not-leak",
      rawCode: "fixture-raw-code-must-not-leak",
      secretVersion: 1,
      createdAt: now,
      expiresAt: Timestamp.fromMillis(now.toMillis() + 86_400_000),
    }),
    firestore.doc(track(`workspace_members/${memberUid}`)).set({
      uid: memberUid,
      workspaceId,
      role: "super_manager",
      status: "active",
    }),
  ]);

  const modeKeys = [
    `fixture-mode-school-${suffix}`,
    `fixture-mode-academy-${suffix}`,
  ] as const;
  for (const key of modeKeys) trackOperation(ownerUid, key, "workspace.operation_mode.set", workspaceId);
  const modeRace = await Promise.allSettled([
    trustedSetWorkspaceOperationMode(
      fixtureActor(ownerUid),
      modeInput(workspaceId, modeKeys[0], "integrated_unconfigured", "school"),
    ),
    trustedSetWorkspaceOperationMode(
      fixtureActor(ownerUid),
      modeInput(workspaceId, modeKeys[1], "integrated_unconfigured", "academy"),
    ),
  ]);
  assert.equal(fulfilled(modeRace), 1);
  const racedWorkspace = (await firestore.doc(`workspaces/${workspaceId}`).get()).data();
  assert.ok(["school", "academy"].includes(String(racedWorkspace?.operationMode)));
  assert.equal(racedWorkspace?.operationModeVersion, 1);

  const lifecycleKey = `fixture-mode-disable-${suffix}`;
  const recoveryModeKey = `fixture-mode-recovery-${suffix}`;
  trackOperation(ownerUid, lifecycleKey, "workspace.lifecycle.set", workspaceId);
  trackOperation(ownerUid, recoveryModeKey, "workspace.operation_mode.set", workspaceId);
  const lifecycleRace = await Promise.allSettled([
    trustedSetWorkspaceLifecycle(fixtureActor(ownerUid), lifecycleInput(workspaceId, lifecycleKey)),
    trustedSetWorkspaceOperationMode(
      fixtureActor(ownerUid),
      modeInput(
        workspaceId,
        recoveryModeKey,
        String(racedWorkspace?.operationMode),
        "integrated_unconfigured",
      ),
    ),
  ]);
  assert.equal(lifecycleRace[0].status, "fulfilled");
  assert.ok([1, 2].includes(fulfilled(lifecycleRace)));
  const disabledWorkspace = (await firestore.doc(`workspaces/${workspaceId}`).get()).data();
  assert.equal(disabledWorkspace?.status, "disabled");
  assert.equal(disabledWorkspace?.disabled, true);

  const [idempotencyBeforeReads, auditBeforeReads] = await Promise.all([
    firestore.collection("trustedOperationIdempotency").get(),
    firestore.collection("securityAuditLogs").get(),
  ]);
  const ownerWorkspaces = await trustedListOwnerWorkspaces(
    fixtureActor(ownerUid),
    readInput("management.owner_workspaces.list", "owner_workspaces", null, 100),
  );
  assert.equal(ownerWorkspaces.items.some((item) => item.workspaceId === workspaceId), true);

  const members = await trustedListWorkspaceMembers(
    fixtureActor(managerUid),
    readInput("management.workspace_members.list", "workspace_members", workspaceId, 100),
  );
  assert.equal(members.items.some((item) => item.uid === memberUid && item.role === "teacher"), true);
  assert.equal(members.items.some((item) => item.role === "super_manager"), false);

  const invitations = await trustedListInvitations(
    fixtureActor(managerUid),
    readInput("management.invitations.list", "invitations", workspaceId, 100),
  );
  assert.equal(invitations.items.some((item) => item.invitationId === invitationId), true);
  assert.doesNotMatch(JSON.stringify(invitations), /rawCode|codeHash|secretVersion|fixture-secret|fixture-raw-code/);
  const [idempotencyAfterReads, auditAfterReads] = await Promise.all([
    firestore.collection("trustedOperationIdempotency").get(),
    firestore.collection("securityAuditLogs").get(),
  ]);
  assert.equal(idempotencyAfterReads.size, idempotencyBeforeReads.size);
  assert.equal(auditAfterReads.size, auditBeforeReads.size);

  console.log(
    "P0-6B mode/management integration passed; stale race, lifecycle race, canonical reads and redaction preserved; production access=0",
  );
} finally {
  const paths = [...cleanupPaths].sort((left, right) => right.split("/").length - left.split("/").length);
  for (let offset = 0; offset < paths.length; offset += 400) {
    const batch = firestore.batch();
    for (const path of paths.slice(offset, offset + 400)) batch.delete(firestore.doc(path));
    await batch.commit();
  }
}
