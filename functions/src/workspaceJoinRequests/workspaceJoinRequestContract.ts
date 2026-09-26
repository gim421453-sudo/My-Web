import type { AuthorityDocumentSnapshot, WorkspaceRole } from "../authz/authorizationTypes.js";
import { isWorkspaceRole } from "../authz/authorizationTypes.js";
import { isPlainRecord, isValidDocumentId } from "../authz/resolverUtils.js";
import { sha256Canonical } from "../operations/operationContract.js";
import { OperationError } from "../operations/operationErrors.js";
import type { CanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";

export interface CanonicalWorkspaceJoinRequest {
  readonly schemaVersion: 1;
  readonly requestType: "WORKSPACE_JOIN";
  readonly requestId: string;
  readonly applicantUid: string;
  readonly workspaceId: string;
  readonly invitationId: string;
  readonly requestedRole: WorkspaceRole;
  readonly status: "pending" | "approved" | "rejected";
  readonly source: "trusted_ingress";
}

const REQUEST_KEYS = new Set([
  "schemaVersion", "requestType", "requestId", "applicantUid", "workspaceId",
  "invitationId", "requestedRole", "status", "source", "createdAt", "updatedAt",
  "approvedAt", "approvedBy", "rejectedAt", "rejectedBy",
]);
const GUARD_KEYS = new Set([
  "schemaVersion", "requestType", "applicantUid", "workspaceId", "status",
  "pendingRequestId", "lastRequestId", "lastDecision", "createdAt", "updatedAt",
]);

function fail(requestId: string): never {
  throw new OperationError("FAILED_PRECONDITION", requestId);
}

export function parseCanonicalWorkspaceJoinRequest(
  snapshot: AuthorityDocumentSnapshot,
  expectedRequestId: string,
  requestId: string,
): CanonicalWorkspaceJoinRequest {
  if (!snapshot.exists || !isPlainRecord(snapshot.data)) return fail(requestId);
  const data = snapshot.data;
  if (Object.keys(data).some((key) => !REQUEST_KEYS.has(key))
    || data.schemaVersion !== 1
    || data.requestType !== "WORKSPACE_JOIN"
    || data.requestId !== expectedRequestId
    || !isValidDocumentId(data.applicantUid)
    || !isValidDocumentId(data.workspaceId)
    || !isValidDocumentId(data.invitationId)
    || !isWorkspaceRole(data.requestedRole)
    || !["pending", "approved", "rejected"].includes(String(data.status || ""))
    || data.source !== "trusted_ingress"
    || data.createdAt === undefined
    || data.updatedAt === undefined) {
    return fail(requestId);
  }
  if (data.status === "pending"
    && ["approvedAt", "approvedBy", "rejectedAt", "rejectedBy"].some(
      (key) => data[key] !== undefined,
    )) {
    return fail(requestId);
  }
  return Object.freeze({ ...data }) as unknown as CanonicalWorkspaceJoinRequest;
}

function uniquenessKey(applicantUid: string, workspaceId: string): string {
  return sha256Canonical({ applicantUid, workspaceId, requestType: "WORKSPACE_JOIN" });
}

function parseGuard(
  snapshot: AuthorityDocumentSnapshot,
  applicantUid: string,
  workspaceId: string,
  requestId: string,
): "MISSING" | "PENDING" | "RELEASED" {
  if (!snapshot.exists) return "MISSING";
  if (!isPlainRecord(snapshot.data)) return fail(requestId);
  const data = snapshot.data;
  if (Object.keys(data).some((key) => !GUARD_KEYS.has(key))
    || data.schemaVersion !== 1
    || data.requestType !== "WORKSPACE_JOIN"
    || data.applicantUid !== applicantUid
    || data.workspaceId !== workspaceId
    || !["pending", "released"].includes(String(data.status || ""))
    || data.createdAt === undefined
    || data.updatedAt === undefined) {
    return fail(requestId);
  }
  if (data.status === "pending") {
    if (!isValidDocumentId(data.pendingRequestId)) return fail(requestId);
    return "PENDING";
  }
  if (data.pendingRequestId !== null
    || !isValidDocumentId(data.lastRequestId)
    || !["approved", "rejected"].includes(String(data.lastDecision || ""))) {
    return fail(requestId);
  }
  return "RELEASED";
}

export async function reservePendingWorkspaceJoinRequest(
  repositories: CanonicalAuthorityRepositories,
  applicantUid: string,
  workspaceId: string,
  pendingRequestId: string,
  requestId: string,
): Promise<void> {
  const key = uniquenessKey(applicantUid, workspaceId);
  const snapshot = await repositories.workspaceJoinRequests.getUniqueness(key, requestId);
  const state = parseGuard(snapshot, applicantUid, workspaceId, requestId);
  if (state === "PENDING") throw new OperationError("CONFLICT", requestId);
  const now = repositories.now;
  if (state === "MISSING") {
    repositories.workspaceJoinRequests.createUniqueness(key, Object.freeze({
      schemaVersion: 1,
      requestType: "WORKSPACE_JOIN",
      applicantUid,
      workspaceId,
      status: "pending",
      pendingRequestId,
      createdAt: now,
      updatedAt: now,
    }), requestId);
  } else {
    repositories.workspaceJoinRequests.updateUniqueness(key, Object.freeze({
      status: "pending",
      pendingRequestId,
      lastRequestId: null,
      lastDecision: null,
      updatedAt: now,
    }), requestId);
  }
}

export async function releasePendingWorkspaceJoinRequest(
  repositories: CanonicalAuthorityRepositories,
  request: CanonicalWorkspaceJoinRequest,
  decision: "approved" | "rejected",
  requestId: string,
): Promise<void> {
  const key = uniquenessKey(request.applicantUid, request.workspaceId);
  const snapshot = await repositories.workspaceJoinRequests.getUniqueness(key, requestId);
  const state = parseGuard(snapshot, request.applicantUid, request.workspaceId, requestId);
  if (state !== "PENDING" || snapshot.data?.pendingRequestId !== request.requestId) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  repositories.workspaceJoinRequests.updateUniqueness(key, Object.freeze({
    status: "released",
    pendingRequestId: null,
    lastRequestId: request.requestId,
    lastDecision: decision,
    updatedAt: repositories.now,
  }), requestId);
}

