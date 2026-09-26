import type { VerifiedActor } from "../auth/verifiedActor.js";
import { isWorkspaceRole, type WorkspaceMembershipResolution, type WorkspaceRole } from "../authz/authorizationTypes.js";
import { isPlainRecord } from "../authz/resolverUtils.js";
import { requireActiveWorkspace } from "../adminApplications/adminApplicationContract.js";
import {
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
  MAX_INVITATION_EXPIRY_SECONDS,
  MAX_INVITATION_USES,
  MIN_INVITATION_EXPIRY_SECONDS,
  MIN_INVITATION_USES,
  parseCanonicalInvitation,
  timestampAfter,
  timestampMillis,
  validateRawInvitationCode,
} from "./invitationContract.js";
import {
  getEmulatorInvitationSecretProvider,
  hashHighEntropyInvitationCode,
  type InvitationSecretProvider,
} from "./invitationFoundation.js";
import {
  requireInvitationMutationAuthority,
  requireRoleDelegation,
  resolveInvitationActorAuthority,
} from "./invitationPolicy.js";

interface CreatePayload extends CanonicalObject {
  readonly targetRole: WorkspaceRole;
  readonly expiresInSeconds: number;
  readonly maxUses: number;
}

interface RevokePayload extends CanonicalObject {}

interface RedeemPayload extends CanonicalObject {
  readonly code: string;
}

export interface InvitationOperationDependencies {
  readonly runner?: TrustedTransactionRunner;
  readonly secretProvider?: InvitationSecretProvider;
}

export interface CreateInvitationExecutionResult extends AuthorityOperationExecutionResult {
  readonly invitationId: string;
  readonly invitationCode: string;
}

const CREATE_KEYS = new Set(["targetRole", "expiresInSeconds", "maxUses"]);
const REDEEM_KEYS = new Set(["code"]);
const EMPTY_KEYS = new Set<string>();

function integerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  requestId: string,
): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  return Number(value);
}

const CREATE_SPECIFICATION: OperationSpecification<CreatePayload> = Object.freeze({
  operation: "invitation.create",
  targetKind: "workspace",
  payloadKeys: CREATE_KEYS,
  parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
    if (!isWorkspaceRole(payload.targetRole)) throw new OperationError("INVALID_ARGUMENT", requestId);
    return Object.freeze({
      targetRole: payload.targetRole,
      expiresInSeconds: integerInRange(
        payload.expiresInSeconds,
        MIN_INVITATION_EXPIRY_SECONDS,
        MAX_INVITATION_EXPIRY_SECONDS,
        requestId,
      ),
      maxUses: integerInRange(
        payload.maxUses,
        MIN_INVITATION_USES,
        MAX_INVITATION_USES,
        requestId,
      ),
    });
  },
});

const REVOKE_SPECIFICATION: OperationSpecification<RevokePayload> = Object.freeze({
  operation: "invitation.revoke",
  targetKind: "invitation",
  payloadKeys: EMPTY_KEYS,
  parsePayload() {
    return Object.freeze({});
  },
});

const REDEEM_SPECIFICATION: OperationSpecification<RedeemPayload> = Object.freeze({
  operation: "invitation.redeem",
  targetKind: "invitation_code",
  payloadKeys: REDEEM_KEYS,
  parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
    return Object.freeze({ code: validateRawInvitationCode(payload.code, requestId) });
  },
});

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
  if (operation.target.workspaceId !== null) {
    throw new OperationError("INVALID_ARGUMENT", operation.requestId);
  }
}

function requireCreateTarget(operation: ValidatedOperation<CreatePayload>): string {
  requireUnscopedTarget(operation);
  return operation.target.id;
}

