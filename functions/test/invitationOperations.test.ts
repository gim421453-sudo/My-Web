import assert from "node:assert/strict";
import test from "node:test";
import type { WorkspaceRole } from "../src/authz/authorizationTypes.js";
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
import { fixtureActor, membershipV1, ownerV1 } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

const ACTOR = "fixture-invitation-owner";
const REDEEMER = "fixture-invitation-redeemer";
const WORKSPACE = "fixture-invitation-workspace";
const NOW = new Date("2030-01-01T00:00:00.000Z");
const provider = createHmacInvitationSecretProvider(
  { fixture_v1: "fixture-invitation-secret-material-with-more-than-thirty-two-bytes" },
  "fixture_v1",
);

function ownerRunner(extra: Record<string, Record<string, unknown>> = {}) {
  return new MemoryTransactionRunner({
    [`systemOwners/${ACTOR}`]: ownerV1({ uid: ACTOR }),
    [`workspaces/${WORKSPACE}`]: { workspaceId: WORKSPACE, status: "active" },
    ...extra,
  }, NOW);
}

function memberRunner(role: WorkspaceRole, extra: Record<string, Record<string, unknown>> = {}) {
  return new MemoryTransactionRunner({
    [`workspaces/${WORKSPACE}`]: { workspaceId: WORKSPACE, status: "active" },
    [`workspaces/${WORKSPACE}/members/${ACTOR}`]: membershipV1(role, {
      uid: ACTOR,
      workspaceId: WORKSPACE,
    }),
    ...extra,
  }, NOW);
}

function createInput(
  targetRole: string = "teacher",
  idempotencyKey = "fixture-invitation-create-0001",
  payload: Record<string, unknown> = {},
) {
  return {
    operation: "invitation.create",
    idempotencyKey,
    target: { kind: "workspace", id: WORKSPACE },
    payload: { targetRole, expiresInSeconds: 3_600, maxUses: 2, ...payload },
  };
}

function revokeInput(invitationId: string, idempotencyKey = "fixture-invitation-revoke-0001") {
  return {
    operation: "invitation.revoke",
    idempotencyKey,
    target: { kind: "invitation", id: invitationId },
    payload: {},
  };
}

function redeemInput(code: string, idempotencyKey = "fixture-invitation-redeem-0001") {
  return {
    operation: "invitation.redeem",
    idempotencyKey,
    target: { kind: "invitation_code", id: "redeem" },
    payload: { code },
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => (
    error instanceof OperationError && error.code === code
  ));
}

test("unauthenticated create revoke and redeem fail before repository access", async () => {
  const actor = {
    ...fixtureActor(ACTOR),
    auth: { ...fixtureActor(ACTOR).auth, tokenVerified: false },
  } as never;
  const runner = ownerRunner();
  await expectCode(trustedCreateInvitation(actor, createInput(), { runner, secretProvider: provider }), "UNAUTHENTICATED");
  await expectCode(trustedRevokeInvitation(actor, revokeInput("fixture-invitation"), { runner }), "UNAUTHENTICATED");
  await expectCode(trustedRedeemInvitation(actor, redeemInput("A".repeat(32)), { runner }), "UNAUTHENTICATED");
  assert.deepEqual(runner.reads, []);
  assert.deepEqual(runner.writes, []);
});

test("create writes only canonical invitation index audit and completed idempotency", async () => {
  const runner = ownerRunner();
  const created = await trustedCreateInvitation(fixtureActor(ACTOR), createInput(), {
    runner,
    secretProvider: provider,
  });
  assert.equal(created.replayed, false);
  assert.match(created.invitationId, /^[a-f0-9]{64}$/);
  assert.match(created.invitationCode, /^[A-Za-z0-9_-]{32}$/);
  const invitation = runner.store.get(`authorityInvitations/${created.invitationId}`);
  assert.equal(invitation?.targetRole, "teacher");
  assert.equal(invitation?.status, "active");
  assert.equal(invitation?.usedCount, 0);
  assert.equal(invitation?.createdByUid, ACTOR);
  assert.equal(runner.store.has(`invitationCodeIndex/${String(invitation?.codeHash)}`), true);
  assert.equal([...runner.store.keys()].filter((path) => path.startsWith("securityAuditLogs/")).length, 1);
  assert.equal([...runner.store.keys()].filter((path) => path.startsWith("trustedOperationIdempotency/")).length, 1);
  assert.equal([...runner.store.keys()].some((path) => /(^|\/)(invites|invitations|inviteCodes)(\/|$)/.test(path)), false);
  assert.doesNotMatch(JSON.stringify([...runner.store.values()]), new RegExp(created.invitationCode));
});

