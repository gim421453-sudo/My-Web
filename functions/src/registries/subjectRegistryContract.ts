import {
  type CanonicalEntityRegistrySource,
  type CanonicalEntityRegistryStatus,
  type RegistryBinding,
  type RegistryParseResult,
  CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION,
  isOptionalDisplayText,
  parseRegistryBase,
} from "./entityRegistryContract.js";

const SUBJECT_REGISTRY_KEYS = new Set([
  "schemaVersion", "version", "workspaceId", "subjectId", "status", "source", "createdAt", "updatedAt", "createdBy",
  "displayName", "subjectCode",
]);

export interface CanonicalSubjectRegistry {
  readonly schemaVersion: typeof CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION;
  readonly version: number;
  readonly workspaceId: string;
  readonly subjectId: string;
  readonly status: CanonicalEntityRegistryStatus;
  readonly source: CanonicalEntityRegistrySource;
  readonly createdAt: unknown;
  readonly updatedAt: unknown;
  readonly createdBy: string;
  readonly displayName: string;
  readonly subjectCode?: string;
}

export function parseSubjectRegistryDocument(
  value: unknown,
  binding: RegistryBinding,
): RegistryParseResult<CanonicalSubjectRegistry> {
  const data = parseRegistryBase(value, binding, "subjectId", SUBJECT_REGISTRY_KEYS);
  if (!data || !isOptionalDisplayText(data.displayName) || data.displayName === undefined
    || !isOptionalDisplayText(data.subjectCode, 100)) {
    return Object.freeze({ state: "MALFORMED" });
  }
  return Object.freeze({
    state: "VALID",
    entity: Object.freeze({
      schemaVersion: CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION,
      version: data.version as number,
      workspaceId: binding.workspaceId,
      subjectId: binding.entityId,
      status: data.status as CanonicalEntityRegistryStatus,
      source: data.source as CanonicalEntityRegistrySource,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy as string,
      displayName: data.displayName as string,
      ...(data.subjectCode === undefined ? {} : { subjectCode: data.subjectCode as string }),
    }),
  });
}
