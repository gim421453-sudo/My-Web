import { createHash } from "node:crypto";
import { isWorkspaceRole, type WorkspaceRole } from "../../authz/authorizationTypes.js";
import { isPlainRecord, isValidDocumentId } from "../../authz/resolverUtils.js";
import { LEGACY_INVITATION_SOURCES } from "./legacyInvitationTypes.js";
import type {
  LegacyCanonicalCollision,
  LegacyFieldComparison,
  LegacyFieldComparisonResult,
  LegacyInvitationClassifierOptions,
  LegacyInvitationDryRunManifest,
  LegacyInvitationSource,
  LegacyInvitationSourceDocument,
  LegacyMigrationDisposition,
  LegacySecretSecurityClassification,
  LegacySourceClassification,
  LegacySourceSummary,
  LegacyWorkspaceResolution,
} from "./legacyInvitationTypes.js";

const SOURCE_ORDER: Readonly<Record<LegacyInvitationSource, number>> = Object.freeze({
  ROOT_INVITES: 0,
  ROOT_INVITATIONS: 1,
  NESTED_INVITE_CODES: 2,
});

const KNOWN_LEGACY_KEYS = new Set([
  "id", "invitationId", "inviteCodeId", "code", "codeHash", "codePreview",
  "workspaceId", "role", "targetRole", "status", "maxUses", "usedCount",
  "useLimit", "useCount",
  "expiresAt", "createdBy", "inviterUid", "invitedBy", "createdAt", "updatedAt",
  "revokedAt", "revoked", "isRevoked", "email", "inviterEmail", "usedAt", "usedBy", "usedByEmail",
  "usedByName", "reusable",
]);

type ValueState = "VALUE" | "MISSING" | "INVALID" | "UNKNOWN";

interface ParsedValue<T> {
  readonly state: ValueState;
  readonly value: T | null;
  readonly normalized: boolean;
  readonly reasonCode: string;
}

interface InternalSource {
  readonly source: LegacyInvitationSource;
  readonly groupFingerprint: string;
  readonly sourceFingerprint: string;
  readonly parentWorkspaceId?: string;
  readonly data: Record<string, unknown> | null;
  readonly malformed: boolean;
  readonly reasonCodes: readonly string[];
}

interface InternalGroup {
  readonly fingerprint: string;
  readonly sources: readonly InternalSource[];
  readonly groupingMalformed: boolean;
}

interface FieldResolution<T> {
  readonly state: "RESOLVED" | "MISSING" | "INVALID" | "CONFLICT" | "UNKNOWN";
  readonly value: T | null;
  readonly comparison: LegacyFieldComparison;
}

interface StatusValue {
  readonly canonicalStatus: "active" | "consumed" | "revoked" | null;
  readonly historicalInactive: boolean;
}

