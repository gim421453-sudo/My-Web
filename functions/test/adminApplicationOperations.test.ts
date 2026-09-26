import assert from "node:assert/strict";
import test from "node:test";
import {
  trustedApproveAdminApplication,
  trustedRejectAdminApplication,
} from "../src/adminApplications/adminApplicationOperations.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { adminApplicationUniquenessKey } from "../src/adminApplications/adminApplicationContract.js";
import { fixtureActor, membershipV1, ownerV1 } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

const ACTOR = "fixture-owner";
const TARGET = "fixture-target";
const WORKSPACE = "fixture-workspace";
const APPLICATION = "fixture-application";

function actor() {
  return fixtureActor(ACTOR);
}

function application(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    applicationType: "WORKSPACE_ACCESS",
    source: "trusted_migration",
    applicantUid: TARGET,
    workspaceId: WORKSPACE,
    requestedRole: "manager",
    status: "pending",
    createdAt: "fixture-created",
    updatedAt: "fixture-updated",
    ...overrides,
  };
}

function fixtures(
  overrides: Record<string, Record<string, unknown>> = {},
): Record<string, Record<string, unknown>> {
  return {
    [`systemOwners/${ACTOR}`]: ownerV1({ uid: ACTOR }),
    [`users/${TARGET}`]: { uid: TARGET, status: "waiting_approval", disabled: false },
    [`workspaces/${WORKSPACE}`]: { workspaceId: WORKSPACE, status: "active" },
    [`adminApplications/${APPLICATION}`]: application(),
    ...overrides,
  };
}

function input(
  operation: "admin_application.approve" | "admin_application.reject",
  applicationId = APPLICATION,
  idempotencyKey = "fixture-admin-idempotency-0001",
  payload: Record<string, unknown> = {},
) {
  return {
    operation,
    idempotencyKey,
    target: { kind: "admin_application", id: applicationId },
    payload,
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(
    promise,
    (error: unknown) => error instanceof OperationError && error.code === code,
  );
}

test("active canonical system owner approves a pending application", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  const result = await trustedApproveAdminApplication(actor(), input("admin_application.approve"), { runner });
  assert.equal(result.replayed, false);
  assert.equal(result.result.applicationStatus, "approved");
  assert.equal(runner.store.get(`users/${TARGET}`)?.status, "active");
  assert.equal(runner.store.get(`users/${TARGET}`)?.currentWorkspaceId, WORKSPACE);
  assert.equal(runner.store.get(`users/${TARGET}`)?.role, undefined);
  const membership = runner.store.get(`workspaces/${WORKSPACE}/members/${TARGET}`);
  assert.equal(membership?.role, "manager");
  assert.equal(membership?.source, "admin_approval");
  assert.equal(runner.store.get(`adminApplications/${APPLICATION}`)?.status, "approved");
  assert.equal(runner.writes.some((path) => path === `workspaces/${WORKSPACE}`), false);
  assert.equal(runner.writes.some((path) => path.startsWith("workspace_members/")), false);
  assert.equal(runner.writes.some((path) => path.startsWith("workspaceMembers/")), false);
});

test("missing owner is forbidden", async () => {
  const data = fixtures();
  delete data[`systemOwners/${ACTOR}`];
  await expectCode(trustedApproveAdminApplication(actor(), input("admin_application.approve"), {
    runner: new MemoryTransactionRunner(data),
  }), "FORBIDDEN");
});

test("inactive owner is forbidden", async () => {
  await expectCode(trustedApproveAdminApplication(actor(), input("admin_application.approve"), {
    runner: new MemoryTransactionRunner(fixtures({
      [`systemOwners/${ACTOR}`]: ownerV1({ uid: ACTOR, status: "inactive" }),
    })),
  }), "FORBIDDEN");
});

test("users.role-only owner is forbidden", async () => {
  const data = fixtures({ [`users/${ACTOR}`]: { uid: ACTOR, role: "system_owner", status: "active" } });
  delete data[`systemOwners/${ACTOR}`];
  await expectCode(trustedApproveAdminApplication(actor(), input("admin_application.approve"), {
    runner: new MemoryTransactionRunner(data),
  }), "FORBIDDEN");
});

