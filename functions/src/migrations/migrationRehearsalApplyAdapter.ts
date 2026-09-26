import type { VerifiedActor } from "../auth/verifiedActor.js";
import { AuthorizationError } from "../authz/authzErrors.js";
import { requirePermission } from "../authz/permissionResolver.js";
import type { PermissionName } from "../authz/permissions.js";
import { requireActiveWorkspace } from "../adminApplications/adminApplicationContract.js";
import { IdempotencyRepository } from "../operations/idempotencyRepository.js";
import { OperationError } from "../operations/operationErrors.js";
import {
  sha256Canonical,
  strictPayload,
  validateOperation,
  type CanonicalObject,
  type OperationSpecification,
  type ValidatedOperation,
} from "../operations/operationContract.js";
import { safeSummary } from "../operations/safeSummary.js";
import { SecurityAuditRepository, securityAuditMutation } from "../operations/securityAuditRepository.js";
import { createCanonicalAuthorityRepositories, type CanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";
import type { TrustedTransactionRunner } from "../repositories/trustedTransaction.js";
import { createEntityRegistryRepository } from "../registries/entityRegistryRepository.js";
import { createRegistryMutationRepository } from "../registries/registryMutationRepository.js";
import { parseClassRegistryDocument } from "../registries/classRegistryContract.js";
import { parseStudentRegistryDocument } from "../registries/studentRegistryContract.js";
import { parseSubjectRegistryDocument } from "../registries/subjectRegistryContract.js";
import { validateEnrollmentReferences } from "../relationships/enrollmentReferentialValidator.js";
import { createEnrollmentMutationRepository } from "../relationships/enrollmentMutationRepository.js";
import { parseCanonicalStudentEnrollment } from "../relationships/studentEnrollmentContract.js";
import { InMemoryMigrationRehearsalJournal, type MigrationJournalEntry } from "./migrationRehearsalJournal.js";
import { assertPlanCurrent, type MigrationPlan } from "./migrationDryRunOrchestrator.js";
import type { PersistentMigrationManifestPort } from "./persistentMigrationManifestRepository.js";

type EntityType = "student" | "class" | "subject" | "enrollment";
type RegistryMetadata = Readonly<Record<string, string>>;

export interface MigrationCanonicalProposal {
  readonly workspaceId: string;
  readonly sourceFingerprint: string;
  readonly targetId: string;
  readonly status?: "active" | "inactive";
  readonly metadata?: RegistryMetadata;
  readonly classId?: string;
  readonly subjectIds?: readonly string[];
}

export interface MigrationRehearsalCommand {
  readonly plan: MigrationPlan;
  readonly operationKey: string;
  readonly entityType: EntityType;
  readonly proposal: MigrationCanonicalProposal;
}

export interface MigrationApplyResult {
  readonly state: "CREATED" | "ALREADY_CANONICAL" | "REPLAYED";
  readonly planId: string;
  readonly operationKey: string;
  readonly entityType: EntityType;
  readonly workspaceId: string;
  readonly targetId: string;
  readonly version: 1;
  readonly fingerprint: string;
}

export interface MigrationPlanApplyResult {
  readonly state: "COMPLETED" | "STOPPED_PARTIAL";
  readonly completed: readonly MigrationApplyResult[];
  readonly failedOperationKey: string | null;
}

export interface MigrationRehearsalApplyDependencies {
  // Required deliberately: C2G1-A2 must not bind an Admin SDK or Emulator runner.
  readonly runner: TrustedTransactionRunner;
  readonly journal?: InMemoryMigrationRehearsalJournal;
  readonly manifest?: PersistentMigrationManifestPort;
  // Test-only dependency injection. It has no environment toggle or public export.
  readonly beforeCommit?: (command: MigrationRehearsalCommand) => void;
}

const ENTITY_CONFIG: Readonly<Record<EntityType, Readonly<{
  destination: string;
  targetKind: string;
  permission: PermissionName;
  operation: string;
  auditEvent: string;
}>>> = Object.freeze({
  student: Object.freeze({ destination: "studentRegistry", targetKind: "migration_student_registry", permission: "student.registry.manage", operation: "migration.student.create", auditEvent: "MIGRATION_STUDENT_REGISTRY_CREATE" }),
  class: Object.freeze({ destination: "classRegistry", targetKind: "migration_class_registry", permission: "academic.registry.manage", operation: "migration.class.create", auditEvent: "MIGRATION_CLASS_REGISTRY_CREATE" }),
  subject: Object.freeze({ destination: "subjectRegistry", targetKind: "migration_subject_registry", permission: "academic.registry.manage", operation: "migration.subject.create", auditEvent: "MIGRATION_SUBJECT_REGISTRY_CREATE" }),
  enrollment: Object.freeze({ destination: "studentEnrollments", targetKind: "migration_student_enrollment", permission: "student.enrollment.manage", operation: "migration.enrollment.create", auditEvent: "MIGRATION_ENROLLMENT_CREATE" }),
});

interface AdapterPayload extends CanonicalObject {
  readonly planId: string;
  readonly operationKey: string;
  readonly sourceFingerprint: string;
  readonly semanticFingerprint: string;
}

function fail(requestId: string, code: "INVALID_ARGUMENT" | "FAILED_PRECONDITION" | "CONFLICT" = "FAILED_PRECONDITION"): never {
  throw new OperationError(code, requestId);
}

function destinationFor(entityType: EntityType, targetId: string): string {
  return `${ENTITY_CONFIG[entityType].destination}/${targetId}`;
}

function planOperation(command: MigrationRehearsalCommand): MigrationPlan["operations"][number] {
  if (!command.plan.applyable) fail("migration-plan", "FAILED_PRECONDITION");
  const operation = command.plan.operations.find((candidate) => candidate.operationKey === command.operationKey);
  if (!operation || operation.entityType !== command.entityType) fail("migration-plan", "INVALID_ARGUMENT");
  if (operation.sourceFingerprint !== command.proposal.sourceFingerprint
    || operation.workspaceFingerprint !== sha256Canonical({ workspaceId: command.proposal.workspaceId }).slice(0, 16)
    || operation.destination !== destinationFor(command.entityType, command.proposal.targetId)) {
    fail("migration-plan", "INVALID_ARGUMENT");
  }
  return operation;
}

function ids(value: readonly string[] | undefined, requestId: string): readonly string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) || new Set(value).size !== value.length) {
    fail(requestId, "INVALID_ARGUMENT");
  }
  return Object.freeze([...value]);
}

