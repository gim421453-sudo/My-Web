import {
  createSessionWarning,
  isAccountStatus,
  normalizeAccountStatus,
  resolveGlobalRole,
} from "./authNormalization";
import type {
  AccountStatus,
  AuthPhase,
  SessionWarning,
  UserDocumentData,
} from "./authTypes";
import {
  GLOBAL_ROLES,
  isGlobalRole,
  isWorkspaceRole,
  type GlobalRole,
  type WorkspaceRole,
} from "../permissions/roles";
import { normalizeWorkspaceMembership } from "../workspace/membershipService";
import type { WorkspaceMembership } from "../workspace/workspaceTypes";

export type AuthComparisonSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type AuthComparisonErrorKind =
  | "none"
  | "permission-denied"
  | "resource-exhausted"
  | "network-error"
  | "user-document-missing"
  | "unknown";

export interface AuthComparisonFixture {
  name: string;
  authUserExists: boolean;
  emailVerified?: boolean;
  userDocumentExists?: boolean;
  userDocument?: UserDocumentData;
  systemOwnerDocumentExists?: boolean;
  workspaceExists?: boolean;
  canonicalMembership?: WorkspaceMembership | null;
  legacyMembership?: WorkspaceMembership | null;
  localWorkspaceId?: string | null;
  memoryWorkspaceId?: string | null;
  legacyError?: AuthComparisonErrorKind;
  newError?: AuthComparisonErrorKind;
}

export interface AuthPathInterpretation {
  path: "legacy" | "new" | "canonical";
  uidExists: boolean;
  emailVerified: boolean;
  phase: AuthPhase;
  isAuthenticated: boolean;
  status: AccountStatus | "unknown";
  globalRole: GlobalRole | "unknown";
  isSystemOwner: boolean;
  currentWorkspaceIdPresent: boolean;
  currentWorkspaceRole: WorkspaceRole | null;
  membershipSource:
    | "canonical"
    | "legacy"
    | "local"
    | "memory"
    | "system-owner-document"
    | "none";
  warnings: string[];
  errorCategory: AuthComparisonErrorKind;
  destination: string;
  automaticSignOut: boolean;
  firestoreWrite: boolean;
}

export interface AuthMismatch {
  field: keyof AuthPathInterpretation | "warnings";
  legacyValue: unknown;
  newValue: unknown;
  severity: AuthComparisonSeverity;
  reason: string;
}

export interface AuthComparisonResult {
  fixtureName: string;
  legacy: AuthPathInterpretation;
  new: AuthPathInterpretation;
  canonical: AuthPathInterpretation;
  mismatches: AuthMismatch[];
  hasCriticalMismatch: boolean;
  hasHighMismatch: boolean;
}

function warningCodes(warnings: readonly SessionWarning[]): string[] {
  return [...new Set(warnings.map((warning) => warning.code))].sort();
}

function errorWarnings(kind: AuthComparisonErrorKind): string[] {
  if (kind === "permission-denied") return ["SESSION_READ_PERMISSION_DENIED"];
  if (kind === "resource-exhausted") return ["SESSION_READ_QUOTA_EXCEEDED"];
  if (kind === "network-error") return ["SESSION_READ_NETWORK_ERROR"];
  if (kind === "user-document-missing") return ["USER_DOCUMENT_MISSING"];
  return [];
}

function normalizeErrorKind(kind: AuthComparisonErrorKind | undefined): AuthComparisonErrorKind {
  return kind ?? "none";
}

function normalizeStatusWithInvalidWarning(data: UserDocumentData | undefined): {
  status: AccountStatus;
  warnings: string[];
} {
  if (data && Object.prototype.hasOwnProperty.call(data, "status") && !isAccountStatus(data.status)) {
    return {
      status: "pending",
      warnings: ["INVALID_STATUS"],
    };
  }

  const normalized = normalizeAccountStatus(data ?? {});
  return {
    status: normalized.status,
    warnings: warningCodes(normalized.warnings),
  };
}

function resolveWorkspaceRoleFromMembership(
  membership: WorkspaceMembership | null | undefined,
): { role: WorkspaceRole | null; warnings: string[] } {
  if (!membership) return { role: null, warnings: [] };
  const normalized = normalizeWorkspaceMembership(membership);
  return {
    role: normalized.role,
    warnings: warningCodes(normalized.warnings),
  };
}

function destinationFor(params: {
  authUserExists: boolean;
  phase: AuthPhase;
  status: AccountStatus | "unknown";
  error: AuthComparisonErrorKind;
}): string {
  if (!params.authUserExists || params.phase === "signed_out") return "login";
  if (params.error !== "none") return "safe-error";
  if (params.status === "pending") return "account-pending";
  if (params.status === "rejected") return "account-rejected";
  if (params.status === "disabled") return "account-disabled";
  return "authenticated-screen";
}

