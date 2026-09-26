import type { VerifiedActor } from "../auth/verifiedActor.js";
import type { WorkspaceMembershipResolution, WorkspaceRole } from "../authz/authorizationTypes.js";
import {
  requiredString,
  strictPayload,
  validateOperation,
  type CanonicalObject,
  type OperationSpecification,
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
import {
  isSelfServiceWorkspaceRole,
  requireActiveWorkspace,
  requirePendingTargetUser,
} from "./adminApplicationContract.js";
import {
  reservePendingApplication,
  reservePendingBootstrapApplication,
} from "./adminApplicationUniqueness.js";

interface CreateApplicationPayload extends CanonicalObject {
  readonly requestedRole: WorkspaceRole;
  readonly reason: string | null;
}

interface CreateBootstrapPayload extends CanonicalObject {
  readonly requestedWorkspaceName: string;
  readonly reason: string | null;
}

export interface AdminApplicationIngressDependencies {
  readonly runner?: TrustedTransactionRunner;
}

const CREATE_PAYLOAD_KEYS = new Set(["requestedRole", "reason"]);
const CREATE_SPECIFICATION: OperationSpecification<CreateApplicationPayload> = Object.freeze({
  operation: "admin_application.create",
  targetKind: "workspace",
  payloadKeys: CREATE_PAYLOAD_KEYS,
  parsePayload(value: Readonly<Record<string, unknown>>, requestId: string) {
    const payload = strictPayload(value, CREATE_PAYLOAD_KEYS, requestId);
    if (!isSelfServiceWorkspaceRole(payload.requestedRole)) {
      throw new OperationError("INVALID_ARGUMENT", requestId);
    }
    const reason = payload.reason === undefined
      ? null
      : requiredString(payload.reason, requestId, { maxLength: 500 });
    return Object.freeze({ requestedRole: payload.requestedRole, reason });
  },
});

const CREATE_BOOTSTRAP_KEYS = new Set(["requestedWorkspaceName", "reason"]);
const CREATE_BOOTSTRAP_SPECIFICATION: OperationSpecification<CreateBootstrapPayload> = Object.freeze({
  operation: "workspace.bootstrap.application.create",
  targetKind: "workspace_bootstrap",
  payloadKeys: CREATE_BOOTSTRAP_KEYS,
  parsePayload(value: Readonly<Record<string, unknown>>, requestId: string) {
    const payload = strictPayload(value, CREATE_BOOTSTRAP_KEYS, requestId);
    const requestedWorkspaceName = requiredString(payload.requestedWorkspaceName, requestId, {
      maxLength: 120,
    });
    const reason = payload.reason === undefined
      ? null
      : requiredString(payload.reason, requestId, { maxLength: 500 });
    return Object.freeze({ requestedWorkspaceName, reason });
  },
});

function requireAuthenticatedActor(actor: VerifiedActor): void {
  if (!actor.auth.tokenVerified || actor.auth.disabled) {
    throw new OperationError("UNAUTHENTICATED", actor.request.requestId);
  }
}

function requireNoMembership(
  membership: WorkspaceMembershipResolution,
  requestId: string,
): void {
  if (membership.state === "MISSING") return;
  if (["ACTIVE", "DISABLED", "INACTIVE"].includes(membership.state)) {
    throw new OperationError("CONFLICT", requestId);
  }
  throw new OperationError("FAILED_PRECONDITION", requestId);
}

function normalizeFailure(error: unknown, requestId: string): never {
  if (error instanceof OperationError) throw error;
  throw new OperationError("INTERNAL", requestId);
}

export async function trustedCreateAdminApplication(
  actor: VerifiedActor,
  input: unknown,
  dependencies: AdminApplicationIngressDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    requireAuthenticatedActor(actor);
    const operation = validateOperation(actor, input, CREATE_SPECIFICATION);
    requestId = operation.requestId;
    if (operation.target.workspaceId !== null) {
      throw new OperationError("INVALID_ARGUMENT", operation.requestId);
    }
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const workspaceId = operation.target.id;
      requireActiveWorkspace(
        await repositories.workspaces.get(workspaceId, operation.requestId),
        workspaceId,
        operation.requestId,
      );
      requireNoMembership(
        await repositories.workspaceMemberships.resolve(operation.actor, workspaceId),
        operation.requestId,
      );
      const applicationId = operation.operationIdHash;
      await reservePendingApplication(
        repositories,
        operation.actor.uid,
        workspaceId,
        applicationId,
        operation.requestId,
      );
      const now = repositories.now;
      repositories.adminApplications.create(applicationId, Object.freeze({
        schemaVersion: 1,
        applicationType: "WORKSPACE_ACCESS",
        applicantUid: operation.actor.uid,
        workspaceId,
        requestedRole: operation.payload.requestedRole,
        status: "pending",
        source: "trusted_ingress",
        ...(operation.payload.reason ? { reason: operation.payload.reason } : {}),
        createdAt: now,
        updatedAt: now,
      }), operation.requestId);
      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          applicationStatus: "pending",
          created: true,
          role: operation.payload.requestedRole,
        }),
        audit: securityAuditMutation(
          { exists: false },
          { exists: true, applicationStatus: "pending", role: operation.payload.requestedRole },
          operation.requestId,
          {
            eventType: "ADMIN_APPLICATION_CREATED",
            targetUid: operation.actor.uid,
            workspaceId,
          },
        ),
      });
    });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}

export async function trustedCreateWorkspaceBootstrapApplication(
  actor: VerifiedActor,
  input: unknown,
  dependencies: AdminApplicationIngressDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    requireAuthenticatedActor(actor);
    const operation = validateOperation(actor, input, CREATE_BOOTSTRAP_SPECIFICATION);
    requestId = operation.requestId;
    if (operation.target.id !== "self" || operation.target.workspaceId !== null) {
      throw new OperationError("INVALID_ARGUMENT", requestId);
    }
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      requirePendingTargetUser(
        await repositories.users.get(operation.actor.uid, requestId),
        operation.actor.uid,
        requestId,
      );
      const applicationId = operation.operationIdHash;
      await reservePendingBootstrapApplication(
        repositories,
        operation.actor.uid,
        applicationId,
        requestId,
      );
      const now = repositories.now;
      repositories.adminApplications.create(applicationId, Object.freeze({
        schemaVersion: 1,
        applicationType: "WORKSPACE_BOOTSTRAP",
        applicantUid: operation.actor.uid,
        workspaceId: null,
        requestedWorkspaceName: operation.payload.requestedWorkspaceName,
        requestedRole: "super_manager",
        status: "pending",
        source: "trusted_ingress",
        ...(operation.payload.reason ? { reason: operation.payload.reason } : {}),
        createdAt: now,
        updatedAt: now,
      }), requestId);
      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          applicationStatus: "pending",
          created: true,
          role: "super_manager",
        }),
        audit: securityAuditMutation(
          { exists: false },
          { exists: true, applicationStatus: "pending", role: "super_manager" },
          requestId,
          { eventType: "WORKSPACE_BOOTSTRAP_APPLICATION_CREATED", targetUid: operation.actor.uid },
        ),
      });
    });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}
