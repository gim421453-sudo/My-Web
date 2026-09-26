import { isCanonicalEntityId } from "../registries/entityRegistryContract.js";
import type { EntityRegistryRepository } from "../registries/entityRegistryRepository.js";

export type EnrollmentReferenceDecision = "REFERENCES_VALID" | "REFERENCES_INVALID" | "REFERENCES_UNVERIFIABLE";
export type EnrollmentReferenceReason =
  | "REFERENCES_VALID"
  | "INVALID_INPUT"
  | "STUDENT_MISSING"
  | "STUDENT_INACTIVE"
  | "CLASS_MISSING"
  | "CLASS_INACTIVE"
  | "SUBJECT_MISSING"
  | "SUBJECT_INACTIVE"
  | "MALFORMED_REGISTRY";

export interface EnrollmentReferenceRequest {
  readonly workspaceId: string;
  readonly studentId: string;
  readonly classId: string;
  readonly subjectIds: readonly string[];
}

export interface EnrollmentReferenceResult {
  readonly decision: EnrollmentReferenceDecision;
  readonly reasonCode: EnrollmentReferenceReason;
}

function result(decision: EnrollmentReferenceDecision, reasonCode: EnrollmentReferenceReason): EnrollmentReferenceResult {
  return Object.freeze({ decision, reasonCode });
}

function validRequest(request: EnrollmentReferenceRequest): boolean {
  return isCanonicalEntityId(request.workspaceId)
    && isCanonicalEntityId(request.studentId)
    && isCanonicalEntityId(request.classId)
    && Array.isArray(request.subjectIds)
    && request.subjectIds.every(isCanonicalEntityId)
    && new Set(request.subjectIds).size === request.subjectIds.length;
}

export async function validateEnrollmentReferences(
  request: EnrollmentReferenceRequest,
  registries: EntityRegistryRepository,
): Promise<EnrollmentReferenceResult> {
  if (!validRequest(request)) return result("REFERENCES_INVALID", "INVALID_INPUT");
  const student = await registries.getStudent(request.workspaceId, request.studentId);
  if (student.state === "MISSING") return result("REFERENCES_INVALID", "STUDENT_MISSING");
  if (student.state === "MALFORMED") return result("REFERENCES_UNVERIFIABLE", "MALFORMED_REGISTRY");
  if (student.entity.status !== "active") return result("REFERENCES_INVALID", "STUDENT_INACTIVE");

  const classRegistry = await registries.getClass(request.workspaceId, request.classId);
  if (classRegistry.state === "MISSING") return result("REFERENCES_INVALID", "CLASS_MISSING");
  if (classRegistry.state === "MALFORMED") return result("REFERENCES_UNVERIFIABLE", "MALFORMED_REGISTRY");
  if (classRegistry.entity.status !== "active") return result("REFERENCES_INVALID", "CLASS_INACTIVE");

  for (const subjectId of request.subjectIds) {
    const subject = await registries.getSubject(request.workspaceId, subjectId);
    if (subject.state === "MISSING") return result("REFERENCES_INVALID", "SUBJECT_MISSING");
    if (subject.state === "MALFORMED") return result("REFERENCES_UNVERIFIABLE", "MALFORMED_REGISTRY");
    if (subject.entity.status !== "active") return result("REFERENCES_INVALID", "SUBJECT_INACTIVE");
  }
  return result("REFERENCES_VALID", "REFERENCES_VALID");
}
