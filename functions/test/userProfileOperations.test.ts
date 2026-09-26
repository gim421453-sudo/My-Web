import assert from "node:assert/strict";
import test from "node:test";
import { trustedCreateUserProfile } from "../src/profiles/userProfileOperations.js";
import type { VerifiedActor } from "../src/auth/verifiedActor.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { fixtureActor } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

const UID = "fixture-profile-user";

function input(
  payload: Record<string, unknown> = { displayName: "Fixture User" },
  key = "fixture-profile-create-0001",
) {
  return {
    operation: "user_profile.create",
    idempotencyKey: key,
    target: { kind: "user_profile", id: "self", workspaceId: null },
    payload,
  };
}

const authUser = async () => ({
  uid: UID,
  email: "fixture@example.invalid",
  displayName: "Auth Fixture",
  emailVerified: true,
  disabled: false,
});

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof OperationError && error.code === code);
}

test("trusted profile ingress creates only backend-controlled profile fields", async () => {
  const runner = new MemoryTransactionRunner();
  const result = await trustedCreateUserProfile(fixtureActor(UID), input(), { runner, getAuthUser: authUser });
  assert.equal(result.result.created, true);
  const profile = runner.store.get(`users/${UID}`);
  assert.equal(profile?.uid, UID);
  assert.equal(profile?.displayName, "Fixture User");
  assert.equal(profile?.status, "pending");
  for (const authorityField of ["role", "currentRole", "workspaceRole", "globalRole", "workspaceId", "workspace_id"]) {
    assert.equal(profile?.[authorityField], undefined);
  }
});

for (const [label, payload] of [
  ["role", { displayName: "Fixture", role: "system_owner" }],
  ["status", { displayName: "Fixture", status: "active" }],
  ["workspace", { displayName: "Fixture", currentWorkspaceId: "forged-workspace" }],
  ["schema", { displayName: "Fixture", schemaVersion: 9 }],
  ["source", { displayName: "Fixture", source: "client" }],
] as const) {
  test(`profile ${label} injection is rejected`, async () => {
    await expectCode(trustedCreateUserProfile(fixtureActor(UID), input(payload), {
      runner: new MemoryTransactionRunner(),
      getAuthUser: authUser,
    }), "INVALID_ARGUMENT");
  });
}

test("profile target cannot inject another uid", async () => {
  await expectCode(trustedCreateUserProfile(fixtureActor(UID), {
    ...input(),
    target: { kind: "user_profile", id: "another-user", workspaceId: null },
  }, { runner: new MemoryTransactionRunner(), getAuthUser: authUser }), "INVALID_ARGUMENT");
});

test("disabled or mismatched Auth identity fails closed", async () => {
  await expectCode(trustedCreateUserProfile(fixtureActor(UID), input(), {
    runner: new MemoryTransactionRunner(),
    getAuthUser: async () => ({ ...(await authUser()), disabled: true }),
  }), "FAILED_PRECONDITION");
  await expectCode(trustedCreateUserProfile(fixtureActor(UID), input(), {
    runner: new MemoryTransactionRunner(),
    getAuthUser: async () => ({ ...(await authUser()), uid: "another-user" }),
  }), "FAILED_PRECONDITION");
});

test("duplicate profile retry is safe and never overwrites authority fields", async () => {
  const runner = new MemoryTransactionRunner({
    [`users/${UID}`]: { uid: UID, role: "normal", status: "pending" },
  });
  const result = await trustedCreateUserProfile(fixtureActor(UID), input({}, "fixture-profile-retry-0002"), {
    runner,
    getAuthUser: authUser,
  });
  assert.equal(result.result.created, false);
  assert.equal(runner.store.get(`users/${UID}`)?.role, "normal");
  assert.equal(runner.writes.filter((path) => path === `users/${UID}`).length, 0);
});

test("unauthenticated profile ingress is denied", async () => {
  const actor = {
    ...fixtureActor(UID),
    auth: { ...fixtureActor(UID).auth, tokenVerified: false },
  } as unknown as VerifiedActor;
  await expectCode(trustedCreateUserProfile(actor, input(), {
    runner: new MemoryTransactionRunner(),
    getAuthUser: authUser,
  }), "UNAUTHENTICATED");
});

