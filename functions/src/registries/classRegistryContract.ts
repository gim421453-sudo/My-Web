import {
  type CanonicalEntityRegistrySource,
  type CanonicalEntityRegistryStatus,
  type RegistryBinding,
  type RegistryParseResult,
  CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION,
  isOptionalDisplayText,
  parseRegistryBase,
} from "./entityRegistryContract.js";

const CLASS_REGISTRY_KEYS = new Set([
  "schemaVersion", "version", "workspaceId", "classId", "status", "source", "createdAt", "updatedAt", "createdBy",
  "displayName", "schoolYear", "grade",
]);

export interface CanonicalClassRegistry {
  readonly schemaVersion: typeof CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION;
  readonly version: number;
  readonly workspaceId: string;
  readonly classId: string;
  readonly status: CanonicalEntityRegistryStatus;
  readonly source: CanonicalEntityRegistrySource;
  readonly createdAt: unknown;
  readonly updatedAt: unknown;
  readonly createdBy: string;
  readonly displayName: string;
  readonly schoolYear?: string;
  readonly grade?: string;
}

export function parseClassRegistryDocument(
  value: unknown,
  binding: RegistryBinding,
): RegistryParseResult<CanonicalClassRegistry> {
  const data = parseRegistryBase(value, binding, "classId", CLASS_REGISTRY_KEYS);
  if (!data || !isOptionalDisplayText(data.displayName) || data.displayName === undefined
    || !isOptionalDisplayText(data.schoolYear, 40) || !isOptionalDisplayText(data.grade, 80)) {
    return Object.freeze({ state: "MALFORMED" });
  }
  return Object.freeze({
    state: "VALID",
    entity: Object.freeze({
      schemaVersion: CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION,
      version: data.version as number,
      workspaceId: binding.workspaceId,
      classId: binding.entityId,
      status: data.status as CanonicalEntityRegistryStatus,
      source: data.source as CanonicalEntityRegistrySource,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy as string,
      displayName: data.displayName as string,
      ...(data.schoolYear === undefined ? {} : { schoolYear: data.schoolYear as string }),
      ...(data.grade === undefined ? {} : { grade: data.grade as string }),
    }),
  });
}
