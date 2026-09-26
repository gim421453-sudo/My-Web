import assert from "node:assert/strict";
import test from "node:test";
import { createRegistryMutationService } from "../src/registries/registryMutationService.js";
import { createEnrollmentMutationService } from "../src/relationships/enrollmentMutationService.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { fixtureActor, FIXTURE_UID, FIXTURE_WORKSPACE, membershipV1, ownerV1 } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

function workspace() { return { workspaceId: FIXTURE_WORKSPACE, status: "active" }; }
function registry(kind: "student" | "class" | "subject", id: string, overrides: Record<string, unknown> = {}) {
  return { schemaVersion: 1, version: 1, workspaceId: FIXTURE_WORKSPACE, [`${kind}Id`]: id, status: "active", source: "manual_admin", createdAt: 1, updatedAt: 1, createdBy: FIXTURE_UID,
    ...(kind === "class" || kind === "subject" ? { displayName: `${kind} A` } : {}), ...overrides };
}
function baseFixtures(role: "super_manager" | "teacher" = "super_manager", isOwner = true) {
  return {
    ...(isOwner ? { [`systemOwners/${FIXTURE_UID}`]: ownerV1() } : {}),
    [`workspaces/${FIXTURE_WORKSPACE}`]: workspace(),
    [`workspaces/${FIXTURE_WORKSPACE}/members/${FIXTURE_UID}`]: membershipV1(role),
    [`workspaces/${FIXTURE_WORKSPACE}/studentRegistry/student-a`]: registry("student", "student-a"),
    [`workspaces/${FIXTURE_WORKSPACE}/classRegistry/class-a`]: registry("class", "class-a"),
    [`workspaces/${FIXTURE_WORKSPACE}/classRegistry/class-b`]: registry("class", "class-b"),
    [`workspaces/${FIXTURE_WORKSPACE}/subjectRegistry/subject-a`]: registry("subject", "subject-a"),
    [`workspaces/${FIXTURE_WORKSPACE}/subjectRegistry/subject-b`]: registry("subject", "subject-b"),
  };
}
function input(operation: string, target: Record<string, unknown>, payload: Record<string, unknown>, idempotencyKey = "mutation-test-key-0001") {
  return { operation, idempotencyKey, target, payload };
}
function expectCode(code: string) {
  return (error: unknown) => error instanceof OperationError && error.code === code;
}