test("workspace membership alone cannot authorize approval", async () => {
  const data = fixtures({
    [`workspaces/${WORKSPACE}/members/${ACTOR}`]: membershipV1("super_manager", {
      uid: ACTOR,
      workspaceId: WORKSPACE,
    }),
  });
  delete data[`systemOwners/${ACTOR}`];
  await expectCode(trustedApproveAdminApplication(actor(), input("admin_application.approve"), {
    runner: new MemoryTransactionRunner(data),
  }), "FORBIDDEN");
});

test("pending application can be rejected without user or membership writes", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  const result = await trustedRejectAdminApplication(actor(), input("admin_application.reject"), { runner });
  assert.equal(result.result.applicationStatus, "rejected");
  assert.equal(runner.store.get(`adminApplications/${APPLICATION}`)?.status, "rejected");
  assert.deepEqual(runner.store.get(`users/${TARGET}`), fixtures()[`users/${TARGET}`]);
  assert.equal(runner.writes.some((path) => path.startsWith("users/")), false);
  assert.equal(runner.writes.some((path) => path.includes("/members/")), false);
  assert.equal(runner.writes.some((path) => path.startsWith("workspaces/")), false);
});

test("reject releases a trusted-ingress pending uniqueness guard", async () => {
  const guardKey = adminApplicationUniquenessKey(TARGET, WORKSPACE);
  const runner = new MemoryTransactionRunner(fixtures({
    [`adminApplications/${APPLICATION}`]: application({ source: "trusted_ingress" }),
    [`adminApplicationPendingKeys/${guardKey}`]: {
      schemaVersion: 1,
      applicationType: "WORKSPACE_ACCESS",
      applicantUid: TARGET,
      workspaceId: WORKSPACE,
      status: "pending",
      pendingApplicationId: APPLICATION,
      createdAt: "fixture-created",
      updatedAt: "fixture-updated",
    },
  }));
  await trustedRejectAdminApplication(actor(), input("admin_application.reject"), { runner });
  assert.equal(runner.store.get(`adminApplicationPendingKeys/${guardKey}`)?.status, "released");
  assert.equal(runner.store.get(`adminApplicationPendingKeys/${guardKey}`)?.lastDecision, "rejected");
});

for (const [status, operation] of [
  ["approved", "admin_application.approve"],
  ["rejected", "admin_application.approve"],
  ["approved", "admin_application.reject"],
  ["rejected", "admin_application.reject"],
] as const) {
  test(`${status} application conflicts with ${operation}`, async () => {
    const runner = new MemoryTransactionRunner(fixtures({
      [`adminApplications/${APPLICATION}`]: application({ status }),
    }));
    const call = operation.endsWith("approve") ? trustedApproveAdminApplication : trustedRejectAdminApplication;
    await expectCode(call(actor(), input(operation), { runner }), "CONFLICT");
  });
}

for (const malformed of [
  { status: "unknown" },
  { schemaVersion: 2 },
  { applicationType: "workspace_bootstrap" },
  { source: "client" },
  { workspaceId: "" },
  { requestedRole: "system_owner" },
  { requestedRole: "unknown" },
  { role: "manager" },
]) {
  test(`malformed application fails closed: ${JSON.stringify(malformed)}`, async () => {
    await expectCode(trustedApproveAdminApplication(actor(), input("admin_application.approve"), {
      runner: new MemoryTransactionRunner(fixtures({
        [`adminApplications/${APPLICATION}`]: application(malformed),
      })),
    }), "FAILED_PRECONDITION");
  });
}

test("current legacy bootstrap application schema is unsupported", async () => {
  await expectCode(trustedApproveAdminApplication(actor(), input("admin_application.approve"), {
    runner: new MemoryTransactionRunner(fixtures({
      [`adminApplications/${APPLICATION}`]: {
        uid: TARGET,
        requestedWorkspaceName: "Fixture School",
        status: "pending",
        createdAt: "fixture-created",
        updatedAt: "fixture-updated",
      },
    })),
  }), "FAILED_PRECONDITION");
});

