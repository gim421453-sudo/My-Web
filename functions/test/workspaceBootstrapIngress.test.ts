import assert from "node:assert/strict";
import test from "node:test";
import { trustedCreateWorkspaceBootstrapApplication } from "../src/adminApplications/adminApplicationIngress.js";
import { trustedRejectAdminApplication } from "../src/adminApplications/adminApplicationOperations.js";
import type { VerifiedActor } from "../src/auth/verifiedActor.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { fixtureActor } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";
import { ownerV1 } from "./support/authzFixtures.js";

const APPLICANT = "fixture-bootstrap-applicant";

function input(
  payload: Record<string, unknown> = { requestedWorkspaceName: "Fixture School", reason: "Initial workspace" },
  key = "fixture-bootstrap-ingress-0001",
) {
  return {
    operation: "workspace.bootstrap.application.create",
    idempotencyKey: key,
    target: { kind: "workspace_bootstrap", id: "self", workspaceId: null },
    payload,
  };
}

function runner() {
  return new MemoryTransactionRunner({
    [`users/${APPLICANT}`]: { uid: APPLICANT, status: "pending", disabled: false },
  });
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof OperationError && error.code === code);
}

test("bootstrap ingress creates a distinct canonical pending application", async () => {
  const store = runner();
  const result = await trustedCreateWorkspaceBootstrapApplication(fixtureActor(APPLICANT), input(), { runner: store });
  assert.equal(result.result.applicationStatus, "pending");
  assert.equal(result.result.role, "super_manager");
  const application = [...store.store.entries()].find(([path]) => path.startsWith("adminApplications/"))?.[1];
  assert.equal(application?.applicationType, "WORKSPACE_BOOTSTRAP");
  assert.equal(application?.applicantUid, APPLICANT);
  assert.equal(application?.workspaceId, null);
  assert.equal(application?.requestedRole, "super_manager");
  assert.equal(application?.requestedWorkspaceName, "Fixture School");
});

for (const [label, payload] of [
  ["applicant", { requestedWorkspaceName: "Fixture", applicantUid: "forged-user" }],
  ["role", { requestedWorkspaceName: "Fixture", initialRole: "system_owner" }],
  ["status", { requestedWorkspaceName: "Fixture", status: "approved" }],
  ["schema", { requestedWorkspaceName: "Fixture", schemaVersion: 2 }],
  ["source", { requestedWorkspaceName: "Fixture", source: "client" }],
  ["workspace id", { requestedWorkspaceName: "Fixture", workspaceId: "forged-workspace" }],
] as const) {
  test(`bootstrap ${label} injection is rejected`, async () => {
    await expectCode(trustedCreateWorkspaceBootstrapApplication(fixtureActor(APPLICANT), input(payload), {
      runner: runner(),
    }), "INVALID_ARGUMENT");
  });
}

test("bootstrap requires authenticated actor and an existing pending profile", async () => {
  const unauthenticated = {
    ...fixtureActor(APPLICANT),
    auth: { ...fixtureActor(APPLICANT).auth, tokenVerified: false },
  } as unknown as VerifiedActor;
  await expectCode(trustedCreateWorkspaceBootstrapApplication(unauthenticated, input(), { runner: runner() }), "UNAUTHENTICATED");
  await expectCode(trustedCreateWorkspaceBootstrapApplication(fixtureActor(APPLICANT), input(), {
    runner: new MemoryTransactionRunner(),
  }), "FAILED_PRECONDITION");
});

test("duplicate pending bootstrap is blocked and same idempotency request replays", async () => {
  const store = runner();
  assert.equal((await trustedCreateWorkspaceBootstrapApplication(fixtureActor(APPLICANT), input(), { runner: store })).replayed, false);
  assert.equal((await trustedCreateWorkspaceBootstrapApplication(fixtureActor(APPLICANT), input(), { runner: store })).replayed, true);
  await expectCode(trustedCreateWorkspaceBootstrapApplication(
    fixtureActor(APPLICANT),
    input({ requestedWorkspaceName: "Second School" }, "fixture-bootstrap-ingress-0002"),
    { runner: store },
  ), "CONFLICT");
  assert.equal([...store.store.keys()].filter((path) => path.startsWith("adminApplications/")).length, 1);
});

test("trusted bootstrap rejection releases ingress guard without profile mutation", async () => {
  const store = runner();
  await trustedCreateWorkspaceBootstrapApplication(fixtureActor(APPLICANT), input(), { runner: store });
  const applicationPath = [...store.store.keys()].find((path) => path.startsWith("adminApplications/"));
  assert.ok(applicationPath);
  const applicationId = applicationPath.split("/")[1] || "";
  const ownerUid = "fixture-bootstrap-owner";
  store.store.set(`systemOwners/${ownerUid}`, ownerV1({ uid: ownerUid }));
  store.writes.length = 0;
  await trustedRejectAdminApplication(fixtureActor(ownerUid), {
    operation: "admin_application.reject",
    idempotencyKey: "fixture-bootstrap-reject-0001",
    target: { kind: "admin_application", id: applicationId, workspaceId: null },
    payload: {},
  }, { runner: store });
  assert.equal(store.store.get(applicationPath)?.status, "rejected");
  assert.equal(store.store.get(`users/${APPLICANT}`)?.status, "pending");
  assert.equal(store.writes.some((path) => path === `users/${APPLICANT}` || path.includes("/members/")), false);
});
