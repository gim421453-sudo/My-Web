import { isPlainRecord, isValidDocumentId } from "../authz/resolverUtils.js";

export const TEACHER_ASSIGNMENT_SCHEMA_VERSION = 1 as const;
export const TEACHER_ASSIGNMENT_STATUSES = Object.freeze(["active", "inactive"] as const);
export const TEACHER_ASSIGNMENT_SOURCES = Object.freeze([
  "manual_admin",
  "migration",
  "system_bootstrap",
] as const);

export type TeacherAssignmentStatus = typeof TEACHER_ASSIGNMENT_STATUSES[number];
export type TeacherAssignmentSource = typeof TEACHER_ASSIGNMENT_SOURCES[number];
export type TeacherAssignmentTarget =
  | Readonly<{ type: "student"; studentId: string }>
  | Readonly<{ type: "class"; classId: string }>
  | Readonly<{ type: "subject"; subjectId: string }>
  | Readonly<{ type: "class_subject"; classId: string; subjectId: string }>;
export type AssignedScopeTarget = TeacherAssignmentTarget;

export interface CanonicalTeacherAssignment {
  readonly schemaVersion: typeof TEACHER_ASSIGNMENT_SCHEMA_VERSION;
  readonly workspaceId: string;
  readonly teacherUid: string;
  readonly target: TeacherAssignmentTarget;
  readonly status: TeacherAssignmentStatus;
  readonly source: TeacherAssignmentSource;
  readonly createdAt: unknown;
  readonly updatedAt: unknown;
  readonly createdBy: string;
  readonly validFrom: number | null;
  readonly validUntil: number | null;
}

export type TeacherAssignmentParseResult =
  | Readonly<{ state: "VALID"; assignment: CanonicalTeacherAssignment }>
  | Readonly<{ state: "MALFORMED" }>;

const ALLOWED_KEYS = new Set([
  "schemaVersion", "workspaceId", "teacherUid", "target", "status", "source",
  "createdAt", "updatedAt", "createdBy", "validFrom", "validUntil",
]);

function validTimestamp(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0;
  if (typeof value === "string") return value.length > 0;
  return typeof value === "object" && value !== null
    && typeof (value as Readonly<{ toMillis?: unknown }>).toMillis === "function";
}

function optionalMillis(value: unknown): number | null | undefined {
  if (value === undefined) return null;
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

export function parseAssignedScopeTarget(value: unknown): AssignedScopeTarget | null {
  if (!isPlainRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "student" && Object.keys(value).every((key) => ["type", "studentId"].includes(key)) && isValidDocumentId(value.studentId)) {
    return Object.freeze({ type: "student", studentId: value.studentId });
  }
  if (value.type === "class" && Object.keys(value).every((key) => ["type", "classId"].includes(key)) && isValidDocumentId(value.classId)) {
    return Object.freeze({ type: "class", classId: value.classId });
  }
  if (value.type === "subject" && Object.keys(value).every((key) => ["type", "subjectId"].includes(key)) && isValidDocumentId(value.subjectId)) {
    return Object.freeze({ type: "subject", subjectId: value.subjectId });
  }
  if (value.type === "class_subject"
    && Object.keys(value).every((key) => ["type", "classId", "subjectId"].includes(key))
    && isValidDocumentId(value.classId) && isValidDocumentId(value.subjectId)) {
    return Object.freeze({ type: "class_subject", classId: value.classId, subjectId: value.subjectId });
  }
  return null;
}

export function parseCanonicalTeacherAssignment(value: unknown): TeacherAssignmentParseResult {
  if (!isPlainRecord(value) || !Object.keys(value).every((key) => ALLOWED_KEYS.has(key))) {
    return Object.freeze({ state: "MALFORMED" });
  }
  if (value.schemaVersion !== TEACHER_ASSIGNMENT_SCHEMA_VERSION
    || !isValidDocumentId(value.workspaceId)
    || !isValidDocumentId(value.teacherUid)
    || !isValidDocumentId(value.createdBy)
    || !TEACHER_ASSIGNMENT_STATUSES.includes(value.status as TeacherAssignmentStatus)
    || !TEACHER_ASSIGNMENT_SOURCES.includes(value.source as TeacherAssignmentSource)
    || !validTimestamp(value.createdAt)
    || !validTimestamp(value.updatedAt)) {
    return Object.freeze({ state: "MALFORMED" });
  }
  const target = parseAssignedScopeTarget(value.target);
  const validFrom = optionalMillis(value.validFrom);
  const validUntil = optionalMillis(value.validUntil);
  if (!target || validFrom === undefined || validUntil === undefined
    || (validFrom !== null && validUntil !== null && validFrom > validUntil)) {
    return Object.freeze({ state: "MALFORMED" });
  }
  return Object.freeze({
    state: "VALID",
    assignment: Object.freeze({
      schemaVersion: TEACHER_ASSIGNMENT_SCHEMA_VERSION,
      workspaceId: value.workspaceId,
      teacherUid: value.teacherUid,
      target,
      status: value.status as TeacherAssignmentStatus,
      source: value.source as TeacherAssignmentSource,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      createdBy: value.createdBy,
      validFrom,
      validUntil,
    }),
  });
}

export function isAssignmentActiveAt(assignment: CanonicalTeacherAssignment, nowMs: number): boolean {
  return assignment.status === "active"
    && (assignment.validFrom === null || nowMs >= assignment.validFrom)
    && (assignment.validUntil === null || nowMs <= assignment.validUntil);
}
