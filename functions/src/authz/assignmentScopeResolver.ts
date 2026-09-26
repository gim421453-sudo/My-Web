import type { AuthorizationContext } from "./authorizationTypes.js";
import { isValidDocumentId } from "./resolverUtils.js";
import {
  isAssignmentActiveAt,
  parseAssignedScopeTarget,
  parseCanonicalTeacherAssignment,
  type AssignedScopeTarget,
} from "../teacherAssignments/teacherAssignmentContract.js";
import type { TeacherAssignmentRepository } from "../teacherAssignments/teacherAssignmentRepository.js";
import { resolveStudentEnrollmentRelationship } from "./relationshipScopeResolver.js";
import type { StudentEnrollmentRepository } from "../relationships/studentEnrollmentRepository.js";
import type { EntityRegistryRepository } from "../registries/entityRegistryRepository.js";

export type AssignmentScopeDecisionKind = "SCOPE_ALLOWED" | "SCOPE_DENIED" | "SCOPE_UNVERIFIABLE";
export type AssignmentScopeReason =
  | "ASSIGNED_SCOPE_ALLOWED"
  | "ASSIGNED_SCOPE_CONTEXT_INVALID"
  | "ASSIGNED_SCOPE_MEMBERSHIP_REQUIRED"
  | "ASSIGNED_SCOPE_ROLE_REQUIRED"
  | "ASSIGNED_SCOPE_TARGET_INVALID"
  | "ASSIGNED_SCOPE_ASSIGNMENT_MISSING"
  | "ASSIGNED_SCOPE_ASSIGNMENT_MALFORMED"
  | "ASSIGNED_SCOPE_ASSIGNMENT_INACTIVE"
  | "ASSIGNED_SCOPE_ASSIGNMENT_OUTSIDE_VALIDITY"
  | "ASSIGNED_SCOPE_TARGET_MISMATCH"
  | "ASSIGNED_SCOPE_RELATIONSHIP_UNVERIFIABLE";

export interface AssignmentScopeDecision {
  readonly decision: AssignmentScopeDecisionKind;
  readonly reasonCode: AssignmentScopeReason;
}

export interface TeacherAssignedScopeDependencies {
  readonly assignments: TeacherAssignmentRepository;
  readonly relationships?: StudentEnrollmentRepository;
  readonly registries?: EntityRegistryRepository;
  readonly nowMs?: () => number;
}

function result(decision: AssignmentScopeDecisionKind, reasonCode: AssignmentScopeReason): AssignmentScopeDecision {
  return Object.freeze({ decision, reasonCode });
}

async function targetMatch(
  assignment: AssignedScopeTarget,
  requested: AssignedScopeTarget,
  workspaceId: string,
  relationships: StudentEnrollmentRepository | undefined,
  registries: EntityRegistryRepository | undefined,
): Promise<"MATCH" | "MISMATCH" | "UNVERIFIABLE"> {
  if (assignment.type === "student" && requested.type === "student") {
    if (assignment.studentId !== requested.studentId) return "MISMATCH";
    if (!registries) return "UNVERIFIABLE";
    const student = await registries.getStudent(workspaceId, requested.studentId);
    return student.state === "VALID" && student.entity.status === "active" ? "MATCH" : "UNVERIFIABLE";
  }
  if (requested.type !== "student" || !relationships) return "UNVERIFIABLE";
  if (assignment.type === "class") {
    const relationship = await resolveStudentEnrollmentRelationship({
      workspaceId,
      studentId: requested.studentId,
      classId: assignment.classId,
    }, relationships, registries);
    return relationship.decision === "RELATIONSHIP_MATCH" ? "MATCH"
      : relationship.decision === "RELATIONSHIP_NO_MATCH" ? "MISMATCH" : "UNVERIFIABLE";
  }
  if (assignment.type === "subject") {
    const relationship = await resolveStudentEnrollmentRelationship({
      workspaceId,
      studentId: requested.studentId,
      subjectId: assignment.subjectId,
    }, relationships, registries);
    return relationship.decision === "RELATIONSHIP_MATCH" ? "MATCH"
      : relationship.decision === "RELATIONSHIP_NO_MATCH" ? "MISMATCH" : "UNVERIFIABLE";
  }
  if (assignment.type === "class_subject") {
    const relationship = await resolveStudentEnrollmentRelationship({
      workspaceId,
      studentId: requested.studentId,
      classId: assignment.classId,
      subjectId: assignment.subjectId,
    }, relationships, registries);
    return relationship.decision === "RELATIONSHIP_MATCH" ? "MATCH"
      : relationship.decision === "RELATIONSHIP_NO_MATCH" ? "MISMATCH" : "UNVERIFIABLE";
  }
  return "UNVERIFIABLE";
}

