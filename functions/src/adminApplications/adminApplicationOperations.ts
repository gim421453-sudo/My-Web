import type { VerifiedActor } from "../auth/verifiedActor.js";
import { AuthorizationError } from "../authz/authzErrors.js";
import { requireGlobalSystemOwner } from "../authz/policies.js";
import type { WorkspaceMembershipResolution } from "../authz/authorizationTypes.js";
import {
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
import {
  getEmulatorTransactionRunner,
  type TrustedTransactionRunner,
} from "../repositories/trustedTransaction.js";
import type { CanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";
import {
  parseCanonicalAdminApplication,
  requireActiveWorkspace,
  requirePendingApplication,
  requirePendingTargetUser,
  requireWorkspaceAccessApplication,
  type CanonicalAdminApplication,
} from "./adminApplicationContract.js";
import { releasePendingApplication } from "./adminApplicationUniqueness.js";

interface EmptyPayload extends CanonicalObject {}

export interface AdminApplicationOperationDependencies {
  readonly runner?: TrustedTransactionRunner;
}

const EMPTY_KEYS = new Set<string>();

function specification(operation: string): OperationSpecification<EmptyPayload> {
  return Object.freeze({
    operation,
    targetKind: "admin_application",
    payloadKeys: EMPTY_KEYS,
    parsePayload(value: Readonly<Record<string, unknown>>, requestId: string) {
      strictPayload(value, EMPTY_KEYS, requestId);
      return {};
    },
  });
}

const APPROVE_SPECIFICATION = specification("admin_application.approve");
const REJECT_SPECIFICATION = specification("admin_application.reject");

function requireUnscopedApplicationTarget(
  operation: ValidatedOperation<EmptyPayload>,
): void {
  if (operation.target.workspaceId !== null) {
    throw new OperationError("INVALID_ARGUMENT", operation.requestId);
  }
}

function requireOwner(error: unknown, requestId: string): never {
  if (error instanceof AuthorizationError) {
    throw new OperationError(
      error.code === "AUTHZ_INTERNAL_ERROR" ? "INTERNAL" : "FORBIDDEN",
      requestId,
    );
  }
  throw error;
}

async function authorizeOwner(
  repositories: CanonicalAuthorityRepositories,
  operation: ValidatedOperation<EmptyPayload>,
): Promise<void> {
  try {
    const context = await repositories.systemOwners.buildAuthorizationContext(
      operation.actor,
      operation.operation,
    );
    requireGlobalSystemOwner(context);
  } catch (error) {
    requireOwner(error, operation.requestId);
  }
}

function requireMissingMembership(
  membership: WorkspaceMembershipResolution,
  requestId: string,
): void {
  if (membership.state === "MISSING") return;
  if (["ACTIVE", "DISABLED", "INACTIVE"].includes(membership.state)) {
    throw new OperationError("CONFLICT", requestId);
  }
  throw new OperationError("FAILED_PRECONDITION", requestId);
}

function membershipPayload(
  operation: ValidatedOperation<EmptyPayload>,
  application: CanonicalAdminApplication,
  now: unknown,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    schemaVersion: 1,
    uid: application.applicantUid,
    workspaceId: application.workspaceId,
    role: application.requestedRole,
    status: "active",
    disabled: false,
    active: true,
    source: "admin_approval",
    approvalRequestId: operation.target.id,
    createdAt: now,
    createdBy: operation.actor.uid,
    updatedAt: now,
    updatedBy: operation.actor.uid,
  });
}

function normalizeOperationFailure(error: unknown, requestId: string): never {
  if (error instanceof OperationError) throw error;
  throw new OperationError("INTERNAL", requestId);
}

