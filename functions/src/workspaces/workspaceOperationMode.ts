import type { VerifiedActor } from "../auth/verifiedActor.js";
import { AuthorizationError } from "../authz/authzErrors.js";
import { requireGlobalSystemOwner } from "../authz/policies.js";
import { isPlainRecord } from "../authz/resolverUtils.js";
import {
  requiredString,
  strictPayload,
  validateOperation,
  type CanonicalObject,
  type OperationSpecification,
  type ValidatedOperation,
} from "../operations/operationContract.js";
import { OperationError } from "../operations/operationErrors.js";
import {
  executeIdempotentAuthorityOperation,
  type AuthorityOperationExecutionResult,
} from "../operations/operationExecutor.js";
import { securityAuditMutation } from "../operations/securityAuditRepository.js";
import type { CanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";
import {
  getEmulatorTransactionRunner,
  type TrustedTransactionRunner,
} from "../repositories/trustedTransaction.js";

export const WORKSPACE_OPERATION_MODES = Object.freeze([
  "integrated_unconfigured",
  "personal",
  "school",
  "academy",
] as const);

export type WorkspaceOperationMode = typeof WORKSPACE_OPERATION_MODES[number];

interface OperationModePayload extends CanonicalObject {
  expectedMode: WorkspaceOperationMode;
  newMode: WorkspaceOperationMode;
  reason: string;
}

export interface WorkspaceOperationModeDependencies {
  readonly runner?: TrustedTransactionRunner;
}

const PAYLOAD_KEYS = new Set(["expectedMode", "newMode", "reason"]);

function isOperationMode(value: unknown): value is WorkspaceOperationMode {
  return typeof value === "string"
    && (WORKSPACE_OPERATION_MODES as readonly string[]).includes(value);
}

const SPECIFICATION: OperationSpecification<OperationModePayload> = Object.freeze({
  operation: "workspace.operation_mode.set",
  targetKind: "workspace",
  payloadKeys: PAYLOAD_KEYS,
  parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
    strictPayload(payload, PAYLOAD_KEYS, requestId);
    if (!isOperationMode(payload.expectedMode) || !isOperationMode(payload.newMode)) {
      throw new OperationError("INVALID_ARGUMENT", requestId);
    }
    return Object.freeze({
      expectedMode: payload.expectedMode,
      newMode: payload.newMode,
      reason: requiredString(payload.reason, requestId, { maxLength: 500 }),
    });
  },
});

function requireUnscopedTarget(operation: ValidatedOperation<OperationModePayload>): void {
  if (operation.target.workspaceId !== null) {
    throw new OperationError("INVALID_ARGUMENT", operation.requestId);
  }
}

async function authorizeOwner(
  repositories: CanonicalAuthorityRepositories,
  operation: ValidatedOperation<OperationModePayload>,
): Promise<void> {
  try {
    requireGlobalSystemOwner(await repositories.systemOwners.buildAuthorizationContext(
      operation.actor,
      operation.operation,
    ));
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

function currentWorkspaceMode(
  snapshot: { exists: boolean; data?: Record<string, unknown> },
  workspaceId: string,
  requestId: string,
): Readonly<{ mode: WorkspaceOperationMode; version: number }> {
  if (!snapshot.exists || !isPlainRecord(snapshot.data)) {
    throw new OperationError("NOT_FOUND", requestId);
  }
  const data = snapshot.data;
  if (data.workspaceId !== undefined && data.workspaceId !== workspaceId) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  const status = data.status === undefined ? "active" : String(data.status);
  if (data.disabled === true || data.archived === true || status === "disabled" || status === "archived") {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  const rawMode = data.operationMode ?? (isPlainRecord(data.settings) ? data.settings.operationMode : undefined);
  if (rawMode !== undefined && !isOperationMode(rawMode)) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  const version = data.operationModeVersion === undefined ? 0 : Number(data.operationModeVersion);
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  return Object.freeze({
    mode: rawMode === undefined ? "integrated_unconfigured" : rawMode,
    version,
  });
}

function normalizeFailure(error: unknown, requestId: string): never {
  if (error instanceof OperationError) throw error;
  throw new OperationError("INTERNAL", requestId);
}

export async function trustedSetWorkspaceOperationMode(
  actor: VerifiedActor,
  input: unknown,
  dependencies: WorkspaceOperationModeDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    if (actor.auth.tokenVerified !== true || actor.auth.disabled !== false) {
      throw new OperationError("UNAUTHENTICATED", requestId);
    }
    const operation = validateOperation(actor, input, SPECIFICATION);
    requestId = operation.requestId;
    requireUnscopedTarget(operation);
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const before = currentWorkspaceMode(
        await repositories.workspaces.get(operation.target.id, requestId),
        operation.target.id,
        requestId,
      );
      if (before.mode !== operation.payload.expectedMode) {
        throw new OperationError("FAILED_PRECONDITION", requestId);
      }
      if (before.mode === operation.payload.newMode) {
        throw new OperationError("CONFLICT", requestId);
      }

      const nextVersion = before.version + 1;
      repositories.workspaces.update(operation.target.id, Object.freeze({
        operationMode: operation.payload.newMode,
        operationModeVersion: nextVersion,
        operationModeReason: operation.payload.reason,
        operationModeUpdatedAt: repositories.now,
        operationModeUpdatedBy: actor.uid,
        updatedAt: repositories.now,
      }), requestId);

      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          workspaceId: operation.target.id,
          previousMode: before.mode,
          nextMode: operation.payload.newMode,
          operationModeVersion: nextVersion,
          dataPreserved: true,
        }),
        audit: securityAuditMutation(
          { operationMode: before.mode, operationModeVersion: before.version },
          { operationMode: operation.payload.newMode, operationModeVersion: nextVersion },
          requestId,
          {
            eventType: "WORKSPACE_OPERATION_MODE_CHANGED",
            workspaceId: operation.target.id,
          },
        ),
      });
    }, { authorize: ({ repositories }) => authorizeOwner(repositories, operation) });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}
