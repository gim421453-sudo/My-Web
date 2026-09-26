import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { WorkspaceRole } from "../src/authz/authorizationTypes.js";
import { sha256Canonical } from "../src/operations/operationContract.js";
import { getTrustedAdminFirestore } from "../src/runtime/adminFirestore.js";
import {
  trustedRemoveWorkspaceMember,
  trustedSetWorkspaceMemberStatus,
  trustedUpdateWorkspaceMemberRole,
} from "../src/workspaceMembers/workspaceMemberOperations.js";
import { fixtureActor } from "./support/authzFixtures.js";

const suffix = randomUUID();
const firestore = getTrustedAdminFirestore().firestore;
const ownerUid = `fixture-member-owner-${suffix}`;
const cleanupPaths = new Set<string>();

function track(path: string): string {
  cleanupPaths.add(path);
  return path;
}

function member(workspaceId: string, uid: string, role: WorkspaceRole) {
  return {
    schemaVersion: 1,
    uid,
    workspaceId,
    role,
    status: "active",
    disabled: false,
    active: true,
    source: "system_bootstrap",
    createdAt: new Date(),
    createdBy: ownerUid,
    updatedAt: new Date(),
    updatedBy: ownerUid,
  };
}

function roleInput(workspaceId: string, targetUid: string, newRole: WorkspaceRole, key: string) {
  return {
    operation: "workspace_member.role.update",
    idempotencyKey: key,
    target: { kind: "workspace_member", id: targetUid, workspaceId },
    payload: { newRole },
  };
}

function statusInput(workspaceId: string, targetUid: string, status: "active" | "disabled", key: string) {
  return {
    operation: "workspace_member.status.set",
    idempotencyKey: key,
    target: { kind: "workspace_member", id: targetUid, workspaceId },
    payload: { status },
  };
}

function removeInput(workspaceId: string, targetUid: string, key: string) {
  return {
    operation: "workspace_member.remove",
    idempotencyKey: key,
    target: { kind: "workspace_member", id: targetUid, workspaceId },
    payload: {},
  };
}

type Input = ReturnType<typeof roleInput> | ReturnType<typeof statusInput> | ReturnType<typeof removeInput>;

function trackOperation(input: Input): void {
  const scopeHash = sha256Canonical({ actorUid: ownerUid, idempotencyKey: input.idempotencyKey });
  const operationIdHash = sha256Canonical({
    actorUid: ownerUid,
    idempotencyKey: input.idempotencyKey,
    operation: input.operation,
    target: input.target,
  });
  track(`trustedOperationIdempotency/${scopeHash}`);
  track(`securityAuditLogs/${operationIdHash}`);
}

async function seedWorkspace(
  label: string,
  members: readonly Readonly<{ uid: string; role: WorkspaceRole }>[],
): Promise<string> {
  const workspaceId = `fixture-member-${label}-${suffix}`;
  const batch = firestore.batch();
  batch.set(firestore.doc(track(`workspaces/${workspaceId}`)), { workspaceId, status: "active" });
  for (const entry of members) {
    batch.set(
      firestore.doc(track(`workspaces/${workspaceId}/members/${entry.uid}`)),
      member(workspaceId, entry.uid, entry.role),
    );
  }
  await batch.commit();
  return workspaceId;
}

function fulfilled(results: readonly PromiseSettledResult<unknown>[]): number {
  return results.filter((result) => result.status === "fulfilled").length;
}

async function activeTopManagerCount(workspaceId: string): Promise<number> {
  const snapshot = await firestore.collection(`workspaces/${workspaceId}/members`)
    .where("role", "==", "super_manager")
    .get();
  return snapshot.docs.filter((document) => {
    const data = document.data();
    return data.status === "active" && data.active === true && data.disabled === false;
  }).length;
}

async function runLastAdminRace(
  label: string,
  invoke: (workspaceId: string, uid: string, key: string) => Promise<unknown>,
): Promise<void> {
  const first = `fixture-${label}-admin-a-${suffix}`;
  const second = `fixture-${label}-admin-b-${suffix}`;
  const workspaceId = await seedWorkspace(label, [
    { uid: first, role: "super_manager" },
    { uid: second, role: "super_manager" },
  ]);
  const keys = [`fixture-${label}-a-${suffix}`, `fixture-${label}-b-${suffix}`];
  const inputs = [first, second].map((uid, index) => {
    const key = keys[index];
    assert.ok(key);
    if (label === "demote") return roleInput(workspaceId, uid, "manager", key);
    if (label === "disable") return statusInput(workspaceId, uid, "disabled", key);
    return removeInput(workspaceId, uid, key);
  });
  inputs.forEach(trackOperation);
  const results = await Promise.allSettled([
    invoke(workspaceId, first, keys[0] as string),
    invoke(workspaceId, second, keys[1] as string),
  ]);
  assert.equal(fulfilled(results), 1);
  assert.equal(await activeTopManagerCount(workspaceId), 1);
}

