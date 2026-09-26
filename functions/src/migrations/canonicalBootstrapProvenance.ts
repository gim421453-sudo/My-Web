import { hasOnlyKeys, isPlainRecord, isValidDocumentId } from "../authz/resolverUtils.js";
import { sha256Canonical } from "../operations/operationContract.js";

export const CANONICAL_BOOTSTRAP_PROVENANCE_SCHEMA_VERSION = 1 as const;
export const CANONICAL_BOOTSTRAP_SOURCE_FINGERPRINT_PREFIX = "sha256-c14n-v1:" as const;

export type CanonicalBootstrapProvenanceIssue =
  | "MISSING_SOURCE_FINGERPRINT"
  | "INVALID_SOURCE_FINGERPRINT"
  | "MISSING_BATCH_ID"
  | "INVALID_BATCH_ID"
  | "MISSING_MANIFEST_REFERENCE"
  | "INVALID_MANIFEST_REFERENCE"
  | "MANIFEST_BATCH_MISMATCH"
  | "PROVENANCE_VERSION_UNSUPPORTED";

export class CanonicalBootstrapProvenanceError extends Error {
  readonly issue: CanonicalBootstrapProvenanceIssue;

  constructor(issue: CanonicalBootstrapProvenanceIssue) {
    super(issue);
    this.name = "CanonicalBootstrapProvenanceError";
    this.issue = issue;
  }
}

export interface CanonicalBootstrapProvenanceV1 {
  readonly schemaVersion: typeof CANONICAL_BOOTSTRAP_PROVENANCE_SCHEMA_VERSION;
  readonly authoritativeInputFingerprint: string;
  readonly bootstrapBatchId: string;
  readonly manifestReference: string;
}

export interface ApprovedBootstrapManifestBinding {
  readonly planId: string;
  readonly authoritativeInputFingerprint: string;
}

const PROVENANCE_KEYS = new Set([
  "schemaVersion",
  "authoritativeInputFingerprint",
  "bootstrapBatchId",
  "manifestReference",
]);
const SHA256_HEX = /^[a-f0-9]{64}$/;

function invalid(issue: CanonicalBootstrapProvenanceIssue): never {
  throw new CanonicalBootstrapProvenanceError(issue);
}

function requiredText(value: unknown, missing: CanonicalBootstrapProvenanceIssue, invalidIssue: CanonicalBootstrapProvenanceIssue): string {
  if (value === undefined || value === null || value === "") return invalid(missing);
  if (typeof value !== "string" || !value.trim() || value.trim() !== value) return invalid(invalidIssue);
  return value;
}

function manifestId(value: unknown, missing: CanonicalBootstrapProvenanceIssue, invalidIssue: CanonicalBootstrapProvenanceIssue): string {
  const id = requiredText(value, missing, invalidIssue);
  if (!isValidDocumentId(id) || !SHA256_HEX.test(id)) return invalid(invalidIssue);
  return id;
}

export function validateCanonicalBootstrapProvenance(value: unknown): CanonicalBootstrapProvenanceV1 {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, PROVENANCE_KEYS)) {
    return invalid("PROVENANCE_VERSION_UNSUPPORTED");
  }
  if (value.schemaVersion !== CANONICAL_BOOTSTRAP_PROVENANCE_SCHEMA_VERSION) {
    return invalid("PROVENANCE_VERSION_UNSUPPORTED");
  }

  const authoritativeInputFingerprint = requiredText(
    value.authoritativeInputFingerprint,
    "MISSING_SOURCE_FINGERPRINT",
    "INVALID_SOURCE_FINGERPRINT",
  );
  const digest = authoritativeInputFingerprint.slice(CANONICAL_BOOTSTRAP_SOURCE_FINGERPRINT_PREFIX.length);
  if (!authoritativeInputFingerprint.startsWith(CANONICAL_BOOTSTRAP_SOURCE_FINGERPRINT_PREFIX) || !SHA256_HEX.test(digest)) {
    return invalid("INVALID_SOURCE_FINGERPRINT");
  }

  const bootstrapBatchId = manifestId(value.bootstrapBatchId, "MISSING_BATCH_ID", "INVALID_BATCH_ID");
  const manifestReference = manifestId(value.manifestReference, "MISSING_MANIFEST_REFERENCE", "INVALID_MANIFEST_REFERENCE");
  if (bootstrapBatchId !== manifestReference) return invalid("MANIFEST_BATCH_MISMATCH");

  return Object.freeze({
    schemaVersion: CANONICAL_BOOTSTRAP_PROVENANCE_SCHEMA_VERSION,
    authoritativeInputFingerprint,
    bootstrapBatchId,
    manifestReference,
  });
}

export function createCanonicalBootstrapProvenanceFromApprovedManifest(
  binding: ApprovedBootstrapManifestBinding,
): CanonicalBootstrapProvenanceV1 {
  if (!isPlainRecord(binding)) return invalid("INVALID_MANIFEST_REFERENCE");
  return validateCanonicalBootstrapProvenance(Object.freeze({
    schemaVersion: CANONICAL_BOOTSTRAP_PROVENANCE_SCHEMA_VERSION,
    authoritativeInputFingerprint: binding.authoritativeInputFingerprint,
    bootstrapBatchId: binding.planId,
    manifestReference: binding.planId,
  }));
}

export function canonicalBootstrapReplayIdentity(
  provenance: CanonicalBootstrapProvenanceV1,
  target: Readonly<{ workspaceId: string; entityType: "student" | "class" | "subject" | "enrollment"; entityId: string }>,
): string {
  const checked = validateCanonicalBootstrapProvenance(provenance);
  if (!isPlainRecord(target)
    || !isValidDocumentId(target.workspaceId)
    || !isValidDocumentId(target.entityId)
    || !["student", "class", "subject", "enrollment"].includes(target.entityType)) {
    throw new TypeError("INVALID_BOOTSTRAP_TARGET");
  }
  return sha256Canonical({
    contract: "CANONICAL_BOOTSTRAP_PROVENANCE_REPLAY_V1",
    provenance: checked,
    target: Object.freeze({
      workspaceId: target.workspaceId,
      entityType: target.entityType,
      entityId: target.entityId,
    }),
  });
}
