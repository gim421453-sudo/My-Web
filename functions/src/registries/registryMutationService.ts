import { randomUUID } from "node:crypto";
import type { VerifiedActor } from "../auth/verifiedActor.js";
import { AuthorizationError } from "../authz/authzErrors.js";
import { requirePermission } from "../authz/permissionResolver.js";
import { requireActiveWorkspace } from "../adminApplications/adminApplicationContract.js";
import {
  strictPayload,
  validateOperation,
  type CanonicalObject,
  type OperationSpecification,
  type ValidatedOperation,
} from "../operations/operationContract.js";
import { OperationError } from "../operations/operationErrors.js";
import { executeIdempotentAuthorityOperation, type AuthorityOperationExecutionResult } from "../operations/operationExecutor.js";
import { securityAuditMutation } from "../operations/securityAuditRepository.js";
import type { CanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";
import { getEmulatorTransactionRunner, type TrustedTransactionRunner } from "../repositories/trustedTransaction.js";
import {
  CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION,
  isCanonicalEntityVersion,
  type CanonicalEntityRegistryStatus,
} from "./entityRegistryContract.js";
import { createEntityRegistryRepository } from "./entityRegistryRepository.js";
import { createRegistryMutationRepository } from "./registryMutationRepository.js";
import { parseStudentRegistryDocument, type CanonicalStudentRegistry } from "./studentRegistryContract.js";
import { parseClassRegistryDocument, type CanonicalClassRegistry } from "./classRegistryContract.js";
import { parseSubjectRegistryDocument, type CanonicalSubjectRegistry } from "./subjectRegistryContract.js";

type RegistryKind = "student" | "class" | "subject";
type Metadata = Readonly<Record<string, string | undefined>>;
interface RegistryPayload extends CanonicalObject { readonly expectedVersion: number | null; readonly metadata: CanonicalObject | null }

export interface RegistryMutationDependencies { readonly runner?: TrustedTransactionRunner; readonly createId?: () => string }

function metadataKeys(kind: RegistryKind): Set<string> {
  return new Set(kind === "student" ? ["displayName", "studentNumber"] : kind === "class"
    ? ["displayName", "schoolYear", "grade"] : ["displayName", "subjectCode"]);
}
function requiredMetadata(kind: RegistryKind, metadata: Record<string, unknown>, requestId: string): Metadata {
  const keys = metadataKeys(kind);
  strictPayload(metadata, keys, requestId);
  if ((kind === "class" || kind === "subject") && typeof metadata.displayName !== "string") {
    throw new OperationError("INVALID_ARGUMENT", requestId);
  }
  const result: Record<string, string | undefined> = {};
  for (const key of keys) {
    const value = metadata[key];
    if (value !== undefined && (typeof value !== "string" || !value.trim() || value.length > 200)) {
      throw new OperationError("INVALID_ARGUMENT", requestId);
    }
    if (typeof value === "string") result[key] = value.trim();
  }
  return Object.freeze(result);
}
function parseVersion(value: unknown, requestId: string): number {
  if (!isCanonicalEntityVersion(value)) throw new OperationError("INVALID_ARGUMENT", requestId);
  return value;
}
function spec(kind: RegistryKind, action: "create" | "update" | "activate" | "deactivate"): OperationSpecification<RegistryPayload> {
  const operation = `${kind}_registry.${action}`;
  const payloadKeys = action === "create" ? new Set(["metadata"]) : action === "update"
    ? new Set(["expectedVersion", "metadata"]) : new Set(["expectedVersion"]);
  return Object.freeze({
    operation,
    targetKind: `${kind}_registry`,
    payloadKeys,
    parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string): RegistryPayload {
      strictPayload(payload, payloadKeys, requestId);
      if (action === "create") {
        if (!payload.metadata || typeof payload.metadata !== "object" || Array.isArray(payload.metadata)) throw new OperationError("INVALID_ARGUMENT", requestId);
        return Object.freeze({ expectedVersion: null, metadata: requiredMetadata(kind, payload.metadata as Record<string, unknown>, requestId) }) as RegistryPayload;
      }
      const expectedVersion = parseVersion(payload.expectedVersion, requestId);
      if (action === "update") {
        if (!payload.metadata || typeof payload.metadata !== "object" || Array.isArray(payload.metadata)) throw new OperationError("INVALID_ARGUMENT", requestId);
        return Object.freeze({ expectedVersion, metadata: requiredMetadata(kind, payload.metadata as Record<string, unknown>, requestId) }) as RegistryPayload;
      }
      return Object.freeze({ expectedVersion, metadata: null }) as RegistryPayload;
    },
  });
}
function workspaceId<T extends CanonicalObject>(operation: ValidatedOperation<T>): string {
  if (!operation.target.workspaceId) throw new OperationError("INVALID_ARGUMENT", operation.requestId);
  return operation.target.workspaceId;
}
async function authorize<T extends CanonicalObject>(repositories: CanonicalAuthorityRepositories, operation: ValidatedOperation<T>, permission: "student.registry.manage" | "academic.registry.manage"): Promise<void> {
  try {
    const targetWorkspaceId = workspaceId(operation);
    const context = await repositories.systemOwners.buildWorkspaceAuthorizationContext(operation.actor, operation.operation, targetWorkspaceId);
    requirePermission(context, permission);
    requireActiveWorkspace(await repositories.workspaces.get(targetWorkspaceId, operation.requestId), targetWorkspaceId, operation.requestId);
  } catch (error) {
    if (error instanceof AuthorizationError) throw new OperationError(error.code === "AUTHZ_INTERNAL_ERROR" ? "INTERNAL" : "FORBIDDEN", operation.requestId);
    throw error;
  }
}
function nextVersion(current: number, requestId: string): number {
  if (!isCanonicalEntityVersion(current) || current === Number.MAX_SAFE_INTEGER) throw new OperationError("FAILED_PRECONDITION", requestId);
  return current + 1;
}
function generatedId(kind: RegistryKind, createId: () => string, requestId: string): string {
  const id = `${kind}_${createId().replaceAll("-", "")}`;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new OperationError("INTERNAL", requestId);
  return id;
}
function base(kind: RegistryKind, workspaceIdValue: string, entityId: string, actor: VerifiedActor, now: unknown, metadata: Metadata) {
  return Object.freeze({ schemaVersion: CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION, version: 1, workspaceId: workspaceIdValue,
    [`${kind}Id`]: entityId, status: "active", source: "manual_admin", createdAt: now, updatedAt: now, createdBy: actor.uid, ...metadata });
}
function parseExisting(kind: RegistryKind, data: unknown, workspaceIdValue: string, entityId: string, requestId: string): CanonicalStudentRegistry | CanonicalClassRegistry | CanonicalSubjectRegistry {
  const parsed = kind === "student" ? parseStudentRegistryDocument(data, { workspaceId: workspaceIdValue, entityId })
    : kind === "class" ? parseClassRegistryDocument(data, { workspaceId: workspaceIdValue, entityId })
      : parseSubjectRegistryDocument(data, { workspaceId: workspaceIdValue, entityId });
  if (parsed.state === "MALFORMED") throw new OperationError("FAILED_PRECONDITION", requestId);
  return parsed.entity;
}
// Registry mutations need their narrow writer in the same transaction as audit/idempotency.
// Keep the transaction-bound implementation outside the generic executor rather than exposing generic writes.
export function createRegistryMutationService(dependencies: RegistryMutationDependencies = {}) {
  const createId = dependencies.createId ?? randomUUID;
  const invoke = async (kind: RegistryKind, action: "create" | "update" | "activate" | "deactivate", actor: VerifiedActor, input: unknown): Promise<AuthorityOperationExecutionResult> => {
    const operation = validateOperation(actor, input, spec(kind, action));
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    const permission = kind === "student" ? "student.registry.manage" : "academic.registry.manage";
    // Firestore may replay a transaction callback. Generate once per validated logical command.
    const createdId = action === "create" ? generatedId(kind, createId, operation.requestId) : null;
    return runner.run(async (transaction) => {
      const { createCanonicalAuthorityRepositories } = await import("../repositories/canonicalAuthorityRepositories.js");
      const { IdempotencyRepository } = await import("../operations/idempotencyRepository.js");
      const { SecurityAuditRepository } = await import("../operations/securityAuditRepository.js");
      const { safeSummary } = await import("../operations/safeSummary.js");
      const repositories = createCanonicalAuthorityRepositories(transaction);
      await authorize(repositories, operation, permission);
      const idempotency = new IdempotencyRepository(transaction);
      const replay = await idempotency.inspect(operation);
      if (replay.state === "REPLAY_COMPLETED") return Object.freeze({ replayed: true, result: replay.result });
      const targetWorkspaceId = workspaceId(operation);
      const writer = createRegistryMutationRepository(transaction);
      const lookup = createEntityRegistryRepository(transaction);
      const id = createdId ?? operation.target.id;
      const currentLookup = kind === "student" ? await lookup.getStudent(targetWorkspaceId, id) : kind === "class" ? await lookup.getClass(targetWorkspaceId, id) : await lookup.getSubject(targetWorkspaceId, id);
      if (action === "create") {
        if (currentLookup.state !== "MISSING") throw new OperationError("CONFLICT", operation.requestId);
        const data = base(kind, targetWorkspaceId, id, operation.actor, transaction.now, operation.payload.metadata as Metadata);
        parseExisting(kind, data, targetWorkspaceId, id, operation.requestId);
        if (kind === "student") writer.createStudent(targetWorkspaceId, id, data); else if (kind === "class") writer.createClass(targetWorkspaceId, id, data); else writer.createSubject(targetWorkspaceId, id, data);
        const result = safeSummary({ created: true, workspaceId: targetWorkspaceId, targetId: id, status: "active", version: 1 }, operation.requestId);
        new SecurityAuditRepository(transaction).createSuccess(operation, securityAuditMutation({}, { created: true, status: "active", version: 1 }, operation.requestId, { eventType: `${kind.toUpperCase()}_REGISTRY_CREATE`, workspaceId: targetWorkspaceId }));
        idempotency.createCompleted(operation, result);
        return Object.freeze({ replayed: false, result });
      }
      if (currentLookup.state === "MISSING") throw new OperationError("NOT_FOUND", operation.requestId);
      if (currentLookup.state === "MALFORMED") throw new OperationError("FAILED_PRECONDITION", operation.requestId);
      const current = parseExisting(kind, currentLookup.entity, targetWorkspaceId, id, operation.requestId);
      const payload = operation.payload;
      if (current.version !== payload.expectedVersion) throw new OperationError("CONFLICT", operation.requestId);
      const requestedStatus: CanonicalEntityRegistryStatus = action === "activate" ? "active" : action === "deactivate" ? "inactive" : current.status;
      const metadata = action === "update" ? payload.metadata as Metadata : {};
      const changed = action === "update" ? Object.entries(metadata).some(([key, value]) => current[key as keyof typeof current] !== value) : current.status !== requestedStatus;
      if (!changed) return Object.freeze({ replayed: false, result: safeSummary({ workspaceId: targetWorkspaceId, targetId: id, status: current.status, version: current.version, updated: false }, operation.requestId) });
      const data = Object.freeze({ ...current, ...metadata, status: requestedStatus, version: nextVersion(current.version, operation.requestId), updatedAt: transaction.now });
      parseExisting(kind, data, targetWorkspaceId, id, operation.requestId);
      if (kind === "student") writer.updateStudent(targetWorkspaceId, id, data); else if (kind === "class") writer.updateClass(targetWorkspaceId, id, data); else writer.updateSubject(targetWorkspaceId, id, data);
      const result = safeSummary({ workspaceId: targetWorkspaceId, targetId: id, status: requestedStatus, version: data.version, updated: true }, operation.requestId);
      new SecurityAuditRepository(transaction).createSuccess(operation, securityAuditMutation({ status: current.status, version: current.version }, { status: requestedStatus, version: data.version, updated: true }, operation.requestId, { eventType: `${kind.toUpperCase()}_REGISTRY_${action === "update" ? "UPDATE" : action.toUpperCase()}`, workspaceId: targetWorkspaceId }));
      idempotency.createCompleted(operation, result);
      return Object.freeze({ replayed: false, result });
    });
  };
  return Object.freeze({
    createStudentRegistry: (actor: VerifiedActor, input: unknown) => invoke("student", "create", actor, input),
    updateStudentRegistryMetadata: (actor: VerifiedActor, input: unknown) => invoke("student", "update", actor, input),
    activateStudentRegistry: (actor: VerifiedActor, input: unknown) => invoke("student", "activate", actor, input),
    deactivateStudentRegistry: (actor: VerifiedActor, input: unknown) => invoke("student", "deactivate", actor, input),
    createClassRegistry: (actor: VerifiedActor, input: unknown) => invoke("class", "create", actor, input),
    updateClassRegistryMetadata: (actor: VerifiedActor, input: unknown) => invoke("class", "update", actor, input),
    activateClassRegistry: (actor: VerifiedActor, input: unknown) => invoke("class", "activate", actor, input),
    deactivateClassRegistry: (actor: VerifiedActor, input: unknown) => invoke("class", "deactivate", actor, input),
    createSubjectRegistry: (actor: VerifiedActor, input: unknown) => invoke("subject", "create", actor, input),
    updateSubjectRegistryMetadata: (actor: VerifiedActor, input: unknown) => invoke("subject", "update", actor, input),
    activateSubjectRegistry: (actor: VerifiedActor, input: unknown) => invoke("subject", "activate", actor, input),
    deactivateSubjectRegistry: (actor: VerifiedActor, input: unknown) => invoke("subject", "deactivate", actor, input),
  });
}
