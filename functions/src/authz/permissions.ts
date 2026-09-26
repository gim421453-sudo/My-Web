export const ROLE_PERMISSION_POLICY_VERSION = "ROLE_PERMISSION_POLICY_V1_2" as const;

export const PERMISSION_DOMAINS = Object.freeze([
  "system",
  "workspace",
  "member",
  "invitation",
  "application",
  "join",
  "account",
  "teaching_assignment",
  "student",
  "academic",
  "attendance",
  "grade",
  "assignment",
  "record",
  "notice",
  "material",
  "schedule",
  "report",
  "print",
  "export",
  "audit",
] as const);

export const PERMISSION_RISK_LEVELS = Object.freeze([
  "low",
  "medium",
  "high",
  "critical",
] as const);

export const PERMISSION_SCOPE_KINDS = Object.freeze([
  "global",
  "workspace",
  "self",
  "assigned",
  "underlying",
  "approved_print_dto",
] as const);

export const PERMISSION_IMPLEMENTATION_STATUSES = Object.freeze([
  "IMPLEMENT_NOW",
  "DEFER",
] as const);

export type PermissionDomain = typeof PERMISSION_DOMAINS[number];
export type PermissionRiskLevel = typeof PERMISSION_RISK_LEVELS[number];
export type PermissionScopeKind = typeof PERMISSION_SCOPE_KINDS[number];
export type PermissionImplementationStatus = typeof PERMISSION_IMPLEMENTATION_STATUSES[number];

interface PermissionCatalogDefinition {
  readonly name: `${PermissionDomain}.${string}`;
  readonly domain: PermissionDomain;
  readonly riskLevel: PermissionRiskLevel;
  readonly scopeKind: PermissionScopeKind;
  readonly implementationStatus: PermissionImplementationStatus;
  readonly auditRequired: boolean;
  readonly freshAuthRequired: boolean;
  readonly confirmationRequired: boolean;
}

