import assert from "node:assert/strict";
import test from "node:test";
import {
  strictPayload,
  validateOperation,
  type CanonicalObject,
  type OperationSpecification,
} from "../src/operations/operationContract.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { executeIdempotentAuthorityOperation } from "../src/operations/operationExecutor.js";
import { securityAuditMutation } from "../src/operations/securityAuditRepository.js";
import { fixtureActor } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

interface FixturePayload extends CanonicalObject { value: string }
const specification: OperationSpecification<FixturePayload> = Object.freeze({
  operation: "fixture.mutate",
  targetKind: "user",
  payloadKeys: new Set(["value"]),
  parsePayload(value: Readonly<Record<string, unknown>>, requestId: string) {
    const payload = strictPayload(value, this.payloadKeys, requestId);
    if (typeof payload.value !== "string" || !payload.value.trim()) {
      throw new OperationError("INVALID_ARGUMENT", requestId);
    }
    return { value: payload.value.trim() };
  },
});

function operation(value = "one") {
  return validateOperation(fixtureActor(), {
    operation: "fixture.mutate",
    idempotencyKey: "fixture-idem-key-0001",
    target: { kind: "user", id: "fixture-user" },
    payload: { value },
  }, specification);
}

test("same idempotency scope and payload reuses completed result", async () => {
  const runner = new MemoryTransactionRunner();
  let handlerCount = 0;
  const handler = async () => {
    handlerCount += 1;
    return {
      result: { status: "completed", count: 1 },
      audit: securityAuditMutation({ status: "pending" }, { status: "completed" }, "fixture-request"),
    };
  };
  assert.equal((await executeIdempotentAuthorityOperation(runner, operation(), handler)).replayed, false);
  assert.equal((await executeIdempotentAuthorityOperation(runner, operation(), handler)).replayed, true);
  assert.equal(handlerCount, 1);
  assert.equal([...runner.store.keys()].filter((path) => path.startsWith("securityAuditLogs/")).length, 1);
  assert.equal([...runner.store.keys()].filter((path) => path.startsWith("trustedOperationIdempotency/")).length, 1);
});

test("same idempotency scope with different payload conflicts", async () => {
  const runner = new MemoryTransactionRunner();
  await executeIdempotentAuthorityOperation(runner, operation("one"), async () => ({
    result: { status: "completed" },
    audit: securityAuditMutation({}, { status: "completed" }, "fixture-request"),
  }));
  await assert.rejects(
    executeIdempotentAuthorityOperation(runner, operation("two"), async () => ({
      result: { status: "completed" },
      audit: securityAuditMutation({}, {}, "fixture-request"),
    })),
    (error: unknown) => error instanceof OperationError && error.code === "IDEMPOTENCY_CONFLICT",
  );
});

test("sensitive result and audit fields are not persisted", async () => {
  const runner = new MemoryTransactionRunner();
  const secret = "raw-secret-must-not-persist";
  await executeIdempotentAuthorityOperation(runner, operation(secret), async () => ({
    result: { status: "completed", token: secret } as never,
    audit: securityAuditMutation(
      { status: "pending", inviteCode: secret },
      { status: "completed", email: secret },
      "fixture-request",
    ),
  }));
  assert.doesNotMatch(JSON.stringify([...runner.store.values()]), /raw-secret-must-not-persist|inviteCode|token|email/);
});

test("failed handler rolls back authority, audit, and idempotency writes", async () => {
  const runner = new MemoryTransactionRunner({ "users/fixture-user": { status: "pending" } });
  await assert.rejects(executeIdempotentAuthorityOperation(runner, operation(), async ({ repositories }) => {
    repositories.users.update("fixture-user", { status: "active" }, "fixture-request");
    throw new Error("fixture-operation-failed");
  }));
  assert.deepEqual(runner.store.get("users/fixture-user"), { status: "pending" });
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("securityAuditLogs/")), false);
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("trustedOperationIdempotency/")), false);
});