interface UsageValue {
  readonly maxUses: number;
  readonly usedCount: number;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function fingerprint(namespace: string, value: string): string {
  return sha256(`myweb-${namespace}-v1:${value}`);
}

function normalizeLegacyCode(value: string): string {
  return value.trim().toUpperCase();
}

function freezeManifest(manifest: LegacyInvitationDryRunManifest): LegacyInvitationDryRunManifest {
  return Object.freeze({
    ...manifest,
    sources: Object.freeze([...manifest.sources]),
    fieldComparisons: Object.freeze([...manifest.fieldComparisons]),
    workspaceResolution: Object.freeze({ ...manifest.workspaceResolution }),
    roleResolution: Object.freeze({ ...manifest.roleResolution }),
    statusResolution: Object.freeze({ ...manifest.statusResolution }),
    usageResolution: Object.freeze({ ...manifest.usageResolution }),
    expirationResolution: Object.freeze({ ...manifest.expirationResolution }),
    creatorResolution: Object.freeze({ ...manifest.creatorResolution }),
    collisionResolution: Object.freeze({ ...manifest.collisionResolution }),
    canonicalPlan: Object.freeze({ ...manifest.canonicalPlan }),
    reasonCodes: Object.freeze([...manifest.reasonCodes]),
  });
}

function sourceFingerprint(
  source: LegacyInvitationSource,
  groupFingerprint: string,
  parentWorkspaceId?: string,
): string {
  const parent = parentWorkspaceId ? fingerprint("workspace", parentWorkspaceId) : "root";
  return fingerprint("legacy-source", `${source}:${groupFingerprint}:${parent}`);
}

function groupInternal(documents: readonly LegacyInvitationSourceDocument[]): readonly InternalGroup[] {
  const groups = new Map<string, InternalSource[]>();
  for (const document of documents) {
    const validSource = (LEGACY_INVITATION_SOURCES as readonly unknown[]).includes(document.source);
    const sourceKind: LegacyInvitationSource = validSource ? document.source : "ROOT_INVITES";
    const rawDocumentId = typeof document.documentId === "string" ? document.documentId : "";
    const normalized = normalizeLegacyCode(rawDocumentId);
    const legacyCodeHash = sha256(normalized || "invalid");
    const groupFingerprint = fingerprint("legacy-invitation-group", legacyCodeHash);
    const reasons: string[] = [];
    let malformed = !validSource || !normalized || !isValidDocumentId(normalized);
    const data = isPlainRecord(document.data) ? document.data : null;
    if (!data) {
      malformed = true;
      reasons.push("LEGACY_DOCUMENT_NOT_OBJECT");
    }
    if (!validSource) reasons.push("LEGACY_SOURCE_INVALID");
    if (data) {
      const embedded = [data.code, data.invitationId, data.inviteCodeId]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
      if (embedded.some((value) => sha256(normalizeLegacyCode(value)) !== legacyCodeHash)) {
        malformed = true;
        reasons.push("LEGACY_DOCUMENT_CODE_MISMATCH");
      }
    }
    if (!isValidDocumentId(normalized)) reasons.push("LEGACY_DOCUMENT_ID_INVALID");
    const internal: InternalSource = Object.freeze({
      source: sourceKind,
      groupFingerprint,
      sourceFingerprint: sourceFingerprint(sourceKind, groupFingerprint, document.parentWorkspaceId),
      parentWorkspaceId: document.parentWorkspaceId,
      data,
      malformed,
      reasonCodes: Object.freeze(reasons),
    });
    const current = groups.get(groupFingerprint) ?? [];
    current.push(internal);
    groups.set(groupFingerprint, current);
  }
  return Object.freeze([...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupFingerprint, sources]) => {
      const sorted = [...sources].sort((left, right) => (
        SOURCE_ORDER[left.source] - SOURCE_ORDER[right.source]
        || left.sourceFingerprint.localeCompare(right.sourceFingerprint)
      ));
      const counts = new Map<LegacyInvitationSource, number>();
      for (const source of sorted) counts.set(source.source, (counts.get(source.source) ?? 0) + 1);
      return Object.freeze({
        fingerprint: groupFingerprint,
        sources: Object.freeze(sorted),
        groupingMalformed: sorted.some((source) => source.malformed)
          || [...counts.values()].some((count) => count > 1),
      });
    }));
}

function parseWorkspace(source: InternalSource): ParsedValue<string> {
  const dataValue = source.data?.workspaceId;
  const pathValue = source.source === "NESTED_INVITE_CODES" ? source.parentWorkspaceId : undefined;
  if (dataValue !== undefined && (typeof dataValue !== "string" || !isValidDocumentId(dataValue))) {
    return { state: "INVALID", value: null, normalized: false, reasonCode: "WORKSPACE_ID_INVALID" };
  }
  if (pathValue !== undefined && !isValidDocumentId(pathValue)) {
    return { state: "INVALID", value: null, normalized: false, reasonCode: "NESTED_WORKSPACE_ID_INVALID" };
  }
  if (typeof dataValue === "string" && pathValue && dataValue !== pathValue) {
    return { state: "INVALID", value: null, normalized: false, reasonCode: "NESTED_WORKSPACE_MISMATCH" };
  }
  if (typeof dataValue === "string") {
    return { state: "VALUE", value: dataValue, normalized: false, reasonCode: "WORKSPACE_ID_RESOLVED" };
  }
  if (pathValue) {
    return { state: "VALUE", value: pathValue, normalized: true, reasonCode: "WORKSPACE_FROM_NESTED_PATH" };
  }
  return { state: "MISSING", value: null, normalized: false, reasonCode: "WORKSPACE_ID_MISSING" };
}