function requireRedeemTarget(operation: ValidatedOperation<RedeemPayload>): void {
  requireUnscopedTarget(operation);
  if (operation.target.id !== "redeem") {
    throw new OperationError("INVALID_ARGUMENT", operation.requestId);
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
  if (membership.state === "READ_ERROR") throw new OperationError("INTERNAL", requestId);
  throw new OperationError("FAILED_PRECONDITION", requestId);
}

function parseIndex(
  snapshot: Awaited<ReturnType<CanonicalAuthorityRepositories["invitations"]["getCodeIndex"]>>,
  requestId: string,
): string {
  if (!snapshot.exists || !isPlainRecord(snapshot.data)) throw new OperationError("NOT_FOUND", requestId);
  if (Object.keys(snapshot.data).some((key) => !["schemaVersion", "invitationId"].includes(key))
    || snapshot.data.schemaVersion !== 1
    || typeof snapshot.data.invitationId !== "string") {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  return snapshot.data.invitationId;
}

async function authorizeDelegation(
  repositories: CanonicalAuthorityRepositories,
  operation: ValidatedOperation<CreatePayload>,
): Promise<void> {
  const workspaceId = requireCreateTarget(operation);
  const authority = await resolveInvitationActorAuthority(
    repositories,
    operation.actor,
    workspaceId,
    operation.requestId,
  );
  requireRoleDelegation(authority, operation.payload.targetRole, operation.requestId);
  requireActiveWorkspace(
    await repositories.workspaces.get(workspaceId, operation.requestId),
    workspaceId,
    operation.requestId,
  );
}

async function authorizeRevoke(
  repositories: CanonicalAuthorityRepositories,
  operation: ValidatedOperation<RevokePayload>,
): Promise<void> {
  const invitation = parseCanonicalInvitation(
    await repositories.invitations.get(operation.target.id, operation.requestId),
    operation.target.id,
    operation.requestId,
  );
  const authority = await resolveInvitationActorAuthority(
    repositories,
    operation.actor,
    invitation.workspaceId,
    operation.requestId,
  );
  requireInvitationMutationAuthority(
    authority,
    invitation.targetRole,
    operation.requestId,
  );
}

export async function trustedCreateInvitation(
  actor: VerifiedActor,
  input: unknown,
  dependencies: InvitationOperationDependencies = {},
): Promise<CreateInvitationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    requireAuthenticatedActor(actor);
    const operation = validateOperation(actor, input, CREATE_SPECIFICATION);
    requestId = operation.requestId;
    const workspaceId = requireCreateTarget(operation);
    const provider = dependencies.secretProvider ?? getEmulatorInvitationSecretProvider();
    const initialSecret = provider.derive(provider.currentVersion, operation.operationIdHash);
    const invitationId = operation.operationIdHash;
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    const execution = await executeIdempotentAuthorityOperation(
      runner,
      operation,
      async ({ repositories }) => {
        if ((await repositories.invitations.getCodeIndex(initialSecret.codeHash, requestId)).exists) {
          throw new OperationError("CONFLICT", requestId);
        }
        const now = repositories.now;
        const expiresAt = timestampAfter(now, operation.payload.expiresInSeconds, requestId);
        repositories.invitations.create(invitationId, Object.freeze({
          schemaVersion: 1,
          invitationId,
          workspaceId,
          targetRole: operation.payload.targetRole,
          status: "active",
          createdByUid: actor.uid,
          codeHash: initialSecret.codeHash,
          secretVersion: provider.currentVersion,
          maxUses: operation.payload.maxUses,
          usedCount: 0,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        }), requestId);
        repositories.invitations.createCodeIndex(initialSecret.codeHash, Object.freeze({
          schemaVersion: 1,
          invitationId,
        }), requestId);
        return Object.freeze({
          result: Object.freeze({
            status: "completed",
            invitationStatus: "active",
            role: operation.payload.targetRole,
            maxUses: operation.payload.maxUses,
            usedCount: 0,
            secretVersion: provider.currentVersion,
          }),
          audit: securityAuditMutation(
            { invitationStatus: null, usedCount: 0 },
            {
              invitationStatus: "active",
              role: operation.payload.targetRole,
              maxUses: operation.payload.maxUses,
              usedCount: 0,
            },
            requestId,
            { eventType: "INVITATION_CREATED", workspaceId },
          ),
        });
      },
      { authorize: ({ repositories }) => authorizeDelegation(repositories, operation) },
    );
    const secretVersion = execution.result.secretVersion;
    if (typeof secretVersion !== "string") throw new OperationError("INTERNAL", requestId);
    const replaySecret = provider.derive(secretVersion, operation.operationIdHash);
    return Object.freeze({
      ...execution,
      invitationId,
      invitationCode: replaySecret.rawCode,
    });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}

export async function trustedRevokeInvitation(
  actor: VerifiedActor,
  input: unknown,
  dependencies: InvitationOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    requireAuthenticatedActor(actor);
    const operation = validateOperation(actor, input, REVOKE_SPECIFICATION);
    requestId = operation.requestId;
    requireUnscopedTarget(operation);
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const invitation = parseCanonicalInvitation(
        await repositories.invitations.get(operation.target.id, requestId),
        operation.target.id,
        requestId,
      );
      if (invitation.status !== "active") throw new OperationError("CONFLICT", requestId);
      const now = repositories.now;
      repositories.invitations.update(operation.target.id, Object.freeze({
        status: "revoked",
        revokedAt: now,
        revokedByUid: actor.uid,
        updatedAt: now,
      }), requestId);
      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          invitationStatus: "revoked",
          usedCount: invitation.usedCount,
          maxUses: invitation.maxUses,
        }),
        audit: securityAuditMutation(
          { invitationStatus: "active", usedCount: invitation.usedCount },
          { invitationStatus: "revoked", usedCount: invitation.usedCount },
          requestId,
          { eventType: "INVITATION_REVOKED", workspaceId: invitation.workspaceId },
        ),
      });
    }, { authorize: ({ repositories }) => authorizeRevoke(repositories, operation) });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}

