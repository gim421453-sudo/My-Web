import { AuthorizationError } from "./authzErrors.js";
import type { AuthorizationContext } from "./authorizationTypes.js";
import {
  ROLE_PERMISSION_POLICY_VERSION,
  isPermissionName,
  type PermissionName,
  type PermissionScopeKind,
} from "./permissions.js";
import {
  getPermissionPolicyRule,
  type PermissionPolicyRole,
} from "./permissionPolicy.js";

export type PermissionDecisionKind = "ALLOW" | "DENY" | "REQUIRES_SCOPE" | "DEFERRED";
export type PermissionDecisionReason =
  | "PERMISSION_ALLOWED"
  | "PERMISSION_UNKNOWN"
  | "PERMISSION_DEFERRED"
  | "AUTHORITY_INACTIVE"
  | "WORKSPACE_CONTEXT_REQUIRED"
  | "ROLE_PERMISSION_DENIED"
  | "SCOPE_VERIFICATION_REQUIRED";

export interface PermissionDecision {
  readonly decision: PermissionDecisionKind;
  readonly permission: PermissionName | null;
  readonly policyVersion: typeof ROLE_PERMISSION_POLICY_VERSION;
  readonly requiredScope: PermissionScopeKind | null;
  readonly reasonCode: PermissionDecisionReason;
  readonly role: PermissionPolicyRole | null;
}

function decision(
  kind: PermissionDecisionKind,
  permission: PermissionName | null,
  reasonCode: PermissionDecisionReason,
  role: PermissionPolicyRole | null = null,
  requiredScope: PermissionScopeKind | null = null,
): PermissionDecision {
  return Object.freeze({
    decision: kind,
    permission,
    policyVersion: ROLE_PERMISSION_POLICY_VERSION,
    requiredScope,
    reasonCode,
    role,
  });
}

function resolveCanonicalRole(context: AuthorizationContext): PermissionPolicyRole | null {
  if (context.global.systemOwner.state === "ACTIVE") return "system_owner";
  return context.workspace.membership.state === "ACTIVE"
    ? context.workspace.membership.role
    : null;
}

function requiresWorkspace(permissionScope: PermissionScopeKind): boolean {
  return permissionScope !== "global";
}

function requiresVerifiedScope(permissionScope: PermissionScopeKind): boolean {
  return permissionScope === "self"
    || permissionScope === "assigned"
    || permissionScope === "underlying"
    || permissionScope === "approved_print_dto";
}

// This resolver consumes only an already-built canonical AuthorizationContext.
// It intentionally does not read legacy user roles, aliases, or client state.
export function resolveActorPermission(
  candidate: AuthorizationContext | null | undefined,
  requestedPermission: unknown,
): PermissionDecision {
  if (!isPermissionName(requestedPermission)) {
    return decision("DENY", null, "PERMISSION_UNKNOWN");
  }

  const ruleForSystemOwner = getPermissionPolicyRule("system_owner", requestedPermission);
  if (!ruleForSystemOwner) return decision("DENY", requestedPermission, "PERMISSION_UNKNOWN");
  if (ruleForSystemOwner.metadata.implementationStatus === "DEFER") {
    return decision("DEFERRED", requestedPermission, "PERMISSION_DEFERRED");
  }

  if (!candidate || candidate.resolution !== "complete") {
    return decision("DENY", requestedPermission, "AUTHORITY_INACTIVE");
  }
  const role = resolveCanonicalRole(candidate);
  if (!role) return decision("DENY", requestedPermission, "AUTHORITY_INACTIVE");

  const rule = getPermissionPolicyRule(role, requestedPermission);
  if (!rule || !rule.granted) {
    return decision("DENY", requestedPermission, "ROLE_PERMISSION_DENIED", role);
  }
  if (requiresWorkspace(rule.metadata.scopeKind) && !candidate.workspace.workspaceId) {
    return decision("DENY", requestedPermission, "WORKSPACE_CONTEXT_REQUIRED", role, rule.metadata.scopeKind);
  }
  if (requiresVerifiedScope(rule.metadata.scopeKind)) {
    return decision("REQUIRES_SCOPE", requestedPermission, "SCOPE_VERIFICATION_REQUIRED", role, rule.metadata.scopeKind);
  }
  return decision("ALLOW", requestedPermission, "PERMISSION_ALLOWED", role);
}

// Generic callers have no verified target scope until P1.5-C. Only ALLOW is a
// successful result; scope-required decisions must not become an implicit grant.
export function requirePermission(
  candidate: AuthorizationContext | null | undefined,
  permission: PermissionName,
): void {
  const resolved = resolveActorPermission(candidate, permission);
  if (resolved.decision === "ALLOW") return;
  if (resolved.decision === "REQUIRES_SCOPE") {
    throw new AuthorizationError("AUTHZ_SCOPE_DENIED");
  }
  throw new AuthorizationError("AUTHZ_ROLE_DENIED");
}