function parseRole(source: InternalSource): ParsedValue<WorkspaceRole> {
  const role = source.data?.role;
  const targetRole = source.data?.targetRole;
  if (role !== undefined && targetRole !== undefined && role !== targetRole) {
    return { state: "INVALID", value: null, normalized: false, reasonCode: "ROLE_ALIAS_CONFLICT" };
  }
  const value = targetRole ?? role;
  if (value === undefined || value === null || value === "") {
    return { state: "MISSING", value: null, normalized: false, reasonCode: "ROLE_MISSING" };
  }
  if (value === "system_owner") {
    return { state: "INVALID", value: null, normalized: false, reasonCode: "SYSTEM_OWNER_ROLE_FORBIDDEN" };
  }
  if (!isWorkspaceRole(value)) {
    return { state: "INVALID", value: null, normalized: false, reasonCode: "ROLE_INVALID" };
  }
  return {
    state: "VALUE",
    value,
    normalized: targetRole === undefined && role !== undefined,
    reasonCode: targetRole === undefined ? "ROLE_ALIAS_TO_TARGET_ROLE" : "TARGET_ROLE_RESOLVED",
  };
}

function parseUsage(source: InternalSource): ParsedValue<UsageValue> {
  if (source.data?.useLimit !== undefined || source.data?.useCount !== undefined) {
    return { state: "UNKNOWN", value: null, normalized: false, reasonCode: "USAGE_ALIAS_SEMANTICS_UNKNOWN" };
  }
  const maxUses = source.data?.maxUses;
  const usedCount = source.data?.usedCount;
  if (maxUses === undefined || usedCount === undefined) {
    return { state: "MISSING", value: null, normalized: false, reasonCode: "USAGE_MISSING" };
  }
  if (!Number.isInteger(maxUses) || !Number.isInteger(usedCount)
    || Number(maxUses) < 1 || Number(maxUses) > 1_000
    || Number(usedCount) < 0 || Number(usedCount) > Number(maxUses)) {
    return { state: "INVALID", value: null, normalized: false, reasonCode: "USAGE_INVALID" };
  }
  return {
    state: "VALUE",
    value: { maxUses: Number(maxUses), usedCount: Number(usedCount) },
    normalized: false,
    reasonCode: "USAGE_RESOLVED",
  };
}

function parseStatus(source: InternalSource, usage: ParsedValue<UsageValue>): ParsedValue<StatusValue> {
  const status = source.data?.status;
  if (typeof status !== "string" || !status.trim()) {
    return { state: "MISSING", value: null, normalized: false, reasonCode: "STATUS_MISSING" };
  }
  const normalized = status.trim().toLowerCase();
  if (normalized === "active" || normalized === "pending") {
    return {
      state: "VALUE",
      value: { canonicalStatus: "active", historicalInactive: false },
      normalized: normalized === "pending",
      reasonCode: normalized === "pending" ? "PENDING_NORMALIZED_TO_ACTIVE" : "STATUS_ACTIVE",
    };
  }
  if (normalized === "revoked") {
    return {
      state: "VALUE",
      value: { canonicalStatus: "revoked", historicalInactive: true },
      normalized: false,
      reasonCode: "STATUS_REVOKED",
    };
  }
  if (normalized === "expired") {
    return {
      state: "VALUE",
      value: { canonicalStatus: null, historicalInactive: true },
      normalized: true,
      reasonCode: "STATUS_EXPIRED_ARCHIVE_ONLY",
    };
  }
  if (normalized === "used" && usage.state === "VALUE"
    && usage.value?.usedCount === usage.value?.maxUses) {
    return {
      state: "VALUE",
      value: { canonicalStatus: "consumed", historicalInactive: true },
      normalized: true,
      reasonCode: "USED_NORMALIZED_TO_CONSUMED",
    };
  }
  if (normalized === "accepted") {
    return { state: "UNKNOWN", value: null, normalized: false, reasonCode: "ACCEPTED_STATUS_SEMANTICS_UNKNOWN" };
  }
  return { state: "INVALID", value: null, normalized: false, reasonCode: "STATUS_INVALID" };
}

