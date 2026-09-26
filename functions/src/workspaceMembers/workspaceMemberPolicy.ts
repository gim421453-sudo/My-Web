import type { VerifiedActor } from "../auth/verifiedActor.js";
import type { WorkspaceRole } from "../authz/authorizationTypes.js";
import { OperationError } from "../operations/operationErrors.js";
import type { CanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";
import type { CanonicalWorkspaceMember } from "./workspaceMemberContract.js";

const DELEGATION: Readonly<Record<WorkspaceRole, readonly WorkspaceRole[]>> = Object.freeze({
  super_manager: Object.freeze<WorkspaceRole[]>(["manager", "teacher", "normal", "viewer", "print_account"]),
  manager: Object.freeze<WorkspaceRole[]>(["teacher", "normal", "viewer", "print_account"]),
  teacher: Object.freeze<WorkspaceRole[]>([]),
  normal: Object.freeze<WorkspaceRole[]>([]),
  viewer: Object.freeze<WorkspaceRole[]>([]),
  print_account: Object.freeze<WorkspaceRole[]>([]),
});

export type WorkspaceMemberActorAuthority = "system_owner" | WorkspaceRole;

function ownerFailure(state: string, requestId: string): never {
  if (state === "READ_ERROR") throw new OperationError("INTERNAL", requestId);
  if (["MALFORMED", "MIGRATION_REQUIRED"].includes(state)) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  throw new OperationError("FORBIDDEN", requestId);
}

export async function resolveWorkspaceMemberActorAuthority(
  repositories: CanonicalAuthorityRepositories,
  actor: VerifiedActor,
  workspaceId: string,
  requestId: string,
): Promise<WorkspaceMemberActorAuthority> {
  const owner = await repositories.systemOwners.resolve(actor);
  if (owner.state === "ACTIVE") return "system_owner";
  if (owner.state !== "NOT_OWNER") return ownerFailure(owner.state, requestId);
  const membership = await repositories.workspaceMemberships.resolve(actor, workspaceId);
  if (membership.state === "ACTIVE") return membership.role;
  if (membership.state === "READ_ERROR") throw new OperationError("INTERNAL", requestId);
  if (["MALFORMED", "MIGRATION_REQUIRED", "WRONG_UID", "WRONG_WORKSPACE", "UNKNOWN_ROLE"]
    .includes(membership.state)) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  throw new OperationError("FORBIDDEN", requestId);
}

export function requireWorkspaceMemberMutationAuthority(
  authority: WorkspaceMemberActorAuthority,
  actorUid: string,
  target: CanonicalWorkspaceMember,
  requestedRole: WorkspaceRole | null,
  requestId: string,
): void {
  if (actorUid === target.uid) throw new OperationError("FORBIDDEN", requestId);
  if (authority === "system_owner") return;
  const manageable = DELEGATION[authority];
  if (!manageable.includes(target.role)
    || (requestedRole !== null && !manageable.includes(requestedRole))) {
    throw new OperationError("FORBIDDEN", requestId);
  }
}

export const WORKSPACE_MEMBER_DELEGATION_MATRIX = DELEGATION;