try {
  await firestore.doc(track(`systemOwners/${ownerUid}`)).set({
    schemaVersion: 1,
    uid: ownerUid,
    status: "active",
    source: "system_bootstrap",
  });
  const actor = fixtureActor(ownerUid);

  const updateUid = `fixture-update-target-${suffix}`;
  const updateWorkspace = await seedWorkspace("update-race", [{ uid: updateUid, role: "teacher" }]);
  const updateInputs = [
    roleInput(updateWorkspace, updateUid, "viewer", `fixture-update-a-${suffix}`),
    roleInput(updateWorkspace, updateUid, "normal", `fixture-update-b-${suffix}`),
  ];
  updateInputs.forEach(trackOperation);
  const updateRace = await Promise.allSettled(updateInputs.map((input) => (
    trustedUpdateWorkspaceMemberRole(actor, input)
  )));
  assert.ok([1, 2].includes(fulfilled(updateRace)));
  const updated = (await firestore.doc(`workspaces/${updateWorkspace}/members/${updateUid}`).get()).data();
  assert.ok(["viewer", "normal"].includes(String(updated?.role)));
  assert.equal(updated?.status, "active");

  const roleStatusUid = `fixture-role-status-target-${suffix}`;
  const roleStatusWorkspace = await seedWorkspace("role-status", [{ uid: roleStatusUid, role: "teacher" }]);
  const roleStatusInputs = [
    roleInput(roleStatusWorkspace, roleStatusUid, "viewer", `fixture-role-status-role-${suffix}`),
    statusInput(roleStatusWorkspace, roleStatusUid, "disabled", `fixture-role-status-disable-${suffix}`),
  ];
  roleStatusInputs.forEach(trackOperation);
  const roleStatusRace = await Promise.allSettled([
    trustedUpdateWorkspaceMemberRole(actor, roleStatusInputs[0]),
    trustedSetWorkspaceMemberStatus(actor, roleStatusInputs[1]),
  ]);
  assert.ok([1, 2].includes(fulfilled(roleStatusRace)));
  const roleStatus = (await firestore.doc(`workspaces/${roleStatusWorkspace}/members/${roleStatusUid}`).get()).data();
  assert.ok(["teacher", "viewer"].includes(String(roleStatus?.role)));
  assert.ok(["active", "disabled"].includes(String(roleStatus?.status)));
  assert.equal(roleStatus?.active, roleStatus?.status === "active");
  assert.equal(roleStatus?.disabled, roleStatus?.status === "disabled");

  const disableRemoveUid = `fixture-disable-remove-target-${suffix}`;
  const disableRemoveWorkspace = await seedWorkspace("disable-remove", [{ uid: disableRemoveUid, role: "teacher" }]);
  const disableRemoveInputs = [
    statusInput(disableRemoveWorkspace, disableRemoveUid, "disabled", `fixture-disable-remove-disable-${suffix}`),
    removeInput(disableRemoveWorkspace, disableRemoveUid, `fixture-disable-remove-remove-${suffix}`),
  ];
  disableRemoveInputs.forEach(trackOperation);
  const disableRemoveRace = await Promise.allSettled([
    trustedSetWorkspaceMemberStatus(actor, disableRemoveInputs[0]),
    trustedRemoveWorkspaceMember(actor, disableRemoveInputs[1]),
  ]);
  assert.ok([1, 2].includes(fulfilled(disableRemoveRace)));
  const removed = (await firestore.doc(`workspaces/${disableRemoveWorkspace}/members/${disableRemoveUid}`).get()).data();
  assert.equal(removed?.status, "inactive");
  assert.equal(removed?.active, false);
  assert.equal(removed?.disabled, false);

  await runLastAdminRace("demote", (workspaceId, uid, key) => (
    trustedUpdateWorkspaceMemberRole(actor, roleInput(workspaceId, uid, "manager", key))
  ));
  await runLastAdminRace("disable", (workspaceId, uid, key) => (
    trustedSetWorkspaceMemberStatus(actor, statusInput(workspaceId, uid, "disabled", key))
  ));
  await runLastAdminRace("remove", (workspaceId, uid, key) => (
    trustedRemoveWorkspaceMember(actor, removeInput(workspaceId, uid, key))
  ));

  console.log(
    "P0-5B1 membership integration passed; canonical nested writes only; lockout races preserved; production access=0",
  );
} finally {
  const paths = [...cleanupPaths].sort((left, right) => right.split("/").length - left.split("/").length);
  for (let offset = 0; offset < paths.length; offset += 400) {
    const batch = firestore.batch();
    for (const path of paths.slice(offset, offset + 400)) batch.delete(firestore.doc(path));
    await batch.commit();
  }
}