function parseExpiration(source: InternalSource): ParsedValue<number | null> {
  if (!source.data || !("expiresAt" in source.data)) {
    return { state: "MISSING", value: null, normalized: false, reasonCode: "EXPIRATION_MISSING" };
  }
  const value = source.data.expiresAt;
  if (value === null) {
    return { state: "VALUE", value: null, normalized: false, reasonCode: "EXPIRATION_NONE" };
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0 && Number.isInteger(value)) {
    return { state: "VALUE", value, normalized: false, reasonCode: "EXPIRATION_MILLIS_RESOLVED" };
  }
  if (typeof value === "string" || (value && typeof value === "object")) {
    return { state: "UNKNOWN", value: null, normalized: false, reasonCode: "EXPIRATION_FORMAT_UNKNOWN" };
  }
  return { state: "INVALID", value: null, normalized: false, reasonCode: "EXPIRATION_INVALID" };
}

function parseCreator(source: InternalSource): ParsedValue<string> {
  const values = [source.data?.createdBy, source.data?.inviterUid, source.data?.invitedBy]
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  if (values.length === 0) {
    return { state: "MISSING", value: null, normalized: false, reasonCode: "CREATOR_MISSING" };
  }
  if (values.some((value) => !isValidDocumentId(value))) {
    return { state: "INVALID", value: null, normalized: false, reasonCode: "CREATOR_INVALID" };
  }
  if (new Set(values).size > 1) {
    return { state: "INVALID", value: null, normalized: false, reasonCode: "CREATOR_ALIAS_CONFLICT" };
  }
  return {
    state: "VALUE",
    value: values[0] ?? null,
    normalized: values.length > 1 || source.data?.createdBy === undefined,
    reasonCode: "CREATOR_RESOLVED",
  };
}

function parseRevokedState(source: InternalSource): ParsedValue<boolean> {
  if (source.data?.revoked !== undefined || source.data?.isRevoked !== undefined) {
    return { state: "UNKNOWN", value: null, normalized: false, reasonCode: "REVOKED_BOOLEAN_SEMANTICS_UNKNOWN" };
  }
  if (source.data?.revokedAt === undefined || source.data.revokedAt === null) {
    return { state: "VALUE", value: false, normalized: false, reasonCode: "REVOKED_AT_ABSENT" };
  }
  const timestamp = timestampMetadata(source.data.revokedAt);
  if (timestamp.state === "VALUE") {
    return { state: "VALUE", value: true, normalized: timestamp.normalized, reasonCode: "REVOKED_AT_PRESENT" };
  }
  return { ...timestamp, value: null };
}

function timestampMetadata(value: unknown): ParsedValue<number> {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { state: "VALUE", value, normalized: false, reasonCode: "CREATED_AT_RESOLVED" };
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return { state: "VALUE", value: value.getTime(), normalized: true, reasonCode: "CREATED_AT_DATE_NORMALIZED" };
  }
  if (value && typeof value === "object" && "toMillis" in value
    && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    const millis = (value as { toMillis(): number }).toMillis();
    if (Number.isFinite(millis)) {
      return { state: "VALUE", value: millis, normalized: true, reasonCode: "CREATED_AT_TIMESTAMP_NORMALIZED" };
    }
  }
  if (value === undefined || value === null) {
    return { state: "MISSING", value: null, normalized: false, reasonCode: "CREATED_AT_MISSING" };
  }
  return { state: "UNKNOWN", value: null, normalized: false, reasonCode: "CREATED_AT_FORMAT_UNKNOWN" };
}

function stableValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`).join(",")}}`;
}

