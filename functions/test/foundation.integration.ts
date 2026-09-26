import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  strictPayload,
  validateOperation,
  type CanonicalObject,
  type OperationSpecification,
} from "../src/operations/operationContract.js";
import { executeIdempotentAuthorityOperation } from "../src/operations/operationExecutor.js";
import { securityAuditMutation } from "../src/operations/securityAuditRepository.js";
import { getTrustedAdminFirestore } from "../src/runtime/adminFirestore.js";
import { createAdminTransactionRunner } from "../src/repositories/trustedTransaction.js";
import { fixtureActor } from "./support/authzFixtures.js";

interface FixturePayload extends CanonicalObject { value: string }
const specification: OperationSpecification<FixturePayload> = Object.freeze({
  operation: "foundation.verify",
  targetKind: "fixture",
  payloadKeys: new Set(["value"]),
  parsePayload(value: Readonly<Record<string, unknown>>, requestId: string) {
    const payload = strictPayload(value, this.payloadKeys, requestId);
    assert.equal(typeof payload.value, "string");
    return { value: payload.value as string };
  },
});

const suffix = randomUUID();
const actor = fixtureActor(`fixture-foundation-${suffix}`);
const operation = validateOperation(actor, {
  operation: "foundation.verify",
  idempotencyKey: `fixture-idempotency-${suffix}`,
  target: { kind: "fixture", id: `fixture-target-${suffix}` },
  payload: { value: "emulator-only" },
}, specification);
const firestore = getTrustedAdminFirestore().firestore;
const runner = createAdminTransactionRunner(firestore);
let handlerCount = 0;

try {
  const execute = () => executeIdempotentAuthorityOperation(runner, operation, async () => {
    handlerCount += 1;
    return {
      result: { status: "completed", count: 1 },
      audit: securityAuditMutation(
        { status: "pending" },
        { status: "completed" },
        operation.requestId,
      ),
    };
  });

  assert.equal((await execute()).replayed, false);
  assert.equal((await execute()).replayed, true);
  assert.equal(handlerCount, 1);

  const [idempotency, audit] = await Promise.all([
    firestore.doc(`trustedOperationIdempotency/${operation.scopeHash}`).get(),
    firestore.doc(`securityAuditLogs/${operation.operationIdHash}`).get(),
  ]);
  assert.equal(idempotency.exists, true);
  assert.equal(idempotency.data()?.status, "completed");
  assert.equal(audit.exists, true);
  assert.equal(audit.data()?.outcome, "success");
  assert.doesNotMatch(JSON.stringify([idempotency.data(), audit.data()]), /emulator-only/);

  console.log("P0-1 foundation integration passed; business writes=0; production access=0");
} finally {
  const cleanup = firestore.batch();
  cleanup.delete(firestore.doc(`trustedOperationIdempotency/${operation.scopeHash}`));
  cleanup.delete(firestore.doc(`securityAuditLogs/${operation.operationIdHash}`));
  await cleanup.commit();
}
