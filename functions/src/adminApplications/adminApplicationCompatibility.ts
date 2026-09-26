import { isWorkspaceRole, type WorkspaceRole } from "../authz/authorizationTypes.js";
import { isPlainRecord, isValidDocumentId } from "../authz/resolverUtils.js";
import {
  parseCanonicalAdminApplication,
  type AdminApplicationStatus,
  type AdminApplicationType,
} from "./adminApplicationContract.js";

export type LegacyApplicationClassification =
  | "CANONICAL_V1_WORKSPACE_ACCESS"
  | "CANONICAL_V1_WORKSPACE_BOOTSTRAP"
  | "LEGACY_BOOTSTRAP_CANDIDATE"
  | "LEGACY_ACCESS_CANDIDATE"
  | "LEGACY_AMBIGUOUS"
  | "MALFORMED";

export type LegacyMigrationStatus =
  | "MIGRATABLE"
  | "NEEDS_WORKSPACE_RESOLUTION"
  | "NEEDS_ROLE_RESOLUTION"
  | "NEEDS_APPLICATION_TYPE_RESOLUTION"
  | "CONFLICT"
  | "MALFORMED"
  | "ALREADY_CANONICAL";

export interface LegacyMigrationResolution {
  readonly applicationType?: AdminApplicationType;
  readonly workspaceId?: string;
  readonly requestedRole?: WorkspaceRole;
}

export interface LegacyMigrationPlan {
  readonly status: LegacyMigrationStatus;
  readonly classification: LegacyApplicationClassification;
  readonly canonicalPreview?: Readonly<Record<string, unknown>>;
}

const LEGACY_STATUSES = new Set<AdminApplicationStatus>(["pending", "approved", "rejected"]);
const BOOTSTRAP_MARKERS = new Set(["WORKSPACE_BOOTSTRAP", "workspace_bootstrap"]);
const ACCESS_MARKERS = new Set(["WORKSPACE_ACCESS", "workspace_access"]);

function legacyApplicant(data: Record<string, unknown>): string | null {
  const applicantUid = data.applicantUid;
  const uid = data.uid;
  if (applicantUid !== undefined && uid !== undefined && applicantUid !== uid) return null;
  const candidate = applicantUid ?? uid;
  return isValidDocumentId(candidate) ? candidate : null;
}

function explicitLegacyType(data: Record<string, unknown>): AdminApplicationType | null {
  const markers = [data.applicationType, data.requestType, data.type].filter(
    (value): value is string => typeof value === "string",
  );
  const hasBootstrap = markers.some((value) => BOOTSTRAP_MARKERS.has(value));
  const hasAccess = markers.some((value) => ACCESS_MARKERS.has(value));
  if (hasBootstrap === hasAccess) return null;
  return hasBootstrap ? "WORKSPACE_BOOTSTRAP" : "WORKSPACE_ACCESS";
}

function hasInvalidLegacyCore(data: Record<string, unknown>): boolean {
  if (!legacyApplicant(data)) return true;
  if (data.status !== undefined
    && (typeof data.status !== "string" || !LEGACY_STATUSES.has(data.status as AdminApplicationStatus))) {
    return true;
  }
  if (data.workspaceId !== undefined && !isValidDocumentId(data.workspaceId)) return true;
  if (data.requestedRole !== undefined && !isWorkspaceRole(data.requestedRole)) return true;
  return data.createdAt === undefined || data.updatedAt === undefined;
}