function resolveField<T>(
  field: string,
  parsed: readonly ParsedValue<T>[],
  options?: Readonly<{ metadataDifferenceIsSafe?: boolean }>,
): FieldResolution<T> {
  const invalid = parsed.find((item) => item.state === "INVALID");
  if (invalid) {
    return {
      state: "INVALID", value: null,
      comparison: { field, result: "MALFORMED", reasonCode: invalid.reasonCode },
    };
  }
  const unknown = parsed.find((item) => item.state === "UNKNOWN");
  if (unknown) {
    return {
      state: "UNKNOWN", value: null,
      comparison: { field, result: "SEMANTIC_UNKNOWN", reasonCode: unknown.reasonCode },
    };
  }
  const values = parsed.filter((item) => item.state === "VALUE");
  const missing = parsed.some((item) => item.state === "MISSING");
  if (values.length === 0) {
    return {
      state: "MISSING", value: null,
      comparison: { field, result: "MISSING_ONE_SIDE", reasonCode: parsed[0]?.reasonCode ?? `${field.toUpperCase()}_MISSING` },
    };
  }
  const distinct = new Set(values.map((item) => stableValue(item.value)));
  if (distinct.size > 1) {
    if (options?.metadataDifferenceIsSafe) {
      return {
        state: "RESOLVED", value: values[0]?.value ?? null,
        comparison: { field, result: "SAFE_NORMALIZATION", reasonCode: "CREATED_AT_METADATA_DIFFERENCE" },
      };
    }
    return {
      state: "CONFLICT", value: null,
      comparison: { field, result: "DIVERGENT", reasonCode: `${field.toUpperCase()}_SOURCE_CONFLICT` },
    };
  }
  const normalized = values.some((item) => item.normalized);
  return {
    state: missing ? "MISSING" : "RESOLVED",
    value: values[0]?.value ?? null,
    comparison: {
      field,
      result: missing ? "MISSING_ONE_SIDE" : normalized ? "SAFE_NORMALIZATION" : "EXACT_MATCH",
      reasonCode: missing ? `${field.toUpperCase()}_MISSING_ONE_SIDE` : normalized ? values[0]?.reasonCode ?? "SAFE_NORMALIZATION" : `${field.toUpperCase()}_MATCH`,
    },
  };
}

function sourceCombination(sources: readonly InternalSource[]): LegacySourceClassification {
  const kinds = new Set(sources.map((source) => source.source));
  const hasInvites = kinds.has("ROOT_INVITES");
  const hasInvitations = kinds.has("ROOT_INVITATIONS");
  const hasNested = kinds.has("NESTED_INVITE_CODES");
  if (hasInvites && hasInvitations && hasNested) return "ALL_THREE";
  if (hasInvites && hasInvitations) return "SHARED_ROOTS";
  if (hasNested && (hasInvites || hasInvitations)) return "ROOTS_AND_NESTED";
  if (hasInvites) return "INVITES_ONLY";
  if (hasInvitations) return "INVITATIONS_ONLY";
  return "NESTED_ONLY";
}

function compareUnknownFields(sources: readonly InternalSource[]): LegacyFieldComparison {
  const unknownKeys = new Set<string>();
  for (const source of sources) {
    for (const key of Object.keys(source.data ?? {})) {
      if (!KNOWN_LEGACY_KEYS.has(key)) unknownKeys.add(key);
    }
  }
  return unknownKeys.size > 0
    ? { field: "unknownFields", result: "SEMANTIC_UNKNOWN", reasonCode: "UNKNOWN_LEGACY_FIELDS_PRESENT" }
    : { field: "unknownFields", result: "EXACT_MATCH", reasonCode: "NO_UNKNOWN_LEGACY_FIELDS" };
}

function safeCollision(value: LegacyCanonicalCollision | undefined): LegacyCanonicalCollision {
  return Object.freeze({
    canonicalInvitationExists: value?.canonicalInvitationExists === true,
    codeHashIndexExists: value?.codeHashIndexExists === true,
    migrationFingerprintConsumed: value?.migrationFingerprintConsumed === true,
  });
}

function reasonsFrom(
  comparisons: readonly LegacyFieldComparison[],
  extra: readonly string[],
): readonly string[] {
  return Object.freeze([...new Set([
    ...comparisons.filter((item) => item.result !== "EXACT_MATCH").map((item) => item.reasonCode),
    ...extra,
  ])].sort());
}