function metadata(value: RegistryMetadata | undefined, entityType: EntityType, requestId: string): RegistryMetadata {
  const source = value ?? {};
  const allowed = entityType === "student" ? new Set(["displayName", "studentNumber"])
    : new Set(entityType === "class" ? ["displayName", "schoolYear", "grade"] : ["displayName", "subjectCode"]);
  strictPayload(source, allowed, requestId);
  if ((entityType === "class" || entityType === "subject") && typeof source.displayName !== "string") fail(requestId, "INVALID_ARGUMENT");
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(source)) {
    if (typeof item !== "string" || !item.trim() || item.length > 200) fail(requestId, "INVALID_ARGUMENT");
    result[key] = item.trim();
  }
  return Object.freeze(result);
}

function canonicalDocument(command: MigrationRehearsalCommand, actor: VerifiedActor, now: unknown, requestId: string): Readonly<Record<string, unknown>> {
  const { entityType, proposal } = command;
  const status = proposal.status ?? "active";
  if (status !== "active" && status !== "inactive") fail(requestId, "INVALID_ARGUMENT");
  const base = { schemaVersion: 1, version: 1, workspaceId: proposal.workspaceId, status, source: "migration", createdAt: now, updatedAt: now, createdBy: actor.uid };
  if (entityType === "student") {
    const document = Object.freeze({ ...base, studentId: proposal.targetId, ...metadata(proposal.metadata, entityType, requestId) });
    if (parseStudentRegistryDocument(document, { workspaceId: proposal.workspaceId, entityId: proposal.targetId }).state === "MALFORMED") fail(requestId, "INVALID_ARGUMENT");
    return document;
  }
  if (entityType === "class") {
    const document = Object.freeze({ ...base, classId: proposal.targetId, ...metadata(proposal.metadata, entityType, requestId) });
    if (parseClassRegistryDocument(document, { workspaceId: proposal.workspaceId, entityId: proposal.targetId }).state === "MALFORMED") fail(requestId, "INVALID_ARGUMENT");
    return document;
  }
  if (entityType === "subject") {
    const document = Object.freeze({ ...base, subjectId: proposal.targetId, ...metadata(proposal.metadata, entityType, requestId) });
    if (parseSubjectRegistryDocument(document, { workspaceId: proposal.workspaceId, entityId: proposal.targetId }).state === "MALFORMED") fail(requestId, "INVALID_ARGUMENT");
    return document;
  }
  if (typeof proposal.classId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(proposal.classId)) fail(requestId, "INVALID_ARGUMENT");
  const document = Object.freeze({ ...base, studentId: proposal.targetId, classId: proposal.classId, subjectIds: ids(proposal.subjectIds, requestId) });
  if (parseCanonicalStudentEnrollment(document).state === "MALFORMED") fail(requestId, "INVALID_ARGUMENT");
  return document;
}

