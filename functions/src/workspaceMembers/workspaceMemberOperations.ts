import type { VerifiedActor } from "../auth/verifiedActor.js";
import { isWorkspaceRole, type WorkspaceRole } from "../authz/authorizationTypes.js";
import { requireActiveWorkspace } from "../adminApplications/adminApplicationContract.js";
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
  parseCanonicalWorkspaceMember,
  type CanonicalWorkspaceMember,
  type WorkspaceMemberStatus,
} from "./workspaceMemberContract.js";
import {
  requireWorkspaceMemberMutationAuthority,
  resolveWorkspaceMemberActorAuthority,
} from "./workspaceMemberPolicy.js";

interface RolePayload extends CanonicalObject { newRole: WorkspaceRole }
interface StatusPayload extends CanonicalObject { status: "active" | "disabled" }
interface EmptyPayload extends CanonicalObject {}

export interface WorkspaceMemberOperationDependencies {
  readonly runner?: TrustedTransactionRunner;
}

const ROLE_KEYS = new Set(["newRole"]);
const STATUS_KEYS = new Set(["status"]);
const EMPTY_KEYS = new Set<string>();

const ROLE_SPECIFICATION: OperationSpecification<RolePayload> = Object.freeze({
  operation: "workspace_member.role.update",
  targetKind: "workspace_member",
  payloadKeys: ROLE_KEYS,
  parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
    strictPayload(payload, ROLE_KEYS, requestId);
    if (!isWorkspaceRole(payload.newRole)) throw new OperationError("INVALID_ARGUMENT", requestId);
    return Object.freeze({ newRole: payload.newRole });
  },
});

const STATUS_SPECIFICATION: OperationSpecification<StatusPayload> = Object.freeze({
  operation: "workspace_member.status.set",
  targetKind: "workspace_member",
  payloadKeys: STATUS_KEYS,
  parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
    strictPayload(payload, STATUS_KEYS, requestId);
    if (payload.status !== "active" && payload.status !== "disabled") {
      throw new OperationError("INVALID_ARGUMENT", requestId);
    }
    return Object.freeze({ status: payload.status });
  },
});

const REMOVE_SPECIFICATION: OperationSpecification<EmptyPayload> = Object.freeze({
  operation: "workspace_member.remove",
  targetKind: "workspace_member",
  payloadKeys: EMPTY_KEYS,
  parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string) {
    strictPayload(payload, EMPTY_KEYS, requestId);
    return Object.freeze({});
  },
});

function requireAuthenticatedActor(actor: VerifiedActor): void {
  if (actor.auth.tokenVerified !== true || actor.auth.disabled !== false) {
    throw new OperationError("UNAUTHENTICATED", actor.request.requestId);
  }
}

function requireScopedTarget<TPayload extends CanonicalObject>(
  operation: ValidatedOperation<TPayload>,
): string {
  if (!operation.target.workspaceId) throw new OperationError("INVALID_ARGUMENT", operation.requestId);
  return operation.target.workspaceId;
}

async function loadMutationContext<TPayload extends CanonicalObject>(
  repositories: CanonicalAuthorityRepositories,
  operation: ValidatedOperation<TPayload>,
  requestedRole: WorkspaceRole | null,
): Promise<Readonly<{ workspaceId: string; target: CanonicalWorkspaceMember }>> {
  const workspaceId = requireScopedTarget(operation);
  requireActiveWorkspace(
    await repositories.workspaces.get(workspaceId, operation.requestId),
    workspaceId,
    operation.requestId,
  );
  const target = parseCanonicalWorkspaceMember(
    await repositories.workspaceMemberships.get(workspaceId, operation.target.id, operation.requestId),
    workspaceId,
    operation.target.id,
    operation.requestId,
  );
  const authority = await resolveWorkspaceMemberActorAuthority(
    repositories,
    operation.actor,
    workspaceId,
    operation.requestId,
  );
  requireWorkspaceMemberMutationAuthority(
    authority,
    operation.actor.uid,
    target,
    requestedRole,
    operation.requestId,
  );
  return Object.freeze({ workspaceId, target });
}

async function requireNotLastActiveTopManager(
  repositories: CanonicalAuthorityRepositories,
  target: CanonicalWorkspaceMember,
  requestId: string,
): Promise<void> {
  if (target.role !== "super_manager" || target.status !== "active") return;
  const snapshots = await repositories.workspaceMemberships.listByRole(
    target.workspaceId,
    "super_manager",
    requestId,
  );
  const activeCount = snapshots.map((snapshot) => {
    if (!snapshot.data || typeof snapshot.data.uid !== "string") {
      throw new OperationError("FAILED_PRECONDITION", requestId);
    }
    return parseCanonicalWorkspaceMember(
      snapshot,
      target.workspaceId,
      snapshot.data.uid,
      requestId,
    );
  }).filter((member) => member.status === "active").length;
  if (activeCount <= 1) throw new OperationError("FAILED_PRECONDITION", requestId);
}

function normalizedFailure(error: unknown, requestId: string): never {
  if (error instanceof OperationError) throw error;
  throw new OperationError("INTERNAL", requestId);
}

