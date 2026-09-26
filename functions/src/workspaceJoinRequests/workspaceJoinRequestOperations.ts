import type { VerifiedActor } from "../auth/verifiedActor.js";
import { AuthorizationError } from "../authz/authzErrors.js";
import { requireGlobalSystemOwner } from "../authz/policies.js";
import type { WorkspaceMembershipResolution } from "../authz/authorizationTypes.js";
import { isPlainRecord } from "../authz/resolverUtils.js";
import { requireActiveWorkspace, requirePendingTargetUser } from "../adminApplications/adminApplicationContract.js";
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
import type { CanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";
import {
  getEmulatorTransactionRunner,
  type TrustedTransactionRunner,
} from "../repositories/trustedTransaction.js";
import {
  parseCanonicalInvitation,
  timestampMillis,
  validateRawInvitationCode,
} from "../invitations/invitationContract.js";
import { hashHighEntropyInvitationCode } from "../invitations/invitationFoundation.js";
import {
  parseCanonicalWorkspaceJoinRequest,
  releasePendingWorkspaceJoinRequest,
  reservePendingWorkspaceJoinRequest,
} from "./workspaceJoinRequestContract.js";

interface SubmitPayload extends CanonicalObject { readonly code: string }
interface EmptyPayload extends CanonicalObject {}

export interface WorkspaceJoinRequestOperationDependencies {
  readonly runner?: TrustedTransactionRunner;
}

const SUBMIT_SPECIFICATION: OperationSpecification<SubmitPayload> = Object.freeze({
  operation: "workspace_join.create",
  targetKind: "workspace_join",
  payloadKeys: new Set(["code"]),
  parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
    return Object.freeze({ code: validateRawInvitationCode(payload.code, requestId) });
  },
});
const EMPTY_KEYS = new Set<string>();
function decisionSpecification(operation: string): OperationSpecification<EmptyPayload> {
  return Object.freeze({
    operation,
    targetKind: "workspace_join_request",
    payloadKeys: EMPTY_KEYS,
    parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
      strictPayload(payload, EMPTY_KEYS, requestId);
      return Object.freeze({});
    },
  });
}
const APPROVE_SPECIFICATION = decisionSpecification("workspace_join.approve");
const REJECT_SPECIFICATION = decisionSpecification("workspace_join.reject");

function normalizeFailure(error: unknown, requestId: string): never {
  if (error instanceof OperationError) throw error;
  throw new OperationError("INTERNAL", requestId);
}

function requireAuthenticatedActor(actor: VerifiedActor): void {
  if (actor.auth.tokenVerified !== true || actor.auth.disabled !== false) {
    throw new OperationError("UNAUTHENTICATED", actor.request.requestId);
  }
}

function requireUnscopedTarget(operation: ValidatedOperation<CanonicalObject>): void {
  if (operation.target.workspaceId !== null) throw new OperationError("INVALID_ARGUMENT", operation.requestId);
}

function requireMissingMembership(
  membership: WorkspaceMembershipResolution,
  requestId: string,
): void {
  if (membership.state === "MISSING") return;
  if (["ACTIVE", "DISABLED", "INACTIVE"].includes(membership.state)) {
    throw new OperationError("CONFLICT", requestId);
  }
  throw new OperationError(membership.state === "READ_ERROR" ? "INTERNAL" : "FAILED_PRECONDITION", requestId);
}

function invitationIdFromIndex(
  snapshot: Awaited<ReturnType<CanonicalAuthorityRepositories["invitations"]["getCodeIndex"]>>,
  requestId: string,
): string {
  if (!snapshot.exists || !isPlainRecord(snapshot.data)
    || Object.keys(snapshot.data).some((key) => !["schemaVersion", "invitationId"].includes(key))
    || snapshot.data.schemaVersion !== 1
    || typeof snapshot.data.invitationId !== "string") {
    throw new OperationError(snapshot.exists ? "FAILED_PRECONDITION" : "NOT_FOUND", requestId);
  }
  return snapshot.data.invitationId;
}

function requireUsableInvitation(
  invitation: ReturnType<typeof parseCanonicalInvitation>,
  now: unknown,
  requestId: string,
): void {
  if (invitation.status !== "active" || invitation.usedCount >= invitation.maxUses) {
    throw new OperationError("CONFLICT", requestId);
  }
  if (timestampMillis(now, requestId) >= timestampMillis(invitation.expiresAt, requestId)) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
}

