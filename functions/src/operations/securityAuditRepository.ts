import type { CanonicalObject, ValidatedOperation } from "./operationContract.js";
import { isValidDocumentId } from "../authz/resolverUtils.js";
import { OperationError } from "./operationErrors.js";
import { safeSummary, type SafeSummary } from "./safeSummary.js";
import type { TrustedTransaction } from "../repositories/trustedTransaction.js";

const COLLECTION = "securityAuditLogs";

export interface SecurityAuditMutation {
  readonly before: SafeSummary;
  readonly after: SafeSummary;
  readonly eventType: string | null;
  readonly targetUid: string | null;
  readonly workspaceId: string | null;
}

export interface SecurityAuditContext {
  readonly eventType?: string;
  readonly targetUid?: string;
  readonly workspaceId?: string;
}

function optionalDocumentId(value: string | undefined, requestId: string): string | null {
  if (value === undefined) return null;
  if (!isValidDocumentId(value)) throw new OperationError("INTERNAL", requestId);
  return value;
}

export function securityAuditMutation(
  before: unknown,
  after: unknown,
  requestId: string,
  context: SecurityAuditContext = {},
): SecurityAuditMutation {
  const eventType = context.eventType ?? null;
  if (eventType !== null && !/^[A-Z][A-Z0-9_]{2,80}$/.test(eventType)) {
    throw new OperationError("INTERNAL", requestId);
  }
  return Object.freeze({
    before: safeSummary(before, requestId),
    after: safeSummary(after, requestId),
    eventType,
    targetUid: optionalDocumentId(context.targetUid, requestId),
    workspaceId: optionalDocumentId(context.workspaceId, requestId),
  });
}

export class SecurityAuditRepository {
  constructor(private readonly transaction: TrustedTransaction) {}

  createSuccess<TPayload extends CanonicalObject>(
    operation: ValidatedOperation<TPayload>,
    mutation: SecurityAuditMutation,
  ): void {
    this.transaction.create([COLLECTION, operation.operationIdHash], Object.freeze({
      schemaVersion: 1,
      eventType: mutation.eventType ?? operation.operation,
      requestId: operation.requestId,
      operationIdHash: operation.operationIdHash,
      actorUid: operation.actor.uid,
      targetSummary: Object.freeze({
        kind: operation.target.kind,
        targetHash: operation.targetHash,
      }),
      ...(mutation.targetUid ? { targetUid: mutation.targetUid } : {}),
      ...(mutation.workspaceId ? { workspaceId: mutation.workspaceId } : {}),
      outcome: "success",
      authorityBeforeSummary: mutation.before,
      authorityAfterSummary: mutation.after,
      occurredAt: this.transaction.now,
    }));
  }
}
