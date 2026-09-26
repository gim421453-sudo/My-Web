import { isPlainRecord, isValidDocumentId } from "../authz/resolverUtils.js";
import { sha256Canonical } from "../operations/operationContract.js";
import { parseClassRegistryDocument } from "../registries/classRegistryContract.js";
import { parseCanonicalStudentEnrollment } from "../relationships/studentEnrollmentContract.js";
import {
  CANONICAL_BOOTSTRAP_PROVENANCE_SCHEMA_VERSION,
  CANONICAL_BOOTSTRAP_SOURCE_FINGERPRINT_PREFIX,
  canonicalBootstrapReplayIdentity,
  createCanonicalBootstrapProvenanceFromApprovedManifest,
  type CanonicalBootstrapProvenanceV1,
} from "./canonicalBootstrapProvenance.js";

export const CANONICAL_BOOTSTRAP_INPUT_SCHEMA_VERSION = 1 as const;
export const CANONICAL_BOOTSTRAP_INPUT_CANONICALIZATION = "CANONICAL_BOOTSTRAP_INPUT_C14N_V1" as const;

export const AUTHORITATIVE_BOOTSTRAP_SOURCE_KINDS = Object.freeze([
  "manual_verified_entry",
  "user_approved_structured_import",
  "official_current_source",
  "system_generated_from_verified_current_source",
  "other_explicitly_ratified_source",
] as const);
export type AuthoritativeBootstrapSourceKind = typeof AUTHORITATIVE_BOOTSTRAP_SOURCE_KINDS[number];
export type BootstrapEntityType = "class" | "enrollment";
export type BootstrapDryRunStatus = "READY_FOR_APPROVAL" | "INVALID_INPUT" | "REFERENTIAL_BLOCKED" | "CONFLICTED" | "SCHEMA_UNSUPPORTED" | "PROVENANCE_INVALID";
export type BootstrapIssueCode =
  | "INPUT_SCHEMA_UNSUPPORTED"
  | "INVALID_WORKSPACE_ID"
  | "INVALID_PLAN_ID"
  | "INVALID_SOURCE_KIND"
  | "INVALID_CLASS_SCHEMA"
  | "INVALID_ENROLLMENT_SCHEMA"
  | "DUPLICATE_CLASS_INPUT"
  | "DUPLICATE_ENROLLMENT_INPUT"
  | "CONFLICTING_DUPLICATE_INPUT"
  | "REFERENTIAL_BLOCKED";

export interface ClassBootstrapInputV1 {
  readonly classId: string;
  readonly displayName: string;
  readonly status: "active" | "inactive";
  readonly schoolYear?: string;
  readonly grade?: string;
}

export interface EnrollmentBootstrapInputV1 {
  readonly studentId: string;
  readonly classId: string;
  readonly subjectIds: readonly string[];
  readonly status: "active" | "inactive";
}

export interface BootstrapPrerequisiteSnapshotV1 {
  readonly studentIds: readonly string[];
  readonly subjectIds: readonly string[];
  readonly classIds?: readonly string[];
}

export interface CanonicalBootstrapInputV1 {
  readonly schemaVersion: typeof CANONICAL_BOOTSTRAP_INPUT_SCHEMA_VERSION;
  readonly workspaceId: string;
  readonly planId: string;
  readonly sourceKind: AuthoritativeBootstrapSourceKind;
  readonly classes: readonly ClassBootstrapInputV1[];
  readonly enrollments: readonly EnrollmentBootstrapInputV1[];
  readonly prerequisiteSnapshot?: BootstrapPrerequisiteSnapshotV1;
}

export interface BootstrapValidationIssue {
  readonly code: BootstrapIssueCode;
  readonly entityType: BootstrapEntityType | null;
  readonly recordIndex: number | null;
  readonly field: string | null;
  readonly targetId: string | null;
}

interface BootstrapMutationIntentBase {
  readonly targetId: string;
  readonly operation: "create";
  readonly expectedVersion: null;
  readonly casPrecondition: "CAS_EXPECTATION_UNRESOLVED";
  readonly idempotencyIdentity: string;
  readonly provenance: CanonicalBootstrapProvenanceV1;
}

