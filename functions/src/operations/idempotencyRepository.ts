import type { ValidatedOperation } from "./operationContract.js";
import type { CanonicalObject } from "./operationContract.js";
import { OperationError } from "./operationErrors.js";
import { safeSummary, type SafeSummary } from "./safeSummary.js";
import type { TrustedTransaction } from "../repositories/trustedTransaction.js";

const COLLECTION = "trustedOperationIdempotency";
const ALLOWED_KEYS = new Set([
  "schemaVersion",
  "status",
  "operation",
  "scopeHash",
  "targetHash",
  "payloadHash",
  "result",
  "createdAt",
  "completedAt",
]);

export type IdempotencyDecision =
  | Readonly<{ state: "NEW" }>
  | Readonly<{ state: "REPLAY_COMPLETED"; result: SafeSummary }>;

function completedRecord(
  data: Record<string, unknown>,
  operation: ValidatedOperation<CanonicalObject>,
): SafeSummary {
  if (Object.keys(data).some((key) => !ALLOWED_KEYS.has(key))
    || data.schemaVersion !== 1
    || data.status !== "completed"
    || data.scopeHash !== operation.scopeHash) {
    throw new OperationError("FAILED_PRECONDITION", operation.requestId);
  }
  if (data.operation !== operation.operation
    || data.targetHash !== operation.targetHash
    || data.payloadHash !== operation.payloadHash) {
    throw new OperationError("IDEMPOTENCY_CONFLICT", operation.requestId);
  }
  return safeSummary(data.result, operation.requestId);
}

export class IdempotencyRepository {
  constructor(private readonly transaction: TrustedTransaction) {}

  async inspect<TPayload extends CanonicalObject>(
    operation: ValidatedOperation<TPayload>,
  ): Promise<IdempotencyDecision> {
    const snapshot = await this.transaction.get([COLLECTION, operation.scopeHash]);
    if (!snapshot.exists) return Object.freeze({ state: "NEW" });
    if (!snapshot.data) {
      throw new OperationError("FAILED_PRECONDITION", operation.requestId);
    }
    return Object.freeze({
      state: "REPLAY_COMPLETED",
      result: completedRecord(snapshot.data, operation as ValidatedOperation<CanonicalObject>),
    });
  }

  createCompleted<TPayload extends CanonicalObject>(
    operation: ValidatedOperation<TPayload>,
    result: SafeSummary,
  ): void {
    this.transaction.create([COLLECTION, operation.scopeHash], Object.freeze({
      schemaVersion: 1,
      status: "completed",
      operation: operation.operation,
      scopeHash: operation.scopeHash,
      targetHash: operation.targetHash,
      payloadHash: operation.payloadHash,
      result,
      createdAt: this.transaction.now,
      completedAt: this.transaction.now,
    }));
  }
}