function globalRoleFromUserDocument(fixture: AuthComparisonFixture): {
  globalRole: GlobalRole | "unknown";
  isSystemOwner: boolean;
  warnings: string[];
} {
  const data = fixture.userDocument ?? {};
  const warnings: string[] = [];
  if (data.globalRole !== undefined && !isGlobalRole(data.globalRole)) {
    warnings.push("INVALID_GLOBAL_ROLE");
  }
  const resolved = resolveGlobalRole({
    systemOwnerExists: !!fixture.systemOwnerDocumentExists,
    usersGlobalRole: data.globalRole,
    legacyRole: data.role,
    legacyCurrentRole: data.currentRole,
    legacyWorkspaceRole: data.workspaceRole,
  });
  warnings.push(...warningCodes(resolved.warnings));

  return {
    globalRole: resolved.globalRole,
    isSystemOwner: resolved.globalRole === GLOBAL_ROLES.SYSTEM_OWNER,
    warnings: [...new Set(warnings)].sort(),
  };
}

function workspaceIdFromUser(data: UserDocumentData | undefined): string | null {
  const value = data?.currentWorkspaceId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validateWorkspaceAccessForComparison(fixture: AuthComparisonFixture): {
  currentWorkspaceIdPresent: boolean;
  currentWorkspaceRole: WorkspaceRole | null;
  membershipSource: AuthPathInterpretation["membershipSource"];
  warnings: string[];
} {
  const currentWorkspaceId = workspaceIdFromUser(fixture.userDocument);
  const staleWorkspaceId = currentWorkspaceId || fixture.memoryWorkspaceId || fixture.localWorkspaceId || null;
  const warnings: string[] = [];

  if (!staleWorkspaceId) {
    return {
      currentWorkspaceIdPresent: false,
      currentWorkspaceRole: null,
      membershipSource: "none",
      warnings,
    };
  }

  if (fixture.workspaceExists === false) {
    warnings.push("WORKSPACE_DOCUMENT_MISSING", "CURRENT_WORKSPACE_NOT_ACCESSIBLE");
    return {
      currentWorkspaceIdPresent: false,
      currentWorkspaceRole: null,
      membershipSource: "none",
      warnings,
    };
  }

  if (fixture.canonicalMembership) {
    const role = resolveWorkspaceRoleFromMembership(fixture.canonicalMembership);
    return {
      currentWorkspaceIdPresent: true,
      currentWorkspaceRole: role.role,
      membershipSource: "canonical",
      warnings: role.warnings,
    };
  }

  if (fixture.legacyMembership) {
    const role = resolveWorkspaceRoleFromMembership(fixture.legacyMembership);
    return {
      currentWorkspaceIdPresent: true,
      currentWorkspaceRole: role.role,
      membershipSource: "legacy",
      warnings: [...role.warnings, "LEGACY_ONLY_MEMBERSHIP"],
    };
  }

  warnings.push("MEMBERSHIP_MISSING", "CURRENT_WORKSPACE_NOT_ACCESSIBLE");
  return {
    currentWorkspaceIdPresent: false,
    currentWorkspaceRole: null,
    membershipSource: "none",
    warnings,
  };
}

function createBaseResult(
  fixture: AuthComparisonFixture,
  path: AuthPathInterpretation["path"],
  error: AuthComparisonErrorKind,
): AuthPathInterpretation {
  if (!fixture.authUserExists) {
    return {
      path,
      uidExists: false,
      emailVerified: false,
      phase: "signed_out",
      isAuthenticated: false,
      status: "unknown",
      globalRole: "unknown",
      isSystemOwner: false,
      currentWorkspaceIdPresent: false,
      currentWorkspaceRole: null,
      membershipSource: "none",
      warnings: errorWarnings(error),
      errorCategory: error,
      destination: "login",
      automaticSignOut: false,
      firestoreWrite: false,
    };
  }

  if (error !== "none") {
    const status = normalizeStatusWithInvalidWarning(fixture.userDocument).status;
    const role = globalRoleFromUserDocument(fixture);
    return {
      path,
      uidExists: true,
      emailVerified: !!fixture.emailVerified,
      phase: "error",
      isAuthenticated: true,
      status,
      globalRole: role.globalRole,
      isSystemOwner: role.isSystemOwner,
      currentWorkspaceIdPresent: false,
      currentWorkspaceRole: null,
      membershipSource: "none",
      warnings: [...new Set([...role.warnings, ...errorWarnings(error)])].sort(),
      errorCategory: error,
      destination: "safe-error",
      automaticSignOut: false,
      firestoreWrite: false,
    };
  }

  if (fixture.userDocumentExists === false) {
    return {
      path,
      uidExists: true,
      emailVerified: !!fixture.emailVerified,
      phase: "error",
      isAuthenticated: true,
      status: "pending",
      globalRole: "user",
      isSystemOwner: false,
      currentWorkspaceIdPresent: false,
      currentWorkspaceRole: null,
      membershipSource: "none",
      warnings: ["USER_DOCUMENT_MISSING"],
      errorCategory: "user-document-missing",
      destination: "safe-error",
      automaticSignOut: false,
      firestoreWrite: false,
    };
  }

  const status = normalizeStatusWithInvalidWarning(fixture.userDocument);
  const role = globalRoleFromUserDocument(fixture);
  const phase: AuthPhase = status.status === "active"
    ? "authenticated"
    : "account_action_required";

  return {
    path,
    uidExists: true,
    emailVerified: !!fixture.emailVerified,
    phase,
    isAuthenticated: true,
    status: status.status,
    globalRole: role.globalRole,
    isSystemOwner: role.isSystemOwner,
    currentWorkspaceIdPresent: false,
    currentWorkspaceRole: null,
    membershipSource: "none",
    warnings: [...new Set([...status.warnings, ...role.warnings])].sort(),
    errorCategory: "none",
    destination: destinationFor({
      authUserExists: true,
      phase,
      status: status.status,
      error: "none",
    }),
    automaticSignOut: false,
    firestoreWrite: false,
  };
}

export function resolveLegacyAuthComparison(fixture: AuthComparisonFixture): AuthPathInterpretation {
  const base = createBaseResult(fixture, "legacy", normalizeErrorKind(fixture.legacyError));
  if (!base.isAuthenticated || base.errorCategory !== "none" || base.status !== "active") return base;

  const workspace = validateWorkspaceAccessForComparison(fixture);

  return {
    ...base,
    currentWorkspaceIdPresent: workspace.currentWorkspaceIdPresent,
    currentWorkspaceRole: workspace.currentWorkspaceRole,
    membershipSource: workspace.membershipSource,
    warnings: [
      ...new Set([
        ...base.warnings,
        ...workspace.warnings,
      ]),
    ].sort(),
  };
}

export function resolveNewAuthComparison(fixture: AuthComparisonFixture): AuthPathInterpretation {
  const base = createBaseResult(fixture, "new", normalizeErrorKind(fixture.newError));
  if (!base.isAuthenticated || base.errorCategory !== "none" || base.status !== "active") return base;

  const workspace = validateWorkspaceAccessForComparison(fixture);
  return {
    ...base,
    currentWorkspaceIdPresent: workspace.currentWorkspaceIdPresent,
    currentWorkspaceRole: workspace.currentWorkspaceRole,
    membershipSource: workspace.membershipSource,
    warnings: [...new Set([...base.warnings, ...workspace.warnings])].sort(),
  };
}

export function resolveCanonicalAuthComparison(fixture: AuthComparisonFixture): AuthPathInterpretation {
  const next = resolveNewAuthComparison(fixture);
  return {
    ...next,
    path: "canonical",
  };
}

function severityForField(field: AuthMismatch["field"]): AuthComparisonSeverity {
  if (
    field === "isAuthenticated" ||
    field === "globalRole" ||
    field === "isSystemOwner" ||
    field === "automaticSignOut" ||
    field === "firestoreWrite"
  ) {
    return "CRITICAL";
  }
  if (
    field === "status" ||
    field === "currentWorkspaceIdPresent" ||
    field === "currentWorkspaceRole" ||
    field === "membershipSource"
  ) {
    return "HIGH";
  }
  if (field === "warnings" || field === "errorCategory" || field === "destination") {
    return "MEDIUM";
  }
  return "LOW";
}

function comparableWarningValue(value: readonly string[]): string {
  return [...value].sort().join("|");
}

export function compareLegacyAndNewAuth(
  fixture: AuthComparisonFixture,
): AuthComparisonResult {
  const legacy = resolveLegacyAuthComparison(fixture);
  const next = resolveNewAuthComparison(fixture);
  const canonical = resolveCanonicalAuthComparison(fixture);
  const fields: AuthMismatch["field"][] = [
    "uidExists",
    "emailVerified",
    "phase",
    "isAuthenticated",
    "status",
    "globalRole",
    "isSystemOwner",
    "currentWorkspaceIdPresent",
    "currentWorkspaceRole",
    "membershipSource",
    "errorCategory",
    "destination",
    "automaticSignOut",
    "firestoreWrite",
  ];
  const mismatches: AuthMismatch[] = [];

  for (const field of fields) {
    if (legacy[field] !== next[field]) {
      mismatches.push({
        field,
        legacyValue: legacy[field],
        newValue: next[field],
        severity: severityForField(field),
        reason: `${String(field)} differs between legacy and new auth interpretation.`,
      });
    }
  }

  if (comparableWarningValue(legacy.warnings) !== comparableWarningValue(next.warnings)) {
    mismatches.push({
      field: "warnings",
      legacyValue: legacy.warnings,
      newValue: next.warnings,
      severity: "MEDIUM",
      reason: "warning sets differ between legacy and new auth interpretation.",
    });
  }

  return {
    fixtureName: fixture.name,
    legacy,
    new: next,
    canonical,
    mismatches,
    hasCriticalMismatch: mismatches.some((mismatch) => mismatch.severity === "CRITICAL"),
    hasHighMismatch: mismatches.some((mismatch) => mismatch.severity === "HIGH"),
  };
}

export function compareAuthFixtures(
  fixtures: readonly AuthComparisonFixture[],
): AuthComparisonResult[] {
  return fixtures.map(compareLegacyAndNewAuth);
}