export type BootstrapMutationIntent =
  | Readonly<BootstrapMutationIntentBase & { readonly entityType: "class"; readonly payload: ClassBootstrapInputV1 }>
  | Readonly<BootstrapMutationIntentBase & { readonly entityType: "enrollment"; readonly payload: EnrollmentBootstrapInputV1 }>;

export interface CanonicalBootstrapDryRunResult {
  readonly status: BootstrapDryRunStatus;
  readonly input: CanonicalBootstrapInputV1 | null;
  readonly sourceFingerprint: string | null;
  readonly provenance: CanonicalBootstrapProvenanceV1 | null;
  readonly issues: readonly BootstrapValidationIssue[];
  readonly intents: readonly BootstrapMutationIntent[];
  readonly manifest: Readonly<Record<string, string | number | boolean | null>>;
  readonly firestoreReadCalls: 0;
  readonly firestoreWriteCalls: 0;
  readonly persistenceCalls: 0;
}

const TOP_LEVEL_KEYS = new Set(["schemaVersion", "workspaceId", "planId", "sourceKind", "classes", "enrollments", "prerequisiteSnapshot"]);
const CLASS_KEYS = new Set(["classId", "displayName", "status", "schoolYear", "grade"]);
const ENROLLMENT_KEYS = new Set(["studentId", "classId", "subjectIds", "status"]);
const SNAPSHOT_KEYS = new Set(["studentIds", "subjectIds", "classIds"]);
const HASH_ID = /^[a-f0-9]{64}$/;