test("canonical workspace bootstrap cannot use access approval", async () => {
  await expectCode(trustedApproveAdminApplication(actor(), input("admin_application.approve"), {
    runner: new MemoryTransactionRunner(fixtures({
      [`adminApplications/${APPLICATION}`]: application({
        applicationType: "WORKSPACE_BOOTSTRAP",
        workspaceId: null,
        requestedWorkspaceName: "Fixture School",
      }),
    })),
  }), "FAILED_PRECONDITION");
});

test("strict canonical workspace bootstrap can be rejected without authority mutation", async () => {
  const runner = new MemoryTransactionRunner(fixtures({
    [`adminApplications/${APPLICATION}`]: application({
      applicationType: "WORKSPACE_BOOTSTRAP",
      workspaceId: null,
      requestedWorkspaceName: "Fixture School",
    }),
  }));
  const result = await trustedRejectAdminApplication(actor(), input("admin_application.reject"), { runner });
  assert.equal(result.result.applicationStatus, "rejected");
  assert.equal(runner.writes.some((path) => path.startsWith("users/")), false);
  assert.equal(runner.writes.some((path) => path.includes("/members/")), false);
});

test("missing workspace fails closed", async () => {
  const data = fixtures();
  delete data[`workspaces/${WORKSPACE}`];
  await expectCode(trustedApproveAdminApplication(actor(), input("admin_application.approve"), {
    runner: new MemoryTransactionRunner(data),
  }), "FAILED_PRECONDITION");
});

test("missing target user fails closed", async () => {
  const data = fixtures();
  delete data[`users/${TARGET}`];
  await expectCode(trustedApproveAdminApplication(actor(), input("admin_application.approve"), {
    runner: new MemoryTransactionRunner(data),
  }), "FAILED_PRECONDITION");
});

for (const [label, payload] of [
  ["target uid", { targetUid: "forged-user" }],
  ["workspace", { workspaceId: "forged-workspace" }],
  ["role", { role: "super_manager" }],
] as const) {
  test(`client cannot inject ${label}`, async () => {
    await expectCode(trustedApproveAdminApplication(
      actor(),
      input("admin_application.approve", APPLICATION, "fixture-admin-idempotency-0001", payload),
      { runner: new MemoryTransactionRunner(fixtures()) },
    ), "INVALID_ARGUMENT");
  });
}

test("target workspace hint is rejected instead of overriding application provenance", async () => {
  const forged = input("admin_application.approve") as Record<string, unknown>;
  forged.target = { kind: "admin_application", id: APPLICATION, workspaceId: "forged-workspace" };
  await expectCode(trustedApproveAdminApplication(actor(), forged, {
    runner: new MemoryTransactionRunner(fixtures()),
  }), "INVALID_ARGUMENT");
});

for (const state of [
  membershipV1("manager", { uid: TARGET, workspaceId: WORKSPACE }),
  membershipV1("manager", {
    uid: TARGET, workspaceId: WORKSPACE, status: "inactive", active: false, disabled: false,
  }),
  membershipV1("teacher", { uid: TARGET, workspaceId: WORKSPACE }),
]) {
  test(`existing canonical membership conflicts: ${String(state.status)}:${String(state.role)}`, async () => {
    await expectCode(trustedApproveAdminApplication(actor(), input("admin_application.approve"), {
      runner: new MemoryTransactionRunner(fixtures({
        [`workspaces/${WORKSPACE}/members/${TARGET}`]: state,
      })),
    }), "CONFLICT");
  });
}