export async function resolveTeacherAssignedScope(
  context: AuthorizationContext | null | undefined,
  workspaceId: string,
  requestedTarget: unknown,
  dependencies: TeacherAssignedScopeDependencies,
): Promise<AssignmentScopeDecision> {
  if (!context || context.resolution !== "complete" || !isValidDocumentId(workspaceId)
    || context.workspace.workspaceId !== workspaceId) {
    return result("SCOPE_DENIED", "ASSIGNED_SCOPE_CONTEXT_INVALID");
  }
  const membership = context.workspace.membership;
  if (membership.state !== "ACTIVE") return result("SCOPE_DENIED", "ASSIGNED_SCOPE_MEMBERSHIP_REQUIRED");
  if (membership.role !== "teacher") return result("SCOPE_DENIED", "ASSIGNED_SCOPE_ROLE_REQUIRED");
  const target = parseAssignedScopeTarget(requestedTarget);
  if (!target) return result("SCOPE_DENIED", "ASSIGNED_SCOPE_TARGET_INVALID");

  const snapshots = await dependencies.assignments.listForTeacher(workspaceId, context.actor.uid);
  if (snapshots.length === 0) return result("SCOPE_DENIED", "ASSIGNED_SCOPE_ASSIGNMENT_MISSING");
  const parsed = snapshots.map((snapshot) => parseCanonicalTeacherAssignment(snapshot.data));
  const valid = parsed.filter((entry) => entry.state === "VALID").map((entry) => entry.assignment);
  if (valid.length === 0) return result("SCOPE_DENIED", "ASSIGNED_SCOPE_ASSIGNMENT_MALFORMED");

  const canonical = valid.filter((assignment) => (
    assignment.workspaceId === workspaceId && assignment.teacherUid === context.actor.uid
  ));
  if (canonical.length === 0) return result("SCOPE_DENIED", "ASSIGNED_SCOPE_CONTEXT_INVALID");
  const active = canonical.filter((assignment) => assignment.status === "active");
  if (active.length === 0) return result("SCOPE_DENIED", "ASSIGNED_SCOPE_ASSIGNMENT_INACTIVE");
  const atNow = active.filter((assignment) => isAssignmentActiveAt(assignment, dependencies.nowMs?.() ?? Date.now()));
  if (atNow.length === 0) return result("SCOPE_DENIED", "ASSIGNED_SCOPE_ASSIGNMENT_OUTSIDE_VALIDITY");

  let sawUnverifiable = false;
  for (const assignment of atNow) {
    const match = await targetMatch(
      assignment.target,
      target,
      workspaceId,
      dependencies.relationships,
      dependencies.registries,
    );
    if (match === "MATCH") return result("SCOPE_ALLOWED", "ASSIGNED_SCOPE_ALLOWED");
    if (match === "UNVERIFIABLE") sawUnverifiable = true;
  }
  return sawUnverifiable
    ? result("SCOPE_UNVERIFIABLE", "ASSIGNED_SCOPE_RELATIONSHIP_UNVERIFIABLE")
    : result("SCOPE_DENIED", "ASSIGNED_SCOPE_TARGET_MISMATCH");
}
