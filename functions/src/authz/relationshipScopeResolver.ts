import {
  isStableRelationshipId,
  parseCanonicalStudentEnrollment,
} from "../relationships/studentEnrollmentContract.js";
import type { StudentEnrollmentRepository } from "../relationships/studentEnrollmentRepository.js";
import type { EntityRegistryRepository } from "../registries/entityRegistryRepository.js";
import { validateEnrollmentReferences } from "../relationships/enrollmentReferentialValidator.js";

export type RelationshipDecisionKind = "RELATIONSHIP_MATCH" | "RELATIONSHIP_NO_MATCH" | "RELATIONSHIP_UNVERIFIABLE";
export type RelationshipReasonCode =
  | "RELATIONSHIP_MATCHED"
  | "RELATIONSHIP_INPUT_INVALID"
  | "RELATIONSHIP_MISSING"
  | "RELATIONSHIP_MALFORMED"
  | "RELATIONSHIP_INACTIVE"
  | "RELATIONSHIP_WORKSPACE_MISMATCH"
  | "RELATIONSHIP_REGISTRY_REQUIRED"
  | "RELATIONSHIP_REGISTRY_UNVERIFIABLE"
  | "RELATIONSHIP_NO_MATCH";

export interface StudentRelationshipRequest {
  readonly workspaceId: string;
  readonly studentId: string;
  readonly classId?: string;
  readonly subjectId?: string;
}

export interface RelationshipDecision {
  readonly decision: RelationshipDecisionKind;
  readonly reasonCode: RelationshipReasonCode;
}

function result(decision: RelationshipDecisionKind, reasonCode: RelationshipReasonCode): RelationshipDecision {
  return Object.freeze({ decision, reasonCode });
}

function validRequest(request: StudentRelationshipRequest): boolean {
  return isStableRelationshipId(request.workspaceId)
    && isStableRelationshipId(request.studentId)
    && (request.classId === undefined || isStableRelationshipId(request.classId))
    && (request.subjectId === undefined || isStableRelationshipId(request.subjectId))
    && (request.classId !== undefined || request.subjectId !== undefined);
}

export async function resolveStudentEnrollmentRelationship(
  request: StudentRelationshipRequest,
  repository: StudentEnrollmentRepository,
  registries: EntityRegistryRepository | undefined,
): Promise<RelationshipDecision> {
  if (!validRequest(request)) return result("RELATIONSHIP_NO_MATCH", "RELATIONSHIP_INPUT_INVALID");
  const snapshots = await repository.listForStudent(request.workspaceId, request.studentId);
  if (snapshots.length === 0) return result("RELATIONSHIP_NO_MATCH", "RELATIONSHIP_MISSING");
  const parsed = snapshots.map((snapshot) => parseCanonicalStudentEnrollment(snapshot.data));
  if (parsed.some((entry) => entry.state === "MALFORMED")) {
    return result("RELATIONSHIP_UNVERIFIABLE", "RELATIONSHIP_MALFORMED");
  }
  const enrollments = parsed
    .filter((entry): entry is Extract<typeof entry, { state: "VALID" }> => entry.state === "VALID")
    .map((entry) => entry.enrollment);
  if (enrollments.some((entry) => entry.workspaceId !== request.workspaceId || entry.studentId !== request.studentId)) {
    return result("RELATIONSHIP_NO_MATCH", "RELATIONSHIP_WORKSPACE_MISMATCH");
  }
  const active = enrollments.filter((entry) => entry.status === "active");
  if (active.length === 0) return result("RELATIONSHIP_NO_MATCH", "RELATIONSHIP_INACTIVE");
  const matched = active.filter((entry) => (
    (request.classId === undefined || entry.classId === request.classId)
    && (request.subjectId === undefined || entry.subjectIds.includes(request.subjectId))
  ));
  if (matched.length === 0) return result("RELATIONSHIP_NO_MATCH", "RELATIONSHIP_NO_MATCH");
  if (!registries) return result("RELATIONSHIP_UNVERIFIABLE", "RELATIONSHIP_REGISTRY_REQUIRED");
  for (const enrollment of matched) {
    const references = await validateEnrollmentReferences(enrollment, registries);
    if (references.decision !== "REFERENCES_VALID") {
      return result("RELATIONSHIP_UNVERIFIABLE", "RELATIONSHIP_REGISTRY_UNVERIFIABLE");
    }
  }
  return result("RELATIONSHIP_MATCH", "RELATIONSHIP_MATCHED");
}
