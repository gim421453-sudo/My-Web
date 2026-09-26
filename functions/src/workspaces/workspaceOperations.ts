import type { VerifiedActor } from "../auth/verifiedActor.js";
import { AuthorizationError } from "../authz/authzErrors.js";
import { requireGlobalSystemOwner } from "../authz/policies.js";
import { isPlainRecord } from "../authz/resolverUtils.js";
import {
  parseCanonicalAdminApplication,
  requirePendingApplication,
  requirePendingTargetUser,
} from "../adminApplications/adminApplicationContract.js";
import { releasePendingApplication } from "../adminApplications/adminApplicationUniqueness.js";
import {
  sha256Canonical,
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

interface EmptyPayload extends CanonicalObject {}
interface LifecyclePayload extends CanonicalObject { status: WorkspaceLifecycleStatus }
type WorkspaceLifecycleStatus = "active" | "disabled" | "archived";

export interface WorkspaceOperationDependencies {
  readonly runner?: TrustedTransactionRunner;
}

const EMPTY_KEYS = new Set<string>();
const LIFECYCLE_KEYS = new Set(["status"]);

const BOOTSTRAP_SPECIFICATION: OperationSpecification<EmptyPayload> = Object.freeze({
  operation: "workspace.bootstrap.approve",
  targetKind: "admin_application",
  payloadKeys: EMPTY_KEYS,
  parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
    strictPayload(payload, EMPTY_KEYS, requestId);
    return Object.freeze({});
  },
});

const LIFECYCLE_SPECIFICATION: OperationSpecification<LifecyclePayload> = Object.freeze({
  operation: "workspace.lifecycle.set",
  targetKind: "workspace",
  payloadKeys: LIFECYCLE_KEYS,
  parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
    strictPayload(payload, LIFECYCLE_KEYS, requestId);
    if (!['active', 'disabled', 'archived'].includes(String(payload.status || ''))) {
      throw new OperationError("INVALID_ARGUMENT", requestId);
    }
    return Object.freeze({ status: payload.status as WorkspaceLifecycleStatus });
  },
});

function normalizeFailure(error: unknown, requestId: string): never {
  if (error instanceof OperationError) throw error;
  throw new OperationError("INTERNAL", requestId);
}

