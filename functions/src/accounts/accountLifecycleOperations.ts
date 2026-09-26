import type { VerifiedActor } from "../auth/verifiedActor.js";
import { AuthorizationError } from "../authz/authzErrors.js";
import { requireGlobalSystemOwner } from "../authz/policies.js";
import { isPlainRecord } from "../authz/resolverUtils.js";
import { IdempotencyRepository } from "../operations/idempotencyRepository.js";
import {
  requiredString,
  strictPayload,
  validateOperation,
  type CanonicalObject,
  type OperationSpecification,
  type ValidatedOperation,
} from "../operations/operationContract.js";
import { OperationError } from "../operations/operationErrors.js";
import { safeSummary, type SafeSummary } from "../operations/safeSummary.js";
import { SecurityAuditRepository, securityAuditMutation } from "../operations/securityAuditRepository.js";
import { createCanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";
import {
  getEmulatorTransactionRunner,
  type TrustedTransaction,
  type TrustedTransactionRunner,
} from "../repositories/trustedTransaction.js";
import {
  getEmulatorTrustedAuthAdmin,
  TrustedAuthAdminError,
  type TrustedAuthAdmin,
  type TrustedAuthUser,
} from "./trustedAuthAdmin.js";

interface AccountPayload extends CanonicalObject { reasonCode: string }

export interface AccountLifecycleDependencies {
  readonly runner?: TrustedTransactionRunner;
  readonly authAdmin?: TrustedAuthAdmin;
}

const PAYLOAD_KEYS = new Set(["reasonCode"]);
const INTENT_KEYS = new Set([
  "schemaVersion", "operation", "scopeHash", "targetHash", "payloadHash", "targetUid",
  "desiredDisabled", "reasonCode", "state", "createdAt", "createdBy", "updatedAt", "updatedBy",
  "completedAt",
]);
const OWNER_KEYS = new Set([
  "schemaVersion", "status", "source", "uid", "createdAt", "createdBy", "updatedAt", "updatedBy",
]);

function specification(operation: string): OperationSpecification<AccountPayload> {
  return Object.freeze({
    operation,
    targetKind: "user_account",
    payloadKeys: PAYLOAD_KEYS,
    parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
      strictPayload(payload, PAYLOAD_KEYS, requestId);
      return Object.freeze({
        reasonCode: requiredString(payload.reasonCode, requestId, {
          maxLength: 40,
          pattern: /^[a-z][a-z0-9_-]*$/,
        }),
      });
    },
  });
}

const DISABLE_SPECIFICATION = specification("user_account.disable");
const ENABLE_SPECIFICATION = specification("user_account.enable");

function normalizedFailure(error: unknown, requestId: string): never {
  if (error instanceof OperationError) throw error;
  if (error instanceof TrustedAuthAdminError) {
    throw new OperationError(error.code === "USER_NOT_FOUND" ? "NOT_FOUND" : "INTERNAL", requestId);
  }
  throw new OperationError("INTERNAL", requestId);
}

async function requireOwner(
  transaction: TrustedTransaction,
  operation: ValidatedOperation<AccountPayload>,
): Promise<void> {
  try {
    const repositories = createCanonicalAuthorityRepositories(transaction);
    const context = await repositories.systemOwners.buildAuthorizationContext(
      operation.actor,
      operation.operation,
    );
    requireGlobalSystemOwner(context);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw new OperationError(
        error.code === "AUTHZ_INTERNAL_ERROR" ? "INTERNAL" : "FORBIDDEN",
        operation.requestId,
      );
    }
    throw error;
  }
}

function requireUnscopedTarget(operation: ValidatedOperation<AccountPayload>): void {
  if (operation.target.workspaceId !== null || operation.target.id === operation.actor.uid) {
    throw new OperationError(
      operation.target.id === operation.actor.uid ? "FORBIDDEN" : "INVALID_ARGUMENT",
      operation.requestId,
    );
  }
}

function requireUserProfile(
  snapshot: { exists: boolean; data?: Record<string, unknown> },
  uid: string,
  requestId: string,
): void {
  if (!snapshot.exists || !isPlainRecord(snapshot.data) || snapshot.data.uid !== uid) {
    throw new OperationError(snapshot.exists ? "FAILED_PRECONDITION" : "NOT_FOUND", requestId);
  }
}

function validActiveOwnerSnapshot(snapshot: { exists: boolean; data?: Record<string, unknown> }): boolean {
  if (!snapshot.exists || !isPlainRecord(snapshot.data)) return false;
  const data = snapshot.data;
  return Object.keys(data).every((key) => OWNER_KEYS.has(key))
    && data.schemaVersion === 1
    && data.status === "active"
    && ["trusted_migration", "system_bootstrap"].includes(String(data.source || ""));
}

