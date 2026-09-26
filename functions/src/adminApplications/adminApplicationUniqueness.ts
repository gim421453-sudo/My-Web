import type { AuthorityDocumentSnapshot } from "../authz/authorizationTypes.js";
import { isPlainRecord, isValidDocumentId } from "../authz/resolverUtils.js";
import { OperationError } from "../operations/operationErrors.js";
import type { CanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";
import {
  adminApplicationUniquenessKey,
  type CanonicalAdminApplication,
} from "./adminApplicationContract.js";

const GUARD_KEYS = new Set([
  "schemaVersion",
  "applicationType",
  "applicantUid",
  "workspaceId",
  "status",
  "pendingApplicationId",
  "lastApplicationId",
  "lastDecision",
  "createdAt",
  "updatedAt",
]);

interface PendingGuardIdentity {
  readonly key: string;
  readonly applicationType: "WORKSPACE_ACCESS" | "WORKSPACE_BOOTSTRAP";
  readonly applicantUid: string;
  readonly workspaceId: string | null;
}

function identity(applicantUid: string, workspaceId: string): PendingGuardIdentity {
  return Object.freeze({
    key: adminApplicationUniquenessKey(applicantUid, workspaceId),
    applicationType: "WORKSPACE_ACCESS",
    applicantUid,
    workspaceId,
  });
}

function bootstrapIdentity(applicantUid: string): PendingGuardIdentity {
  return Object.freeze({
    key: adminApplicationUniquenessKey(applicantUid, null, "WORKSPACE_BOOTSTRAP"),
    applicationType: "WORKSPACE_BOOTSTRAP",
    applicantUid,
    workspaceId: null,
  });
}

function parseGuard(
  snapshot: AuthorityDocumentSnapshot,
  expected: PendingGuardIdentity,
  requestId: string,
): "MISSING" | "PENDING" | "RELEASED" {
  if (!snapshot.exists) return "MISSING";
  if (!isPlainRecord(snapshot.data)) throw new OperationError("FAILED_PRECONDITION", requestId);
  const data = snapshot.data;
  if (Object.keys(data).some((key) => !GUARD_KEYS.has(key))
    || data.schemaVersion !== 1
    || data.applicationType !== expected.applicationType
    || data.applicantUid !== expected.applicantUid
    || data.workspaceId !== expected.workspaceId
    || !["pending", "released"].includes(String(data.status || ""))
    || data.createdAt === undefined
    || data.updatedAt === undefined) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  if (data.status === "pending") {
    if (!isValidDocumentId(data.pendingApplicationId)
      || (data.lastApplicationId !== undefined && data.lastApplicationId !== null)
      || (data.lastDecision !== undefined && data.lastDecision !== null)) {
      throw new OperationError("FAILED_PRECONDITION", requestId);
    }
    return "PENDING";
  }
  if (data.pendingApplicationId !== null
    || !isValidDocumentId(data.lastApplicationId)
    || !["approved", "rejected"].includes(String(data.lastDecision || ""))) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  return "RELEASED";
}

export async function reservePendingApplication(
  repositories: CanonicalAuthorityRepositories,
  applicantUid: string,
  workspaceId: string,
  applicationId: string,
  requestId: string,
): Promise<string> {
  const expected = identity(applicantUid, workspaceId);
  const state = parseGuard(
    await repositories.adminApplications.getUniqueness(expected.key, requestId),
    expected,
    requestId,
  );
  if (state === "PENDING") throw new OperationError("CONFLICT", requestId);
  const now = repositories.now;
  const data = Object.freeze({
    schemaVersion: 1,
    applicationType: "WORKSPACE_ACCESS",
    applicantUid,
    workspaceId,
    status: "pending",
    pendingApplicationId: applicationId,
    createdAt: now,
    updatedAt: now,
  });
  if (state === "MISSING") {
    repositories.adminApplications.createUniqueness(expected.key, data, requestId);
  } else {
    repositories.adminApplications.updateUniqueness(expected.key, Object.freeze({
      status: "pending",
      pendingApplicationId: applicationId,
      lastApplicationId: null,
      lastDecision: null,
      updatedAt: now,
    }), requestId);
  }
  return expected.key;
}

export async function reservePendingBootstrapApplication(
  repositories: CanonicalAuthorityRepositories,
  applicantUid: string,
  applicationId: string,
  requestId: string,
): Promise<string> {
  const expected = bootstrapIdentity(applicantUid);
  const state = parseGuard(
    await repositories.adminApplications.getUniqueness(expected.key, requestId),
    expected,
    requestId,
  );
  if (state === "PENDING") throw new OperationError("CONFLICT", requestId);
  const now = repositories.now;
  const data = Object.freeze({
    schemaVersion: 1,
    applicationType: "WORKSPACE_BOOTSTRAP",
    applicantUid,
    workspaceId: null,
    status: "pending",
    pendingApplicationId: applicationId,
    createdAt: now,
    updatedAt: now,
  });
  if (state === "MISSING") {
    repositories.adminApplications.createUniqueness(expected.key, data, requestId);
  } else {
    repositories.adminApplications.updateUniqueness(expected.key, Object.freeze({
      status: "pending",
      pendingApplicationId: applicationId,
      lastApplicationId: null,
      lastDecision: null,
      updatedAt: now,
    }), requestId);
  }
  return expected.key;
}

export async function releasePendingApplication(
  repositories: CanonicalAuthorityRepositories,
  application: CanonicalAdminApplication,
  applicationId: string,
  decision: "approved" | "rejected",
  requestId: string,
): Promise<void> {
  const expected = application.applicationType === "WORKSPACE_BOOTSTRAP"
    ? bootstrapIdentity(application.applicantUid)
    : application.workspaceId
      ? identity(application.applicantUid, application.workspaceId)
      : null;
  if (!expected) return;
  const snapshot = await repositories.adminApplications.getUniqueness(expected.key, requestId);
  if (!snapshot.exists) {
    if (application.source === "trusted_migration") return;
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  const state = parseGuard(snapshot, expected, requestId);
  if (state !== "PENDING" || snapshot.data?.pendingApplicationId !== applicationId) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  repositories.adminApplications.updateUniqueness(expected.key, Object.freeze({
    status: "released",
    pendingApplicationId: null,
    lastApplicationId: applicationId,
    lastDecision: decision,
    updatedAt: repositories.now,
  }), requestId);
}
