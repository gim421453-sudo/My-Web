import type { VerifiedActor } from "../auth/verifiedActor.js";
import type {
  AuthorityDocumentReader,
  MembershipSource,
  WorkspaceMembershipResolution,
  WorkspaceRole,
} from "./authorizationTypes.js";
import { isWorkspaceRole } from "./authorizationTypes.js";
import {
  defaultAuthorityDocumentReader,
  hasOnlyKeys,
  isPlainRecord,
  isValidDocumentId,
  MEMBERSHIP_SOURCES,
} from "./resolverUtils.js";

const MEMBERSHIP_KEYS = new Set([
  "schemaVersion",
  "uid",
  "workspaceId",
  "role",
  "status",
  "disabled",
  "active",
  "source",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
  "invitationId",
  "approvalRequestId",
]);
const MEMBERSHIP_STATUSES = new Set(["active", "accepted", "disabled", "inactive"]);

export interface WorkspaceMembershipResolverDependencies {
  reader?: AuthorityDocumentReader;
}

export async function resolveWorkspaceMembership(
  actor: Pick<VerifiedActor, "uid">,
  workspaceId: string,
  dependencies: WorkspaceMembershipResolverDependencies = {},
): Promise<WorkspaceMembershipResolution> {
  if (!isValidDocumentId(actor.uid) || !isValidDocumentId(workspaceId)) {
    return Object.freeze({ state: "MALFORMED" });
  }
  const reader = dependencies.reader ?? defaultAuthorityDocumentReader();

  try {
    const snapshot = await reader.getDocument(Object.freeze([
      "workspaces",
      workspaceId,
      "members",
      actor.uid,
    ]));
    if (!snapshot.exists) return Object.freeze({ state: "MISSING" });
    if (!isPlainRecord(snapshot.data) || !hasOnlyKeys(snapshot.data, MEMBERSHIP_KEYS)) {
      return Object.freeze({ state: "MALFORMED" });
    }
    const data = snapshot.data;
    if (data.uid !== undefined && typeof data.uid !== "string") {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (typeof data.uid === "string" && data.uid !== actor.uid) {
      return Object.freeze({ state: "WRONG_UID" });
    }
    if (data.workspaceId !== undefined && typeof data.workspaceId !== "string") {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (typeof data.workspaceId === "string" && data.workspaceId !== workspaceId) {
      return Object.freeze({ state: "WRONG_WORKSPACE" });
    }
    if (data.role !== undefined && !isWorkspaceRole(data.role)) {
      return Object.freeze({ state: "UNKNOWN_ROLE" });
    }
    if (data.schemaVersion !== undefined
      && (typeof data.schemaVersion !== "number" || data.schemaVersion !== 1)) {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (data.status !== undefined
      && (typeof data.status !== "string" || !MEMBERSHIP_STATUSES.has(data.status))) {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (data.disabled !== undefined && typeof data.disabled !== "boolean") {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (data.active !== undefined && typeof data.active !== "boolean") {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (data.source !== undefined && typeof data.source !== "string") {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (data.schemaVersion === undefined || data.source === undefined || data.status === "accepted") {
      return Object.freeze({ state: "MIGRATION_REQUIRED" });
    }
    if (["uid", "workspaceId", "role", "status", "disabled", "active"]
      .some((key) => data[key] === undefined)) {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (!(MEMBERSHIP_SOURCES as readonly unknown[]).includes(data.source)) {
      return Object.freeze({ state: "MIGRATION_REQUIRED" });
    }

    if (data.status === "disabled") {
      return data.disabled === true && data.active === false
        ? Object.freeze({ state: "DISABLED" })
        : Object.freeze({ state: "MALFORMED" });
    }
    if (data.status === "inactive") {
      return data.disabled === false && data.active === false
        ? Object.freeze({ state: "INACTIVE" })
        : Object.freeze({ state: "MALFORMED" });
    }
    if (data.status !== "active" || data.disabled !== false || data.active !== true) {
      return Object.freeze({ state: "MALFORMED" });
    }
    return Object.freeze({
      state: "ACTIVE",
      role: data.role as WorkspaceRole,
      source: data.source as MembershipSource,
    });
  } catch {
    return Object.freeze({ state: "READ_ERROR" });
  }
}