test("legacy root memberships are ignored and never overwritten", async () => {
  const legacySnake = membershipV1("super_manager", { uid: TARGET, workspaceId: WORKSPACE });
  const legacyCamel = membershipV1("teacher", { uid: TARGET, workspaceId: WORKSPACE });
  const runner = new MemoryTransactionRunner(fixtures({
    [`workspace_members/${WORKSPACE}_${TARGET}`]: legacySnake,
    [`workspaceMembers/${WORKSPACE}_${TARGET}`]: legacyCamel,
  }));
  await trustedApproveAdminApplication(actor(), input("admin_application.approve"), { runner });
  assert.deepEqual(runner.store.get(`workspace_members/${WORKSPACE}_${TARGET}`), legacySnake);
  assert.deepEqual(runner.store.get(`workspaceMembers/${WORKSPACE}_${TARGET}`), legacyCamel);
  assert.equal(runner.reads.some((path) => path.startsWith("workspace_members/")), false);
  assert.equal(runner.reads.some((path) => path.startsWith("workspaceMembers/")), false);
});

test("same idempotency key replays approve result", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  assert.equal((await trustedApproveAdminApplication(actor(), input("admin_application.approve"), { runner })).replayed, false);
  assert.equal((await trustedApproveAdminApplication(actor(), input("admin_application.approve"), { runner })).replayed, true);
  assert.equal(runner.writes.filter((path) => path === `workspaces/${WORKSPACE}/members/${TARGET}`).length, 1);
});

test("idempotency replay still requires an active canonical owner", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  await trustedApproveAdminApplication(actor(), input("admin_application.approve"), { runner });
  runner.store.set(`systemOwners/${ACTOR}`, ownerV1({ uid: ACTOR, status: "inactive" }));
  await expectCode(
    trustedApproveAdminApplication(actor(), input("admin_application.approve"), { runner }),
    "FORBIDDEN",
  );
});

test("same idempotency key cannot switch target or operation", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  await trustedRejectAdminApplication(actor(), input("admin_application.reject"), { runner });
  await expectCode(trustedApproveAdminApplication(actor(), input("admin_application.approve"), { runner }), "IDEMPOTENCY_CONFLICT");
  await expectCode(trustedRejectAdminApplication(actor(), input(
    "admin_application.reject",
    "other-application",
  ), { runner }), "IDEMPOTENCY_CONFLICT");
});

test("transaction failure rolls back user, membership, application, audit and idempotency", async () => {
  const firstRunner = new MemoryTransactionRunner(fixtures());
  const firstInput = input("admin_application.approve");
  const completed = await trustedApproveAdminApplication(actor(), firstInput, { runner: firstRunner });
  const auditPath = [...firstRunner.store.keys()].find((path) => path.startsWith("securityAuditLogs/"));
  assert.ok(auditPath);

  const blocked = fixtures({ [auditPath]: { existing: true } });
  const runner = new MemoryTransactionRunner(blocked);
  await expectCode(trustedApproveAdminApplication(actor(), firstInput, { runner }), "INTERNAL");
  assert.equal(runner.store.get(`users/${TARGET}`)?.status, "waiting_approval");
  assert.equal(runner.store.has(`workspaces/${WORKSPACE}/members/${TARGET}`), false);
  assert.equal(runner.store.get(`adminApplications/${APPLICATION}`)?.status, "pending");
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("trustedOperationIdempotency/")), false);
  assert.equal(completed.result.applicationStatus, "approved");
});

test("approve audit contains canonical references and no profile PII", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  await trustedApproveAdminApplication(actor(), input("admin_application.approve"), { runner });
  const audit = [...runner.store.entries()].find(([path]) => path.startsWith("securityAuditLogs/"))?.[1];
  assert.equal(audit?.eventType, "ADMIN_APPLICATION_APPROVED");
  assert.equal(audit?.targetUid, TARGET);
  assert.equal(audit?.workspaceId, WORKSPACE);
  assert.doesNotMatch(JSON.stringify(audit), /email|phone|reason|memo|raw request|token/i);
});

test("default transaction runner fails closed outside the Emulator", async () => {
  await expectCode(
    trustedApproveAdminApplication(actor(), input("admin_application.approve")),
    "INTERNAL",
  );
});