function dispositionFor(input: Readonly<{
  sourceClassification: LegacySourceClassification;
  workspaceState: LegacyWorkspaceResolution | "MALFORMED";
  roleState: FieldResolution<WorkspaceRole>["state"];
  statusState: FieldResolution<StatusValue>["state"];
  usageState: FieldResolution<UsageValue>["state"];
  expirationState: FieldResolution<number | null>["state"];
  hasFiniteExpiration: boolean;
  creatorState: FieldResolution<string>["state"];
  historicalInactive: boolean;
  expiredByClock: boolean;
  secret: LegacySecretSecurityClassification;
  collision: LegacyCanonicalCollision;
  unknownSemantics: boolean;
}>): LegacyMigrationDisposition {
  if (input.sourceClassification === "MALFORMED" || input.workspaceState === "MALFORMED"
    || input.roleState === "INVALID" || input.statusState === "INVALID"
    || input.usageState === "INVALID" || input.expirationState === "INVALID"
    || input.creatorState === "INVALID") return "MALFORMED";
  if (input.sourceClassification === "SOURCE_CONFLICT"
    || input.roleState === "CONFLICT" || input.statusState === "CONFLICT"
    || input.usageState === "CONFLICT" || input.expirationState === "CONFLICT"
    || input.creatorState === "CONFLICT") return "SOURCE_CONFLICT";
  if (input.collision.migrationFingerprintConsumed) return "ALREADY_MIGRATED";
  if (input.collision.canonicalInvitationExists || input.collision.codeHashIndexExists) return "MANUAL_REVIEW";
  if (input.workspaceState !== "VALID") return "NEEDS_WORKSPACE_RESOLUTION";
  if (input.roleState !== "RESOLVED") return "NEEDS_ROLE_RESOLUTION";
  if (input.statusState !== "RESOLVED") return "NEEDS_STATUS_RESOLUTION";
  if (input.historicalInactive || input.expiredByClock) return "MIGRATABLE_ARCHIVE_ONLY";
  if (input.usageState !== "RESOLVED") return "NEEDS_USAGE_RESOLUTION";
  if (input.expirationState !== "RESOLVED") {
    return input.expirationState === "MISSING" ? "MANUAL_REVIEW" : "REISSUE_REQUIRED";
  }
  if (!input.hasFiniteExpiration) return "REISSUE_REQUIRED";
  if (input.creatorState !== "RESOLVED") return "MANUAL_REVIEW";
  if (input.unknownSemantics) return "MANUAL_REVIEW";
  if (input.secret === "LEGACY_SECRET_WEAK_OR_INVALID") return "REISSUE_REQUIRED";
  if (input.secret === "LEGACY_SECRET_STRENGTH_UNKNOWN") return "NEEDS_SECRET_SECURITY_REVIEW";
  if (input.secret !== "LEGACY_SECRET_VERIFIED_STRONG") return "MANUAL_REVIEW";
  return "MIGRATABLE_CANONICAL";
}