test("create replay returns the same derived secret without another authority mutation", async () => {
  const runner = ownerRunner();
  const first = await trustedCreateInvitation(fixtureActor(ACTOR), createInput(), { runner, secretProvider: provider });
  const writeCount = runner.writes.length;
  const replay = await trustedCreateInvitation(fixtureActor(ACTOR), createInput(), { runner, secretProvider: provider });
  assert.equal(replay.replayed, true);
  assert.equal(replay.invitationId, first.invitationId);
  assert.equal(replay.invitationCode, first.invitationCode);
  assert.equal(runner.writes.length, writeCount);
});

const allowedByRole: Readonly<Record<WorkspaceRole, readonly WorkspaceRole[]>> = {
  super_manager: ["manager", "teacher", "normal", "viewer", "print_account"],
  manager: ["teacher", "normal", "viewer", "print_account"],
  teacher: [], normal: [], viewer: [], print_account: [],
};

for (const [actorRole, allowed] of Object.entries(allowedByRole) as [WorkspaceRole, WorkspaceRole[]][]) {
  for (const targetRole of ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"] as WorkspaceRole[]) {
    test(`${actorRole} delegation to ${targetRole} is server enforced`, async () => {
      const call = trustedCreateInvitation(fixtureActor(ACTOR), createInput(
        targetRole,
        `fixture-delegation-${actorRole}-${targetRole}`,
      ), { runner: memberRunner(actorRole), secretProvider: provider });
      if (allowed.includes(targetRole)) {
        assert.equal((await call).result.role, targetRole);
      } else {
        await expectCode(call, "FORBIDDEN");
      }
    });
  }
}

test("system owner may delegate a workspace super_manager role but never system_owner", async () => {
  const runner = ownerRunner();
  assert.equal((await trustedCreateInvitation(fixtureActor(ACTOR), createInput("super_manager"), {
    runner, secretProvider: provider,
  })).result.role, "super_manager");
  await expectCode(trustedCreateInvitation(fixtureActor(ACTOR), createInput(
    "system_owner",
    "fixture-system-owner-target-0001",
  ), { runner, secretProvider: provider }), "INVALID_ARGUMENT");
});

for (const role of ["unknown", "Teacher", "SYSTEM_OWNER"]) {
  test(`create rejects non-canonical role ${role}`, async () => {
    await expectCode(trustedCreateInvitation(fixtureActor(ACTOR), createInput(
      role,
      `fixture-invalid-role-${role.toLowerCase()}`,
    ), { runner: ownerRunner(), secretProvider: provider }), "INVALID_ARGUMENT");
  });
}

test("users.role system_owner spoof grants no invitation authority", async () => {
  const runner = new MemoryTransactionRunner({
    [`users/${ACTOR}`]: { uid: ACTOR, role: "system_owner", status: "active" },
    [`workspaces/${WORKSPACE}`]: { workspaceId: WORKSPACE, status: "active" },
  }, NOW);
  await expectCode(trustedCreateInvitation(fixtureActor(ACTOR), createInput(), {
    runner, secretProvider: provider,
  }), "FORBIDDEN");
  assert.equal(runner.reads.includes(`users/${ACTOR}`), false);
});

test("malformed workspace target and idempotency payload mismatch fail closed", async () => {
  const malformed = createInput() as ReturnType<typeof createInput>;
  malformed.target.id = "invalid/workspace";
  await expectCode(trustedCreateInvitation(fixtureActor(ACTOR), malformed, {
    runner: ownerRunner(), secretProvider: provider,
  }), "INVALID_ARGUMENT");

  const runner = ownerRunner();
  await trustedCreateInvitation(fixtureActor(ACTOR), createInput(), { runner, secretProvider: provider });
  await expectCode(trustedCreateInvitation(fixtureActor(ACTOR), createInput(
    "normal",
    "fixture-invitation-create-0001",
  ), { runner, secretProvider: provider }), "IDEMPOTENCY_CONFLICT");
});

