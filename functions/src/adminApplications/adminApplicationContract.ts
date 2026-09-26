import type { AuthorityDocumentSnapshot, WorkspaceRole } from "../authz/authorizationTypes.js";
import { isWorkspaceRole } from "../authz/authorizationTypes.js";
import { isPlainRecord, isValidDocumentId } from "../authz/resolverUtils.js";
import { OperationError } from "../operations/operationErrors.js";
import { sha256Canonical } from "../operations/operationContract.js";

export const ADMIN_APPLICATION_TYPES = Object.freeze([
  "WORKSPACE_ACCESS",
  "WORKSPACE_BOOTSTRAP",
] as const);
export const SELF_SERVICE_WORKSPACE_ROLES = Object.freeze([
  "teacher",
  "normal",
  "viewer",
  "print_account",
] as const);

export type AdminApplicationType = typeof ADMIN_APPLICATION_TYPES[number];
export type AdminApplicationStatus = "pending" | "approved" | "rejected";
export type AdminApplicationSource = "trusted_ingress" | "trusted_migration";

const APPLICATION_KEYS = new Set([
  "schemaVersion",
  "applicationType",
  "applicantUid",
  "workspaceId",
  "requestedWorkspaceName",
  "provisionedWorkspaceId",
  "requestedRole",
  "status",
  "source",
  "reason",
  "createdAt",
  "updatedAt",
  "approvedAt",
  "approvedBy",
  "rejectedAt",
  "rejectedBy",
]);
const APPLICATION_SOURCES = new Set<AdminApplicationSource>([
  "trusted_ingress",
  "trusted_migration",
]);
const APPLICATION_STATUSES = new Set<AdminApplicationStatus>([
  "pending",
  "approved",
  "rejected",
]);
const PENDING_FORBIDDEN_KEYS = ["approvedAt", "approvedBy", "rejectedAt", "rejectedBy"];

export interface CanonicalAdminApplication {
  readonly schemaVersion: 1;
  readonly applicationType: AdminApplicationType;
  readonly applicantUid: string;
  readonly workspaceId: string | null;
  readonly requestedWorkspaceName: string | null;
  readonly provisionedWorkspaceId: string | null;
  readonly requestedRole: WorkspaceRole;
  readonly status: AdminApplicationStatus;
  readonly source: AdminApplicationSource;
  readonly reason: string | null;
}

function fail(requestId: string): never {
  throw new OperationError("FAILED_PRECONDITION", requestId);
}

function optionalReason(value: unknown, requestId: string): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string") return fail(requestId);
  const normalized = value.trim();
  if (!normalized || normalized.length > 500) return fail(requestId);
  return normalized;
}

export function isSelfServiceWorkspaceRole(value: unknown): value is WorkspaceRole {
  return isWorkspaceRole(value)
    && (SELF_SERVICE_WORKSPACE_ROLES as readonly string[]).includes(value);
}

