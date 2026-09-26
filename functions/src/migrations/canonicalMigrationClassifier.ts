import { sha256Canonical } from "../operations/operationContract.js";
import { isCanonicalEntityId } from "../registries/entityRegistryContract.js";
import { parseStudentRegistryDocument } from "../registries/studentRegistryContract.js";
import { parseClassRegistryDocument } from "../registries/classRegistryContract.js";
import { parseSubjectRegistryDocument } from "../registries/subjectRegistryContract.js";
import { parseCanonicalStudentEnrollment } from "../relationships/studentEnrollmentContract.js";

export const CANONICAL_MIGRATION_CLASSIFIER_VERSION = "CANONICAL_MIGRATION_CLASSIFIER_V1" as const;

export const MIGRATION_CLASSIFICATIONS = Object.freeze([
  "SAFE_TO_CANONICALIZE", "NEEDS_ADMIN_REVIEW", "MISSING_STUDENT_ID", "MISSING_CLASS_ID",
  "INVALID_SUBJECT_ID", "DUPLICATE_STUDENT", "CONFLICTING_CLASS", "CONFLICTING_SUBJECTS",
  "CROSS_WORKSPACE", "MALFORMED", "UNKNOWN_SOURCE", "ALREADY_CANONICAL",
] as const);
export type MigrationClassification = typeof MIGRATION_CLASSIFICATIONS[number];
type EntityType = "student" | "class" | "subject" | "enrollment";
type SourceKind = "operational_student" | "people_fallback" | "operational_class_ref" | "operational_subject" | "legacy_subject" | "operational_enrollment" | "already_canonical";
type AnySourceKind = SourceKind | "unknown";

export interface MigrationPreviewRecord {
  readonly classifierVersion: typeof CANONICAL_MIGRATION_CLASSIFIER_VERSION;
  readonly sourceKind: AnySourceKind;
  readonly sourceFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly classification: MigrationClassification;
  readonly reasonCodes: readonly string[];
  readonly proposedEntityType: EntityType;
  readonly proposedDestination: string | null;
  readonly proposedStatus: "active" | "inactive" | null;
  readonly mappingFingerprint: string | null;
  readonly changeSummary: Readonly<Record<string, boolean | number | string>>;
}

export interface MigrationPreview {
  readonly classifierVersion: typeof CANONICAL_MIGRATION_CLASSIFIER_VERSION;
  readonly mappingFingerprint: string;
  readonly records: readonly MigrationPreviewRecord[];
  readonly summary: Readonly<Record<MigrationClassification, number> & { total: number; students: number; classes: number; subjects: number; enrollments: number; safeStudents: number; safeEnrollments: number; classRefsMapped: number; subjectRefsResolved: number; fallbackDependencies: number }>;
}

interface RawRecord { readonly [key: string]: unknown }
interface Mapping { readonly workspaceId: string; readonly legacyRef: string; readonly canonicalId: string; }
interface NormalSource { readonly entity: EntityType; readonly sourceKind: AnySourceKind; readonly workspaceId: string; readonly sourceId: string | null; readonly studentId: string | null; readonly classRef: string | null; readonly subjectRefs: readonly string[]; readonly declaredWorkspaceId: string | null; readonly alreadyCanonical: boolean; readonly displayMetadataPresent: boolean; }

const SOURCE_KINDS = new Set<SourceKind>(["operational_student", "people_fallback", "operational_class_ref", "operational_subject", "legacy_subject", "operational_enrollment", "already_canonical"]);
const PRECEDENCE: readonly MigrationClassification[] = ["MALFORMED", "CROSS_WORKSPACE", "UNKNOWN_SOURCE", "MISSING_STUDENT_ID", "MISSING_CLASS_ID", "INVALID_SUBJECT_ID", "DUPLICATE_STUDENT", "CONFLICTING_CLASS", "CONFLICTING_SUBJECTS", "NEEDS_ADMIN_REVIEW", "ALREADY_CANONICAL", "SAFE_TO_CANONICALIZE"];

