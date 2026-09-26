import { createHmac, hash, randomBytes } from "node:crypto";

export const AUTHORITY_SCOPES = Object.freeze([
  "systemOwners",
  "canonicalMemberships",
  "workspace_members",
  "workspaceMembers",
]);
export const DEFAULT_LIMITS = Object.freeze({
  pageSize: 50,
  maxDocsPerScope: 1_000,
  maxTotalDocs: 3_000,
});

const OWNER_FIELDS = new Set([
  "schemaVersion", "status", "source", "uid", "createdAt", "createdBy",
  "updatedAt", "updatedBy",
]);
const MEMBERSHIP_FIELDS = new Set([
  "schemaVersion", "uid", "workspaceId", "role", "status", "disabled",
  "active", "source", "createdAt", "createdBy", "updatedAt", "updatedBy",
  "invitationId", "approvalRequestId",
]);
const OWNER_SOURCES = new Set(["trusted_migration", "system_bootstrap"]);
const MEMBERSHIP_SOURCES = new Set([
  "invite", "admin_approval", "trusted_migration", "student_link", "system_bootstrap",
]);
const ROLES = new Set([
  "super_manager", "manager", "teacher", "normal", "viewer", "print_account",
]);
const OWNER_CLASSES = [
  "VALID_V1_ACTIVE", "VALID_V1_DISABLED", "MIGRATION_REQUIRED", "MALFORMED",
  "UNSUPPORTED_SCHEMA", "UNKNOWN_SOURCE", "UNKNOWN_STATUS",
];
const MEMBERSHIP_CLASSES = [
  "VALID_V1_ACTIVE", "DISABLED", "INACTIVE", "MIGRATION_REQUIRED", "MALFORMED",
  "UNKNOWN_ROLE", "WRONG_UID", "WRONG_WORKSPACE", "UNSUPPORTED_SCHEMA", "UNKNOWN_SOURCE",
];

function plainRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function countMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function unexpectedFields(data, allowed) {
  return plainRecord(data) ? Object.keys(data).filter((key) => !allowed.has(key)).sort() : [];
}

function isKnownStatusShape(data) {
  return (data.disabled === undefined || typeof data.disabled === "boolean")
    && (data.active === undefined || typeof data.active === "boolean");
}

export function classifySystemOwner(pathUid, data) {
  const unexpected = unexpectedFields(data, OWNER_FIELDS);
  if (!plainRecord(data) || unexpected.length > 0) {
    return { classification: "MALFORMED", unexpectedFields: unexpected };
  }
  if (data.uid !== undefined && (typeof data.uid !== "string" || data.uid !== pathUid)) {
    return { classification: "MALFORMED", unexpectedFields: unexpected };
  }
  if (data.schemaVersion !== undefined && data.schemaVersion !== 1) {
    return { classification: "UNSUPPORTED_SCHEMA", unexpectedFields: unexpected };
  }
  if (data.status !== undefined
    && !["active", "disabled", "inactive", "revoked"].includes(data.status)) {
    return { classification: "UNKNOWN_STATUS", unexpectedFields: unexpected };
  }
  if (data.source !== undefined && typeof data.source !== "string") {
    return { classification: "MALFORMED", unexpectedFields: unexpected };
  }
  if (data.schemaVersion === undefined || data.status === undefined || data.source === undefined) {
    return { classification: "MIGRATION_REQUIRED", unexpectedFields: unexpected };
  }
  if (!OWNER_SOURCES.has(data.source)) {
    return { classification: "UNKNOWN_SOURCE", unexpectedFields: unexpected };
  }
  return {
    classification: data.status === "active" ? "VALID_V1_ACTIVE" : "VALID_V1_DISABLED",
    unexpectedFields: unexpected,
  };
}

