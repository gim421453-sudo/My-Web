import type { VerifiedActor } from "../auth/verifiedActor.js";
import { isWorkspaceRole, type WorkspaceRole } from "../authz/authorizationTypes.js";
import { resolveSystemOwner } from "../authz/systemOwnerResolver.js";
import { resolveWorkspaceMembership } from "../authz/workspaceMembershipResolver.js";
import { isPlainRecord } from "../authz/resolverUtils.js";
import { OperationError } from "../operations/operationErrors.js";
import {
  encodeManagementCursor,
  validateManagementRead,
  type ManagementReadRequest,
  type ManagementReadResult,
} from "./managementReadContract.js";
import {
  getEmulatorManagementReadStore,
  type ManagementReadDocument,
  type ManagementReadStore,
} from "./managementReadStore.js";

export interface ManagementReadDependencies {
  readonly store?: ManagementReadStore;
}

const WORKSPACE_MANAGEMENT_ROLES: readonly WorkspaceRole[] = Object.freeze([
  "super_manager",
  "manager",
]);

type ManagementMapper = (
  document: ManagementReadDocument,
  request: ManagementReadRequest,
) => Readonly<Record<string, unknown>> | null;

function safeTimestamp(value: unknown): string | null {
  if (typeof value === "string") return value.slice(0, 64);
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (value && typeof value === "object" && "toDate" in value
    && typeof (value as { toDate?: unknown }).toDate === "function") {
    try {
      return (value as { toDate(): Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function safeString(value: unknown, maxLength = 256): string | null {
  return typeof value === "string" && value.length <= maxLength ? value : null;
}

function safeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function safeInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

async function authority(
  request: ManagementReadRequest,
  store: ManagementReadStore,
  workspaceId: string | null,
): Promise<"system_owner" | WorkspaceRole> {
  const owner = await resolveSystemOwner(request.actor, { reader: store });
  if (owner.state === "ACTIVE") return "system_owner";
  if (owner.state === "READ_ERROR") throw new OperationError("INTERNAL", request.requestId);
  if (!workspaceId) throw new OperationError("FORBIDDEN", request.requestId);
  const membership = await resolveWorkspaceMembership(request.actor, workspaceId, { reader: store });
  if (membership.state === "READ_ERROR") throw new OperationError("INTERNAL", request.requestId);
  if (membership.state !== "ACTIVE" || !WORKSPACE_MANAGEMENT_ROLES.includes(membership.role)) {
    throw new OperationError("FORBIDDEN", request.requestId);
  }
  return membership.role;
}

async function requireOwner(request: ManagementReadRequest, store: ManagementReadStore): Promise<void> {
  if (await authority(request, store, null) !== "system_owner") {
    throw new OperationError("FORBIDDEN", request.requestId);
  }
}

function requireWorkspaceTarget(request: ManagementReadRequest): string {
  const workspaceId = request.target.workspaceId;
  if (!workspaceId || request.target.id !== workspaceId) {
    throw new OperationError("INVALID_ARGUMENT", request.requestId);
  }
  return workspaceId;
}

function requireAllTarget(request: ManagementReadRequest): void {
  if (request.target.id !== "all" || request.target.workspaceId !== null) {
    throw new OperationError("INVALID_ARGUMENT", request.requestId);
  }
}

async function paged(
  store: ManagementReadStore,
  path: readonly string[],
  request: ManagementReadRequest,
  mapper: ManagementMapper,
  filters: readonly Readonly<{ field: string; value: string | number | boolean }>[] = [],
): Promise<ManagementReadResult> {
  const documents = await store.listCollection(path, {
    offset: request.offset,
    limit: request.limit + 1,
    filters,
  });
  const hasMore = documents.length > request.limit;
  const page = documents.slice(0, request.limit);
  return Object.freeze({
    items: Object.freeze(page.map((document) => mapper(document, request)).filter((item) => item !== null)),
    nextCursor: hasMore ? encodeManagementCursor(request.offset + request.limit) : null,
  });
}

function mapAdminApplication(document: ManagementReadDocument): Readonly<Record<string, unknown>> {
  const data = document.data;
  const canonical = data.schemaVersion === 1
    && ["WORKSPACE_ACCESS", "WORKSPACE_BOOTSTRAP"].includes(String(data.applicationType || ""))
    && typeof data.applicantUid === "string"
    && ["pending", "approved", "rejected"].includes(String(data.status || ""));
  if (!canonical) {
    return Object.freeze({
      applicationId: document.id,
      classification: "LEGACY_REVIEW_REQUIRED",
      status: "legacy_review_required",
      createdAt: safeTimestamp(data.createdAt),
    });
  }
  return Object.freeze({
    applicationId: document.id,
    classification: "CANONICAL",
    applicationType: String(data.applicationType),
    applicantUid: String(data.applicantUid),
    workspaceId: safeString(data.workspaceId),
    requestedWorkspaceName: safeString(data.requestedWorkspaceName, 120),
    requestedRole: isWorkspaceRole(data.requestedRole) ? data.requestedRole : null,
    status: String(data.status),
    createdAt: safeTimestamp(data.createdAt),
    updatedAt: safeTimestamp(data.updatedAt),
  });
}

function mapJoinRequest(document: ManagementReadDocument): Readonly<Record<string, unknown>> | null {
  const data = document.data;
  if (data.schemaVersion !== 1 || data.requestType !== "WORKSPACE_JOIN"
    || typeof data.applicantUid !== "string" || typeof data.workspaceId !== "string"
    || !isWorkspaceRole(data.requestedRole)
    || !["pending", "approved", "rejected"].includes(String(data.status || ""))) return null;
  return Object.freeze({
    requestId: document.id,
    applicantUid: data.applicantUid,
    workspaceId: data.workspaceId,
    requestedRole: data.requestedRole,
    status: data.status,
    createdAt: safeTimestamp(data.createdAt),
    updatedAt: safeTimestamp(data.updatedAt),
  });
}

function mapWorkspaceMember(document: ManagementReadDocument, request: ManagementReadRequest) {
  const data = document.data;
  if (data.schemaVersion !== 1 || data.uid !== document.id
    || data.workspaceId !== request.target.workspaceId || !isWorkspaceRole(data.role)
    || !["active", "disabled", "inactive"].includes(String(data.status || ""))
    || typeof data.active !== "boolean" || typeof data.disabled !== "boolean") return null;
  return Object.freeze({
    uid: data.uid,
    workspaceId: data.workspaceId,
    role: data.role,
    status: data.status,
    active: data.active,
    disabled: data.disabled,
    createdAt: safeTimestamp(data.createdAt),
    updatedAt: safeTimestamp(data.updatedAt),
  });
}

function mapInvitation(document: ManagementReadDocument, request: ManagementReadRequest) {
  const data = document.data;
  if (data.schemaVersion !== 1 || data.workspaceId !== request.target.workspaceId
    || !isWorkspaceRole(data.targetRole)
    || !["active", "revoked", "exhausted", "expired"].includes(String(data.status || ""))) return null;
  return Object.freeze({
    invitationId: document.id,
    workspaceId: data.workspaceId,
    targetRole: data.targetRole,
    status: data.status,
    maxUses: safeInteger(data.maxUses),
    usedCount: safeInteger(data.usedCount),
    expiresAt: safeTimestamp(data.expiresAt),
    createdAt: safeTimestamp(data.createdAt),
  });
}

function mapWorkspace(document: ManagementReadDocument) {
  const data = document.data;
  if (!isPlainRecord(data)) return null;
  const operationMode = ["integrated_unconfigured", "personal", "school", "academy"]
    .includes(String(data.operationMode || ""))
    ? String(data.operationMode)
    : "integrated_unconfigured";
  return Object.freeze({
    workspaceId: document.id,
    name: safeString(data.name, 120),
    status: safeString(data.status, 32) || "active",
    disabled: safeBoolean(data.disabled),
    archived: safeBoolean(data.archived),
    operationMode,
    operationModeVersion: safeInteger(data.operationModeVersion) || 0,
    updatedAt: safeTimestamp(data.updatedAt),
  });
}

function mapUser(document: ManagementReadDocument) {
  const data = document.data;
  return Object.freeze({
    uid: document.id,
    email: safeString(data.email, 320),
    displayName: safeString(data.displayName, 120),
    emailVerified: safeBoolean(data.emailVerified),
    status: safeString(data.status, 32),
    disabled: safeBoolean(data.disabled),
    currentWorkspaceId: safeString(data.currentWorkspaceId),
    pendingWorkspaceId: safeString(data.pendingWorkspaceId),
    createdAt: safeTimestamp(data.createdAt),
    updatedAt: safeTimestamp(data.updatedAt),
  });
}

function storeFor(dependencies: ManagementReadDependencies): ManagementReadStore {
  return dependencies.store ?? getEmulatorManagementReadStore();
}

export async function trustedListAdminApplications(
  actor: VerifiedActor,
  input: unknown,
  dependencies: ManagementReadDependencies = {},
): Promise<ManagementReadResult> {
  const request = validateManagementRead(actor, input, {
    operation: "management.admin_applications.list",
    targetKind: "admin_applications",
  });
  requireAllTarget(request);
  const store = storeFor(dependencies);
  await requireOwner(request, store);
  return paged(store, ["adminApplications"], request, mapAdminApplication);
}

export async function trustedListWorkspaceJoinRequests(
  actor: VerifiedActor,
  input: unknown,
  dependencies: ManagementReadDependencies = {},
): Promise<ManagementReadResult> {
  const request = validateManagementRead(actor, input, {
    operation: "management.workspace_join_requests.list",
    targetKind: "workspace_join_requests",
  });
  const store = storeFor(dependencies);
  const workspaceId = request.target.workspaceId;
  if (workspaceId === null) {
    requireAllTarget(request);
    await requireOwner(request, store);
    return paged(store, ["workspaceJoinRequests"], request, mapJoinRequest);
  }
  if (request.target.id !== workspaceId) throw new OperationError("INVALID_ARGUMENT", request.requestId);
  await authority(request, store, workspaceId);
  return paged(store, ["workspaceJoinRequests"], request, mapJoinRequest, [{ field: "workspaceId", value: workspaceId }]);
}

export async function trustedListWorkspaceMembers(
  actor: VerifiedActor,
  input: unknown,
  dependencies: ManagementReadDependencies = {},
): Promise<ManagementReadResult> {
  const request = validateManagementRead(actor, input, {
    operation: "management.workspace_members.list",
    targetKind: "workspace_members",
  });
  const workspaceId = requireWorkspaceTarget(request);
  const store = storeFor(dependencies);
  await authority(request, store, workspaceId);
  return paged(store, ["workspaces", workspaceId, "members"], request, mapWorkspaceMember);
}

export async function trustedListInvitations(
  actor: VerifiedActor,
  input: unknown,
  dependencies: ManagementReadDependencies = {},
): Promise<ManagementReadResult> {
  const request = validateManagementRead(actor, input, {
    operation: "management.invitations.list",
    targetKind: "invitations",
  });
  const workspaceId = requireWorkspaceTarget(request);
  const store = storeFor(dependencies);
  await authority(request, store, workspaceId);
  return paged(store, ["authorityInvitations"], request, mapInvitation, [{ field: "workspaceId", value: workspaceId }]);
}

export async function trustedListOwnerWorkspaces(
  actor: VerifiedActor,
  input: unknown,
  dependencies: ManagementReadDependencies = {},
): Promise<ManagementReadResult> {
  const request = validateManagementRead(actor, input, {
    operation: "management.owner_workspaces.list",
    targetKind: "owner_workspaces",
  });
  requireAllTarget(request);
  const store = storeFor(dependencies);
  await requireOwner(request, store);
  return paged(store, ["workspaces"], request, mapWorkspace);
}

export async function trustedListManagementUsers(
  actor: VerifiedActor,
  input: unknown,
  dependencies: ManagementReadDependencies = {},
): Promise<ManagementReadResult> {
  const request = validateManagementRead(actor, input, {
    operation: "management.users.list",
    targetKind: "management_users",
  });
  requireAllTarget(request);
  const store = storeFor(dependencies);
  await requireOwner(request, store);
  return paged(store, ["users"], request, mapUser);
}
