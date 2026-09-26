import assert from "node:assert/strict";
import test from "node:test";
import type { TrustedAuthAdmin, TrustedAuthUser } from "../src/accounts/trustedAuthAdmin.js";
import { TrustedAuthAdminError } from "../src/accounts/trustedAuthAdmin.js";
import {
  trustedDisableUserAccount,
  trustedEnableUserAccount,
} from "../src/accounts/accountLifecycleOperations.js";
import { OperationError } from "../src/operations/operationErrors.js";
import type { TrustedTransaction, TrustedTransactionRunner } from "../src/repositories/trustedTransaction.js";
import { fixtureActor, ownerV1 } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

const ACTOR = "fixture-account-owner";
const TARGET = "fixture-account-target";
const OTHER_OWNER = "fixture-account-other-owner";
const NOW = new Date("2026-08-13T00:00:00.000Z");

class FakeAuthAdmin implements TrustedAuthAdmin {
  readonly users = new Map<string, boolean>();
  readonly calls: string[] = [];
  failSetCount = 0;
  failRevokeCount = 0;

  constructor(fixtures: Record<string, boolean> = { [TARGET]: false }) {
    for (const [uid, disabled] of Object.entries(fixtures)) this.users.set(uid, disabled);
  }

  private user(uid: string): TrustedAuthUser {
    if (!this.users.has(uid)) throw new TrustedAuthAdminError("USER_NOT_FOUND");
    return Object.freeze({ uid, disabled: this.users.get(uid) === true });
  }

  async getUser(uid: string) {
    this.calls.push(`get:${uid}`);
    return this.user(uid);
  }

  async setDisabled(uid: string, disabled: boolean) {
    this.calls.push(`set:${uid}:${disabled}`);
    if (this.failSetCount > 0) {
      this.failSetCount -= 1;
      throw new TrustedAuthAdminError("AUTH_MUTATION_FAILED");
    }
    this.user(uid);
    this.users.set(uid, disabled);
    return this.user(uid);
  }

  async revokeRefreshTokens(uid: string) {
    this.calls.push(`revoke:${uid}`);
    this.user(uid);
    if (this.failRevokeCount > 0) {
      this.failRevokeCount -= 1;
      throw new TrustedAuthAdminError("AUTH_MUTATION_FAILED");
    }
  }

  async deleteUser(uid: string) {
    this.calls.push(`delete:${uid}`);
    this.user(uid);
    this.users.delete(uid);
  }
}

class FailRunOnce implements TrustedTransactionRunner {
  runCount = 0;
  constructor(readonly inner: MemoryTransactionRunner, readonly failAt: number) {}
  run<T>(callback: (transaction: TrustedTransaction) => Promise<T>): Promise<T> {
    this.runCount += 1;
    if (this.runCount === this.failAt) throw new Error("fixture-transaction-failure");
    return this.inner.run(callback);
  }
}

function fixtures(extra: Record<string, Readonly<Record<string, unknown>>> = {}) {
  return {
    [`systemOwners/${ACTOR}`]: ownerV1({ uid: ACTOR }),
    [`users/${TARGET}`]: { uid: TARGET, status: "active", disabled: false, active: true },
    ...extra,
  };
}

function runner(extra: Record<string, Readonly<Record<string, unknown>>> = {}) {
  return new MemoryTransactionRunner(fixtures(extra), NOW);
}

function input(operation: "user_account.disable" | "user_account.enable", key = `fixture-${operation}-0001`) {
  return {
    operation,
    idempotencyKey: key,
    target: { kind: "user_account", id: TARGET, workspaceId: null },
    payload: { reasonCode: "security_admin_action" },
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof OperationError && error.code === code);
}

