import {
  type CanonicalEntityRegistrySource,
  type CanonicalEntityRegistryStatus,
  type RegistryBinding,
  type RegistryParseResult,
  CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION,
  isOptionalDisplayText,
  parseRegistryBase,
} from "./entityRegistryContract.js";

const STUDENT_REGISTRY_KEYS = new Set([
  "schemaVersion", "version", "workspaceId", "studentId", "status", "source", "createdAt", "updatedAt", "createdBy",
  "displayName", "studentNumber",
]);

export interface CanonicalStudentRegistry {
  readonly schemaVersion: typeof CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION;
  readonly version: number;
  readonly workspaceId: string;
  readonly studentId: string;
  readonly status: CanonicalEntityRegistryStatus;
  readonly source: CanonicalEntityRegistrySource;
  readonly createdAt: unknown;
  readonly updatedAt: unknown;
  readonly createdBy: string;
  readonly displayName?: string;
  readonly studentNumber?: string;
}

export function parseStudentRegistryDocument(
  value: unknown,
  binding: RegistryBinding,
): RegistryParseResult<CanonicalStudentRegistry> {
  const data = parseRegistryBase(value, binding, "studentId", STUDENT_REGISTRY_KEYS);
  if (!data || !isOptionalDisplayText(data.displayName) || !isOptionalDisplayText(data.studentNumber, 100)) {
    return Object.freeze({ state: "MALFORMED" });
  }
  return Object.freeze({
    state: "VALID",
    entity: Object.freeze({
      schemaVersion: CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION,
      version: data.version as number,
      workspaceId: binding.workspaceId,
      studentId: binding.entityId,
      status: data.status as CanonicalEntityRegistryStatus,
      source: data.source as CanonicalEntityRegistrySource,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy as string,
      ...(data.displayName === undefined ? {} : { displayName: data.displayName as string }),
      ...(data.studentNumber === undefined ? {} : { studentNumber: data.studentNumber as string }),
    }),
  });
}