export function classifyAdminApplication(value: unknown): LegacyApplicationClassification {
  if (!isPlainRecord(value)) return "MALFORMED";
  if (value.schemaVersion === 1) {
    try {
      const canonical = parseCanonicalAdminApplication({ exists: true, data: value }, "classification");
      return canonical.applicationType === "WORKSPACE_ACCESS"
        ? "CANONICAL_V1_WORKSPACE_ACCESS"
        : "CANONICAL_V1_WORKSPACE_BOOTSTRAP";
    } catch {
      return "MALFORMED";
    }
  }
  if (hasInvalidLegacyCore(value)) return "MALFORMED";
  const explicitType = explicitLegacyType(value);
  if (explicitType === "WORKSPACE_ACCESS") return "LEGACY_ACCESS_CANDIDATE";
  if (explicitType === "WORKSPACE_BOOTSTRAP") return "LEGACY_BOOTSTRAP_CANDIDATE";
  if (isValidDocumentId(value.workspaceId)) return "LEGACY_ACCESS_CANDIDATE";
  if (typeof value.requestedWorkspaceName === "string" && value.requestedWorkspaceName.trim()) {
    return "LEGACY_AMBIGUOUS";
  }
  return "MALFORMED";
}

function conflict<T>(left: T | undefined, right: T | undefined): boolean {
  return left !== undefined && right !== undefined && left !== right;
}

export function planLegacyAdminApplicationMigration(
  value: unknown,
  resolution: LegacyMigrationResolution = {},
): LegacyMigrationPlan {
  const classification = classifyAdminApplication(value);
  if (classification.startsWith("CANONICAL_V1_")) {
    return Object.freeze({ status: "ALREADY_CANONICAL", classification });
  }
  if (classification === "MALFORMED" || !isPlainRecord(value)) {
    return Object.freeze({ status: "MALFORMED", classification: "MALFORMED" });
  }

  const inferredType = classification === "LEGACY_ACCESS_CANDIDATE"
    ? "WORKSPACE_ACCESS"
    : classification === "LEGACY_BOOTSTRAP_CANDIDATE"
      ? "WORKSPACE_BOOTSTRAP"
      : undefined;
  if (conflict(inferredType, resolution.applicationType)) {
    return Object.freeze({ status: "CONFLICT", classification });
  }
  const applicationType = inferredType ?? resolution.applicationType;
  if (!applicationType) {
    return Object.freeze({ status: "NEEDS_APPLICATION_TYPE_RESOLUTION", classification });
  }

  const legacyWorkspaceId = isValidDocumentId(value.workspaceId) ? value.workspaceId : undefined;
  if (conflict(legacyWorkspaceId, resolution.workspaceId)) {
    return Object.freeze({ status: "CONFLICT", classification });
  }
  const workspaceId = legacyWorkspaceId ?? resolution.workspaceId;
  if (applicationType === "WORKSPACE_ACCESS" && !isValidDocumentId(workspaceId)) {
    return Object.freeze({ status: "NEEDS_WORKSPACE_RESOLUTION", classification });
  }

  const legacyRole = isWorkspaceRole(value.requestedRole) ? value.requestedRole : undefined;
  if (conflict(legacyRole, resolution.requestedRole)) {
    return Object.freeze({ status: "CONFLICT", classification });
  }
  const requestedRole = legacyRole ?? resolution.requestedRole;
  if (!isWorkspaceRole(requestedRole)) {
    return Object.freeze({ status: "NEEDS_ROLE_RESOLUTION", classification });
  }

  const applicantUid = legacyApplicant(value);
  if (!applicantUid) return Object.freeze({ status: "MALFORMED", classification });
  const status = typeof value.status === "string" ? value.status : "pending";
  const preview: Record<string, unknown> = {
    schemaVersion: 1,
    applicationType,
    applicantUid,
    workspaceId: applicationType === "WORKSPACE_ACCESS" ? workspaceId : null,
    requestedRole,
    status,
    source: "trusted_migration",
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
  if (applicationType === "WORKSPACE_BOOTSTRAP") {
    if (typeof value.requestedWorkspaceName !== "string" || !value.requestedWorkspaceName.trim()) {
      return Object.freeze({ status: "MALFORMED", classification });
    }
    preview.requestedWorkspaceName = value.requestedWorkspaceName.trim();
  }
  if (typeof value.reason === "string" && value.reason.trim() && value.reason.trim().length <= 500) {
    preview.reason = value.reason.trim();
  }
  return Object.freeze({
    status: "MIGRATABLE",
    classification,
    canonicalPreview: Object.freeze(preview),
  });
}