export function classifyCanonicalMembership(pathWorkspaceId, pathUid, data) {
  const unexpected = unexpectedFields(data, MEMBERSHIP_FIELDS);
  if (!plainRecord(data) || unexpected.length > 0 || !isKnownStatusShape(data)) {
    return { classification: "MALFORMED", unexpectedFields: unexpected, role: null };
  }
  if (data.uid !== undefined && (typeof data.uid !== "string" || data.uid !== pathUid)) {
    return { classification: "WRONG_UID", unexpectedFields: unexpected, role: null };
  }
  if (data.workspaceId !== undefined
    && (typeof data.workspaceId !== "string" || data.workspaceId !== pathWorkspaceId)) {
    return { classification: "WRONG_WORKSPACE", unexpectedFields: unexpected, role: null };
  }
  if (data.role !== undefined && !ROLES.has(data.role)) {
    return { classification: "UNKNOWN_ROLE", unexpectedFields: unexpected, role: null };
  }
  if (data.schemaVersion !== undefined && data.schemaVersion !== 1) {
    return { classification: "UNSUPPORTED_SCHEMA", unexpectedFields: unexpected, role: data.role ?? null };
  }
  if (data.status !== undefined
    && !["active", "accepted", "disabled", "inactive"].includes(data.status)) {
    return { classification: "MALFORMED", unexpectedFields: unexpected, role: data.role ?? null };
  }
  if (data.source !== undefined && typeof data.source !== "string") {
    return { classification: "MALFORMED", unexpectedFields: unexpected, role: data.role ?? null };
  }
  if (data.schemaVersion === undefined || data.source === undefined || data.status === "accepted") {
    return { classification: "MIGRATION_REQUIRED", unexpectedFields: unexpected, role: data.role ?? null };
  }
  if (!["uid", "workspaceId", "role", "status", "disabled", "active"]
    .every((key) => data[key] !== undefined)) {
    return { classification: "MALFORMED", unexpectedFields: unexpected, role: data.role ?? null };
  }
  if (!MEMBERSHIP_SOURCES.has(data.source)) {
    return { classification: "UNKNOWN_SOURCE", unexpectedFields: unexpected, role: data.role ?? null };
  }
  if (data.status === "disabled") {
    return {
      classification: data.disabled === true && data.active === false ? "DISABLED" : "MALFORMED",
      unexpectedFields: unexpected,
      role: data.role,
    };
  }
  if (data.status === "inactive") {
    return {
      classification: data.disabled === false && data.active === false ? "INACTIVE" : "MALFORMED",
      unexpectedFields: unexpected,
      role: data.role,
    };
  }
  return {
    classification: data.status === "active" && data.disabled === false && data.active === true
      ? "VALID_V1_ACTIVE"
      : "MALFORMED",
    unexpectedFields: unexpected,
    role: data.role,
  };
}

function legacyShape(data) {
  if (!plainRecord(data)) return { classification: "MALFORMED", role: null };
  if (typeof data.uid !== "string" || typeof data.workspaceId !== "string") {
    return { classification: "MALFORMED", role: null };
  }
  if (!ROLES.has(data.role)) return { classification: "UNKNOWN_ROLE", role: null };
  return { classification: "CANONICAL_LOOKING", role: data.role };
}

function makeRefFactory(key = randomBytes(32)) {
  return (prefix, value) => {
    const hmac = createHmac("sha256", key);
    hmac["update"](value);
    return `${prefix}-${hmac.digest("hex").slice(0, 12).toUpperCase()}`;
  };
}

function pushUnique(values, value) {
  if (!values.includes(value)) values.push(value);
}

function assertLimits(limits) {
  for (const key of ["pageSize", "maxDocsPerScope", "maxTotalDocs"]) {
    if (!Number.isInteger(limits[key]) || limits[key] <= 0) throw new Error(`INVALID_LIMIT_${key}`);
  }
  if (limits.pageSize > limits.maxDocsPerScope || limits.maxDocsPerScope > limits.maxTotalDocs) {
    throw new Error("INVALID_LIMIT_RELATIONSHIP");
  }
}

function newSummary(limits) {
  return {
    status: "COMPLETE",
    blocker: null,
    limits: { ...limits },
    reads: Object.fromEntries(AUTHORITY_SCOPES.map((scope) => [scope, 0])),
    totalReads: 0,
    writes: 0,
    owners: { total: 0, classifications: countMap(OWNER_CLASSES), activeOwnerCandidateCount: 0 },
    memberships: {
      total: 0,
      classifications: countMap(MEMBERSHIP_CLASSES),
      roles: countMap([...ROLES]),
    },
    legacy: {
      workspace_members: { total: 0, canonicalLooking: 0, unknownRole: 0, malformed: 0 },
      workspaceMembers: { total: 0, canonicalLooking: 0, unknownRole: 0, malformed: 0 },
    },
    canonicalLegacy: { CANONICAL_V1_WINS: 0, CANONICAL_LEGACY: 0, LEGACY_ONLY: 0, CONFLICT: 0 },
    workspaceRisks: [],
    ownerLockoutRisk: false,
    manualReviewCount: 0,
    unexpectedFieldCount: 0,
    unexpectedFieldNames: [],
    rawIdentifiersIncluded: false,
  };
}