test("system owner disables Auth account then finalizes profile audit and idempotency", async () => {
  const store = runner();
  const auth = new FakeAuthAdmin();
  const result = await trustedDisableUserAccount(fixtureActor(ACTOR), input("user_account.disable"), {
    runner: store,
    authAdmin: auth,
  });
  assert.equal(result.result.accountDisabled, true);
  assert.equal(result.result.sessionInvalidated, true);
  assert.equal(result.result.signOutRequired, true);
  assert.equal(auth.users.get(TARGET), true);
  assert.equal(store.store.get(`users/${TARGET}`)?.status, "disabled");
  assert.equal(auth.calls.filter((call) => call.startsWith("revoke:")).length, 1);
  assert.equal([...store.store.values()].some((row) => row.eventType === "USER_ACCOUNT_DISABLED"), true);
});

test("non-owner users.role spoof and inactive owner cannot mutate Auth", async () => {
  const cases: Array<Record<string, Readonly<Record<string, unknown>>>> = [
    { [`users/${ACTOR}`]: { uid: ACTOR, role: "system_owner" } },
    { [`systemOwners/${ACTOR}`]: ownerV1({ uid: ACTOR, status: "disabled" }) },
  ];
  for (const extra of cases) {
    const store = new MemoryTransactionRunner({
      [`users/${TARGET}`]: { uid: TARGET, status: "active" },
      ...extra,
    }, NOW);
    const auth = new FakeAuthAdmin();
    await expectCode(trustedDisableUserAccount(fixtureActor(ACTOR), input("user_account.disable"), {
      runner: store,
      authAdmin: auth,
    }), "FORBIDDEN");
    assert.equal(auth.calls.some((call) => call.startsWith("set:")), false);
  }
});

test("self disable is denied before Firestore or Auth mutation", async () => {
  const store = runner({ [`users/${ACTOR}`]: { uid: ACTOR, status: "active" } });
  const auth = new FakeAuthAdmin({ [ACTOR]: false });
  await expectCode(trustedDisableUserAccount(fixtureActor(ACTOR), {
    ...input("user_account.disable", "fixture-self-disable-0001"),
    target: { kind: "user_account", id: ACTOR, workspaceId: null },
  }, { runner: store, authAdmin: auth }), "FORBIDDEN");
  assert.equal(auth.calls.some((call) => call.startsWith("set:")), false);
});

test("active system owner target requires another active owner and is reserved before Auth mutation", async () => {
  const denied = runner({ [`systemOwners/${TARGET}`]: ownerV1({ uid: TARGET }) });
  denied.store.delete(`systemOwners/${ACTOR}`);
  denied.store.set(`systemOwners/${ACTOR}`, ownerV1({ uid: ACTOR, status: "disabled" }));
  await expectCode(trustedDisableUserAccount(fixtureActor(ACTOR), input("user_account.disable"), {
    runner: denied,
    authAdmin: new FakeAuthAdmin(),
  }), "FORBIDDEN");

  const allowed = runner({
    [`systemOwners/${TARGET}`]: ownerV1({ uid: TARGET }),
    [`systemOwners/${OTHER_OWNER}`]: ownerV1({ uid: OTHER_OWNER }),
  });
  const auth = new FakeAuthAdmin();
  await trustedDisableUserAccount(fixtureActor(ACTOR), input("user_account.disable", "fixture-owner-disable-0001"), {
    runner: allowed,
    authAdmin: auth,
  });
  assert.equal(allowed.store.get(`systemOwners/${TARGET}`)?.status, "disabled");
});

test("Auth set failure leaves a retryable fail-safe intent and retry completes", async () => {
  const store = runner();
  const auth = new FakeAuthAdmin();
  auth.failSetCount = 1;
  const request = input("user_account.disable", "fixture-disable-auth-retry-0001");
  await expectCode(trustedDisableUserAccount(fixtureActor(ACTOR), request, { runner: store, authAdmin: auth }), "INTERNAL");
  assert.equal([...store.store.values()].some((row) => row.state === "prepared"), true);
  assert.equal(store.store.get(`users/${TARGET}`)?.status, "active");
  const retried = await trustedDisableUserAccount(fixtureActor(ACTOR), request, { runner: store, authAdmin: auth });
  assert.equal(retried.result.accountDisabled, true);
});