async function authorizeOwner(
  repositories: CanonicalAuthorityRepositories,
  operation: ValidatedOperation<CanonicalObject>,
): Promise<void> {
  try {
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

function requireUnscopedTarget(operation: ValidatedOperation<CanonicalObject>): void {
  if (operation.target.workspaceId !== null) {
    throw new OperationError("INVALID_ARGUMENT", operation.requestId);
  }
}

function requireMissing(snapshot: { exists: boolean }, requestId: string): void {
  if (snapshot.exists) throw new OperationError("CONFLICT", requestId);
}

function bootstrapKey(applicantUid: string): string {
  return sha256Canonical({ applicantUid, applicationType: "WORKSPACE_BOOTSTRAP" });
}

function generatedWorkspaceId(applicationId: string, applicantUid: string): string {
  return `ws_${sha256Canonical({ applicationId, applicantUid }).slice(0, 32)}`;
}

function workspaceStatus(
  snapshot: { exists: boolean; data?: Record<string, unknown> },
  workspaceId: string,
  requestId: string,
): WorkspaceLifecycleStatus {
  if (!snapshot.exists || !isPlainRecord(snapshot.data)) throw new OperationError("NOT_FOUND", requestId);
  const data = snapshot.data;
  if (data.workspaceId !== undefined && data.workspaceId !== workspaceId) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  if ((data.disabled !== undefined && typeof data.disabled !== "boolean")
    || (data.archived !== undefined && typeof data.archived !== "boolean")) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  const status = data.status === undefined ? "active" : String(data.status);
  if (data.archived === true || status === "archived") {
    if (data.disabled === true || status === "disabled") throw new OperationError("FAILED_PRECONDITION", requestId);
    return "archived";
  }
  if (data.disabled === true || status === "disabled") return "disabled";
  if (data.archived === false || data.archived === undefined) {
    if (["active", "enabled"].includes(status)) return "active";
  }
  throw new OperationError("FAILED_PRECONDITION", requestId);
}

export async function trustedApproveWorkspaceBootstrap(
  actor: VerifiedActor,
  input: unknown,
  dependencies: WorkspaceOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    const operation = validateOperation(actor, input, BOOTSTRAP_SPECIFICATION);
    requestId = operation.requestId;
    requireUnscopedTarget(operation);
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const application = parseCanonicalAdminApplication(
        await repositories.adminApplications.get(operation.target.id, requestId),
        requestId,
      );
      requirePendingApplication(application, requestId);
      if (application.applicationType !== "WORKSPACE_BOOTSTRAP"
        || !application.requestedWorkspaceName
        || application.workspaceId !== null
        || application.requestedRole !== "super_manager") {
        throw new OperationError("FAILED_PRECONDITION", requestId);
      }
      requirePendingTargetUser(
        await repositories.users.get(application.applicantUid, requestId),
        application.applicantUid,
        requestId,
      );
      const workspaceId = generatedWorkspaceId(operation.target.id, application.applicantUid);
      requireMissing(await repositories.workspaces.get(workspaceId, requestId), requestId);
      const guardKey = bootstrapKey(application.applicantUid);
      requireMissing(await repositories.workspaceBootstraps.get(guardKey, requestId), requestId);
      const membership = await repositories.workspaceMemberships.resolve(
        { uid: application.applicantUid },
        workspaceId,
      );
      if (membership.state !== "MISSING") throw new OperationError("CONFLICT", requestId);
      await releasePendingApplication(
        repositories,
        application,
        operation.target.id,
        "approved",
        requestId,
      );

      const now = repositories.now;
      repositories.workspaces.create(workspaceId, Object.freeze({
        schemaVersion: 1,
        workspaceId,
        name: application.requestedWorkspaceName,
        status: "active",
        disabled: false,
        archived: false,
        createdAt: now,
        createdBy: operation.actor.uid,
        updatedAt: now,
        updatedBy: operation.actor.uid,
      }), requestId);
      repositories.workspaceMemberships.create(workspaceId, application.applicantUid, Object.freeze({
        schemaVersion: 1,
        uid: application.applicantUid,
        workspaceId,
        role: "super_manager",
        status: "active",
        disabled: false,
        active: true,
        source: "system_bootstrap",
        approvalRequestId: operation.target.id,
        createdAt: now,
        createdBy: operation.actor.uid,
        updatedAt: now,
        updatedBy: operation.actor.uid,
      }), requestId);
      repositories.users.update(application.applicantUid, Object.freeze({
        status: "active",
        currentWorkspaceId: workspaceId,
        pendingWorkspaceId: null,
        pendingInviteCodeId: null,
        approvedBy: operation.actor.uid,
        approvedAt: now,
        updatedAt: now,
      }), requestId);
      repositories.adminApplications.update(operation.target.id, Object.freeze({
        status: "approved",
        provisionedWorkspaceId: workspaceId,
        approvedBy: operation.actor.uid,
        approvedAt: now,
        updatedAt: now,
      }), requestId);
      repositories.workspaceBootstraps.create(guardKey, Object.freeze({
        schemaVersion: 1,
        applicantUid: application.applicantUid,
        applicationId: operation.target.id,
        workspaceId,
        status: "completed",
        createdAt: now,
        createdBy: operation.actor.uid,
      }), requestId);

      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          applicationStatus: "approved",
          workspacePresent: true,
          memberPresent: true,
          workspaceId,
          role: "super_manager",
          sessionRefreshRequired: true,
        }),
        audit: securityAuditMutation(
          { applicationStatus: "pending", workspacePresent: false, memberPresent: false },
          { applicationStatus: "approved", workspacePresent: true, memberPresent: true, role: "super_manager" },
          requestId,
          {
            eventType: "WORKSPACE_BOOTSTRAPPED",
            targetUid: application.applicantUid,
            workspaceId,
          },
        ),
      });
    }, { authorize: ({ repositories }) => authorizeOwner(repositories, operation) });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}

export async function trustedSetWorkspaceLifecycle(
  actor: VerifiedActor,
  input: unknown,
  dependencies: WorkspaceOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    const operation = validateOperation(actor, input, LIFECYCLE_SPECIFICATION);
    requestId = operation.requestId;
    requireUnscopedTarget(operation);
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const before = workspaceStatus(
        await repositories.workspaces.get(operation.target.id, requestId),
        operation.target.id,
        requestId,
      );
      const after = operation.payload.status;
      if (before === after) throw new OperationError("CONFLICT", requestId);
      if (before === "archived") throw new OperationError("FAILED_PRECONDITION", requestId);
      repositories.workspaces.update(operation.target.id, Object.freeze({
        status: after,
        disabled: after === "disabled",
        archived: after === "archived",
        updatedAt: repositories.now,
        updatedBy: operation.actor.uid,
      }), requestId);
      const eventType = after === "active"
        ? "WORKSPACE_ENABLED"
        : after === "disabled" ? "WORKSPACE_DISABLED" : "WORKSPACE_ARCHIVED";
      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          workspacePresent: true,
          workspaceId: operation.target.id,
          workspaceLifecycleStatus: after,
        }),
        audit: securityAuditMutation(
          { workspacePresent: true, workspaceLifecycleStatus: before },
          { workspacePresent: true, workspaceLifecycleStatus: after },
          requestId,
          { eventType, workspaceId: operation.target.id },
        ),
      });
    }, { authorize: ({ repositories }) => authorizeOwner(repositories, operation) });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}