export async function runAuthorityInventory(store, options = {}) {
  if (!store || typeof store.listPage !== "function") throw new Error("READ_ONLY_STORE_REQUIRED");
  const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
  assertLimits(limits);
  const summary = newSummary(limits);
  const unknownFields = [];
  const canonicalByLogicalKey = {};
  const legacyByLogicalKey = {};
  const workspaceStats = {};
  const refFor = makeRefFactory(options.hmacKey);

  for (const scope of AUTHORITY_SCOPES) {
    let cursor = null;
    const seenCursors = [];
    while (summary.reads[scope] < limits.maxDocsPerScope
      && summary.totalReads < limits.maxTotalDocs) {
      const remaining = Math.min(
        limits.pageSize,
        limits.maxDocsPerScope - summary.reads[scope],
        limits.maxTotalDocs - summary.totalReads,
      );
      const page = await store.listPage(scope, { cursor, limit: remaining });
      if (!page || !Array.isArray(page.documents) || page.documents.length > remaining) {
        throw new Error("INVALID_READ_ONLY_PAGE");
      }
      if (page.documents.length === 0) break;
      summary.reads[scope] += page.documents.length;
      summary.totalReads += page.documents.length;

      for (const document of page.documents) {
        if (scope === "systemOwners") {
          const result = classifySystemOwner(document.pathUid, document.data);
          summary.owners.total += 1;
          summary.owners.classifications[result.classification] += 1;
          if (["VALID_V1_ACTIVE", "MIGRATION_REQUIRED"].includes(result.classification)) {
            summary.owners.activeOwnerCandidateCount += 1;
          }
          if (!["VALID_V1_ACTIVE", "VALID_V1_DISABLED"].includes(result.classification)) {
            summary.manualReviewCount += 1;
          }
          result.unexpectedFields.forEach((field) => pushUnique(unknownFields, field));
        } else if (scope === "canonicalMemberships") {
          const result = classifyCanonicalMembership(
            document.pathWorkspaceId,
            document.pathUid,
            document.data,
          );
          summary.memberships.total += 1;
          summary.memberships.classifications[result.classification] += 1;
          if (result.role && summary.memberships.roles[result.role] !== undefined) {
            summary.memberships.roles[result.role] += 1;
          }
          if (result.classification !== "VALID_V1_ACTIVE") summary.manualReviewCount += 1;
          result.unexpectedFields.forEach((field) => pushUnique(unknownFields, field));
          const key = `${document.pathWorkspaceId}\u0000${document.pathUid}`;
          canonicalByLogicalKey[key] = result.classification;
          const stats = workspaceStats[document.pathWorkspaceId] || {
            active: 0, superManagers: 0, managers: 0, migrationAdminCandidates: 0,
          };
          if (result.classification === "VALID_V1_ACTIVE") {
            stats.active += 1;
            if (result.role === "super_manager") stats.superManagers += 1;
            if (result.role === "manager") stats.managers += 1;
          }
          if (result.classification === "MIGRATION_REQUIRED"
            && ["super_manager", "manager"].includes(result.role)) {
            stats.migrationAdminCandidates += 1;
          }
          workspaceStats[document.pathWorkspaceId] = stats;
        } else {
          const result = legacyShape(document.data);
          const target = summary.legacy[scope];
          target.total += 1;
          if (result.classification === "CANONICAL_LOOKING") target.canonicalLooking += 1;
          else if (result.classification === "UNKNOWN_ROLE") target.unknownRole += 1;
          else target.malformed += 1;
          if (result.classification !== "CANONICAL_LOOKING") summary.manualReviewCount += 1;
          if (plainRecord(document.data)
            && typeof document.data.uid === "string"
            && typeof document.data.workspaceId === "string") {
            const key = `${document.data.workspaceId}\u0000${document.data.uid}`;
            const existing = legacyByLogicalKey[key] || [];
            existing.push({ classification: result.classification, role: result.role });
            legacyByLogicalKey[key] = existing;
          }
        }
      }

      if (!page.nextCursor) break;
      const cursorHash = hash("sha256", String(page.nextCursorToken), "hex");
      if (seenCursors.includes(cursorHash)) throw new Error("PAGINATION_LOOP_DETECTED");
      seenCursors.push(cursorHash);
      cursor = page.nextCursor;
      if (page.documents.length === remaining
        && (summary.reads[scope] === limits.maxDocsPerScope
          || summary.totalReads === limits.maxTotalDocs)) {
        summary.status = "BLOCKED";
        summary.blocker = "INVENTORY_INCOMPLETE_CAP_REACHED";
        break;
      }
    }
    if (summary.status === "BLOCKED") break;
  }

  for (const [key, legacyEntries] of Object.entries(legacyByLogicalKey)) {
    const canonical = canonicalByLogicalKey[key];
    if (!canonical) summary.canonicalLegacy.LEGACY_ONLY += 1;
    else if (canonical === "VALID_V1_ACTIVE") summary.canonicalLegacy.CANONICAL_V1_WINS += 1;
    else if (canonical === "MIGRATION_REQUIRED") summary.canonicalLegacy.CANONICAL_LEGACY += 1;
    else summary.canonicalLegacy.CONFLICT += 1;
    if (legacyEntries.length > 1) summary.manualReviewCount += 1;
  }

  summary.ownerLockoutRisk = summary.owners.classifications.VALID_V1_ACTIVE === 0;
  summary.workspaceRisks = Object.entries(workspaceStats)
    .filter(([, value]) => value.superManagers + value.managers === 0)
    .map(([workspaceId, value]) => ({
      workspaceRef: refFor("WORKSPACE", workspaceId),
      activeCanonicalMemberCount: value.active,
      activeSuperManagerCount: value.superManagers,
      activeManagerCount: value.managers,
      migrationRequiredAdminCandidateCount: value.migrationAdminCandidates,
      risk: "NO_ACTIVE_ADMIN_AFTER_STRICT",
    }));
  summary.unexpectedFieldNames = unknownFields.sort();
  summary.unexpectedFieldCount = summary.unexpectedFieldNames.length;
  return Object.freeze(summary);
}

