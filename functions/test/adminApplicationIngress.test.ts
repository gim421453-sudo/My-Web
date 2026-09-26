import assert from "node:assert/strict";
import test from "node:test";
import { trustedCreateAdminApplication } from "../src/adminApplications/adminApplicationIngress.js";
import type { VerifiedActor } from "../src/auth/verifiedActor.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { fixtureActor, membershipV1 } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

const ACTOR = "fixture-applicant";
const WORKSPACE = "fixture-workspace";

function actor() {
  return fixtureActor(ACTOR);
}

function fixtures(overrides: Record<string, Record<string, unknown>> = {}) {
  return {
    [`workspaces/${WORKSPACE}`]: { workspaceId: WORKSPACE, status: "active" },
    ...overrides,
  };
}

function input(
  idempotencyKey = "fixture-create-application-0001",
  payload: Record<string, unknown> = { requestedRole: "teacher", reason: "Access request" },
  workspaceId = WORKSPACE,
) {
  return {
    operation: "admin_application.create",
    idempotencyKey,
    target: { kind: "workspace", id: workspaceId },
    payload,
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(
    promise,
    (error: unknown) => error instanceof OperationError && error.code === code,
  );
}

function applicationEntries(runner: MemoryTransactionRunner) {
  return [...runner.store.entries()].filter(([path]) => path.startsWith("adminApplications/"));
}

test("authenticated actor creates canonical workspace access application", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  const result = await trustedCreateAdminApplication(actor(), input(), { runner });
  assert.equal(result.result.applicationStatus, "pending");
  const applications = applicationEntries(runner);
  assert.equal(applications.length, 1);
  const application = applications[0];
  assert.ok(application);
  assert.equal(application[1].applicantUid, ACTOR);
  assert.equal(application[1].applicationType, "WORKSPACE_ACCESS");
  assert.equal(application[1].source, "trusted_ingress");
  assert.equal(application[1].uid, undefined);
  assert.equal(runner.store.size >= 4, true);
});

test("unverified actor is unauthenticated", async () => {
  const unverified = {
    ...actor(),
    auth: { ...actor().auth, tokenVerified: false },
  } as unknown as VerifiedActor;
  await expectCode(trustedCreateAdminApplication(unverified, input(), {
    runner: new MemoryTransactionRunner(fixtures()),
  }), "UNAUTHENTICATED");
});

for (const [label, payload] of [
  ["actor uid", { requestedRole: "teacher", applicantUid: "forged-user" }],
  ["status", { requestedRole: "teacher", status: "approved" }],
  ["schema", { requestedRole: "teacher", schemaVersion: 1 }],
  ["source", { requestedRole: "teacher", source: "trusted_migration" }],
  ["application type", { requestedRole: "teacher", applicationType: "WORKSPACE_BOOTSTRAP" }],
] as const) {
  test(`client cannot inject ${label}`, async () => {
    await expectCode(trustedCreateAdminApplication(actor(), input(undefined, payload), {
      runner: new MemoryTransactionRunner(fixtures()),
    }), "INVALID_ARGUMENT");
  });
}

test("missing workspace fails closed", async () => {
  await expectCode(trustedCreateAdminApplication(actor(), input(), {
    runner: new MemoryTransactionRunner(),
  }), "FAILED_PRECONDITION");
});

test("malformed workspace id is rejected", async () => {
  await expectCode(trustedCreateAdminApplication(actor(), input(undefined, { requestedRole: "teacher" }, "bad/path"), {
    runner: new MemoryTransactionRunner(),
  }), "INVALID_ARGUMENT");
});

for (const role of ["system_owner", "unknown", "Teacher", "manager", "super_manager", ""] as const) {
  test(`self-service requested role is rejected: ${role || "empty"}`, async () => {
    await expectCode(trustedCreateAdminApplication(actor(), input(undefined, { requestedRole: role }), {
      runner: new MemoryTransactionRunner(fixtures()),
    }), "INVALID_ARGUMENT");
  });
}

test("existing canonical membership blocks a new access application", async () => {
  await expectCode(trustedCreateAdminApplication(actor(), input(), {
    runner: new MemoryTransactionRunner(fixtures({
      [`workspaces/${WORKSPACE}/members/${ACTOR}`]: membershipV1("teacher", {
        uid: ACTOR,
        workspaceId: WORKSPACE,
      }),
    })),
  }), "CONFLICT");
});

test("legacy membership does not satisfy or block canonical lookup", async () => {
  const runner = new MemoryTransactionRunner(fixtures({
    [`workspace_members/${WORKSPACE}_${ACTOR}`]: { role: "manager" },
    [`workspaceMembers/${WORKSPACE}_${ACTOR}`]: { role: "super_manager" },
  }));
  await trustedCreateAdminApplication(actor(), input(), { runner });
  assert.equal(runner.reads.some((path) => path.startsWith("workspace_members/")), false);
  assert.equal(runner.reads.some((path) => path.startsWith("workspaceMembers/")), false);
});

test("duplicate pending application is blocked across idempotency keys", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  await trustedCreateAdminApplication(actor(), input("fixture-create-application-0001"), { runner });
  await expectCode(
    trustedCreateAdminApplication(actor(), input("fixture-create-application-0002"), { runner }),
    "CONFLICT",
  );
  assert.equal(applicationEntries(runner).length, 1);
});

test("same idempotency request replays one application", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  assert.equal((await trustedCreateAdminApplication(actor(), input(), { runner })).replayed, false);
  assert.equal((await trustedCreateAdminApplication(actor(), input(), { runner })).replayed, true);
  assert.equal(applicationEntries(runner).length, 1);
});

test("same idempotency key with different payload conflicts", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  await trustedCreateAdminApplication(actor(), input(), { runner });
  await expectCode(trustedCreateAdminApplication(actor(), input(
    "fixture-create-application-0001",
    { requestedRole: "normal" },
  ), { runner }), "IDEMPOTENCY_CONFLICT");
});

test("transaction failure leaves application guard audit and idempotency absent", async () => {
  const probe = new MemoryTransactionRunner(fixtures());
  await trustedCreateAdminApplication(actor(), input(), { runner: probe });
  const auditPath = [...probe.store.keys()].find((path) => path.startsWith("securityAuditLogs/"));
  assert.ok(auditPath);
  const runner = new MemoryTransactionRunner(fixtures({ [auditPath]: { collision: true } }));
  await expectCode(trustedCreateAdminApplication(actor(), input(), { runner }), "INTERNAL");
  assert.equal(applicationEntries(runner).length, 0);
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("adminApplicationPendingKeys/")), false);
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("trustedOperationIdempotency/")), false);
});

test("create audit excludes free-form reason and profile PII", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  await trustedCreateAdminApplication(actor(), input(), { runner });
  const audit = [...runner.store.entries()].find(([path]) => path.startsWith("securityAuditLogs/"))?.[1];
  assert.equal(audit?.eventType, "ADMIN_APPLICATION_CREATED");
  assert.doesNotMatch(JSON.stringify(audit), /Access request|email|phone|token/i);
});

test("default runner fails closed outside the Emulator", async () => {
  await expectCode(trustedCreateAdminApplication(actor(), input()), "INTERNAL");
});