function semanticFingerprint(document: Readonly<Record<string, unknown>>): string {
  const { createdAt: _createdAt, updatedAt: _updatedAt, createdBy: _createdBy, ...semantic } = document;
  return sha256Canonical(semantic);
}

function equalCanonical(current: unknown, expected: Readonly<Record<string, unknown>>, entityType: EntityType, workspaceId: string, targetId: string): boolean {
  const parsed = entityType === "student" ? parseStudentRegistryDocument(current, { workspaceId, entityId: targetId })
    : entityType === "class" ? parseClassRegistryDocument(current, { workspaceId, entityId: targetId })
      : entityType === "subject" ? parseSubjectRegistryDocument(current, { workspaceId, entityId: targetId })
        : parseCanonicalStudentEnrollment(current);
  if (parsed.state === "MALFORMED") return false;
  const entity = "entity" in parsed ? parsed.entity : parsed.enrollment;
  return semanticFingerprint(entity as unknown as Readonly<Record<string, unknown>>) === semanticFingerprint(expected);
}

function operationSpec(entityType: EntityType): OperationSpecification<AdapterPayload> {
  const config = ENTITY_CONFIG[entityType];
  const payloadKeys = new Set(["planId", "operationKey", "sourceFingerprint", "semanticFingerprint"]);
  return Object.freeze({
    operation: config.operation,
    targetKind: config.targetKind,
    payloadKeys,
    parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string): AdapterPayload {
      strictPayload(payload, payloadKeys, requestId);
      for (const key of payloadKeys) if (typeof payload[key] !== "string" || !(payload[key] as string).trim()) fail(requestId, "INVALID_ARGUMENT");
      return Object.freeze({ ...payload }) as AdapterPayload;
    },
  });
}

function internalOperation(actor: VerifiedActor, command: MigrationRehearsalCommand, document: Readonly<Record<string, unknown>>): ValidatedOperation<AdapterPayload> {
  const config = ENTITY_CONFIG[command.entityType];
  const logicalKey = sha256Canonical({ planId: command.plan.planId, operationKey: command.operationKey });
  return validateOperation(actor, Object.freeze({
    operation: config.operation,
    idempotencyKey: logicalKey,
    target: Object.freeze({ kind: config.targetKind, id: command.proposal.targetId, workspaceId: command.proposal.workspaceId }),
    payload: Object.freeze({ planId: command.plan.planId, operationKey: command.operationKey, sourceFingerprint: command.proposal.sourceFingerprint, semanticFingerprint: semanticFingerprint(document) }),
  }), operationSpec(command.entityType));
}

async function authorize(repositories: CanonicalAuthorityRepositories, operation: ValidatedOperation<AdapterPayload>, permission: PermissionName): Promise<void> {
  try {
    const workspaceId = operation.target.workspaceId;
    if (!workspaceId) fail(operation.requestId, "INVALID_ARGUMENT");
    const context = await repositories.systemOwners.buildWorkspaceAuthorizationContext(operation.actor, operation.operation, workspaceId);
    requirePermission(context, permission);
    requireActiveWorkspace(await repositories.workspaces.get(workspaceId, operation.requestId), workspaceId, operation.requestId);
  } catch (error) {
    if (error instanceof AuthorizationError) throw new OperationError(error.code === "AUTHZ_INTERNAL_ERROR" ? "INTERNAL" : "FORBIDDEN", operation.requestId);
    throw error;
  }
}

