import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalJson,
  requiredString,
  strictPayload,
  validateOperation,
  type CanonicalObject,
  type OperationSpecification,
} from "../src/operations/operationContract.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { fixtureActor } from "./support/authzFixtures.js";

interface FixturePayload extends CanonicalObject {
  reason: string;
}

const fixtureSpecification: OperationSpecification<FixturePayload> = Object.freeze({
  operation: "fixture.update",
  targetKind: "member",
  payloadKeys: new Set(["reason"]),
  parsePayload(value: Readonly<Record<string, unknown>>, requestId: string) {
    const payload = strictPayload(value, this.payloadKeys, requestId);
    return { reason: requiredString(payload.reason, requestId, { maxLength: 80 }) };
  },
});

function input(payload: Record<string, unknown> = { reason: "approved" }) {
  return {
    operation: "fixture.update",
    idempotencyKey: "fixture-key-0001",
    target: { kind: "member", id: "fixture-target", workspaceId: "fixture-workspace" },
    payload,
  };
}

test("valid operation uses server actor and request id", () => {
  const actor = fixtureActor();
  const result = validateOperation(actor, input(), fixtureSpecification);
  assert.equal(result.actor, actor);
  assert.equal(result.requestId, actor.request.requestId);
  assert.equal(result.payload.reason, "approved");
  assert.match(result.scopeHash, /^[a-f0-9]{64}$/);
});

test("operation rejects unknown top-level fields", () => {
  assert.throws(
    () => validateOperation(fixtureActor(), { ...input(), role: "system_owner" }, fixtureSpecification),
    (error: unknown) => error instanceof OperationError && error.code === "INVALID_ARGUMENT",
  );
});

test("operation rejects unknown payload fields", () => {
  assert.throws(
    () => validateOperation(fixtureActor(), input({ reason: "ok", role: "system_owner" }), fixtureSpecification),
    (error: unknown) => error instanceof OperationError && error.code === "INVALID_ARGUMENT",
  );
});

test("operation rejects unsafe nested keys", () => {
  const payload = JSON.parse('{"reason":"ok","__proto__":{"admin":true}}') as Record<string, unknown>;
  assert.throws(() => validateOperation(fixtureActor(), input(payload), fixtureSpecification));
});

for (const key of ["", "short", "contains space 000", "a".repeat(129)]) {
  test(`operation rejects invalid idempotency key ${JSON.stringify(key)}`, () => {
    assert.throws(() => validateOperation(
      fixtureActor(),
      { ...input(), idempotencyKey: key },
      fixtureSpecification,
    ));
  });
}

test("canonical JSON and hashes are deterministic across key order", () => {
  assert.equal(canonicalJson({ b: 2, a: { y: true, x: "v" } }), canonicalJson({ a: { x: "v", y: true }, b: 2 }));
  const first = validateOperation(fixtureActor(), input({ reason: "approved" }), fixtureSpecification);
  const second = validateOperation(fixtureActor(), input({ reason: "approved" }), fixtureSpecification);
  assert.equal(first.payloadHash, second.payloadHash);
  assert.equal(first.scopeHash, second.scopeHash);
});

test("idempotency scope is actor plus key while operation identity includes target", () => {
  const first = validateOperation(fixtureActor(), input(), fixtureSpecification);
  const second = validateOperation(fixtureActor(), {
    ...input(),
    target: { kind: "member", id: "fixture-other", workspaceId: "fixture-workspace" },
  }, fixtureSpecification);
  assert.equal(first.scopeHash, second.scopeHash);
  assert.notEqual(first.operationIdHash, second.operationIdHash);
});