function record(value: unknown): value is RawRecord { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown): string | null { return typeof value === "string" && value.length > 0 ? value : null; }
function exactId(value: unknown): string | null { return isCanonicalEntityId(value) ? value : null; }
function fp(value: unknown): string { return sha256Canonical(value).slice(0, 16); }
function choose(reasons: readonly string[]): MigrationClassification {
  for (const classification of PRECEDENCE) if (reasons.includes(classification)) return classification;
  return "NEEDS_ADMIN_REVIEW";
}
function safeReasons(reasons: readonly string[]): readonly string[] { return Object.freeze([...new Set(reasons)].sort().slice(0, 12)); }

function normalize(raw: unknown, entity: EntityType): NormalSource | null {
  if (!record(raw)) return null;
  const rawSourceKind = text(raw.sourceKind);
  if (!rawSourceKind) return null;
  const sourceKind: AnySourceKind = SOURCE_KINDS.has(rawSourceKind as SourceKind) ? rawSourceKind as SourceKind : "unknown";
  const workspaceId = exactId(raw.workspaceId);
  if (!workspaceId) return null;
  const sourceId = text(raw.sourceId);
  const declaredWorkspaceId = raw.declaredWorkspaceId === undefined ? null : exactId(raw.declaredWorkspaceId);
  const subjectRefs = Array.isArray(raw.sourceSubjectRefs) && raw.sourceSubjectRefs.every((item) => typeof item === "string")
    ? Object.freeze([...raw.sourceSubjectRefs as string[]]) : Object.freeze([]);
  if (entity === "enrollment" && (!Array.isArray(raw.sourceSubjectRefs) || !raw.sourceSubjectRefs.every((item) => typeof item === "string"))) return null;
  return Object.freeze({
    entity, sourceKind, workspaceId, sourceId,
    studentId: text(raw.sourceStudentId), classRef: text(raw.sourceClassRef) ?? text(raw.sourceSubjectRef), subjectRefs,
    declaredWorkspaceId, alreadyCanonical: raw.alreadyCanonical === true || sourceKind === "already_canonical",
    displayMetadataPresent: text(raw.displayName) !== null || text(raw.studentNumber) !== null || text(raw.subjectName) !== null,
  });
}

function parseMappings(value: unknown, kind: "class" | "subject"): { readonly map: ReadonlyMap<string, Mapping>; readonly conflicts: ReadonlySet<string>; readonly fingerprint: string } {
  if (!Array.isArray(value)) throw new TypeError(`${kind}_mapping_set_invalid`);
  const map = new Map<string, Mapping>();
  const conflicts = new Set<string>();
  const normalized: Mapping[] = [];
  for (const item of value) {
    if (!record(item) || Object.keys(item).some((key) => !new Set(["workspaceId", "legacyRef", "canonicalId"]).has(key))) throw new TypeError(`${kind}_mapping_invalid`);
    const workspaceId = exactId(item.workspaceId); const legacyRef = text(item.legacyRef); const canonicalId = exactId(item.canonicalId);
    if (!workspaceId || !legacyRef || !canonicalId) throw new TypeError(`${kind}_mapping_invalid`);
    const mapping = Object.freeze({ workspaceId, legacyRef, canonicalId });
    const key = `${workspaceId}\u0000${legacyRef}`;
    const prior = map.get(key);
    if (prior && prior.canonicalId !== canonicalId) conflicts.add(key);
    if (prior && prior.canonicalId === canonicalId) conflicts.add(key);
    map.set(key, mapping); normalized.push(mapping);
  }
  return Object.freeze({ map, conflicts, fingerprint: fp(normalized.sort((a, b) => `${a.workspaceId}\u0000${a.legacyRef}\u0000${a.canonicalId}`.localeCompare(`${b.workspaceId}\u0000${b.legacyRef}\u0000${b.canonicalId}`))) });
}

function mappingFor(mapping: ReturnType<typeof parseMappings>, workspaceId: string, legacyRef: string): Mapping | null {
  const key = `${workspaceId}\u0000${legacyRef}`;
  return mapping.conflicts.has(key) ? null : mapping.map.get(key) ?? null;
}

