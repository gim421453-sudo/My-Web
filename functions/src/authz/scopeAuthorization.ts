import type { AuthorizationContext } from "./authorizationTypes.js";
import {
  resolveActorPermission,
  type PermissionDecision,
} from "./permissionResolver.js";
import type { PermissionName } from "./permissions.js";
import {
  resolveTeacherAssignedScope,
  type AssignmentScopeDecision,
  type TeacherAssignedScopeDependencies,
} from "./assignmentScopeResolver.js";

export interface ScopeAuthorizationDecision {
  readonly decision: "ALLOW" | "DENY";
  readonly permission: PermissionDecision;
  readonly scope: AssignmentScopeDecision | null;
  readonly reasonCode: "PERMISSION_ALLOWED" | "PERMISSION_DENIED" | "SCOPE_DENIED" | "SCOPE_KIND_NOT_IMPLEMENTED";
}

export async function resolvePermissionWithAssignedScope(
  context: AuthorizationContext | null | undefined,
  permission: PermissionName,
  target: unknown,
  dependencies: TeacherAssignedScopeDependencies,
): Promise<ScopeAuthorizationDecision> {
  const permissionDecision = resolveActorPermission(context, permission);
  if (permissionDecision.decision === "ALLOW") {
    return Object.freeze({ decision: "ALLOW", permission: permissionDecision, scope: null, reasonCode: "PERMISSION_ALLOWED" });
  }
  if (permissionDecision.decision !== "REQUIRES_SCOPE") {
    return Object.freeze({ decision: "DENY", permission: permissionDecision, scope: null, reasonCode: "PERMISSION_DENIED" });
  }
  if (permissionDecision.requiredScope !== "assigned") {
    return Object.freeze({ decision: "DENY", permission: permissionDecision, scope: null, reasonCode: "SCOPE_KIND_NOT_IMPLEMENTED" });
  }
  const scope = await resolveTeacherAssignedScope(context, context?.workspace.workspaceId ?? "", target, dependencies);
  return Object.freeze({
    decision: scope.decision === "SCOPE_ALLOWED" ? "ALLOW" : "DENY",
    permission: permissionDecision,
    scope,
    reasonCode: scope.decision === "SCOPE_ALLOWED" ? "PERMISSION_ALLOWED" : "SCOPE_DENIED",
  });
}