test("deterministic code hash collision fails closed without partial write", async () => {
  const input = createInput("teacher", "fixture-code-collision-0001");
  const operationIdHash = sha256Canonical({
    actorUid: ACTOR,
    idempotencyKey: input.idempotencyKey,
    operation: input.operation,
    target: { ...input.target, workspaceId: null },
  });
  const secret = provider.derive("fixture_v1", operationIdHash);
  const runner = ownerRunner({
    [`invitationCodeIndex/${secret.codeHash}`]: {
      schemaVersion: 1,
      invitationId: "fixture-other-invitation",
    },
  });
  await expectCode(trustedCreateInvitation(fixtureActor(ACTOR), input, {
    runner, secretProvider: provider,
  }), "CONFLICT");
  assert.equal(runner.store.has(`authorityInvitations/${operationIdHash}`), false);
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("securityAuditLogs/")), false);
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("trustedOperationIdempotency/")), false);
});

for (const [label, payload] of [
  ["short expiry", { expiresInSeconds: 3_599 }],
  ["long expiry", { expiresInSeconds: 2_592_001 }],
  ["zero uses", { maxUses: 0 }],
  ["too many uses", { maxUses: 1_001 }],
  ["forged creator", { creatorUid: ACTOR }],
  ["forged status", { status: "active" }],
  ["forged used count", { usedCount: 0 }],
  ["forged code hash", { codeHash: "a".repeat(64) }],
] as const) {
  test(`create rejects ${label}`, async () => {
    await expectCode(trustedCreateInvitation(fixtureActor(ACTOR), createInput(
      "teacher",
      `fixture-invalid-create-${String(label).replaceAll(" ", "-")}`,
      payload,
    ), { runner: ownerRunner(), secretProvider: provider }), "INVALID_ARGUMENT");
  });
}

test("inactive canonical membership and both legacy membership names grant no authority", async () => {
  const inactive = membershipV1("super_manager", {
    uid: ACTOR, workspaceId: WORKSPACE, status: "inactive", active: false,
  });
  const runner = new MemoryTransactionRunner({
    [`workspaces/${WORKSPACE}`]: { workspaceId: WORKSPACE, status: "active" },
    [`workspaces/${WORKSPACE}/members/${ACTOR}`]: inactive,
    [`workspace_members/${WORKSPACE}_${ACTOR}`]: membershipV1("super_manager"),
    [`workspaceMembers/${WORKSPACE}_${ACTOR}`]: membershipV1("super_manager"),
  }, NOW);
  await expectCode(trustedCreateInvitation(fixtureActor(ACTOR), createInput(), {
    runner, secretProvider: provider,
  }), "FORBIDDEN");
  assert.equal(runner.reads.some((path) => path.startsWith("workspace_members/")), false);
  assert.equal(runner.reads.some((path) => path.startsWith("workspaceMembers/")), false);
});

test("revoke keeps the index and atomically moves active to revoked", async () => {
  const runner = ownerRunner();
  const created = await trustedCreateInvitation(fixtureActor(ACTOR), createInput(), { runner, secretProvider: provider });
  const invitation = runner.store.get(`authorityInvitations/${created.invitationId}`);
  const indexPath = `invitationCodeIndex/${String(invitation?.codeHash)}`;
  const revoked = await trustedRevokeInvitation(fixtureActor(ACTOR), revokeInput(created.invitationId), { runner });
  assert.equal(revoked.result.invitationStatus, "revoked");
  assert.equal(runner.store.get(`authorityInvitations/${created.invitationId}`)?.status, "revoked");
  assert.equal(runner.store.has(indexPath), true);
  await expectCode(trustedRevokeInvitation(fixtureActor(ACTOR), revokeInput(
    created.invitationId,
    "fixture-second-revoke-0001",
  ), { runner }), "CONFLICT");
});

test("former creator cannot revoke after losing the role needed to delegate", async () => {
  const runner = memberRunner("manager");
  const created = await trustedCreateInvitation(fixtureActor(ACTOR), createInput("teacher"), {
    runner, secretProvider: provider,
  });
  runner.store.set(`workspaces/${WORKSPACE}/members/${ACTOR}`, membershipV1("teacher", {
    uid: ACTOR,
    workspaceId: WORKSPACE,
  }));
  await expectCode(trustedRevokeInvitation(fixtureActor(ACTOR), revokeInput(created.invitationId), {
    runner,
  }), "FORBIDDEN");
  assert.equal(runner.store.get(`authorityInvitations/${created.invitationId}`)?.status, "active");
});