function previewRecord(source: NormalSource | null, entity: EntityType, reasons: string[], destination: string | null, status: "active" | "inactive" | null, mappingFingerprint: string | null, summary: Readonly<Record<string, boolean | number | string>>): MigrationPreviewRecord {
  const safe = source ? { entity, sourceKind: source.sourceKind, workspaceId: source.workspaceId, sourceId: source.sourceId, studentId: source.studentId, classRef: source.classRef, subjectRefs: [...source.subjectRefs], alreadyCanonical: source.alreadyCanonical } : { entity, malformed: true };
  return Object.freeze({ classifierVersion: CANONICAL_MIGRATION_CLASSIFIER_VERSION, sourceKind: source?.sourceKind ?? "unknown", sourceFingerprint: fp(safe), workspaceFingerprint: source ? fp({ workspaceId: source.workspaceId }) : "-", classification: choose(reasons), reasonCodes: safeReasons(reasons), proposedEntityType: entity, proposedDestination: destination, proposedStatus: status, mappingFingerprint, changeSummary: Object.freeze(summary) });
}

function compatible(entity: EntityType, workspaceId: string, id: string, classId?: string, subjectIds?: readonly string[]): boolean {
  const base = { schemaVersion: 1, version: 1, workspaceId, status: "active", source: "migration", createdAt: 0, updatedAt: 0, createdBy: "migration_actor" };
  if (entity === "student") return parseStudentRegistryDocument({ ...base, studentId: id }, { workspaceId, entityId: id }).state === "VALID";
  if (entity === "class") return parseClassRegistryDocument({ ...base, classId: id, displayName: "migration" }, { workspaceId, entityId: id }).state === "VALID";
  if (entity === "subject") return parseSubjectRegistryDocument({ ...base, subjectId: id, displayName: "migration" }, { workspaceId, entityId: id }).state === "VALID";
  return parseCanonicalStudentEnrollment({ ...base, studentId: id, classId, subjectIds }).state === "VALID";
}