function journalEntry(command: MigrationRehearsalCommand, runId: string, result: MigrationApplyResult, beforeExists: boolean, createdByPlan: boolean, beforeFingerprint: string | null): MigrationJournalEntry {
  return Object.freeze({ planId: result.planId, migrationRunId: runId, operationKey: result.operationKey, entityType: result.entityType, workspaceId: result.workspaceId, targetId: result.targetId, beforeExists, beforeFingerprint, afterFingerprint: result.fingerprint, createdByPlan, result: result.state, versionAfter: 1 });
}

// This internal adapter has no default transaction runner: C2G1-B is the only place
// permitted to bind a real Emulator transaction port.
export function createMigrationRehearsalApplyAdapter(dependencies: MigrationRehearsalApplyDependencies) {
  const journal = dependencies.journal ?? new InMemoryMigrationRehearsalJournal();
  const apply = async (actor: VerifiedActor, command: MigrationRehearsalCommand, migrationRunId: string): Promise<MigrationApplyResult> => {
    const planned = planOperation(command);
    if (!migrationRunId || migrationRunId.length > 128) fail(actor.request.requestId, "INVALID_ARGUMENT");
    const transactionResult = await dependencies.runner.run(async (transaction) => {
      const document = canonicalDocument(command, actor, transaction.now, actor.request.requestId);
      const operation = internalOperation(actor, command, document);
      const repositories = createCanonicalAuthorityRepositories(transaction);
      await authorize(repositories, operation, ENTITY_CONFIG[command.entityType].permission);
      const persistentOperation = Object.freeze({ operationKey: command.operationKey, entityType: command.entityType, targetId: command.proposal.targetId, sourceFingerprint: command.proposal.sourceFingerprint, plannedPayloadHash: semanticFingerprint(document) });
      const persistentEvidence = dependencies.manifest
        ? await dependencies.manifest.assertPrepared(transaction, command.plan, command.proposal.workspaceId, persistentOperation, migrationRunId)
        : null;
      const idempotency = new IdempotencyRepository(transaction);
      const replay = await idempotency.inspect(operation);
      const fingerprint = semanticFingerprint(document);
      const path = ["workspaces", command.proposal.workspaceId, ENTITY_CONFIG[command.entityType].destination, command.proposal.targetId] as const;
      const current = await transaction.get(path);
      // A fresh recovery can have a different idempotency request key and take
      // the existing-target path. CREATED evidence must constrain both paths.
      if (persistentEvidence?.status === "CREATED" && (replay.state !== "REPLAY_COMPLETED" || !current.exists || (
        persistentEvidence.createdByPlan !== true
        || persistentEvidence.beforeExists !== false
        || persistentEvidence.versionAfter !== current.data?.version
        || persistentEvidence.afterFingerprint !== semanticFingerprint(current.data ?? {})
      ))) fail(operation.requestId, "CONFLICT");
      if (replay.state === "REPLAY_COMPLETED") {
        // A persistent replay is not trusted if its canonical effect disappeared or changed.
        if (!current.exists || !equalCanonical(current.data, document, command.entityType, command.proposal.workspaceId, command.proposal.targetId)) fail(operation.requestId, "CONFLICT");
        return Object.freeze({ result: Object.freeze({ state: "REPLAYED", planId: command.plan.planId, operationKey: planned.operationKey, entityType: command.entityType, workspaceId: command.proposal.workspaceId, targetId: command.proposal.targetId, version: 1, fingerprint }), evidence: null });
      }
      if (current.exists) {
        if (!equalCanonical(current.data, document, command.entityType, command.proposal.workspaceId, command.proposal.targetId)) fail(operation.requestId, "CONFLICT");
        const beforeFingerprint = semanticFingerprint(current.data ?? {});
        if (dependencies.manifest) await dependencies.manifest.markCompletion(transaction, command.plan, command.proposal.workspaceId, persistentOperation, { status: "ALREADY_CANONICAL", createdByPlan: false, beforeExists: true, beforeFingerprint, afterFingerprint: fingerprint, versionAfter: 1, appliedRunId: migrationRunId });
        return Object.freeze({ result: Object.freeze({ state: "ALREADY_CANONICAL", planId: command.plan.planId, operationKey: planned.operationKey, entityType: command.entityType, workspaceId: command.proposal.workspaceId, targetId: command.proposal.targetId, version: 1, fingerprint }), evidence: Object.freeze({ beforeExists: true, beforeFingerprint, createdByPlan: false }) });
      }
      if (command.entityType === "enrollment") {
        const registry = createEntityRegistryRepository(transaction);
        const valid = await validateEnrollmentReferences({ workspaceId: command.proposal.workspaceId, studentId: command.proposal.targetId, classId: command.proposal.classId!, subjectIds: document.subjectIds as readonly string[] }, registry);
        if (valid.decision !== "REFERENCES_VALID") fail(operation.requestId, "FAILED_PRECONDITION");
        if (dependencies.manifest) await dependencies.manifest.markCompletion(transaction, command.plan, command.proposal.workspaceId, persistentOperation, { status: "CREATED", createdByPlan: true, beforeExists: false, beforeFingerprint: null, afterFingerprint: fingerprint, versionAfter: 1, appliedRunId: migrationRunId });
        dependencies.beforeCommit?.(command);
        createEnrollmentMutationRepository(transaction).createEnrollment(command.proposal.workspaceId, command.proposal.targetId, document);
      } else {
        const writer = createRegistryMutationRepository(transaction);
        if (dependencies.manifest) await dependencies.manifest.markCompletion(transaction, command.plan, command.proposal.workspaceId, persistentOperation, { status: "CREATED", createdByPlan: true, beforeExists: false, beforeFingerprint: null, afterFingerprint: fingerprint, versionAfter: 1, appliedRunId: migrationRunId });
        dependencies.beforeCommit?.(command);
        if (command.entityType === "student") writer.createStudent(command.proposal.workspaceId, command.proposal.targetId, document);
        else if (command.entityType === "class") writer.createClass(command.proposal.workspaceId, command.proposal.targetId, document);
        else writer.createSubject(command.proposal.workspaceId, command.proposal.targetId, document);
      }
      const safe = safeSummary({ created: true, source: "migration", workspaceId: command.proposal.workspaceId, targetId: command.proposal.targetId, status: document.status, version: 1 }, operation.requestId);
      new SecurityAuditRepository(transaction).createSuccess(operation, securityAuditMutation({}, safe, operation.requestId, { eventType: ENTITY_CONFIG[command.entityType].auditEvent, workspaceId: command.proposal.workspaceId }));
      idempotency.createCompleted(operation, safe);
      return Object.freeze({ result: Object.freeze({ state: "CREATED", planId: command.plan.planId, operationKey: planned.operationKey, entityType: command.entityType, workspaceId: command.proposal.workspaceId, targetId: command.proposal.targetId, version: 1, fingerprint }), evidence: Object.freeze({ beforeExists: false, beforeFingerprint: null, createdByPlan: true }) });
    });
    if (transactionResult.evidence) journal.record(journalEntry(command, migrationRunId, transactionResult.result, transactionResult.evidence.beforeExists, transactionResult.evidence.createdByPlan, transactionResult.evidence.beforeFingerprint));
    return transactionResult.result;
  };
  return Object.freeze({
    assertCurrentPlan: (plan: MigrationPlan, sourceInput: Readonly<Record<string, unknown>>): void => {
      assertPlanCurrent(plan, sourceInput);
    },
    createCommand: (plan: MigrationPlan, operationKey: string, entityType: EntityType, proposal: MigrationCanonicalProposal): MigrationRehearsalCommand => {
      const command = Object.freeze({ plan, operationKey, entityType, proposal: Object.freeze({ ...proposal, sourceFingerprint: proposal.sourceFingerprint, targetId: proposal.targetId, workspaceId: proposal.workspaceId }) });
      planOperation(command);
      return command;
    },
    apply,
    applyPlan: async (actor: VerifiedActor, commands: readonly MigrationRehearsalCommand[], migrationRunId: string): Promise<MigrationPlanApplyResult> => {
      const completed: MigrationApplyResult[] = [];
      for (const command of commands) {
        try { completed.push(await apply(actor, command, migrationRunId)); }
        catch { return Object.freeze({ state: "STOPPED_PARTIAL", completed: Object.freeze(completed), failedOperationKey: command.operationKey }); }
      }
      return Object.freeze({ state: "COMPLETED", completed: Object.freeze(completed), failedOperationKey: null });
    },
    journal,
  });
}