export async function trustedRedeemInvitation(
  actor: VerifiedActor,
  input: unknown,
  dependencies: InvitationOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    requireAuthenticatedActor(actor);
    const operation = validateOperation(actor, input, REDEEM_SPECIFICATION);
    requestId = operation.requestId;
    requireRedeemTarget(operation);
    const codeHash = hashHighEntropyInvitationCode(operation.payload.code);
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const invitationId = parseIndex(
        await repositories.invitations.getCodeIndex(codeHash, requestId),
        requestId,
      );
      const invitation = parseCanonicalInvitation(
        await repositories.invitations.get(invitationId, requestId),
        invitationId,
        requestId,
      );
      if (invitation.codeHash !== codeHash) throw new OperationError("FAILED_PRECONDITION", requestId);
      if (invitation.status !== "active") throw new OperationError("CONFLICT", requestId);
      const nowMillis = timestampMillis(repositories.now, requestId);
      if (nowMillis >= timestampMillis(invitation.expiresAt, requestId)) {
        throw new OperationError("FAILED_PRECONDITION", requestId);
      }
      if (invitation.usedCount >= invitation.maxUses) throw new OperationError("CONFLICT", requestId);
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
      const nextUsedCount = invitation.usedCount + 1;
      const nextStatus = nextUsedCount === invitation.maxUses ? "consumed" : "active";
      const now = repositories.now;
      repositories.workspaceMemberships.create(invitation.workspaceId, actor.uid, Object.freeze({
        schemaVersion: 1,
        uid: actor.uid,
        workspaceId: invitation.workspaceId,
        role: invitation.targetRole,
        status: "active",
        disabled: false,
        active: true,
        source: "invite",
        invitationId,
        createdAt: now,
        createdBy: actor.uid,
        updatedAt: now,
        updatedBy: actor.uid,
      }), requestId);
      repositories.invitations.createRedemption(invitationId, actor.uid, Object.freeze({
        schemaVersion: 1,
        invitationId,
        uid: actor.uid,
        workspaceId: invitation.workspaceId,
        role: invitation.targetRole,
        redeemedAt: now,
        operationIdHash: operation.operationIdHash,
      }), requestId);
      repositories.invitations.update(invitationId, Object.freeze({
        usedCount: nextUsedCount,
        status: nextStatus,
        lastRedeemedAt: now,
        updatedAt: now,
      }), requestId);
      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          invitationStatus: nextStatus,
          role: invitation.targetRole,
          usedCount: nextUsedCount,
          maxUses: invitation.maxUses,
          memberPresent: true,
          workspaceId: invitation.workspaceId,
        }),
        audit: securityAuditMutation(
          { invitationStatus: "active", usedCount: invitation.usedCount, memberPresent: false },
          { invitationStatus: nextStatus, usedCount: nextUsedCount, memberPresent: true },
          requestId,
          {
            eventType: "INVITATION_REDEEMED",
            targetUid: actor.uid,
            workspaceId: invitation.workspaceId,
          },
        ),
      });
    });
  } catch (error) {
    return normalizeFailure(error, requestId);
  }
}