function requireIntent(
  snapshot: { exists: boolean; data?: Record<string, unknown> },
  operation: ValidatedOperation<AccountPayload>,
  desiredDisabled: boolean,
): "missing" | "prepared" | "completed" {
  if (!snapshot.exists) return "missing";
  if (!isPlainRecord(snapshot.data)
    || Object.keys(snapshot.data).some((key) => !INTENT_KEYS.has(key))
    || snapshot.data.schemaVersion !== 1
    || snapshot.data.operation !== operation.operation
    || snapshot.data.scopeHash !== operation.scopeHash
    || snapshot.data.targetHash !== operation.targetHash
    || snapshot.data.payloadHash !== operation.payloadHash
    || snapshot.data.targetUid !== operation.target.id
    || snapshot.data.desiredDisabled !== desiredDisabled
    || !["prepared", "completed"].includes(String(snapshot.data.state || ""))) {
    throw new OperationError("IDEMPOTENCY_CONFLICT", operation.requestId);
  }
  return snapshot.data.state as "prepared" | "completed";
}

async function prepareLifecycle(
  runner: TrustedTransactionRunner,
  operation: ValidatedOperation<AccountPayload>,
  authUser: TrustedAuthUser,
  desiredDisabled: boolean,
): Promise<Readonly<{ replayed: boolean; result?: SafeSummary }>> {
  return runner.run(async (transaction) => {
    await requireOwner(transaction, operation);
    const repositories = createCanonicalAuthorityRepositories(transaction);
    const decision = await new IdempotencyRepository(transaction).inspect(operation);
    if (decision.state === "REPLAY_COMPLETED") {
      return Object.freeze({ replayed: true, result: decision.result });
    }

    const intentPath = ["accountLifecycleOperations", operation.scopeHash] as const;
    const intentState = requireIntent(await transaction.get(intentPath), operation, desiredDisabled);
    if (intentState === "completed") throw new OperationError("FAILED_PRECONDITION", operation.requestId);
    if (intentState === "prepared") return Object.freeze({ replayed: false });

    requireUserProfile(
      await repositories.users.get(operation.target.id, operation.requestId),
      operation.target.id,
      operation.requestId,
    );
    if (authUser.uid !== operation.target.id || authUser.disabled === desiredDisabled) {
      throw new OperationError(authUser.uid === operation.target.id ? "CONFLICT" : "FAILED_PRECONDITION", operation.requestId);
    }

    const targetOwner = await repositories.systemOwners.resolve({ uid: operation.target.id });
    if (["MIGRATION_REQUIRED", "MALFORMED"].includes(targetOwner.state)) {
      throw new OperationError("FAILED_PRECONDITION", operation.requestId);
    }
    if (targetOwner.state === "READ_ERROR") throw new OperationError("INTERNAL", operation.requestId);
    if (desiredDisabled && targetOwner.state === "ACTIVE") {
      const activeOwners = await repositories.systemOwners.listByStatus("active");
      if (!activeOwners.every(validActiveOwnerSnapshot) || activeOwners.length <= 1) {
        throw new OperationError("FAILED_PRECONDITION", operation.requestId);
      }
      repositories.systemOwners.update(operation.target.id, Object.freeze({
        status: "disabled",
        updatedAt: repositories.now,
        updatedBy: operation.actor.uid,
      }), operation.requestId);
    }

    transaction.create(intentPath, Object.freeze({
      schemaVersion: 1,
      operation: operation.operation,
      scopeHash: operation.scopeHash,
      targetHash: operation.targetHash,
      payloadHash: operation.payloadHash,
      targetUid: operation.target.id,
      desiredDisabled,
      reasonCode: operation.payload.reasonCode,
      state: "prepared",
      createdAt: transaction.now,
      createdBy: operation.actor.uid,
      updatedAt: transaction.now,
      updatedBy: operation.actor.uid,
    }));
    transaction.set(["accountLifecycleStates", operation.target.id], Object.freeze({
      schemaVersion: 1,
      uid: operation.target.id,
      status: desiredDisabled ? "disable_pending" : "enable_pending",
      disabled: desiredDisabled,
      operationIdHash: operation.operationIdHash,
      updatedAt: transaction.now,
      updatedBy: operation.actor.uid,
    }));
    return Object.freeze({ replayed: false });
  });
}

