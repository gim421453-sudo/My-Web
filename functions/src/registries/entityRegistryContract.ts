import { hasOnlyKeys, isPlainRecord, isValidDocumentId } from "../authz/resolverUtils.js";

export const CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION = 1 as const;
export const CANONICAL_ENTITY_REGISTRY_STATUSES = Object.freeze(["active", "inactive"] as const);
export const CANONICAL_ENTITY_REGISTRY_SOURCES = Object.freeze([
  "manual_admin",
  "migration",
  "system_bootstrap",
  "external_import",
] as const);

export type CanonicalEntityRegistryStatus = typeof CANONICAL_ENTITY_REGISTRY_STATUSES[number];
export type CanonicalEntityRegistrySource = typeof CANONICAL_ENTITY_REGISTRY_SOURCES[number];

export interface RegistryBinding {
  readonly workspaceId: string;
  readonly entityId: string;
}

export interface CanonicalRegistryBase {
  readonly schemaVersion: typeof CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION;
  readonly version: number;
  readonly workspaceId: string;
  readonly status: CanonicalEntityRegistryStatus;
  readonly source: CanonicalEntityRegistrySource;
  readonly createdAt: unknown;
  readonly updatedAt: unknown;
  readonly createdBy: string;
}

export type RegistryParseResult<T> =
  | Readonly<{ state: "VALID"; entity: T }>
  | Readonly<{ state: "MALFORMED" }>;

export function isCanonicalEntityId(value: unknown): value is string {
  return isValidDocumentId(value) && !/\s/.test(value);
}

export function isCanonicalEntityVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

export function isTrustedRegistryTimestamp(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0;
  if (typeof value === "string") return value.length > 0;
  return typeof value === "object" && value !== null
    && typeof (value as Readonly<{ toMillis?: unknown }>).toMillis === "function";
}

export function isOptionalDisplayText(value: unknown, maxLength = 200): boolean {
  return value === undefined || (typeof value === "string" && value.length > 0 && value.length <= maxLength);
}

export function parseRegistryBase(
  value: unknown,
  binding: RegistryBinding,
  entityIdField: string,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> | null {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, allowedKeys)
    || !isCanonicalEntityId(binding.workspaceId)
    || !isCanonicalEntityId(binding.entityId)
    || value.schemaVersion !== CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION
    || !isCanonicalEntityVersion(value.version)
    || value.workspaceId !== binding.workspaceId
    || value[entityIdField] !== binding.entityId
    || !CANONICAL_ENTITY_REGISTRY_STATUSES.includes(value.status as CanonicalEntityRegistryStatus)
    || !CANONICAL_ENTITY_REGISTRY_SOURCES.includes(value.source as CanonicalEntityRegistrySource)
    || !isCanonicalEntityId(value.createdBy)
    || !isTrustedRegistryTimestamp(value.createdAt)
    || !isTrustedRegistryTimestamp(value.updatedAt)) {
    return null;
  }
  return value;
}
