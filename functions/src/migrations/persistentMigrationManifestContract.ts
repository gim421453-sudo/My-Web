import { isValidDocumentId, isPlainRecord, hasOnlyKeys } from "../authz/resolverUtils.js";

export const PERSISTENT_MIGRATION_MANIFEST_VERSION = 1 as const;
export const MANIFEST_STATUSES = Object.freeze(["PREPARING", "PREPARED", "APPLYING", "PARTIAL", "APPLIED", "ROLLING_BACK", "ROLLED_BACK", "ROLLBACK_CONFLICT", "FAILED"] as const);
export const MANIFEST_OPERATION_STATUSES = Object.freeze(["PLANNED", "CREATED", "ALREADY_CANONICAL", "REPLAYED", "CONFLICT", "FAILED", "ROLLBACK_PENDING", "ROLLED_BACK", "ROLLBACK_CONFLICT"] as const);
export type ManifestStatus = typeof MANIFEST_STATUSES[number];
export type ManifestOperationStatus = typeof MANIFEST_OPERATION_STATUSES[number];

const ROOT_KEYS = new Set(["schemaVersion", "version", "workspaceId", "planId", "planFingerprint", "classifierVersion", "mappingFingerprint", "sourceSetFingerprint", "status", "operationCount", "createdAt", "createdBy", "updatedAt", "updatedBy", "activeRunId"]);
const OP_KEYS = new Set(["schemaVersion", "workspaceId", "planId", "operationIdHash", "entityType", "targetId", "sourceFingerprint", "plannedPayloadHash", "status", "createdByPlan", "beforeExists", "beforeFingerprint", "afterFingerprint", "versionAfter", "appliedRunId", "rollbackStatus", "createdAt", "updatedAt"]);

function id(value: unknown): value is string { return typeof value === "string" && isValidDocumentId(value); }
function hash(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }
function version(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value > 0; }
function status(value: unknown): value is ManifestStatus { return typeof value === "string" && MANIFEST_STATUSES.includes(value as ManifestStatus); }
function operationStatus(value: unknown): value is ManifestOperationStatus { return typeof value === "string" && MANIFEST_OPERATION_STATUSES.includes(value as ManifestOperationStatus); }

export function parsePersistentMigrationManifest(value: unknown, binding: Readonly<{ workspaceId: string; planId: string }>) {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ROOT_KEYS) || !id(binding.workspaceId) || !id(binding.planId)
    || value.schemaVersion !== PERSISTENT_MIGRATION_MANIFEST_VERSION || !version(value.version)
    || value.workspaceId !== binding.workspaceId || value.planId !== binding.planId || !hash(value.planFingerprint)
    || typeof value.classifierVersion !== "string" || typeof value.mappingFingerprint !== "string" || !hash(value.sourceSetFingerprint)
    || !status(value.status) || !Number.isSafeInteger(value.operationCount) || (value.operationCount as number) < 0
    || value.createdAt === undefined || !id(value.createdBy) || value.updatedAt === undefined || !id(value.updatedBy)
    || (value.activeRunId !== null && value.activeRunId !== undefined && !id(value.activeRunId))) return Object.freeze({ state: "MALFORMED" as const });
  return Object.freeze({ state: "VALID" as const, manifest: Object.freeze({ ...value }) });
}

export function parsePersistentMigrationOperation(value: unknown, binding: Readonly<{ workspaceId: string; planId: string; operationIdHash: string }>) {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, OP_KEYS) || !id(binding.workspaceId) || !id(binding.planId) || !hash(binding.operationIdHash)
    || value.schemaVersion !== PERSISTENT_MIGRATION_MANIFEST_VERSION || value.workspaceId !== binding.workspaceId || value.planId !== binding.planId
    || value.operationIdHash !== binding.operationIdHash || !hash(value.operationIdHash) || !["student", "class", "subject", "enrollment"].includes(value.entityType as string)
    || !id(value.targetId) || typeof value.sourceFingerprint !== "string" || !hash(value.plannedPayloadHash) || !operationStatus(value.status)
    || typeof value.createdByPlan !== "boolean" || typeof value.beforeExists !== "boolean" || value.createdAt === undefined || value.updatedAt === undefined
    || (value.beforeFingerprint !== null && value.beforeFingerprint !== undefined && !hash(value.beforeFingerprint))
    || (value.afterFingerprint !== null && value.afterFingerprint !== undefined && !hash(value.afterFingerprint))
    || (value.versionAfter !== null && value.versionAfter !== undefined && !version(value.versionAfter))
    || (value.appliedRunId !== null && value.appliedRunId !== undefined && !id(value.appliedRunId))
    || (value.rollbackStatus !== null && value.rollbackStatus !== undefined && !operationStatus(value.rollbackStatus))) return Object.freeze({ state: "MALFORMED" as const });
  return Object.freeze({ state: "VALID" as const, operation: Object.freeze({ ...value }) });
}
