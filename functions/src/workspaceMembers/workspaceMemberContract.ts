import type { AuthorityDocumentSnapshot, MembershipSource, WorkspaceRole } from "../authz/authorizationTypes.js";
import { isWorkspaceRole } from "../authz/authorizationTypes.js";
import { hasOnlyKeys, isPlainRecord, MEMBERSHIP_SOURCES } from "../authz/resolverUtils.js";
import { OperationError } from "../operations/operationErrors.js";

const MEMBER_KEYS = new Set([
  "schemaVersion", "uid", "workspaceId", "role", "status", "disabled", "active",
  "source", "createdAt", "createdBy", "updatedAt", "updatedBy", "invitationId",
  "approvalRequestId",
]);
const MEMBER_STATUSES = new Set(["active", "disabled", "inactive"] as const);

export type WorkspaceMemberStatus = "active" | "disabled" | "inactive";

export interface CanonicalWorkspaceMember {
  readonly uid: string;
  readonly workspaceId: string;
  readonly role: WorkspaceRole;
  readonly status: WorkspaceMemberStatus;
  readonly disabled: boolean;
  readonly active: boolean;
  readonly source: MembershipSource;
}

export function parseCanonicalWorkspaceMember(
  snapshot: AuthorityDocumentSnapshot,
  workspaceId: string,
  uid: string,
  requestId: string,
): CanonicalWorkspaceMember {
  if (!snapshot.exists) throw new OperationError("NOT_FOUND", requestId);
  if (!isPlainRecord(snapshot.data) || !hasOnlyKeys(snapshot.data, MEMBER_KEYS)) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  const data = snapshot.data;
  if (data.schemaVersion !== 1 || data.uid !== uid || data.workspaceId !== workspaceId
    || !isWorkspaceRole(data.role) || !MEMBER_STATUSES.has(data.status as WorkspaceMemberStatus)
    || typeof data.disabled !== "boolean" || typeof data.active !== "boolean"
    || !(MEMBERSHIP_SOURCES as readonly unknown[]).includes(data.source)) {
    throw new OperationError("FAILED_PRECONDITION", requestId);
  }
  const stateMatches = (data.status === "active" && data.active === true && data.disabled === false)
    || (data.status === "disabled" && data.active === false && data.disabled === true)
    || (data.status === "inactive" && data.active === false && data.disabled === false);
  if (!stateMatches) throw new OperationError("FAILED_PRECONDITION", requestId);
  return Object.freeze({
    uid,
    workspaceId,
    role: data.role,
    status: data.status as WorkspaceMemberStatus,
    disabled: data.disabled,
    active: data.active,
    source: data.source as MembershipSource,
  });
}