export async function trustedUpdateWorkspaceMemberRole(
  actor: VerifiedActor,
  input: unknown,
  dependencies: WorkspaceMemberOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    requireAuthenticatedActor(actor);
    const operation = validateOperation(actor, input, ROLE_SPECIFICATION);
    requestId = operation.requestId;
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const { workspaceId, target } = await loadMutationContext(
        repositories,
        operation,
        operation.payload.newRole,
      );
      if (target.status !== "active") throw new OperationError("FAILED_PRECONDITION", requestId);
      if (target.role === operation.payload.newRole) throw new OperationError("CONFLICT", requestId);
      if (target.role === "super_manager" && operation.payload.newRole !== "super_manager") {
        await requireNotLastActiveTopManager(repositories, target, requestId);
      }
      repositories.workspaceMemberships.update(workspaceId, target.uid, Object.freeze({
        role: operation.payload.newRole,
        updatedAt: repositories.now,
        updatedBy: actor.uid,
      }), requestId);
      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          memberPresent: true,
          workspaceId,
          role: operation.payload.newRole,
          membershipStatus: target.status,
          sessionRefreshRequired: true,
        }),
        audit: securityAuditMutation(
          { role: target.role, status: target.status },
          { role: operation.payload.newRole, status: target.status },
          requestId,
          { eventType: "WORKSPACE_MEMBER_ROLE_UPDATED", targetUid: target.uid, workspaceId },
        ),
      });
    }, {
      authorize: async ({ repositories }) => {
        await loadMutationContext(repositories, operation, operation.payload.newRole);
      },
    });
  } catch (error) {
    return normalizedFailure(error, requestId);
  }
}

export async function trustedSetWorkspaceMemberStatus(
  actor: VerifiedActor,
  input: unknown,
  dependencies: WorkspaceMemberOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    requireAuthenticatedActor(actor);
    const operation = validateOperation(actor, input, STATUS_SPECIFICATION);
    requestId = operation.requestId;
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const { workspaceId, target } = await loadMutationContext(repositories, operation, null);
      const nextStatus = operation.payload.status;
      if (target.status === "inactive") throw new OperationError("FAILED_PRECONDITION", requestId);
      if (target.status === nextStatus) throw new OperationError("CONFLICT", requestId);
      if (nextStatus === "disabled") await requireNotLastActiveTopManager(repositories, target, requestId);
      const next = nextStatus === "active"
        ? Object.freeze({ status: "active", disabled: false, active: true })
        : Object.freeze({ status: "disabled", disabled: true, active: false });
      repositories.workspaceMemberships.update(workspaceId, target.uid, Object.freeze({
        ...next,
        updatedAt: repositories.now,
        updatedBy: actor.uid,
      }), requestId);
      const eventType = nextStatus === "active"
        ? "WORKSPACE_MEMBER_ENABLED"
        : "WORKSPACE_MEMBER_DISABLED";
      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          memberPresent: true,
          workspaceId,
          role: target.role,
          membershipStatus: nextStatus,
          active: next.active,
          disabled: next.disabled,
          sessionRefreshRequired: true,
        }),
        audit: securityAuditMutation(
          { role: target.role, status: target.status },
          { role: target.role, status: nextStatus },
          requestId,
          { eventType, targetUid: target.uid, workspaceId },
        ),
      });
    }, {
      authorize: async ({ repositories }) => {
        await loadMutationContext(repositories, operation, null);
      },
    });
  } catch (error) {
    return normalizedFailure(error, requestId);
  }
}

export async function trustedRemoveWorkspaceMember(
  actor: VerifiedActor,
  input: unknown,
  dependencies: WorkspaceMemberOperationDependencies = {},
): Promise<AuthorityOperationExecutionResult> {
  let requestId = actor.request.requestId;
  try {
    requireAuthenticatedActor(actor);
    const operation = validateOperation(actor, input, REMOVE_SPECIFICATION);
    requestId = operation.requestId;
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return await executeIdempotentAuthorityOperation(runner, operation, async ({ repositories }) => {
      const { workspaceId, target } = await loadMutationContext(repositories, operation, null);
      if (target.status === "inactive") throw new OperationError("CONFLICT", requestId);
      await requireNotLastActiveTopManager(repositories, target, requestId);
      repositories.workspaceMemberships.update(workspaceId, target.uid, Object.freeze({
        status: "inactive",
        disabled: false,
        active: false,
        updatedAt: repositories.now,
        updatedBy: actor.uid,
      }), requestId);
      return Object.freeze({
        result: Object.freeze({
          status: "completed",
          memberPresent: true,
          removed: true,
          workspaceId,
          role: target.role,
          membershipStatus: "inactive" satisfies WorkspaceMemberStatus,
          sessionRefreshRequired: true,
        }),
        audit: securityAuditMutation(
          { role: target.role, status: target.status },
          { role: target.role, status: "inactive", removed: true },
          requestId,
          { eventType: "WORKSPACE_MEMBER_REMOVED", targetUid: target.uid, workspaceId },
        ),
      });
    }, {
      authorize: async ({ repositories }) => {
        await loadMutationContext(repositories, operation, null);
      },
    });
  } catch (error) {
    return normalizedFailure(error, requestId);
  }
}