async function authorizeOwner(
  repositories: CanonicalAuthorityRepositories,
  operation: ValidatedOperation<EmptyPayload>,
): Promise<void> {
  try {
    requireGlobalSystemOwner(await repositories.systemOwners.buildAuthorizationContext(
      operation.actor,
      operation.operation,
    ));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw new OperationError(error.code === "AUTHZ_INTERNAL_ERROR" ? "INTERNAL" : "FORBIDDEN", operation.requestId);
    }
    throw error;
  }
}

export async function trustedSubmitWorkspaceJoinRequest(
  actor: VerifiedActor,
  input: unknown,
  dependencies: WorkspaceJoinRequestOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    requireAuthenticatedActor(actor);
    const operation = validateOperation(actor, input, SUBMIT_SPECIFICATION);
    requestId = operation.requestId;
    requireUnscopedTarget(operation);
    if (operation.target.id !== "submit") throw new OperationError("INVALID_ARGUMENT", requestId);
    const codeHash = hashHighEntropyInvitationCode(operation.payload.code);
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      requirePendingTargetUser(
        await repositories.users.get(actor.uid, requestId),
        actor.uid,
        requestId,
      );
      const invitationId = invitationIdFromIndex(
        await repositories.invitations.getCodeIndex(codeHash, requestId),
        requestId,
      );
      const invitation = parseCanonicalInvitation(
        await repositories.invitations.get(invitationId, requestId),
        invitationId,
        requestId,
      );
      if (invitation.codeHash !== codeHash) throw new OperationError("FAILED_PRECONDITION", requestId);
      requireUsableInvitation(invitation, repositories.now, requestId);
      requireActiveWorkspace(
        await repositories.workspaces.get(invitation.workspaceId, requestId),
        invitation.workspaceId,
        requestId,
      );
      requireMissingMembership(
        await repositories.workspaceMemberships.resolve(actor, invitation.workspaceId),
        requestId,
      );
      if ((await repositories.invitations.getRedemption(invitationId, actor.uid, requestId)).exists) {
        throw new OperationError("CONFLICT", requestId);
      }
      const canonicalRequestId = operation.operationIdHash;
      await reservePendingWorkspaceJoinRequest(
        repositories,
        actor.uid,
        invitation.workspaceId,
        canonicalRequestId,
        requestId,
      );
      const now = repositories.now;
      repositories.workspaceJoinRequests.create(canonicalRequestId, Object.freeze({
        schemaVersion: 1,
        requestType: "WORKSPACE_JOIN",
        requestId: canonicalRequestId,
        applicantUid: actor.uid,
        workspaceId: invitation.workspaceId,
        invitationId,
        requestedRole: invitation.targetRole,
        status: "pending",
        source: "trusted_ingress",
        createdAt: now,
        updatedAt: now,
      }), requestId);
      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          created: true,
          applicationStatus: "pending",
          role: invitation.targetRole,
          workspaceId: invitation.workspaceId,
          invitationId,
          joinRequestId: canonicalRequestId,
        }),
        audit: securityAuditMutation(
          { exists: false },
          { exists: true, applicationStatus: "pending", role: invitation.targetRole },
          requestId,
          { eventType: "WORKSPACE_JOIN_REQUEST_CREATED", targetUid: actor.uid, workspaceId: invitation.workspaceId },
        ),
      });
    });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}

