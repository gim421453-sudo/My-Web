import type { VerifiedActor } from "../auth/verifiedActor.js";
import { AuthorizationError } from "../authz/authzErrors.js";
import { requirePermission } from "../authz/permissionResolver.js";
import { requireActiveWorkspace } from "../adminApplications/adminApplicationContract.js";
import { strictPayload, validateOperation, type CanonicalObject, type OperationSpecification, type ValidatedOperation } from "../operations/operationContract.js";
import { OperationError } from "../operations/operationErrors.js";
import { IdempotencyRepository } from "../operations/idempotencyRepository.js";
import { safeSummary } from "../operations/safeSummary.js";
import { SecurityAuditRepository, securityAuditMutation } from "../operations/securityAuditRepository.js";
import { createCanonicalAuthorityRepositories, type CanonicalAuthorityRepositories } from "../repositories/canonicalAuthorityRepositories.js";
import { getEmulatorTransactionRunner, type TrustedTransactionRunner } from "../repositories/trustedTransaction.js";
import { createEntityRegistryRepository } from "../registries/entityRegistryRepository.js";
import { isCanonicalEntityVersion } from "../registries/entityRegistryContract.js";
import { validateEnrollmentReferences } from "./enrollmentReferentialValidator.js";
import { createEnrollmentMutationRepository } from "./enrollmentMutationRepository.js";
import { parseCanonicalStudentEnrollment, STUDENT_ENROLLMENT_SCHEMA_VERSION, type CanonicalStudentEnrollment } from "./studentEnrollmentContract.js";

interface EnrollmentPayload extends CanonicalObject {
  readonly expectedVersion: number | null;
  readonly classId: string | null;
  readonly subjectIds: CanonicalObject | null;
}
type Action = "create" | "class_change" | "subject_replace" | "relationships_replace" | "activate" | "deactivate";
export interface EnrollmentMutationDependencies { readonly runner?: TrustedTransactionRunner }

function ids(value: unknown, requestId: string): readonly string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id))) throw new OperationError("INVALID_ARGUMENT", requestId);
  if (new Set(value).size !== value.length) throw new OperationError("INVALID_ARGUMENT", requestId);
  return Object.freeze([...value]);
}
function version(value: unknown, requestId: string): number {
  if (!isCanonicalEntityVersion(value)) throw new OperationError("INVALID_ARGUMENT", requestId);
  return value;
}
function command(action: Action): OperationSpecification<EnrollmentPayload> {
  const keys = action === "create" ? new Set(["studentId", "classId", "subjectIds"])
    : action === "class_change" ? new Set(["expectedVersion", "newClassId"])
      : action === "subject_replace" ? new Set(["expectedVersion", "subjectIds"])
        : action === "relationships_replace" ? new Set(["expectedVersion", "classId", "subjectIds"])
          : new Set(["expectedVersion"]);
  return Object.freeze({ operation: `student_enrollment.${action}`, targetKind: "student_enrollment", payloadKeys: keys,
    parsePayload(payload: Readonly<Record<string, unknown>>, requestId: string): EnrollmentPayload {
      strictPayload(payload, keys, requestId);
      const studentId = action === "create" ? stringId(payload.studentId, requestId) : null;
      const classId = action === "create" ? stringId(payload.classId, requestId)
        : action === "class_change" ? stringId(payload.newClassId, requestId)
          : action === "relationships_replace" ? stringId(payload.classId, requestId) : null;
      const subjectIds = action === "create" || action === "subject_replace" || action === "relationships_replace"
        ? ids(payload.subjectIds, requestId) : null;
      return Object.freeze({ expectedVersion: action === "create" ? null : version(payload.expectedVersion, requestId), classId,
        subjectIds: subjectIds ? Object.freeze({ values: subjectIds }) : null, ...(studentId ? { studentId } : {}) }) as EnrollmentPayload;
    },
  });
}
function stringId(value: unknown, requestId: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new OperationError("INVALID_ARGUMENT", requestId);
  return value;
}
function workspace<T extends CanonicalObject>(operation: ValidatedOperation<T>): string {
  if (!operation.target.workspaceId) throw new OperationError("INVALID_ARGUMENT", operation.requestId);
  return operation.target.workspaceId;
}
function payloadSubjectIds(payload: EnrollmentPayload): readonly string[] {
  const values = payload.subjectIds?.values;
  if (!Array.isArray(values) || values.some((item) => typeof item !== "string")) throw new OperationError("INTERNAL", "payload");
  return Object.freeze([...values as string[]]);
}
async function authorize(repositories: CanonicalAuthorityRepositories, operation: ValidatedOperation<EnrollmentPayload>): Promise<void> {
  try {
    const workspaceId = workspace(operation);
    const context = await repositories.systemOwners.buildWorkspaceAuthorizationContext(operation.actor, operation.operation, workspaceId);
    requirePermission(context, "student.enrollment.manage");
    requireActiveWorkspace(await repositories.workspaces.get(workspaceId, operation.requestId), workspaceId, operation.requestId);
  } catch (error) {
    if (error instanceof AuthorizationError) throw new OperationError(error.code === "AUTHZ_INTERNAL_ERROR" ? "INTERNAL" : "FORBIDDEN", operation.requestId);
    throw error;
  }
}
function next(current: number, requestId: string): number {
  if (!isCanonicalEntityVersion(current) || current === Number.MAX_SAFE_INTEGER) throw new OperationError("FAILED_PRECONDITION", requestId);
  return current + 1;
}
function ensureReferences(result: Awaited<ReturnType<typeof validateEnrollmentReferences>>, requestId: string): void {
  if (result.decision === "REFERENCES_VALID") return;
  throw new OperationError(result.decision === "REFERENCES_UNVERIFIABLE" ? "FAILED_PRECONDITION" : "FAILED_PRECONDITION", requestId);
}