export async function trustedApproveAdminApplication(
  actor: VerifiedActor,
  input: unknown,
  dependencies: AdminApplicationOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    const operation = validateOperation(actor, input, APPROVE_SPECIFICATION);
    requestId = operation.requestId;
    requireUnscopedApplicationTarget(operation);
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const application = parseCanonicalAdminApplication(
        await repositories.adminApplications.get(operation.target.id, operation.requestId),
        operation.requestId,
      );
      requirePendingApplication(application, operation.requestId);
      requireWorkspaceAccessApplication(application, operation.requestId);
      requirePendingTargetUser(
        await repositories.users.get(application.applicantUid, operation.requestId),
        application.applicantUid,
        operation.requestId,
      );
      requireActiveWorkspace(
        await repositories.workspaces.get(application.workspaceId, operation.requestId),
        application.workspaceId,
        operation.requestId,
      );
      const targetMembership = await repositories.workspaceMemberships.resolve(
        { uid: application.applicantUid },
        application.workspaceId,
      );
      requireMissingMembership(targetMembership, operation.requestId);
      await releasePendingApplication(
        repositories,
        application,
        operation.target.id,
        "approved",
        operation.requestId,
      );

      const now = repositories.now;
      repositories.users.update(application.applicantUid, Object.freeze({
        status: "active",
        currentWorkspaceId: application.workspaceId,
        pendingWorkspaceId: null,
        pendingInviteCodeId: null,
        approvedBy: operation.actor.uid,
        approvedAt: now,
        updatedAt: now,
      }), operation.requestId);
      repositories.workspaceMemberships.create(
        application.workspaceId,
        application.applicantUid,
        membershipPayload(operation, application, now),
        operation.requestId,
      );
      repositories.adminApplications.update(operation.target.id, Object.freeze({
        status: "approved",
        approvedBy: operation.actor.uid,
        approvedAt: now,
        updatedAt: now,
      }), operation.requestId);

      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          applicationStatus: "approved",
          memberPresent: true,
          role: application.requestedRole,
        }),
        audit: securityAuditMutation(
          { applicationStatus: "pending", memberPresent: false, workspacePresent: true },
          { applicationStatus: "approved", memberPresent: true, role: application.requestedRole },
          operation.requestId,
          {
            eventType: "ADMIN_APPLICATION_APPROVED",
            targetUid: application.applicantUid,
            workspaceId: application.workspaceId,
          },
        ),
      });
    }, {
      authorize: ({ repositories }) => authorizeOwner(repositories, operation),
    });
  } catch (error) {
    return normalizeOperationFailure(error, requestId);
  }
}

export async function trustedRejectAdminApplication(
  actor: VerifiedActor,
  input: unknown,
  dependencies: AdminApplicationOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    const operation = validateOperation(actor, input, REJECT_SPECIFICATION);
    requestId = operation.requestId;
    requireUnscopedApplicationTarget(operation);
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const application = parseCanonicalAdminApplication(
        await repositories.adminApplications.get(operation.target.id, operation.requestId),
        operation.requestId,
      );
      requirePendingApplication(application, operation.requestId);
      await releasePendingApplication(
        repositories,
        application,
        operation.target.id,
        "rejected",
        operation.requestId,
      );
      const now = repositories.now;
      repositories.adminApplications.update(operation.target.id, Object.freeze({
        status: "rejected",
        rejectedBy: operation.actor.uid,
        rejectedAt: now,
        updatedAt: now,
      }), operation.requestId);

      return Object.freeze({
        result: Object.freeze({ status: "completed", applicationStatus: "rejected" }),
        audit: securityAuditMutation(
          { applicationStatus: "pending" },
          { applicationStatus: "rejected" },
          operation.requestId,
          {
            eventType: "ADMIN_APPLICATION_REJECTED",
            targetUid: application.applicantUid,
            ...(application.workspaceId ? { workspaceId: application.workspaceId } : {}),
          },
        ),
      });
    }, {
      authorize: ({ repositories }) => authorizeOwner(repositories, operation),
    });
  } catch (error) {
    return normalizeOperationFailure(error, requestId);
  }
}