export async function trustedApproveWorkspaceJoinRequest(
  actor: VerifiedActor,
  input: unknown,
  dependencies: WorkspaceJoinRequestOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    const operation = validateOperation(actor, input, APPROVE_SPECIFICATION);
    requestId = operation.requestId;
    requireUnscopedTarget(operation);
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const request = parseCanonicalWorkspaceJoinRequest(
        await repositories.workspaceJoinRequests.get(operation.target.id, requestId),
        operation.target.id,
        requestId,
      );
      if (request.status !== "pending") throw new OperationError("CONFLICT", requestId);
      requirePendingTargetUser(
        await repositories.users.get(request.applicantUid, requestId),
        request.applicantUid,
        requestId,
      );
      const invitation = parseCanonicalInvitation(
        await repositories.invitations.get(request.invitationId, requestId),
        request.invitationId,
        requestId,
      );
      if (invitation.workspaceId !== request.workspaceId || invitation.targetRole !== request.requestedRole) {
        throw new OperationError("FAILED_PRECONDITION", requestId);
      }
      requireUsableInvitation(invitation, repositories.now, requestId);
      requireActiveWorkspace(
        await repositories.workspaces.get(request.workspaceId, requestId),
        request.workspaceId,
        requestId,
      );
      requireMissingMembership(
        await repositories.workspaceMemberships.resolve({ uid: request.applicantUid }, request.workspaceId),
        requestId,
      );
      if ((await repositories.invitations.getRedemption(request.invitationId, request.applicantUid, requestId)).exists) {
        throw new OperationError("CONFLICT", requestId);
      }
      await releasePendingWorkspaceJoinRequest(repositories, request, "approved", requestId);
      const now = repositories.now;
      const nextUsedCount = invitation.usedCount + 1;
      const nextInvitationStatus = nextUsedCount === invitation.maxUses ? "consumed" : "active";
      repositories.workspaceMemberships.create(request.workspaceId, request.applicantUid, Object.freeze({
        schemaVersion: 1,
        uid: request.applicantUid,
        workspaceId: request.workspaceId,
        role: request.requestedRole,
        status: "active",
        disabled: false,
        active: true,
        source: "invite",
        invitationId: request.invitationId,
        approvalRequestId: request.requestId,
        createdAt: now,
        createdBy: actor.uid,
        updatedAt: now,
        updatedBy: actor.uid,
      }), requestId);
      repositories.invitations.createRedemption(request.invitationId, request.applicantUid, Object.freeze({
        schemaVersion: 1,
        invitationId: request.invitationId,
        uid: request.applicantUid,
        workspaceId: request.workspaceId,
        role: request.requestedRole,
        redeemedAt: now,
        operationIdHash: operation.operationIdHash,
      }), requestId);
      repositories.invitations.update(request.invitationId, Object.freeze({
        usedCount: nextUsedCount,
        status: nextInvitationStatus,
        lastRedeemedAt: now,
        updatedAt: now,
      }), requestId);
      repositories.users.update(request.applicantUid, Object.freeze({
        status: "active",
        currentWorkspaceId: request.workspaceId,
        pendingWorkspaceId: null,
        pendingInviteCodeId: null,
        approvedBy: actor.uid,
        approvedAt: now,
        updatedAt: now,
      }), requestId);
      repositories.workspaceJoinRequests.update(request.requestId, Object.freeze({
        status: "approved",
        approvedBy: actor.uid,
        approvedAt: now,
        updatedAt: now,
      }), requestId);
      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          memberPresent: true,
          membershipStatus: "active",
          role: request.requestedRole,
          workspaceId: request.workspaceId,
        }),
        audit: securityAuditMutation(
          { applicationStatus: "pending", memberPresent: false },
          { applicationStatus: "approved", memberPresent: true, role: request.requestedRole },
          requestId,
          { eventType: "WORKSPACE_JOIN_REQUEST_APPROVED", targetUid: request.applicantUid, workspaceId: request.workspaceId },
        ),
      });
    }, { authorize: ({ repositories }) => authorizeOwner(repositories, operation) });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}

export async function trustedRejectWorkspaceJoinRequest(
  actor: VerifiedActor,
  input: unknown,
  dependencies: WorkspaceJoinRequestOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    const operation = validateOperation(actor, input, REJECT_SPECIFICATION);
    requestId = operation.requestId;
    requireUnscopedTarget(operation);
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const request = parseCanonicalWorkspaceJoinRequest(
        await repositories.workspaceJoinRequests.get(operation.target.id, requestId),
        operation.target.id,
        requestId,
      );
      if (request.status !== "pending") throw new OperationError("CONFLICT", requestId);
      await releasePendingWorkspaceJoinRequest(repositories, request, "rejected", requestId);
      const now = repositories.now;
      repositories.workspaceJoinRequests.update(request.requestId, Object.freeze({
        status: "rejected",
        rejectedBy: actor.uid,
        rejectedAt: now,
        updatedAt: now,
      }), requestId);
      return Object.freeze({
        result: Object.freeze({ status: "completed", updated: true, applicationStatus: "rejected" }),
        audit: securityAuditMutation(
          { applicationStatus: "pending" },
          { applicationStatus: "rejected" },
          requestId,
          { eventType: "WORKSPACE_JOIN_REQUEST_REJECTED", targetUid: request.applicantUid, workspaceId: request.workspaceId },
        ),
      });
    }, { authorize: ({ repositories }) => authorizeOwner(repositories, operation) });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}