export function createCanonicalMigrationPreview(input: Readonly<Record<string, unknown>>): MigrationPreview {
  if (!record(input) || input.classifierVersion !== CANONICAL_MIGRATION_CLASSIFIER_VERSION) throw new TypeError("unsupported_migration_classifier_version");
  const classMappings = parseMappings(input.classMappings ?? [], "class");
  const subjectMappings = parseMappings(input.subjectMappings ?? [], "subject");
  const mappingFingerprint = fp({ class: classMappings.fingerprint, subject: subjectMappings.fingerprint });
  const students = Array.isArray(input.students) ? input.students : [];
  const classes = Array.isArray(input.classes) ? input.classes : [];
  const subjects = Array.isArray(input.subjects) ? input.subjects : [];
  const enrollments = Array.isArray(input.enrollments) ? input.enrollments : [];
  const normalizedStudents = students.map((item) => normalize(item, "student"));
  const studentCounts = new Map<string, number>();
  for (const student of normalizedStudents) if (student?.studentId && exactId(student.studentId)) studentCounts.set(`${student.workspaceId}\u0000${student.studentId}`, (studentCounts.get(`${student.workspaceId}\u0000${student.studentId}`) ?? 0) + 1);
  const operationalSubjects = new Map<string, string>();
  for (const source of subjects.map((item) => normalize(item, "subject"))) if (source?.sourceKind === "operational_subject" && source.sourceId && exactId(source.sourceId)) operationalSubjects.set(`${source.workspaceId}\u0000${source.sourceId}`, source.sourceId);
  const records: MigrationPreviewRecord[] = [];
  for (const student of normalizedStudents) {
    const reasons: string[] = [];
    if (!student) reasons.push("MALFORMED");
    else if (student.declaredWorkspaceId && student.declaredWorkspaceId !== student.workspaceId) reasons.push("CROSS_WORKSPACE");
    else if (student.sourceKind !== "operational_student" && !student.alreadyCanonical) reasons.push(student.sourceKind === "people_fallback" ? "MISSING_STUDENT_ID" : "UNKNOWN_SOURCE");
    else if (!student.studentId) reasons.push("MISSING_STUDENT_ID");
    else if (!exactId(student.studentId)) reasons.push("MALFORMED");
    else if ((studentCounts.get(`${student.workspaceId}\u0000${student.studentId}`) ?? 0) > 1) reasons.push("DUPLICATE_STUDENT");
    else if (student.alreadyCanonical) reasons.push("ALREADY_CANONICAL");
    else if (!compatible("student", student.workspaceId, student.studentId)) reasons.push("MALFORMED");
    else reasons.push("SAFE_TO_CANONICALIZE");
    records.push(previewRecord(student, "student", reasons, choose(reasons) === "SAFE_TO_CANONICALIZE" ? `studentRegistry/${student!.studentId}` : null, choose(reasons) === "SAFE_TO_CANONICALIZE" ? "active" : null, null, { preservesStableStudentId: choose(reasons) === "SAFE_TO_CANONICALIZE", displayMetadataPresent: student?.displayMetadataPresent === true }));
  }
  for (const source of classes.map((item) => normalize(item, "class"))) {
    const reasons: string[] = [];
    const map = source?.classRef ? mappingFor(classMappings, source.workspaceId, source.classRef) : null;
    if (!source) reasons.push("MALFORMED"); else if (source.declaredWorkspaceId && source.declaredWorkspaceId !== source.workspaceId) reasons.push("CROSS_WORKSPACE"); else if (source.sourceKind !== "operational_class_ref") reasons.push("UNKNOWN_SOURCE"); else if (!source.classRef) reasons.push("MISSING_CLASS_ID"); else if (classMappings.conflicts.has(`${source.workspaceId}\u0000${source.classRef}`)) reasons.push("CONFLICTING_CLASS"); else if (!map) reasons.push("MISSING_CLASS_ID"); else if (!compatible("class", source.workspaceId, map.canonicalId)) reasons.push("MALFORMED"); else reasons.push("SAFE_TO_CANONICALIZE");
    records.push(previewRecord(source, "class", reasons, choose(reasons) === "SAFE_TO_CANONICALIZE" ? `classRegistry/${map!.canonicalId}` : null, choose(reasons) === "SAFE_TO_CANONICALIZE" ? "active" : null, classMappings.fingerprint, { exactReviewedMapping: Boolean(map), generatesClassId: false }));
  }
  for (const source of subjects.map((item) => normalize(item, "subject"))) {
    const reasons: string[] = []; const map = source?.classRef ? mappingFor(subjectMappings, source.workspaceId, source.classRef) : null;
    const subjectId = source?.sourceKind === "operational_subject" ? exactId(source.sourceId) : map?.canonicalId ?? null;
    if (!source) reasons.push("MALFORMED"); else if (source.declaredWorkspaceId && source.declaredWorkspaceId !== source.workspaceId) reasons.push("CROSS_WORKSPACE"); else if (source.sourceKind !== "operational_subject" && source.sourceKind !== "legacy_subject") reasons.push("UNKNOWN_SOURCE"); else if (source.sourceKind === "operational_subject" && !subjectId) reasons.push("INVALID_SUBJECT_ID"); else if (source.sourceKind === "legacy_subject" && (!source.classRef || subjectMappings.conflicts.has(`${source.workspaceId}\u0000${source.classRef}`))) reasons.push("INVALID_SUBJECT_ID"); else if (source.sourceKind === "legacy_subject" && !map) reasons.push("INVALID_SUBJECT_ID"); else if (!subjectId || !compatible("subject", source.workspaceId, subjectId)) reasons.push("MALFORMED"); else reasons.push("SAFE_TO_CANONICALIZE");
    records.push(previewRecord(source, "subject", reasons, choose(reasons) === "SAFE_TO_CANONICALIZE" ? `subjectRegistry/${subjectId}` : null, choose(reasons) === "SAFE_TO_CANONICALIZE" ? "active" : null, source?.sourceKind === "legacy_subject" ? subjectMappings.fingerprint : null, { preservesOperationalSubjectId: source?.sourceKind === "operational_subject", exactReviewedMapping: Boolean(map) }));
  }
  for (const source of enrollments.map((item) => normalize(item, "enrollment"))) {
    const reasons: string[] = []; let classId: string | null = null; const subjectIds: string[] = [];
    if (!source) reasons.push("MALFORMED"); else if (source.declaredWorkspaceId && source.declaredWorkspaceId !== source.workspaceId) reasons.push("CROSS_WORKSPACE"); else if (source.sourceKind !== "operational_enrollment") reasons.push("UNKNOWN_SOURCE"); else if (!source.studentId) reasons.push("MISSING_STUDENT_ID"); else if (!exactId(source.studentId)) reasons.push("MALFORMED"); else if ((studentCounts.get(`${source.workspaceId}\u0000${source.studentId}`) ?? 0) !== 1) reasons.push("DUPLICATE_STUDENT");
    if (source && !reasons.length) {
      const classMap = source.classRef ? mappingFor(classMappings, source.workspaceId, source.classRef) : null;
      if (!source.classRef || classMappings.conflicts.has(`${source.workspaceId}\u0000${source.classRef}`)) reasons.push("CONFLICTING_CLASS"); else if (!classMap) reasons.push("MISSING_CLASS_ID"); else classId = classMap.canonicalId;
      for (const ref of source.subjectRefs) {
        const direct = operationalSubjects.get(`${source.workspaceId}\u0000${ref}`); const mapped = mappingFor(subjectMappings, source.workspaceId, ref)?.canonicalId;
        if (!direct && !mapped) reasons.push("INVALID_SUBJECT_ID"); else subjectIds.push(direct ?? mapped!);
      }
      if (new Set(subjectIds).size !== subjectIds.length) reasons.push("CONFLICTING_SUBJECTS");
      if (!reasons.length && !compatible("enrollment", source.workspaceId, source.studentId!, classId!, subjectIds)) reasons.push("MALFORMED");
      if (!reasons.length) reasons.push("SAFE_TO_CANONICALIZE");
    }
    const classification = choose(reasons);
    records.push(previewRecord(source, "enrollment", reasons, classification === "SAFE_TO_CANONICALIZE" ? `studentEnrollments/${source!.studentId}` : null, classification === "SAFE_TO_CANONICALIZE" ? "active" : null, mappingFingerprint, { subjectCount: subjectIds.length, resolvedSubjectCount: subjectIds.length, exactClassMapping: classId !== null }));
  }
  const sorted = records.sort((left, right) => `${left.proposedEntityType}\u0000${left.sourceFingerprint}`.localeCompare(`${right.proposedEntityType}\u0000${right.sourceFingerprint}`));
  const counts = Object.fromEntries(MIGRATION_CLASSIFICATIONS.map((classification) => [classification, sorted.filter((item) => item.classification === classification).length])) as Record<MigrationClassification, number>;
  const by = (entity: EntityType) => sorted.filter((item) => item.proposedEntityType === entity);
  return Object.freeze({ classifierVersion: CANONICAL_MIGRATION_CLASSIFIER_VERSION, mappingFingerprint, records: Object.freeze(sorted), summary: Object.freeze({ ...counts, total: sorted.length, students: by("student").length, classes: by("class").length, subjects: by("subject").length, enrollments: by("enrollment").length, safeStudents: by("student").filter((item) => item.classification === "SAFE_TO_CANONICALIZE").length, safeEnrollments: by("enrollment").filter((item) => item.classification === "SAFE_TO_CANONICALIZE").length, classRefsMapped: by("class").filter((item) => item.classification === "SAFE_TO_CANONICALIZE").length, subjectRefsResolved: by("subject").filter((item) => item.classification === "SAFE_TO_CANONICALIZE").length, fallbackDependencies: sorted.filter((item) => item.sourceKind === "people_fallback" || item.sourceKind === "legacy_subject").length }) });
}
