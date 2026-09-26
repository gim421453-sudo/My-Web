import type { CanonicalObject, ValidatedOperation } from "./operationContract.js";
import { IdempotencyRepository } from "./idempotencyRepository.js";
import {
  SecurityAuditRepository,
  type SecurityAuditMutation,
} from "./securityAuditRepository.js";
import { safeSummary, type SafeSummary } from "./safeSummary.js";
import {
  createCanonicalAuthorityRepositories,
  type CanonicalAuthorityRepositories,
} from "../repositories/canonicalAuthorityRepositories.js";
import type { TrustedTransactionRunner } from "../repositories/trustedTransaction.js";

export interface AuthorityOperationHandlerResult {
  readonly result: SafeSummary;
  readonly audit: SecurityAuditMutation;
}

export interface AuthorityOperationContext {
  readonly repositories: CanonicalAuthorityRepositories;
}

export interface AuthorityOperationExecutionOptions<TPayload extends CanonicalObject> {
  readonly authorize?: (
    context: AuthorityOperationContext,
    operation: ValidatedOperation<TPayload>,
  ) => Promise<void>;
}

export type AuthorityOperationHandler<TPayload extends CanonicalObject> = (
  context: AuthorityOperationContext,
  operation: ValidatedOperation<TPayload>,
) => Promise<AuthorityOperationHandlerResult>;

export interface AuthorityOperationExecutionResult {
  readonly replayed: boolean;
  readonly result: SafeSummary;
}

export function executeIdempotentAuthorityOperation<TPayload extends CanonicalObject>(
  runner: TrustedTransactionRunner,
  operation: ValidatedOperation<TPayload>,
  handler: AuthorityOperationHandler<TPayload>,
  options: AuthorityOperationExecutionOptions<TPayload> = {},
): Promise<AuthorityOperationExecutionResult> {
  return runner.run(async (transaction) => {
    const repositories = createCanonicalAuthorityRepositories(transaction);
    const context = Object.freeze({ repositories });
    await options.authorize?.(context, operation);

    const idempotency = new IdempotencyRepository(transaction);
    const decision = await idempotency.inspect(operation);
    if (decision.state === "REPLAY_COMPLETED") {
      return Object.freeze({ replayed: true, result: decision.result });
    }

    const handled = await handler(context, operation);
    const result = safeSummary(handled.result, operation.requestId);
    const audit = new SecurityAuditRepository(transaction);
    audit.createSuccess(operation, handled.audit);
    idempotency.createCompleted(operation, result);

    return Object.freeze({ replayed: false, result });
  });
}