export function createEnrollmentMutationService(dependencies: EnrollmentMutationDependencies = {}) {
  const invoke = async (action: Action, actor: VerifiedActor, input: unknown) => {
    const operation = validateOperation(actor, input, command(action));
    const runner = dependencies.runner ?? getEmulatorTransactionRunner();
    return runner.run(async (transaction) => {
      const repositories = createCanonicalAuthorityRepositories(transaction);
      await authorize(repositories, operation);
      const idempotency = new IdempotencyRepository(transaction);
      const replay = await idempotency.inspect(operation);
      if (replay.state === "REPLAY_COMPLETED") return Object.freeze({ replayed: true, result: replay.result });
      const workspaceId = workspace(operation);
      const studentId = action === "create" ? ((operation.payload as EnrollmentPayload & { readonly studentId: string }).studentId) : operation.target.id;
      const lookup = await transaction.get(["workspaces", workspaceId, "studentEnrollments", studentId]);
      const registry = createEntityRegistryRepository(transaction);
      const writer = createEnrollmentMutationRepository(transaction);
      if (action === "create") {
        if (lookup.exists) throw new OperationError("CONFLICT", operation.requestId);
        const finalClassId = operation.payload.classId;
        if (!finalClassId) throw new OperationError("INTERNAL", operation.requestId);
        const finalSubjectIds = payloadSubjectIds(operation.payload);
        ensureReferences(await validateEnrollmentReferences({ workspaceId, studentId, classId: finalClassId, subjectIds: finalSubjectIds }, registry), operation.requestId);
        const document = Object.freeze({ schemaVersion: STUDENT_ENROLLMENT_SCHEMA_VERSION, version: 1, workspaceId, studentId, classId: finalClassId, subjectIds: finalSubjectIds, status: "active", source: "manual_admin", createdAt: transaction.now, updatedAt: transaction.now, createdBy: actor.uid });
        if (parseCanonicalStudentEnrollment(document).state === "MALFORMED") throw new OperationError("INTERNAL", operation.requestId);
        writer.createEnrollment(workspaceId, studentId, document);
        const result = safeSummary({ created: true, workspaceId, targetId: studentId, status: "active", version: 1 }, operation.requestId);
        new SecurityAuditRepository(transaction).createSuccess(operation, securityAuditMutation({}, { created: true, status: "active", version: 1 }, operation.requestId, { eventType: "ENROLLMENT_CREATE", workspaceId }));
        idempotency.createCompleted(operation, result);
        return Object.freeze({ replayed: false, result });
      }
      if (!lookup.exists) throw new OperationError("NOT_FOUND", operation.requestId);
      const parsed = parseCanonicalStudentEnrollment(lookup.data);
      if (parsed.state === "MALFORMED") throw new OperationError("FAILED_PRECONDITION", operation.requestId);
      const current: CanonicalStudentEnrollment = parsed.enrollment;
      if (current.version !== operation.payload.expectedVersion) throw new OperationError("CONFLICT", operation.requestId);
      const finalClassId = action === "class_change" || action === "relationships_replace" ? operation.payload.classId! : current.classId;
      const finalSubjectIds = action === "subject_replace" || action === "relationships_replace" ? payloadSubjectIds(operation.payload) : current.subjectIds;
      const finalStatus = action === "activate" ? "active" : action === "deactivate" ? "inactive" : current.status;
      if (action !== "deactivate") ensureReferences(await validateEnrollmentReferences({ workspaceId, studentId, classId: finalClassId, subjectIds: finalSubjectIds }, registry), operation.requestId);
      const changed = finalClassId !== current.classId || finalStatus !== current.status || finalSubjectIds.join("\u0000") !== current.subjectIds.join("\u0000");
      if (!changed) return Object.freeze({ replayed: false, result: safeSummary({ workspaceId, targetId: studentId, status: current.status, version: current.version, updated: false }, operation.requestId) });
      const finalDocument = Object.freeze({ ...current, classId: finalClassId, subjectIds: finalSubjectIds, status: finalStatus, version: next(current.version, operation.requestId), updatedAt: transaction.now });
      if (parseCanonicalStudentEnrollment(finalDocument).state === "MALFORMED") throw new OperationError("INTERNAL", operation.requestId);
      writer.updateEnrollment(workspaceId, studentId, finalDocument);
      const result = safeSummary({ workspaceId, targetId: studentId, status: finalStatus, version: finalDocument.version, updated: true }, operation.requestId);
      const events: Record<Exclude<Action, "create">, string> = { class_change: "ENROLLMENT_CLASS_CHANGE", subject_replace: "ENROLLMENT_SUBJECT_CHANGE", relationships_replace: "ENROLLMENT_RELATIONSHIPS_REPLACE", activate: "ENROLLMENT_ACTIVATE", deactivate: "ENROLLMENT_DEACTIVATE" };
      new SecurityAuditRepository(transaction).createSuccess(operation, securityAuditMutation({ status: current.status, version: current.version }, { status: finalStatus, version: finalDocument.version, updated: true }, operation.requestId, { eventType: events[action as Exclude<Action, "create">], workspaceId }));
      idempotency.createCompleted(operation, result);
      return Object.freeze({ replayed: false, result });
    });
  };
  return Object.freeze({
    createStudentEnrollment: (actor: VerifiedActor, input: unknown) => invoke("create", actor, input),
    changeStudentEnrollmentClass: (actor: VerifiedActor, input: unknown) => invoke("class_change", actor, input),
    replaceStudentEnrollmentSubjects: (actor: VerifiedActor, input: unknown) => invoke("subject_replace", actor, input),
    replaceStudentEnrollmentRelationships: (actor: VerifiedActor, input: unknown) => invoke("relationships_replace", actor, input),
    activateStudentEnrollment: (actor: VerifiedActor, input: unknown) => invoke("activate", actor, input),
    deactivateStudentEnrollment: (actor: VerifiedActor, input: unknown) => invoke("deactivate", actor, input),
  });
}