function compareCodeUnit(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function issue(code: BootstrapIssueCode, entityType: BootstrapEntityType | null, recordIndex: number | null, field: string | null, targetId: string | null): BootstrapValidationIssue {
  return Object.freeze({ code, entityType, recordIndex, field, targetId });
}

function onlyKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function stableId(value: unknown): value is string {
  return isValidDocumentId(value) && typeof value === "string" && !/\s/.test(value);
}

function text(value: unknown, maxLength: number, required: boolean): string | null {
  if (value === undefined && !required) return null;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function status(value: unknown): value is "active" | "inactive" {
  return value === "active" || value === "inactive";
}

function ids(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.some((item) => !stableId(item))) return null;
  const values = value as string[];
  if (new Set(values).size !== values.length) return null;
  return Object.freeze([...values].sort(compareCodeUnit));
}

function normalizeClass(value: unknown, workspaceId: string): ClassBootstrapInputV1 | null {
  if (!isPlainRecord(value) || !onlyKeys(value, CLASS_KEYS) || !stableId(value.classId) || !status(value.status)) return null;
  const displayName = text(value.displayName, 200, true);
  const schoolYear = text(value.schoolYear, 40, false);
  const grade = text(value.grade, 80, false);
  if (!displayName || (value.schoolYear !== undefined && !schoolYear) || (value.grade !== undefined && !grade)) return null;
  const normalized = Object.freeze({ classId: value.classId, displayName, status: value.status, ...(schoolYear ? { schoolYear } : {}), ...(grade ? { grade } : {}) });
  const schemaCandidate = Object.freeze({ schemaVersion: 1, version: 1, workspaceId, ...normalized, source: "system_bootstrap", createdAt: 0, updatedAt: 0, createdBy: "bootstrap_actor" });
  return parseClassRegistryDocument(schemaCandidate, { workspaceId, entityId: normalized.classId }).state === "VALID" ? normalized : null;
}

function normalizeEnrollment(value: unknown, workspaceId: string): EnrollmentBootstrapInputV1 | null {
  if (!isPlainRecord(value) || !onlyKeys(value, ENROLLMENT_KEYS) || !stableId(value.studentId) || !stableId(value.classId) || !status(value.status)) return null;
  const subjectIds = ids(value.subjectIds);
  if (!subjectIds) return null;
  const normalized = Object.freeze({ studentId: value.studentId, classId: value.classId, subjectIds, status: value.status });
  const schemaCandidate = Object.freeze({ schemaVersion: 1, version: 1, workspaceId, ...normalized, source: "system_bootstrap", createdAt: 0, updatedAt: 0, createdBy: "bootstrap_actor" });
  return parseCanonicalStudentEnrollment(schemaCandidate).state === "VALID" ? normalized : null;
}

function normalizeSnapshot(value: unknown): BootstrapPrerequisiteSnapshotV1 | null | undefined {
  if (value === undefined) return undefined;
  if (!isPlainRecord(value) || !onlyKeys(value, SNAPSHOT_KEYS)) return null;
  const studentIds = ids(value.studentIds);
  const subjectIds = ids(value.subjectIds);
  const classIds = value.classIds === undefined ? null : ids(value.classIds);
  if (!studentIds || !subjectIds || (value.classIds !== undefined && !classIds)) return null;
  return Object.freeze({ studentIds, subjectIds, ...(classIds ? { classIds } : {}) });
}

function sourceFingerprint(input: CanonicalBootstrapInputV1): string {
  const material = Object.freeze({
    canonicalization: CANONICAL_BOOTSTRAP_INPUT_CANONICALIZATION,
    schemaVersion: input.schemaVersion,
    workspaceId: input.workspaceId,
    sourceKind: input.sourceKind,
    classes: input.classes,
    enrollments: input.enrollments,
    ...(input.prerequisiteSnapshot ? { prerequisiteSnapshot: input.prerequisiteSnapshot } : {}),
  });
  return `${CANONICAL_BOOTSTRAP_SOURCE_FINGERPRINT_PREFIX}${sha256Canonical(material)}`;
}

export function validateCanonicalBootstrapInput(value: unknown): Readonly<{ input: CanonicalBootstrapInputV1 | null; issues: readonly BootstrapValidationIssue[] }> {
  const problems: BootstrapValidationIssue[] = [];
  if (!isPlainRecord(value) || !onlyKeys(value, TOP_LEVEL_KEYS) || value.schemaVersion !== CANONICAL_BOOTSTRAP_INPUT_SCHEMA_VERSION) {
    return Object.freeze({ input: null, issues: Object.freeze([issue("INPUT_SCHEMA_UNSUPPORTED", null, null, "schemaVersion", null)]) });
  }
  if (!stableId(value.workspaceId)) problems.push(issue("INVALID_WORKSPACE_ID", null, null, "workspaceId", null));
  if (typeof value.planId !== "string" || !HASH_ID.test(value.planId)) problems.push(issue("INVALID_PLAN_ID", null, null, "planId", null));
  if (typeof value.sourceKind !== "string" || !AUTHORITATIVE_BOOTSTRAP_SOURCE_KINDS.includes(value.sourceKind as AuthoritativeBootstrapSourceKind)) problems.push(issue("INVALID_SOURCE_KIND", null, null, "sourceKind", null));
  if (!Array.isArray(value.classes) || !Array.isArray(value.enrollments)) {
    problems.push(issue("INPUT_SCHEMA_UNSUPPORTED", null, null, "records", null));
    return Object.freeze({ input: null, issues: Object.freeze(problems) });
  }
  const workspaceId = typeof value.workspaceId === "string" ? value.workspaceId : "invalid_workspace";
  const classes: ClassBootstrapInputV1[] = [];
  for (let index = 0; index < value.classes.length; index += 1) {
    const normalized = normalizeClass(value.classes[index], workspaceId);
    if (!normalized) problems.push(issue("INVALID_CLASS_SCHEMA", "class", index, null, null)); else classes.push(normalized);
  }
  const enrollments: EnrollmentBootstrapInputV1[] = [];
  for (let index = 0; index < value.enrollments.length; index += 1) {
    const normalized = normalizeEnrollment(value.enrollments[index], workspaceId);
    if (!normalized) problems.push(issue("INVALID_ENROLLMENT_SCHEMA", "enrollment", index, null, null)); else enrollments.push(normalized);
  }
  const snapshot = normalizeSnapshot(value.prerequisiteSnapshot);
  if (value.prerequisiteSnapshot !== undefined && !snapshot) problems.push(issue("INPUT_SCHEMA_UNSUPPORTED", null, null, "prerequisiteSnapshot", null));

  const duplicate = <T extends object>(records: readonly T[], entityType: BootstrapEntityType, id: (record: T) => string) => {
    const prior = new Map<string, string>();
    for (const record of records) {
      const key = id(record); const fingerprint = sha256Canonical(record as Record<string, unknown>);
      const previous = prior.get(key);
      if (previous !== undefined) problems.push(issue(previous === fingerprint ? (entityType === "class" ? "DUPLICATE_CLASS_INPUT" : "DUPLICATE_ENROLLMENT_INPUT") : "CONFLICTING_DUPLICATE_INPUT", entityType, null, null, key));
      else prior.set(key, fingerprint);
    }
  };
  duplicate(classes, "class", (record) => record.classId);
  duplicate(enrollments, "enrollment", (record) => record.studentId);

  if (problems.length || !stableId(value.workspaceId) || typeof value.planId !== "string" || !HASH_ID.test(value.planId) || typeof value.sourceKind !== "string" || !AUTHORITATIVE_BOOTSTRAP_SOURCE_KINDS.includes(value.sourceKind as AuthoritativeBootstrapSourceKind)) {
    return Object.freeze({ input: null, issues: Object.freeze(problems.sort((left, right) => compareCodeUnit(`${left.entityType ?? ""}\u0000${left.targetId ?? ""}\u0000${left.code}`, `${right.entityType ?? ""}\u0000${right.targetId ?? ""}\u0000${right.code}`))) });
  }
  return Object.freeze({ input: Object.freeze({
    schemaVersion: CANONICAL_BOOTSTRAP_INPUT_SCHEMA_VERSION,
    workspaceId: value.workspaceId,
    planId: value.planId,
    sourceKind: value.sourceKind as AuthoritativeBootstrapSourceKind,
    classes: Object.freeze([...classes].sort((left, right) => compareCodeUnit(left.classId, right.classId))),
    enrollments: Object.freeze([...enrollments].sort((left, right) => compareCodeUnit(left.studentId, right.studentId))),
    ...(snapshot ? { prerequisiteSnapshot: snapshot } : {}),
  }), issues: Object.freeze([]) });
}

function referentialIssues(input: CanonicalBootstrapInputV1): readonly BootstrapValidationIssue[] {
  if (!input.enrollments.length) return Object.freeze([]);
  const snapshot = input.prerequisiteSnapshot;
  if (!snapshot) return Object.freeze(input.enrollments.map((record) => issue("REFERENTIAL_BLOCKED", "enrollment", null, "prerequisiteSnapshot", record.studentId)));
  const students = new Set(snapshot.studentIds);
  const subjects = new Set(snapshot.subjectIds);
  const classes = new Set([...(snapshot.classIds ?? []), ...input.classes.map((record) => record.classId)]);
  const problems: BootstrapValidationIssue[] = [];
  for (const record of input.enrollments) {
    if (!students.has(record.studentId)) problems.push(issue("REFERENTIAL_BLOCKED", "enrollment", null, "studentId", record.studentId));
    if (!classes.has(record.classId)) problems.push(issue("REFERENTIAL_BLOCKED", "enrollment", null, "classId", record.classId));
    for (const subjectId of record.subjectIds) if (!subjects.has(subjectId)) problems.push(issue("REFERENTIAL_BLOCKED", "enrollment", null, "subjectIds", subjectId));
  }
  return Object.freeze(problems.sort((left, right) => compareCodeUnit(`${left.targetId ?? ""}\u0000${left.field ?? ""}`, `${right.targetId ?? ""}\u0000${right.field ?? ""}`)));
}

function emptyResult(status: BootstrapDryRunStatus, issues: readonly BootstrapValidationIssue[]): CanonicalBootstrapDryRunResult {
  return Object.freeze({ status, input: null, sourceFingerprint: null, provenance: null, issues, intents: Object.freeze([]), manifest: Object.freeze({ schemaVersion: 1, validationStatus: status, classInputCount: 0, enrollmentInputCount: 0, plannedMutationCount: 0, invalidCount: issues.length, conflictCount: issues.filter((item) => item.code.includes("DUPLICATE") || item.code === "CONFLICTING_DUPLICATE_INPUT").length }), firestoreReadCalls: 0, firestoreWriteCalls: 0, persistenceCalls: 0 });
}

export function planCanonicalBootstrapDryRun(value: unknown): CanonicalBootstrapDryRunResult {
  const validation = validateCanonicalBootstrapInput(value);
  if (!validation.input) {
    const status: BootstrapDryRunStatus = validation.issues.some((entry) => entry.code.includes("DUPLICATE") || entry.code === "CONFLICTING_DUPLICATE_INPUT") ? "CONFLICTED" : validation.issues.some((entry) => entry.code === "INPUT_SCHEMA_UNSUPPORTED") ? "SCHEMA_UNSUPPORTED" : "INVALID_INPUT";
    return emptyResult(status, validation.issues);
  }
  const input = validation.input;
  const fingerprint = sourceFingerprint(input);
  let provenance: CanonicalBootstrapProvenanceV1;
  try {
    provenance = createCanonicalBootstrapProvenanceFromApprovedManifest({ planId: input.planId, authoritativeInputFingerprint: fingerprint });
  } catch {
    return emptyResult("PROVENANCE_INVALID", Object.freeze([issue("INPUT_SCHEMA_UNSUPPORTED", null, null, "provenance", null)]));
  }
  const references = referentialIssues(input);
  const status: BootstrapDryRunStatus = references.length ? "REFERENTIAL_BLOCKED" : "READY_FOR_APPROVAL";
  const intents = status === "READY_FOR_APPROVAL"
    ? Object.freeze([
      ...input.classes.map((record) => Object.freeze({ entityType: "class" as const, targetId: record.classId, operation: "create" as const, expectedVersion: null, casPrecondition: "CAS_EXPECTATION_UNRESOLVED" as const, idempotencyIdentity: canonicalBootstrapReplayIdentity(provenance, { workspaceId: input.workspaceId, entityType: "class", entityId: record.classId }), provenance, payload: record })),
      ...input.enrollments.map((record) => Object.freeze({ entityType: "enrollment" as const, targetId: record.studentId, operation: "create" as const, expectedVersion: null, casPrecondition: "CAS_EXPECTATION_UNRESOLVED" as const, idempotencyIdentity: canonicalBootstrapReplayIdentity(provenance, { workspaceId: input.workspaceId, entityType: "enrollment", entityId: record.studentId }), provenance, payload: record })),
    ]) as readonly BootstrapMutationIntent[]
    : Object.freeze([]);
  return Object.freeze({
    status,
    input,
    sourceFingerprint: fingerprint,
    provenance,
    issues: references,
    intents,
    manifest: Object.freeze({ schemaVersion: 1, workspaceId: input.workspaceId, planId: input.planId, sourceKind: input.sourceKind, sourceFingerprint: fingerprint, provenanceSchemaVersion: CANONICAL_BOOTSTRAP_PROVENANCE_SCHEMA_VERSION, classInputCount: input.classes.length, enrollmentInputCount: input.enrollments.length, validCount: input.classes.length + input.enrollments.length - references.length, invalidCount: references.length, conflictCount: 0, plannedMutationCount: intents.length, validationStatus: status, casExpectation: "CAS_EXPECTATION_UNRESOLVED", idempotencyIdentityCount: intents.length }),
    firestoreReadCalls: 0,
    firestoreWriteCalls: 0,
    persistenceCalls: 0,
  });
}

export function assertBootstrapPlanMatchesInput(plan: Readonly<{ sourceFingerprint: string; provenance: CanonicalBootstrapProvenanceV1 }>, value: unknown): void {
  const next = planCanonicalBootstrapDryRun(value);
  if (!next.sourceFingerprint || !next.provenance || next.sourceFingerprint !== plan.sourceFingerprint || next.provenance.manifestReference !== plan.provenance.manifestReference) {
    throw new TypeError("PLAN_REAPPROVAL_REQUIRED");
  }
}