test("C2E student registry create uses opaque backend ID and completed replay", async () => {
  const runner = new MemoryTransactionRunner(baseFixtures());
  const service = createRegistryMutationService({ runner, createId: () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" });
  const request = input("student_registry.create", { kind: "student_registry", id: "create", workspaceId: FIXTURE_WORKSPACE }, { metadata: { displayName: "Student A" } });
  const first = await service.createStudentRegistry(fixtureActor(), request);
  const second = await service.createStudentRegistry(fixtureActor(), request);
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(first.result.targetId, "student_aaaaaaaabbbbccccddddeeeeeeeeeeee");
  assert.equal([...runner.store.keys()].filter((path) => path.includes("studentRegistry/")).length, 2);
  assert.equal([...runner.store.keys()].filter((path) => path.startsWith("securityAuditLogs/")).length, 1);
});

test("C2E registry stale version and immutable injection fail without writes", async () => {
  const runner = new MemoryTransactionRunner(baseFixtures());
  const service = createRegistryMutationService({ runner });
  const writes = runner.writes.length;
  await assert.rejects(service.updateClassRegistryMetadata(fixtureActor(), input("class_registry.update", { kind: "class_registry", id: "class-a", workspaceId: FIXTURE_WORKSPACE }, { expectedVersion: 2, metadata: { displayName: "Updated" } })), expectCode("CONFLICT"));
  await assert.rejects(service.updateClassRegistryMetadata(fixtureActor(), input("class_registry.update", { kind: "class_registry", id: "class-a", workspaceId: FIXTURE_WORKSPACE }, { expectedVersion: 1, metadata: { schemaVersion: 2 } }, "mutation-test-key-0002")), expectCode("INVALID_ARGUMENT"));
  assert.equal(runner.writes.length, writes);
});

test("C2E teacher and cross-workspace registry attacks are forbidden before target lookup", async () => {
  const teacherRunner = new MemoryTransactionRunner(baseFixtures("teacher", false));
  const service = createRegistryMutationService({ runner: teacherRunner });
  await assert.rejects(service.deactivateSubjectRegistry(fixtureActor(), input("subject_registry.deactivate", { kind: "subject_registry", id: "missing", workspaceId: FIXTURE_WORKSPACE }, { expectedVersion: 1 })), expectCode("FORBIDDEN"));
  const crossRunner = new MemoryTransactionRunner(baseFixtures("super_manager", false));
  await assert.rejects(createRegistryMutationService({ runner: crossRunner }).deactivateSubjectRegistry(fixtureActor(), input("subject_registry.deactivate", { kind: "subject_registry", id: "subject-a", workspaceId: "other-workspace" }, { expectedVersion: 1 })), expectCode("FORBIDDEN"));
});

test("C2E enrollment mutations validate final graph, CAS, and deactivation has no cascade", async () => {
  const runner = new MemoryTransactionRunner(baseFixtures());
  const service = createEnrollmentMutationService({ runner });
  const create = input("student_enrollment.create", { kind: "student_enrollment", id: "create", workspaceId: FIXTURE_WORKSPACE }, { studentId: "student-a", classId: "class-a", subjectIds: ["subject-a"] });
  assert.equal((await service.createStudentEnrollment(fixtureActor(), create)).replayed, false);
  await assert.rejects(service.replaceStudentEnrollmentSubjects(fixtureActor(), input("student_enrollment.subject_replace", { kind: "student_enrollment", id: "student-a", workspaceId: FIXTURE_WORKSPACE }, { expectedVersion: 1, subjectIds: ["subject-a", "subject-a"] }, "mutation-test-key-0002")), expectCode("INVALID_ARGUMENT"));
  await service.changeStudentEnrollmentClass(fixtureActor(), input("student_enrollment.class_change", { kind: "student_enrollment", id: "student-a", workspaceId: FIXTURE_WORKSPACE }, { expectedVersion: 1, newClassId: "class-b" }, "mutation-test-key-0003"));
  await assert.rejects(service.changeStudentEnrollmentClass(fixtureActor(), input("student_enrollment.class_change", { kind: "student_enrollment", id: "student-a", workspaceId: FIXTURE_WORKSPACE }, { expectedVersion: 1, newClassId: "class-a" }, "mutation-test-key-0004")), expectCode("CONFLICT"));
  const registryService = createRegistryMutationService({ runner });
  await registryService.deactivateSubjectRegistry(fixtureActor(), input("subject_registry.deactivate", { kind: "subject_registry", id: "subject-a", workspaceId: FIXTURE_WORKSPACE }, { expectedVersion: 1 }, "mutation-test-key-0005"));
  assert.equal(runner.store.get(`workspaces/${FIXTURE_WORKSPACE}/studentEnrollments/student-a`)?.status, "active");
  assert.equal(runner.store.get(`workspaces/${FIXTURE_WORKSPACE}/subjectRegistry/subject-a`)?.status, "inactive");
});

test("C2E failed enrollment reference validation leaves audit and idempotency absent", async () => {
  const runner = new MemoryTransactionRunner(baseFixtures());
  const service = createEnrollmentMutationService({ runner });
  await assert.rejects(service.createStudentEnrollment(fixtureActor(), input("student_enrollment.create", { kind: "student_enrollment", id: "create", workspaceId: FIXTURE_WORKSPACE }, { studentId: "student-a", classId: "class-a", subjectIds: ["missing-subject"] })), expectCode("FAILED_PRECONDITION"));
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("securityAuditLogs/")), false);
  assert.equal([...runner.store.keys()].some((path) => path.startsWith("trustedOperationIdempotency/")), false);
});