test("token revoke failure after Auth disable retries without false finalize", async () => {
  const store = runner();
  const auth = new FakeAuthAdmin();
  auth.failRevokeCount = 1;
  const request = input("user_account.disable", "fixture-disable-revoke-retry-0001");
  await expectCode(trustedDisableUserAccount(fixtureActor(ACTOR), request, { runner: store, authAdmin: auth }), "INTERNAL");
  assert.equal(auth.users.get(TARGET), true);
  assert.equal(store.store.get(`users/${TARGET}`)?.status, "active");
  await trustedDisableUserAccount(fixtureActor(ACTOR), request, { runner: store, authAdmin: auth });
  assert.equal(store.store.get(`users/${TARGET}`)?.status, "disabled");
});

test("Firestore finalize failure retries after already-applied Auth disable", async () => {
  const inner = runner();
  const store = new FailRunOnce(inner, 2);
  const auth = new FakeAuthAdmin();
  const request = input("user_account.disable", "fixture-disable-finalize-retry-0001");
  await expectCode(trustedDisableUserAccount(fixtureActor(ACTOR), request, { runner: store, authAdmin: auth }), "INTERNAL");
  assert.equal(auth.users.get(TARGET), true);
  assert.equal(inner.store.get(`users/${TARGET}`)?.status, "active");
  await trustedDisableUserAccount(fixtureActor(ACTOR), request, { runner: store, authAdmin: auth });
  assert.equal(inner.store.get(`users/${TARGET}`)?.status, "disabled");
});

test("enable restores only Auth and profile lifecycle, never membership or system owner status", async () => {
  const store = runner({
    [`systemOwners/${TARGET}`]: ownerV1({ uid: TARGET, status: "disabled" }),
    [`workspaces/fixture-workspace/members/${TARGET}`]: {
      uid: TARGET, workspaceId: "fixture-workspace", role: "teacher", status: "disabled",
    },
  });
  store.store.set(`users/${TARGET}`, { uid: TARGET, status: "disabled", disabled: true, active: false });
  const auth = new FakeAuthAdmin({ [TARGET]: true });
  const result = await trustedEnableUserAccount(fixtureActor(ACTOR), input("user_account.enable"), {
    runner: store,
    authAdmin: auth,
  });
  assert.equal(result.result.accountDisabled, false);
  assert.equal(auth.users.get(TARGET), false);
  assert.equal(store.store.get(`systemOwners/${TARGET}`)?.status, "disabled");
  assert.equal(store.store.get(`workspaces/fixture-workspace/members/${TARGET}`)?.status, "disabled");
});

test("missing Auth target fails before Firestore intent and same key payload mismatch conflicts", async () => {
  const missingStore = runner();
  await expectCode(trustedDisableUserAccount(fixtureActor(ACTOR), input("user_account.disable"), {
    runner: missingStore,
    authAdmin: new FakeAuthAdmin({}),
  }), "NOT_FOUND");
  assert.equal([...missingStore.store.keys()].some((path) => path.startsWith("accountLifecycleOperations/")), false);

  const store = runner();
  const auth = new FakeAuthAdmin();
  const request = input("user_account.disable", "fixture-account-idempotency-0001");
  assert.equal((await trustedDisableUserAccount(fixtureActor(ACTOR), request, { runner: store, authAdmin: auth })).replayed, false);
  assert.equal((await trustedDisableUserAccount(fixtureActor(ACTOR), request, { runner: store, authAdmin: auth })).replayed, true);
  await expectCode(trustedEnableUserAccount(fixtureActor(ACTOR), {
    ...input("user_account.enable", "fixture-account-idempotency-0001"),
  }, { runner: store, authAdmin: auth }), "IDEMPOTENCY_CONFLICT");
});

test("account lifecycle never writes membership or deletes Auth user", async () => {
  const store = runner();
  const auth = new FakeAuthAdmin();
  await trustedDisableUserAccount(fixtureActor(ACTOR), input("user_account.disable", "fixture-account-no-membership-0001"), {
    runner: store,
    authAdmin: auth,
  });
  assert.equal(store.writes.some((path) => path.includes("/members/") || path.startsWith("workspace_members/")), false);
  assert.equal(auth.calls.some((call) => call.startsWith("delete:")), false);
});
