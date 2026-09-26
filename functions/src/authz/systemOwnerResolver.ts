import type { VerifiedActor } from "../auth/verifiedActor.js";
import type {
  AuthorityDocumentReader,
  SystemOwnerResolution,
  SystemOwnerSource,
} from "./authorizationTypes.js";
import {
  defaultAuthorityDocumentReader,
  hasOnlyKeys,
  isPlainRecord,
  isValidDocumentId,
  OWNER_SOURCES,
} from "./resolverUtils.js";

const OWNER_KEYS = new Set([
  "schemaVersion",
  "status",
  "source",
  "uid",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
]);
const OWNER_STATUSES = new Set(["active", "disabled", "inactive", "revoked"]);

export interface SystemOwnerResolverDependencies {
  reader?: AuthorityDocumentReader;
}

function migrationRequired(data: Record<string, unknown>): boolean {
  return data.schemaVersion === undefined || data.status === undefined || data.source === undefined;
}

export async function resolveSystemOwner(
  actor: Pick<VerifiedActor, "uid">,
  dependencies: SystemOwnerResolverDependencies = {},
): Promise<SystemOwnerResolution> {
  if (!isValidDocumentId(actor.uid)) return Object.freeze({ state: "MALFORMED" });
  const reader = dependencies.reader ?? defaultAuthorityDocumentReader();

  try {
    const snapshot = await reader.getDocument(Object.freeze(["systemOwners", actor.uid]));
    if (!snapshot.exists) return Object.freeze({ state: "NOT_OWNER" });
    if (!isPlainRecord(snapshot.data) || !hasOnlyKeys(snapshot.data, OWNER_KEYS)) {
      return Object.freeze({ state: "MALFORMED" });
    }
    const data = snapshot.data;
    if (data.uid !== undefined && (typeof data.uid !== "string" || data.uid !== actor.uid)) {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (data.status !== undefined
      && (typeof data.status !== "string" || !OWNER_STATUSES.has(data.status))) {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (data.schemaVersion !== undefined
      && (typeof data.schemaVersion !== "number" || data.schemaVersion !== 1)) {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (data.source !== undefined && typeof data.source !== "string") {
      return Object.freeze({ state: "MALFORMED" });
    }
    if (migrationRequired(data)) return Object.freeze({ state: "MIGRATION_REQUIRED" });
    if (!(OWNER_SOURCES as readonly unknown[]).includes(data.source)) {
      return Object.freeze({ state: "MIGRATION_REQUIRED" });
    }
    if (data.status !== "active") return Object.freeze({ state: "DISABLED" });
    return Object.freeze({
      state: "ACTIVE",
      source: data.source as SystemOwnerSource,
    });
  } catch {
    return Object.freeze({ state: "READ_ERROR" });
  }
}