export function renderSanitizedReport(summary, context = {}) {
  const lines = [
    "# Trusted Backend Authority Inventory Report",
    "",
    `- Result: ${summary.status}`,
    `- Blocker: ${summary.blocker || "none"}`,
    `- Project fingerprint: ${context.projectFingerprint || "not-confirmed"}`,
    `- Credential mode: ${context.credentialMode || "not-confirmed"}`,
    `- Production Firestore reads: ${summary.totalReads}`,
    "- Production Firestore writes: 0",
    "- Production Auth I/O: 0/0",
    "- Production Storage I/O: 0/0",
    "- Raw production dump created: no",
    "",
    "## Limits",
    "",
    `- Page size: ${summary.limits.pageSize}`,
    `- Maximum documents per scope: ${summary.limits.maxDocsPerScope}`,
    `- Maximum total documents: ${summary.limits.maxTotalDocs}`,
    "",
    "## Reads",
    "",
    ...AUTHORITY_SCOPES.map((scope) => `- ${scope}: ${summary.reads[scope]}`),
    "",
    "## System owners",
    "",
    `- Total: ${summary.owners.total}`,
    ...Object.entries(summary.owners.classifications).map(([key, value]) => `- ${key}: ${value}`),
    `- Owner lockout risk: ${summary.ownerLockoutRisk}`,
    "",
    "## Canonical memberships",
    "",
    `- Total: ${summary.memberships.total}`,
    ...Object.entries(summary.memberships.classifications).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Legacy memberships",
    "",
    `- workspace_members total: ${summary.legacy.workspace_members.total}`,
    `- workspaceMembers total: ${summary.legacy.workspaceMembers.total}`,
    `- Canonical/legacy conflicts: ${summary.canonicalLegacy.CONFLICT}`,
    `- Manual review count: ${summary.manualReviewCount}`,
    `- Unexpected field count: ${summary.unexpectedFieldCount}`,
    `- Unexpected field names: ${summary.unexpectedFieldNames.join(", ") || "none"}`,
    "",
    "## Workspace lockout risks",
    "",
    ...(summary.workspaceRisks.length
      ? summary.workspaceRisks.map((risk) => `- ${risk.workspaceRef}: ${risk.risk}`)
      : ["- none"]),
    "",
    "This report contains aggregate counts and redacted references only.",
    "",
  ];
  return lines.join("\n");
}