test("redeem creates only canonical nested membership and redemption and consumes final use", async () => {
  const runner = ownerRunner();
  const created = await trustedCreateInvitation(fixtureActor(ACTOR), createInput(
    "normal",
    "fixture-create-one-use-0001",
    { maxUses: 1 },
  ), { runner, secretProvider: provider });
  const result = await trustedRedeemInvitation(fixtureActor(REDEEMER), redeemInput(created.invitationCode), { runner });
  assert.equal(result.result.invitationStatus, "consumed");
  assert.equal(result.result.workspaceId, WORKSPACE);
  const membershipPath = `workspaces/${WORKSPACE}/members/${REDEEMER}`;
  assert.equal(runner.store.get(membershipPath)?.role, "normal");
  assert.equal(runner.store.get(membershipPath)?.source, "invite");
  assert.equal(runner.store.has(`authorityInvitations/${created.invitationId}/redemptions/${REDEEMER}`), true);
  assert.equal(runner.store.get(`authorityInvitations/${created.invitationId}`)?.usedCount, 1);
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("users/")), false);
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("workspace_members/")), false);
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("workspaceMembers/")), false);
});

test("duplicate redemption and existing inactive membership never overwrite authority", async () => {
  const runner = ownerRunner();
  const created = await trustedCreateInvitation(fixtureActor(ACTOR), createInput(), { runner, secretProvider: provider });
  await trustedRedeemInvitation(fixtureActor(REDEEMER), redeemInput(created.invitationCode), { runner });
  await expectCode(trustedRedeemInvitation(fixtureActor(REDEEMER), redeemInput(
    created.invitationCode,
    "fixture-duplicate-redeem-0002",
  ), { runner }), "CONFLICT");

  const other = "fixture-inactive-member";
  runner.store.set(`workspaces/${WORKSPACE}/members/${other}`, membershipV1("viewer", {
    uid: other, workspaceId: WORKSPACE, status: "inactive", active: false,
  }));
  await expectCode(trustedRedeemInvitation(fixtureActor(other), redeemInput(
    created.invitationCode,
    "fixture-inactive-member-redeem",
  ), { runner }), "CONFLICT");
  assert.equal(runner.store.get(`workspaces/${WORKSPACE}/members/${other}`)?.role, "viewer");
});

test("expired invitation rejects before membership mutation including exact boundary", async () => {
  const runner = ownerRunner();
  const created = await trustedCreateInvitation(fixtureActor(ACTOR), createInput(), { runner, secretProvider: provider });
  const path = `authorityInvitations/${created.invitationId}`;
  const record = runner.store.get(path);
  assert.ok(record);
  runner.store.set(path, { ...record, expiresAt: NOW });
  await expectCode(trustedRedeemInvitation(fixtureActor(REDEEMER), redeemInput(created.invitationCode), { runner }), "FAILED_PRECONDITION");
  assert.equal(runner.store.has(`workspaces/${WORKSPACE}/members/${REDEEMER}`), false);
});

test("invitation remains redeemable immediately before expiry", async () => {
  const runner = ownerRunner();
  const created = await trustedCreateInvitation(fixtureActor(ACTOR), createInput(), { runner, secretProvider: provider });
  const path = `authorityInvitations/${created.invitationId}`;
  const record = runner.store.get(path);
  assert.ok(record);
  runner.store.set(path, { ...record, expiresAt: new Date(NOW.getTime() + 1) });
  const result = await trustedRedeemInvitation(fixtureActor(REDEEMER), redeemInput(created.invitationCode), { runner });
  assert.equal(result.result.memberPresent, true);
});

test("revoked and consumed codes reject while operation replay stays safe", async () => {
  const revokedRunner = ownerRunner();
  const revoked = await trustedCreateInvitation(fixtureActor(ACTOR), createInput(), { runner: revokedRunner, secretProvider: provider });
  await trustedRevokeInvitation(fixtureActor(ACTOR), revokeInput(revoked.invitationId), { runner: revokedRunner });
  await expectCode(trustedRedeemInvitation(fixtureActor(REDEEMER), redeemInput(revoked.invitationCode), { runner: revokedRunner }), "CONFLICT");

  const consumedRunner = ownerRunner();
  const consumed = await trustedCreateInvitation(fixtureActor(ACTOR), createInput(
    "normal", "fixture-consumed-create-0001", { maxUses: 1 },
  ), { runner: consumedRunner, secretProvider: provider });
  const input = redeemInput(consumed.invitationCode, "fixture-consumed-redeem-0001");
  await trustedRedeemInvitation(fixtureActor(REDEEMER), input, { runner: consumedRunner });
  const replay = await trustedRedeemInvitation(fixtureActor(REDEEMER), input, { runner: consumedRunner });
  assert.equal(replay.replayed, true);
  await expectCode(trustedRedeemInvitation(fixtureActor("fixture-other-redeemer"), redeemInput(
    consumed.invitationCode,
    "fixture-consumed-other-0001",
  ), { runner: consumedRunner }), "CONFLICT");
});

