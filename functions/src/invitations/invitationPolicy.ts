import type { WorkspaceMembershipResolution, WorkspaceRole } from "../authz/authorizationTypes.js";
import type { CanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";
import type { VerifiedActor } from "../auth/verifiedActor.js";
import { OperationError } from "../operations/operationErrors.js";

const DELEGATION: Readonly<Record<WorkspaceRole, readonly WorkspaceRole[]>> = Object.freeze({
  super_manager: Object.freeze<WorkspaceRole[]>(["manager", "teacher", "normal", "viewer", "print_account"]),
  manager: Object.freeze<WorkspaceRole[]>(["teacher", "normal", "viewer", "print_account"]),
  teacher: Object.freeze<WorkspaceRole[]>([]),
  normal: Object.freeze<WorkspaceRole[]>([]),
  viewer: Object.freeze<WorkspaceRole[]>([]),
  print_account: Object.freeze<WorkspaceRole[]>([]),
});

export type InvitationActorAuthority = "system_owner" | WorkspaceRole;

function ownerFailure(state: string, requestId: string): never {
  if (state === "READ_ERROR") throw new OperationError("INTERNAL", requestId);
  if (["MALFORMED", "MIGRATION_REQUIRED"].includes(state)) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  throw new OperationError("FORBIDDEN", requestId);
}

function membershipFailure(
  membership: WorkspaceMembershipResolution,
  requestId: string,
): never {
  if (membership.state === "READ_ERROR") throw new OperationError("INTERNAL", requestId);
  if (["MALFORMED", "MIGRATION_REQUIRED", "WRONG_UID", "WRONG_WORKSPACE", "UNKNOWN_ROLE"]
    .includes(membership.state)) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  throw new OperationError("FORBIDDEN", requestId);
}

export async function resolveInvitationActorAuthority(
  repositories: CanonicalAuthorityRepositories,
  actor: VerifiedActor,
  workspaceId: string,
  requestId: string,
): Promise<InvitationActorAuthority> {
  const owner = await repositories.systemOwners.resolve(actor);
  if (owner.state === "ACTIVE") return "system_owner";
  if (owner.state !== "NOT_OWNER") return ownerFailure(owner.state, requestId);
  const membership = await repositories.workspaceMemberships.resolve(actor, workspaceId);
  if (membership.state !== "ACTIVE") return membershipFailure(membership, requestId);
  return membership.role;
}

export function requireRoleDelegation(
  authority: InvitationActorAuthority,
  targetRole: WorkspaceRole,
  requestId: string,
): void {
  if (authority === "system_owner") return;
  if (!DELEGATION[authority].includes(targetRole)) {
    throw new OperationError("FORBIDDEN", requestId);
  }
}

export function requireInvitationMutationAuthority(
  authority: InvitationActorAuthority,
  targetRole: WorkspaceRole,
  requestId: string,
): void {
  if (authority === "system_owner") return;
  if (DELEGATION[authority].includes(targetRole)) return;
  throw new OperationError("FORBIDDEN", requestId);
}

export const INVITATION_DELEGATION_MATRIX = DELEGATION;
