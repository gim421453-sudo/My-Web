import { AuthorizationError } from "./authzErrors.js";
import type { AuthorizationContext, WorkspaceRole } from "./authorizationTypes.js";

function requireContext(context: AuthorizationContext | null | undefined): AuthorizationContext {
  if (!context || context.resolution !== "complete") {
    throw new AuthorizationError("AUTHZ_CONTEXT_REQUIRED");
  }
  return context;
}

export function requireGlobalSystemOwner(
  candidate: AuthorizationContext | null | undefined,
): void {
  const context = requireContext(candidate);
  const owner = context.global.systemOwner;
  if (owner.state === "ACTIVE") return;
  if (owner.state === "READ_ERROR") throw new AuthorizationError("AUTHZ_INTERNAL_ERROR");
  if (owner.state === "MALFORMED" || owner.state === "UNRESOLVED") {
    throw new AuthorizationError("AUTHZ_CONTEXT_MALFORMED");
  }
  throw new AuthorizationError("AUTHZ_SYSTEM_OWNER_REQUIRED");
}

function requireActiveWorkspaceMembership(
  context: AuthorizationContext,
): Extract<AuthorizationContext["workspace"]["membership"], { state: "ACTIVE" }> {
  if (!context.workspace.workspaceId) {
    throw new AuthorizationError("AUTHZ_WORKSPACE_REQUIRED");
  }
  const membership = context.workspace.membership;
  if (membership.state === "ACTIVE") return membership;
  if (membership.state === "MISSING") throw new AuthorizationError("AUTHZ_MEMBERSHIP_MISSING");
  if (membership.state === "DISABLED" || membership.state === "INACTIVE") {
    throw new AuthorizationError("AUTHZ_MEMBERSHIP_DISABLED");
  }
  if (membership.state === "READ_ERROR") throw new AuthorizationError("AUTHZ_INTERNAL_ERROR");
  throw new AuthorizationError("AUTHZ_CONTEXT_MALFORMED");
}

export function requireWorkspaceRole(
  candidate: AuthorizationContext | null | undefined,
  allowedRoles: readonly WorkspaceRole[],
): void {
  const context = requireContext(candidate);
  if (allowedRoles.length === 0) throw new AuthorizationError("AUTHZ_ROLE_DENIED");
  const membership = requireActiveWorkspaceMembership(context);
  if (!allowedRoles.includes(membership.role)) {
    throw new AuthorizationError("AUTHZ_ROLE_DENIED");
  }
}

export function requireWorkspaceRoleOrSystemOwner(
  candidate: AuthorizationContext | null | undefined,
  allowedRoles: readonly WorkspaceRole[],
): void {
  const context = requireContext(candidate);
  const owner = context.global.systemOwner;
  if (owner.state === "UNRESOLVED") throw new AuthorizationError("AUTHZ_CONTEXT_REQUIRED");
  if (owner.state === "ACTIVE") return;
  if (owner.state === "READ_ERROR") throw new AuthorizationError("AUTHZ_INTERNAL_ERROR");
  if (owner.state === "MALFORMED") throw new AuthorizationError("AUTHZ_CONTEXT_MALFORMED");
  requireWorkspaceRole(context, allowedRoles);
}