test("legacy invitation documents are never a redeem fallback", async () => {
  const code = "A".repeat(32);
  const runner = new MemoryTransactionRunner({
    [`invites/${code}`]: { status: "active", workspaceId: WORKSPACE, role: "super_manager" },
    [`invitations/${code}`]: { status: "active", workspaceId: WORKSPACE, role: "super_manager" },
    [`workspaces/${WORKSPACE}/inviteCodes/${code}`]: { status: "active", role: "super_manager" },
  }, NOW);
  await expectCode(trustedRedeemInvitation(fixtureActor(REDEEMER), redeemInput(code), { runner }), "NOT_FOUND");
  assert.deepEqual(runner.reads.filter((path) => /(^|\/)(invites|invitations|inviteCodes)(\/|$)/.test(path)), []);
});

test("random malformed secret and unknown redeem fields fail before Firestore mutation", async () => {
  const runner = ownerRunner();
  await expectCode(trustedRedeemInvitation(fixtureActor(REDEEMER), redeemInput("short"), { runner }), "INVALID_ARGUMENT");
  const forged = redeemInput("A".repeat(32)) as { payload: Record<string, unknown> };
  forged.payload.codeHash = "a".repeat(64);
  await expectCode(trustedRedeemInvitation(fixtureActor(REDEEMER), forged, { runner }), "INVALID_ARGUMENT");
  assert.equal(runner.writes.length, 0);
});

test("random valid-shape secret is not found without legacy lookup", async () => {
  const runner = ownerRunner();
  const code = "Z".repeat(32);
  await expectCode(trustedRedeemInvitation(
    fixtureActor(REDEEMER),
    redeemInput(code),
    { runner },
  ), "NOT_FOUND");
  assert.deepEqual(runner.reads, [
    `trustedOperationIdempotency/${sha256Canonical({
      actorUid: REDEEMER,
      idempotencyKey: "fixture-invitation-redeem-0001",
    })}`,
    `invitationCodeIndex/${hashHighEntropyInvitationCode(code)}`,
  ]);
});

test("redeem audit collision rolls back membership redemption usage and idempotency", async () => {
  const runner = ownerRunner();
  const created = await trustedCreateInvitation(fixtureActor(ACTOR), createInput(), { runner, secretProvider: provider });
  const input = redeemInput(created.invitationCode, "fixture-redeem-rollback-0001");
  const operationIdHash = sha256Canonical({
    actorUid: REDEEMER,
    idempotencyKey: input.idempotencyKey,
    operation: input.operation,
    target: { ...input.target, workspaceId: null },
  });
  runner.store.set(`securityAuditLogs/${operationIdHash}`, { fixtureCollision: true });
  const redeemScopeHash = sha256Canonical({
    actorUid: REDEEMER,
    idempotencyKey: input.idempotencyKey,
  });
  const before = runner.store.get(`authorityInvitations/${created.invitationId}`);
  await expectCode(trustedRedeemInvitation(fixtureActor(REDEEMER), input, { runner }), "INTERNAL");
  assert.equal(runner.store.has(`workspaces/${WORKSPACE}/members/${REDEEMER}`), false);
  assert.equal(runner.store.has(`authorityInvitations/${created.invitationId}/redemptions/${REDEEMER}`), false);
  assert.deepEqual(runner.store.get(`authorityInvitations/${created.invitationId}`), before);
  assert.equal(runner.store.has(`trustedOperationIdempotency/${redeemScopeHash}`), false);
});

test("transaction failure rolls back invitation index audit and idempotency", async () => {
  const runner = ownerRunner();
  const actor = fixtureActor(ACTOR);
  const first = await trustedCreateInvitation(actor, createInput(), { runner, secretProvider: provider });
  const collisionRunner = ownerRunner({
    [`securityAuditLogs/${first.invitationId}`]: { fixtureCollision: true },
  });
  await expectCode(trustedCreateInvitation(actor, createInput(), {
    runner: collisionRunner,
    secretProvider: provider,
  }), "INTERNAL");
  assert.equal(collisionRunner.store.has(`authorityInvitations/${first.invitationId}`), false);
  assert.equal([...collisionRunner.store.keys()].some((path) => path.startsWith("invitationCodeIndex/")), false);
  assert.equal([...collisionRunner.store.keys()].some((path) => path.startsWith("trustedOperationIdempotency/")), false);
});
