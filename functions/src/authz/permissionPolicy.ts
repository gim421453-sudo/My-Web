import type { WorkspaceRole } from "./authorizationTypes.js";
import {
  PERMISSION_CATALOG,
  ROLE_PERMISSION_POLICY_VERSION,
  isPermissionName,
  type PermissionMetadata,
  type PermissionName,
} from "./permissions.js";

export type PermissionPolicyRole = "system_owner" | WorkspaceRole;

export interface PermissionPolicyRule {
  readonly role: PermissionPolicyRole;
  readonly permission: PermissionName;
  readonly granted: boolean;
  readonly metadata: PermissionMetadata;
  readonly policyVersion: typeof ROLE_PERMISSION_POLICY_VERSION;
}

const POLICY_ROLES = Object.freeze([
  "system_owner",
  "super_manager",
  "manager",
  "teacher",
  "normal",
  "viewer",
  "print_account",
] as const satisfies readonly PermissionPolicyRole[]);

function permissionList(names: readonly PermissionName[]): readonly PermissionName[] {
  return Object.freeze([...names]);
}

// This is intentionally an explicit allowlist. It neither expands role rank nor
// turns catalog membership into authority for an unlisted role.
export const ROLE_PERMISSION_POLICY: Readonly<Record<PermissionPolicyRole, readonly PermissionName[]>> = Object.freeze({
  system_owner: permissionList([
    "system.owner.manage",
    "workspace.read",
    "workspace.settings.update",
    "workspace.lifecycle.manage",
    "workspace.mode.change",
    "member.read",
    "member.role.assign",
    "member.role.change",
    "member.status.change",
    "member.remove",
    "invitation.read",
    "invitation.create",
    "invitation.revoke",
    "application.review",
    "join.review",
    "account.disable",
    "account.enable",
    "teaching_assignment.manage",
    "student.enrollment.manage",
    "student.registry.manage",
    "academic.registry.manage",
  ]),
  super_manager: permissionList([
    "workspace.read",
    "workspace.settings.update",
    "member.read",
    "member.role.assign",
    "member.role.change",
    "member.status.change",
    "member.remove",
    "invitation.read",
    "invitation.create",
    "invitation.revoke",
    "teaching_assignment.manage",
    "student.enrollment.manage",
    "student.registry.manage",
    "academic.registry.manage",
  ]),
  manager: permissionList([
    "workspace.read",
    "workspace.settings.update",
    "member.read",
    "member.role.assign",
    "member.role.change",
    "member.status.change",
    "member.remove",
    "invitation.read",
    "invitation.create",
    "invitation.revoke",
  ]),
  teacher: permissionList([
    "student.read",
    "attendance.read",
    "attendance.write",
    "grade.read",
    "grade.write",
    "record.read",
    "record.write",
  ]),
  normal: permissionList(["workspace.read"]),
  viewer: permissionList(["workspace.read"]),
  print_account: permissionList(["workspace.read"]),
});

const metadataByPermission = new Map<PermissionName, PermissionMetadata>(
  PERMISSION_CATALOG.map((metadata) => [metadata.name, metadata]),
);

export function isPermissionPolicyRole(value: unknown): value is PermissionPolicyRole {
  return typeof value === "string" && (POLICY_ROLES as readonly string[]).includes(value);
}

export function getPermissionMetadata(permission: PermissionName): PermissionMetadata {
  const metadata = metadataByPermission.get(permission);
  if (!metadata) throw new Error("permission catalog invariant failed");
  return metadata;
}

export function getPermissionPolicyRule(
  role: unknown,
  permission: unknown,
): PermissionPolicyRule | null {
  if (!isPermissionPolicyRole(role) || !isPermissionName(permission)) return null;
  return Object.freeze({
    role,
    permission,
    granted: ROLE_PERMISSION_POLICY[role].includes(permission),
    metadata: getPermissionMetadata(permission),
    policyVersion: ROLE_PERMISSION_POLICY_VERSION,
  });
}