async function finalizeLifecycle(
  runner: TrustedTransactionRunner,
  operation: ValidatedOperation<AccountPayload>,
  desiredDisabled: boolean,
): Promise<Readonly<{ replayed: boolean; result: SafeSummary }>> {
  return runner.run(async (transaction) => {
    await requireOwner(transaction, operation);
    const repositories = createCanonicalAuthorityRepositories(transaction);
    requireUserProfile(
      await repositories.users.get(operation.target.id, operation.requestId),
      operation.target.id,
      operation.requestId,
    );
    const intentPath = ["accountLifecycleOperations", operation.scopeHash] as const;
    if (requireIntent(await transaction.get(intentPath), operation, desiredDisabled) !== "prepared") {
      throw new OperationError("FAILED_PRECONDITION", operation.requestId);
    }
    const now = repositories.now;
    repositories.users.update(operation.target.id, Object.freeze({
      status: desiredDisabled ? "disabled" : "active",
      disabled: desiredDisabled,
      active: !desiredDisabled,
      updatedAt: now,
      updatedBy: operation.actor.uid,
      ...(desiredDisabled
        ? { disabledAt: now, disabledBy: operation.actor.uid }
        : { enabledAt: now, enabledBy: operation.actor.uid }),
    }), operation.requestId);
    transaction.set(["accountLifecycleStates", operation.target.id], Object.freeze({
      schemaVersion: 1,
      uid: operation.target.id,
      status: desiredDisabled ? "disabled" : "active",
      disabled: desiredDisabled,
      operationIdHash: operation.operationIdHash,
      updatedAt: now,
      updatedBy: operation.actor.uid,
    }));

    const result = safeSummary(Object.freeze({
      status: "completed",
      accountDisabled: desiredDisabled,
      accountLifecycleStatus: desiredDisabled ? "disabled" : "active",
      sessionInvalidated: desiredDisabled,
      signOutRequired: desiredDisabled,
      userProfileUpdated: true,
    }), operation.requestId);
    new SecurityAuditRepository(transaction).createSuccess(operation, securityAuditMutation(
      { accountDisabled: !desiredDisabled },
      { accountDisabled: desiredDisabled, sessionInvalidated: desiredDisabled },
      operation.requestId,
      {
        eventType: desiredDisabled ? "USER_ACCOUNT_DISABLED" : "USER_ACCOUNT_ENABLED",
        targetUid: operation.target.id,
      },
    ));
    new IdempotencyRepository(transaction).createCompleted(operation, result);
    transaction.update(intentPath, Object.freeze({
      state: "completed",
      completedAt: now,
      updatedAt: now,
      updatedBy: operation.actor.uid,
    }));
    return Object.freeze({ replayed: false, result });
  });
}

async function executeAccountLifecycle(
  actor: VerifiedActor,
  input: unknown,
  desiredDisabled: boolean,
  operationSpecification: OperationSpecification<AccountPayload>,
  dependencies: AccountLifecycleDependencies,
): Promise<Readonly<{ replayed: boolean; result: SafeSummary }>> {
  let requestId = actor.request.requestId;
  try {
    if (actor.auth.tokenVerified !== true || actor.auth.disabled !== false) {
      throw new OperationError("UNAUTHENTICATED", requestId);
    }
    const operation = validateOperation(actor, input, operationSpecification);
    requestId = operation.requestId;
    requireUnscopedTarget(operation);
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    const authAdmin = dependencies.authAdmin ?? getEmulatorTrustedAuthAdmin();
    const authUser = await authAdmin.getUser(operation.target.id);
    const prepared = await prepareLifecycle(runner, operation, authUser, desiredDisabled);
    if (prepared.replayed && prepared.result) {
      return Object.freeze({ replayed: true, result: prepared.result });
    }
    await authAdmin.setDisabled(operation.target.id, desiredDisabled);
    if (desiredDisabled) await authAdmin.revokeRefreshTokens(operation.target.id);
    const confirmed = await authAdmin.getUser(operation.target.id);
    if (confirmed.disabled !== desiredDisabled) throw new OperationError("FAILED_PRECONDITION", requestId);
    return await finalizeLifecycle(runner, operation, desiredDisabled);
  } catch (error) {
    return normalizedFailure(error, requestId);
  }
}

export function trustedDisableUserAccount(
  actor: VerifiedActor,
  input: unknown,
  dependencies: AccountLifecycleDependencies = {},
) {
  return executeAccountLifecycle(actor, input, true, DISABLE_SPECIFICATION, dependencies);
}

export function trustedEnableUserAccount(
  actor: VerifiedActor,
  input: unknown,
  dependencies: AccountLifecycleDependencies = {},
) {
  return executeAccountLifecycle(actor, input, false, ENABLE_SPECIFICATION, dependencies);
}