export function parseCanonicalAdminApplication(
  snapshot: AuthorityDocumentSnapshot,
  requestId: string,
): CanonicalAdminApplication {
  if (!snapshot.exists) throw new OperationError("NOT_FOUND", requestId);
  if (!isPlainRecord(snapshot.data)) return fail(requestId);
  const data = snapshot.data;
  if (Object.keys(data).some((key) => !APPLICATION_KEYS.has(key))) return fail(requestId);
  if (data.schemaVersion !== 1
    || !(ADMIN_APPLICATION_TYPES as readonly unknown[]).includes(data.applicationType)
    || !isValidDocumentId(data.applicantUid)
    || !isWorkspaceRole(data.requestedRole)
    || typeof data.status !== "string"
    || !APPLICATION_STATUSES.has(data.status as AdminApplicationStatus)
    || typeof data.source !== "string"
    || !APPLICATION_SOURCES.has(data.source as AdminApplicationSource)
    || data.createdAt === undefined
    || data.updatedAt === undefined) {
    return fail(requestId);
  }

  const applicationType = data.applicationType as AdminApplicationType;
  let workspaceId: string | null = null;
  let requestedWorkspaceName: string | null = null;
  let provisionedWorkspaceId: string | null = null;
  if (applicationType === "WORKSPACE_ACCESS") {
    if (!isValidDocumentId(data.workspaceId)
      || data.requestedWorkspaceName !== undefined
      || data.provisionedWorkspaceId !== undefined) {
      return fail(requestId);
    }
    workspaceId = data.workspaceId;
  } else {
    if (data.workspaceId !== null
      || typeof data.requestedWorkspaceName !== "string"
      || !data.requestedWorkspaceName.trim()
      || data.requestedWorkspaceName.trim().length > 120) {
      return fail(requestId);
    }
    requestedWorkspaceName = data.requestedWorkspaceName.trim();
    if (data.status === "approved") {
      if (!isValidDocumentId(data.provisionedWorkspaceId)) return fail(requestId);
      provisionedWorkspaceId = data.provisionedWorkspaceId;
    } else if (data.provisionedWorkspaceId !== undefined) {
      return fail(requestId);
    }
  }

  if (data.status === "pending"
    && PENDING_FORBIDDEN_KEYS.some((key) => data[key] !== undefined)) {
    return fail(requestId);
  }
  return Object.freeze({
    schemaVersion: 1,
    applicationType,
    applicantUid: data.applicantUid,
    workspaceId,
    requestedWorkspaceName,
    provisionedWorkspaceId,
    requestedRole: data.requestedRole,
    status: data.status as AdminApplicationStatus,
    source: data.source as AdminApplicationSource,
    reason: optionalReason(data.reason, requestId),
  });
}

export function requireWorkspaceAccessApplication(
  application: CanonicalAdminApplication,
  requestId: string,
): asserts application is CanonicalAdminApplication & { readonly workspaceId: string } {
  if (application.applicationType !== "WORKSPACE_ACCESS" || !application.workspaceId) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
}

export function requirePendingApplication(
  application: CanonicalAdminApplication,
  requestId: string,
): void {
  if (application.status !== "pending") throw new OperationError("CONFLICT", requestId);
}

export function requireActiveWorkspace(
  snapshot: AuthorityDocumentSnapshot,
  workspaceId: string,
  requestId: string,
): void {
  if (!snapshot.exists || !isPlainRecord(snapshot.data)) return fail(requestId);
  const data = snapshot.data;
  if (data.workspaceId !== undefined && data.workspaceId !== workspaceId) return fail(requestId);
  if (data.disabled !== undefined && typeof data.disabled !== "boolean") return fail(requestId);
  if (data.archived !== undefined && typeof data.archived !== "boolean") return fail(requestId);
  if (data.disabled === true || data.archived === true) return fail(requestId);
  if (data.status !== undefined) {
    if (typeof data.status !== "string") return fail(requestId);
    if (!["active", "enabled"].includes(data.status)) return fail(requestId);
  }
}

export function requirePendingTargetUser(
  snapshot: AuthorityDocumentSnapshot,
  uid: string,
  requestId: string,
): void {
  if (!snapshot.exists || !isPlainRecord(snapshot.data)) return fail(requestId);
  const data = snapshot.data;
  if (data.uid !== uid) return fail(requestId);
  if (data.disabled !== undefined && typeof data.disabled !== "boolean") return fail(requestId);
  if (data.disabled === true || data.status === "disabled") return fail(requestId);
  if (data.status === "active") throw new OperationError("CONFLICT", requestId);
  if (!["pending", "waiting_approval"].includes(String(data.status || ""))) return fail(requestId);
}

export function adminApplicationUniquenessKey(
  applicantUid: string,
  workspaceId: string | null,
  applicationType: AdminApplicationType = "WORKSPACE_ACCESS",
): string {
  return sha256Canonical({ applicantUid, workspaceId, applicationType });
}