function classifyGroup(
  group: InternalGroup,
  options: LegacyInvitationClassifierOptions,
): LegacyInvitationDryRunManifest {
  const sources = group.sources;
  const workspace = resolveField("workspaceId", sources.map(parseWorkspace));
  const role = resolveField("role", sources.map(parseRole));
  const usageParsed = sources.map(parseUsage);
  const usage = resolveField("usage", usageParsed);
  const status = resolveField("status", sources.map((source, index) => parseStatus(source, usageParsed[index] ?? {
    state: "MISSING", value: null, normalized: false, reasonCode: "USAGE_MISSING",
  })));
  const expiration = resolveField("expiresAt", sources.map(parseExpiration));
  const creator = resolveField("createdBy", sources.map(parseCreator));
  const revokedState = resolveField("revokedState", sources.map(parseRevokedState));
  const createdAt = resolveField("createdAt", sources.map((source) => timestampMetadata(source.data?.createdAt)), {
    metadataDifferenceIsSafe: true,
  });
  const unknownFields = compareUnknownFields(sources);
  const comparisons = Object.freeze([
    workspace.comparison,
    role.comparison,
    status.comparison,
    usage.comparison,
    expiration.comparison,
    creator.comparison,
    revokedState.comparison,
    createdAt.comparison,
    unknownFields,
  ]);
  const authorityConflict = comparisons.some((item) => (
    item.result === "DIVERGENT" && item.field !== "createdAt"
  ));
  const revokedStateValue = revokedState.value;
  const statusValue = status.value;
  const revocationContradiction = statusValue?.canonicalStatus === "active" && revokedStateValue === true;
  const malformed = group.groupingMalformed || revocationContradiction
    || comparisons.some((item) => item.result === "MALFORMED");
  const sourceClassification: LegacySourceClassification = malformed
    ? "MALFORMED"
    : authorityConflict ? "SOURCE_CONFLICT" : sourceCombination(sources);
  const workspaceId = workspace.value;
  const workspaceState: LegacyWorkspaceResolution | "MALFORMED" = workspace.state === "INVALID"
    ? "MALFORMED"
    : workspace.state === "CONFLICT" ? "AMBIGUOUS"
      : workspace.state === "RESOLVED" && workspaceId
        ? options.resolveWorkspace?.(workspaceId) ?? "UNKNOWN"
        : "UNKNOWN";
  const expirationValue = expiration.value;
  const usageValue = usage.value;
  const usageExhausted = usageValue !== null && usageValue.usedCount === usageValue.maxUses;
  const historicalInactive = statusValue?.historicalInactive === true
    || (statusValue?.canonicalStatus === "active" && usageExhausted);
  const expiredByClock = typeof expirationValue === "number" && expirationValue <= options.nowMillis;
  const requestedSecret = options.assessSecret?.(group.fingerprint)
    ?? "LEGACY_SECRET_STRENGTH_UNKNOWN";
  const secret: LegacySecretSecurityClassification = historicalInactive || expiredByClock
    ? "LEGACY_SECRET_NOT_RELEVANT_INACTIVE"
    : requestedSecret;
  const collision = safeCollision(options.resolveCollision?.(group.fingerprint));
  const disposition = dispositionFor({
    sourceClassification,
    workspaceState,
    roleState: role.state,
    statusState: status.state,
    usageState: usage.state,
    expirationState: expiration.state,
    creatorState: creator.state,
    hasFiniteExpiration: typeof expirationValue === "number",
    historicalInactive,
    expiredByClock,
    secret,
    collision,
    unknownSemantics: comparisons.some((item) => item.result === "SEMANTIC_UNKNOWN"),
  });
  const action = disposition === "MIGRATABLE_CANONICAL" ? "CREATE_CANONICAL"
    : disposition === "MIGRATABLE_ARCHIVE_ONLY" ? "ARCHIVE_ONLY"
      : disposition === "REISSUE_REQUIRED" || disposition === "NEEDS_SECRET_SECURITY_REVIEW" ? "REISSUE"
        : "NONE";
  const extraReasons: string[] = [
    `SOURCE_${sourceClassification}`,
    `DISPOSITION_${disposition}`,
  ];
  for (const source of sources) extraReasons.push(...source.reasonCodes);
  if (expiredByClock) extraReasons.push("EXPIRATION_ELAPSED_BY_TRUSTED_CLOCK");
  if (usageExhausted && statusValue?.canonicalStatus === "active") {
    extraReasons.push("ACTIVE_LEGACY_USAGE_EXHAUSTED");
  }
  if (revocationContradiction) extraReasons.push("ACTIVE_STATUS_WITH_REVOKED_STATE");
  if (collision.canonicalInvitationExists) extraReasons.push("CANONICAL_INVITATION_COLLISION");
  if (collision.codeHashIndexExists) extraReasons.push("CANONICAL_CODE_INDEX_COLLISION");
  if (collision.migrationFingerprintConsumed) extraReasons.push("MIGRATION_FINGERPRINT_ALREADY_CONSUMED");
  if (secret !== "LEGACY_SECRET_VERIFIED_STRONG") extraReasons.push(secret);
  return freezeManifest({
    schemaVersion: 1,
    legacyGroupFingerprint: group.fingerprint,
    sources: Object.freeze(sources.map<LegacySourceSummary>((source) => Object.freeze({
      source: source.source,
      sourceFingerprint: source.sourceFingerprint,
    }))),
    sourceClassification,
    fieldComparisons: comparisons,
    migrationDisposition: disposition,
    workspaceResolution: {
      state: workspaceState,
      workspaceFingerprint: workspaceId ? fingerprint("workspace", workspaceId) : null,
    },
    roleResolution: {
      state: role.state,
      targetRole: role.value,
    },
    statusResolution: {
      state: status.state,
      canonicalStatus: statusValue?.canonicalStatus ?? null,
      historicalInactive,
    },
    usageResolution: {
      state: usage.state,
      maxUses: usageValue?.maxUses ?? null,
      usedCount: usageValue?.usedCount ?? null,
    },
    expirationResolution: {
      state: expiration.state === "RESOLVED" && expirationValue === null ? "NO_EXPIRY" : expiration.state,
      expiresAtMillis: expirationValue,
    },
    creatorResolution: {
      state: creator.state,
      creatorFingerprint: creator.value ? fingerprint("creator", creator.value) : null,
    },
    secretSecurityClassification: secret,
    collisionResolution: collision,
    canonicalPlan: {
      action,
      invitationIdStrategy: "KEYED_DETERMINISTIC_V1",
      invitationId: null,
      requiresExecutionKey: true,
      preserveLegacyCode: disposition === "MIGRATABLE_CANONICAL",
      createCodeHashIndex: disposition === "MIGRATABLE_CANONICAL",
      targetRole: role.value,
      status: statusValue?.canonicalStatus ?? null,
      maxUses: usageValue?.maxUses ?? null,
      usedCount: usageValue?.usedCount ?? null,
      expiresAtMillis: expirationValue,
      revokeAuthority: creator.state === "RESOLVED"
        ? "CANONICAL_CREATOR_OR_ADMIN" : "WORKSPACE_ADMIN_OR_SYSTEM_OWNER",
      executionWriteImplemented: false,
    },
    recommendedAction: action === "CREATE_CANONICAL" ? "EXECUTE_APPROVED_MIGRATION"
      : action === "ARCHIVE_ONLY" ? "ARCHIVE_WITHOUT_REDEEM_INDEX"
        : action === "REISSUE" ? "ISSUE_NEW_CANONICAL_INVITATION" : "MANUAL_REVIEW",
    reasonCodes: reasonsFrom(comparisons, extraReasons),
  });
}