// This catalog is contract data only. It performs no authority resolution.
export const PERMISSION_CATALOG = Object.freeze([
  { name: "system.owner.manage", domain: "system", riskLevel: "critical", scopeKind: "global", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: true, confirmationRequired: true },
  { name: "system.policy.manage", domain: "system", riskLevel: "critical", scopeKind: "global", implementationStatus: "DEFER", auditRequired: true, freshAuthRequired: true, confirmationRequired: true },
  { name: "system.recovery.execute", domain: "system", riskLevel: "critical", scopeKind: "global", implementationStatus: "DEFER", auditRequired: true, freshAuthRequired: true, confirmationRequired: true },
  { name: "workspace.read", domain: "workspace", riskLevel: "low", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: false, freshAuthRequired: false, confirmationRequired: false },
  { name: "workspace.settings.update", domain: "workspace", riskLevel: "medium", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: false },
  { name: "workspace.lifecycle.manage", domain: "workspace", riskLevel: "critical", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: true, confirmationRequired: true },
  { name: "workspace.mode.change", domain: "workspace", riskLevel: "critical", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: true, confirmationRequired: true },
  { name: "member.read", domain: "member", riskLevel: "medium", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: false, freshAuthRequired: false, confirmationRequired: false },
  { name: "member.role.assign", domain: "member", riskLevel: "high", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  { name: "member.role.change", domain: "member", riskLevel: "high", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: true, confirmationRequired: true },
  { name: "member.status.change", domain: "member", riskLevel: "high", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  { name: "member.remove", domain: "member", riskLevel: "high", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  { name: "invitation.read", domain: "invitation", riskLevel: "medium", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: false, freshAuthRequired: false, confirmationRequired: false },
  { name: "invitation.create", domain: "invitation", riskLevel: "medium", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: false },
  { name: "invitation.revoke", domain: "invitation", riskLevel: "high", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  { name: "application.review", domain: "application", riskLevel: "high", scopeKind: "global", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  { name: "join.review", domain: "join", riskLevel: "high", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  { name: "account.disable", domain: "account", riskLevel: "critical", scopeKind: "global", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: true, confirmationRequired: true },
  { name: "account.enable", domain: "account", riskLevel: "high", scopeKind: "global", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  // Scope administration; distinct from assignment.write academic content.
  { name: "teaching_assignment.manage", domain: "teaching_assignment", riskLevel: "high", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  { name: "student.read", domain: "student", riskLevel: "high", scopeKind: "assigned", implementationStatus: "IMPLEMENT_NOW", auditRequired: false, freshAuthRequired: false, confirmationRequired: false },
  // Canonical enrollment changes alter authorization-supporting relationships.
  { name: "student.enrollment.manage", domain: "student", riskLevel: "high", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  { name: "student.registry.manage", domain: "student", riskLevel: "high", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  // Structural class/subject registry management only; it grants no academic-data access.
  { name: "academic.registry.manage", domain: "academic", riskLevel: "high", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  { name: "attendance.read", domain: "attendance", riskLevel: "high", scopeKind: "assigned", implementationStatus: "IMPLEMENT_NOW", auditRequired: false, freshAuthRequired: false, confirmationRequired: false },
  { name: "attendance.write", domain: "attendance", riskLevel: "high", scopeKind: "assigned", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: false },
  { name: "grade.read", domain: "grade", riskLevel: "high", scopeKind: "assigned", implementationStatus: "IMPLEMENT_NOW", auditRequired: false, freshAuthRequired: false, confirmationRequired: false },
  { name: "grade.write", domain: "grade", riskLevel: "high", scopeKind: "assigned", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: false },
  { name: "grade.approve", domain: "grade", riskLevel: "critical", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: true, confirmationRequired: true },
  { name: "assignment.read", domain: "assignment", riskLevel: "medium", scopeKind: "assigned", implementationStatus: "IMPLEMENT_NOW", auditRequired: false, freshAuthRequired: false, confirmationRequired: false },
  { name: "assignment.write", domain: "assignment", riskLevel: "medium", scopeKind: "assigned", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: false },
  { name: "record.read", domain: "record", riskLevel: "high", scopeKind: "assigned", implementationStatus: "IMPLEMENT_NOW", auditRequired: false, freshAuthRequired: false, confirmationRequired: false },
  { name: "record.write", domain: "record", riskLevel: "critical", scopeKind: "assigned", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  { name: "notice.read", domain: "notice", riskLevel: "low", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: false, freshAuthRequired: false, confirmationRequired: false },
  { name: "notice.manage", domain: "notice", riskLevel: "medium", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: false },
  { name: "material.read", domain: "material", riskLevel: "low", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: false, freshAuthRequired: false, confirmationRequired: false },
  { name: "material.manage", domain: "material", riskLevel: "medium", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: false },
  { name: "schedule.read", domain: "schedule", riskLevel: "low", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: false, freshAuthRequired: false, confirmationRequired: false },
  { name: "schedule.manage", domain: "schedule", riskLevel: "medium", scopeKind: "workspace", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: false },
  { name: "report.generate", domain: "report", riskLevel: "high", scopeKind: "underlying", implementationStatus: "IMPLEMENT_NOW", auditRequired: true, freshAuthRequired: false, confirmationRequired: false },
  { name: "print.execute", domain: "print", riskLevel: "high", scopeKind: "approved_print_dto", implementationStatus: "DEFER", auditRequired: true, freshAuthRequired: false, confirmationRequired: false },
  { name: "export.file", domain: "export", riskLevel: "high", scopeKind: "underlying", implementationStatus: "DEFER", auditRequired: true, freshAuthRequired: false, confirmationRequired: true },
  { name: "export.sensitive", domain: "export", riskLevel: "critical", scopeKind: "underlying", implementationStatus: "DEFER", auditRequired: true, freshAuthRequired: true, confirmationRequired: true },
  { name: "audit.read", domain: "audit", riskLevel: "critical", scopeKind: "global", implementationStatus: "DEFER", auditRequired: true, freshAuthRequired: false, confirmationRequired: false },
] as const satisfies readonly PermissionCatalogDefinition[]);

export type PermissionName = typeof PERMISSION_CATALOG[number]["name"];
export type PermissionMetadata = typeof PERMISSION_CATALOG[number];

const permissionNames = new Set<string>(PERMISSION_CATALOG.map((permission) => permission.name));
const permissionDomains = new Set<string>(PERMISSION_DOMAINS);
const permissionRiskLevels = new Set<string>(PERMISSION_RISK_LEVELS);
const permissionScopeKinds = new Set<string>(PERMISSION_SCOPE_KINDS);
const permissionStatuses = new Set<string>(PERMISSION_IMPLEMENTATION_STATUSES);
const roleNameSegments = new Set(["system_owner", "super_manager", "manager", "teacher", "normal", "viewer", "print_account"]);
const permissionNamePattern = /^[a-z][a-z_]*\.[a-z][a-z_]*(?:\.[a-z][a-z_]*)*$/;

function assertPermissionCatalog(entries: readonly PermissionCatalogDefinition[]): void {
  const seen = new Set<string>();
  for (const permission of entries) {
    if (!permissionNamePattern.test(permission.name)) throw new Error("invalid permission name");
    if (seen.has(permission.name)) throw new Error("duplicate permission name");
    seen.add(permission.name);
    if (permission.name.split(".")[0] !== permission.domain) throw new Error("permission domain mismatch");
    if (!permissionDomains.has(permission.domain)) throw new Error("unknown permission domain");
    if (!permissionRiskLevels.has(permission.riskLevel)) throw new Error("unknown permission risk level");
    if (!permissionScopeKinds.has(permission.scopeKind)) throw new Error("unknown permission scope kind");
    if (!permissionStatuses.has(permission.implementationStatus)) throw new Error("unknown permission status");
    if (permission.name.split(".").some((segment) => roleNameSegments.has(segment))) {
      throw new Error("role name cannot be a permission segment");
    }
  }
}

assertPermissionCatalog(PERMISSION_CATALOG);

export const PERMISSION_NAMES = Object.freeze(PERMISSION_CATALOG.map((permission) => permission.name));
export const IMPLEMENT_NOW_PERMISSION_NAMES = Object.freeze(
  PERMISSION_CATALOG.filter((permission) => permission.implementationStatus === "IMPLEMENT_NOW").map((permission) => permission.name),
);
export const DEFERRED_PERMISSION_NAMES = Object.freeze(
  PERMISSION_CATALOG.filter((permission) => permission.implementationStatus === "DEFER").map((permission) => permission.name),
);

export function isPermissionName(value: unknown): value is PermissionName {
  return typeof value === "string" && permissionNames.has(value);
}

// workspace.read is limited to basic workspace metadata, never arbitrary workspace data.
export const WORKSPACE_READ_EXCLUDED_DOMAINS = Object.freeze([
  "student",
  "attendance",
  "grade",
  "record",
  "audit",
  "member",
] as const);
