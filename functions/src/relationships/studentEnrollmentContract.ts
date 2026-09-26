import { isPlainRecord, isValidDocumentId } from "../authz/resolverUtils.js";
import { isCanonicalEntityVersion } from "../registries/entityRegistryContract.js";

export const STUDENT_ENROLLMENT_SCHEMA_VERSION = 1 as const;
export const STUDENT_ENROLLMENT_STATUSES = Object.freeze(["active", "inactive"] as const);
export const STUDENT_ENROLLMENT_SOURCES = Object.freeze([
  "manual_admin",
  "migration",
  "system_bootstrap",
] as const);

export type StudentEnrollmentStatus = typeof STUDENT_ENROLLMENT_STATUSES[number];
export type StudentEnrollmentSource = typeof STUDENT_ENROLLMENT_SOURCES[number];

export interface CanonicalStudentEnrollment {
  readonly schemaVersion: typeof STUDENT_ENROLLMENT_SCHEMA_VERSION;
  readonly version: number;
  readonly workspaceId: string;
  readonly studentId: string;
  readonly classId: string;
  readonly subjectIds: readonly string[];
  readonly status: StudentEnrollmentStatus;
  readonly source: StudentEnrollmentSource;
  readonly createdAt: unknown;
  readonly updatedAt: unknown;
  readonly createdBy: string;
}

export type StudentEnrollmentParseResult =
  | Readonly<{ state: "VALID"; enrollment: CanonicalStudentEnrollment }>
  | Readonly<{ state: "MALFORMED" }>;

const ALLOWED_KEYS = new Set([
  "schemaVersion", "version", "workspaceId", "studentId", "classId", "subjectIds", "status", "source",
  "createdAt", "updatedAt", "createdBy",
]);

function validTimestamp(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0;
  if (typeof value === "string") return value.length > 0;
  return typeof value === "object" && value !== null
    && typeof (value as Readonly<{ toMillis?: unknown }>).toMillis === "function";
}

export function isStableRelationshipId(value: unknown): value is string {
  return isValidDocumentId(value) && !/\s/.test(value);
}

function parseSubjectIds(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.some((subjectId) => !isStableRelationshipId(subjectId))) return null;
  const subjectIds = value as string[];
  return new Set(subjectIds).size === subjectIds.length ? Object.freeze([...subjectIds]) : null;
}

export function parseCanonicalStudentEnrollment(value: unknown): StudentEnrollmentParseResult {
  if (!isPlainRecord(value) || !Object.keys(value).every((key) => ALLOWED_KEYS.has(key))) {
    return Object.freeze({ state: "MALFORMED" });
  }
  const subjectIds = parseSubjectIds(value.subjectIds);
  if (value.schemaVersion !== STUDENT_ENROLLMENT_SCHEMA_VERSION
    || !isCanonicalEntityVersion(value.version)
    || !isStableRelationshipId(value.workspaceId)
    || !isStableRelationshipId(value.studentId)
    || !isStableRelationshipId(value.classId)
    || !isStableRelationshipId(value.createdBy)
    || !subjectIds
    || !STUDENT_ENROLLMENT_STATUSES.includes(value.status as StudentEnrollmentStatus)
    || !STUDENT_ENROLLMENT_SOURCES.includes(value.source as StudentEnrollmentSource)
    || !validTimestamp(value.createdAt)
    || !validTimestamp(value.updatedAt)) {
    return Object.freeze({ state: "MALFORMED" });
  }
  return Object.freeze({
    state: "VALID",
    enrollment: Object.freeze({
      schemaVersion: STUDENT_ENROLLMENT_SCHEMA_VERSION,
      version: value.version,
      workspaceId: value.workspaceId,
      studentId: value.studentId,
      classId: value.classId,
      subjectIds,
      status: value.status as StudentEnrollmentStatus,
      source: value.source as StudentEnrollmentSource,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      createdBy: value.createdBy,
    }),
  });
}