export function createLegacyInvitationDryRun(
  documents: readonly LegacyInvitationSourceDocument[],
  options: LegacyInvitationClassifierOptions,
): readonly LegacyInvitationDryRunManifest[] {
  if (!Number.isFinite(options.nowMillis)) {
    throw new TypeError("LEGACY_MIGRATION_TRUSTED_CLOCK_REQUIRED");
  }
  return Object.freeze(groupInternal(documents).map((group) => classifyGroup(group, options)));
}

export function summarizeLegacyInvitationGroups(
  documents: readonly LegacyInvitationSourceDocument[],
): readonly Readonly<{
  legacyGroupFingerprint: string;
  sources: readonly LegacySourceSummary[];
}>[] {
  return Object.freeze(groupInternal(documents).map((group) => Object.freeze({
    legacyGroupFingerprint: group.fingerprint,
    sources: Object.freeze(group.sources.map((source) => Object.freeze({
      source: source.source,
      sourceFingerprint: source.sourceFingerprint,
    }))),
  })));
}

export function isConsoleSafeLegacyManifest(value: LegacyInvitationDryRunManifest): boolean {
  const serialized = JSON.stringify(value);
  return !/(?:email|phone|token|rawCode|documentId|createdByUid)/i.test(serialized);
}

export const LEGACY_FIELD_ALIAS_POLICY = Object.freeze({
  role: "targetRole",
  createdBy: Object.freeze(["createdBy", "inviterUid", "invitedBy"]),
  pendingStatus: "active",
  usedStatus: "consumed_when_usage_is_exhausted",
  useLimit: "SEMANTIC_UNKNOWN",
  useCount: "SEMANTIC_UNKNOWN",
});

export const MIGRATION_INVITATION_ID_STRATEGY = "KEYED_DETERMINISTIC_V1" as const;

export function comparisonResultIsBlocking(result: LegacyFieldComparisonResult): boolean {
  return result === "DIVERGENT" || result === "SEMANTIC_UNKNOWN" || result === "MALFORMED";
}
