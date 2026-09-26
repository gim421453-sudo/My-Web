import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getTrustedAdminFirestore } from "../src/runtime/adminFirestore.js";
import { createAdminTransactionRunner } from "../src/repositories/trustedTransaction.js";
import { createRegistryMutationService } from "../src/registries/registryMutationService.js";
import { createEnrollmentMutationService } from "../src/relationships/enrollmentMutationService.js";
import { createEntityRegistryRepository } from "../src/registries/entityRegistryRepository.js";
import { validateEnrollmentReferences } from "../src/relationships/enrollmentReferentialValidator.js";
import { parseCanonicalStudentEnrollment } from "../src/relationships/studentEnrollmentContract.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { sha256Canonical } from "../src/operations/operationContract.js";
import { fixtureActor } from "./support/authzFixtures.js";

const suffix = randomUUID().replaceAll("-", "");
const workspaceId = `c2e1_workspace_${suffix}`;
const secondWorkspaceId = `c2e1_other_${suffix}`;
const ownerUid = `c2e1_owner_${suffix}`;
const managerUid = `c2e1_manager_${suffix}`;
const teacherUid = `c2e1_teacher_${suffix}`;
const matrixRoles = ["manager", "teacher", "normal", "viewer", "print_account"] as const;
const firestore = getTrustedAdminFirestore().firestore;
const runner = createAdminTransactionRunner(firestore);
const paths = new Set<string>();

function track(path: string): string { paths.add(path); return path; }
function actor(uid: string) { return fixtureActor(uid); }
function request(operation: string, kind: string, id: string, payload: Record<string, unknown>, key: string, workspace = workspaceId) {
  return { operation, idempotencyKey: `${key}-${suffix}`, target: { kind, id, workspaceId: workspace }, payload };
}
function expectCode(code: string) { return (error: unknown) => error instanceof OperationError && error.code === code; }
function registry(kind: "student" | "class" | "subject", id: string, status = "active") {
  return { schemaVersion: 1, version: 1, workspaceId, [`${kind}Id`]: id, status, source: "manual_admin", createdAt: 1, updatedAt: 1, createdBy: ownerUid,
    ...(kind === "class" || kind === "subject" ? { displayName: `${kind} fixture` } : {}) };
}
function membership(uid: string, role: string, status = "active") {
  return { schemaVersion: 1, uid, workspaceId, role, status, active: status === "active", disabled: status !== "active", source: "system_bootstrap" };
}
function idempotencyPath(uid: string, key: string): string {
  return `trustedOperationIdempotency/${sha256Canonical({ actorUid: uid, idempotencyKey: `${key}-${suffix}` })}`;
}
function auditPath(uid: string, operation: string, kind: string, id: string, key: string, targetWorkspace = workspaceId): string {
  return `securityAuditLogs/${sha256Canonical({ actorUid: uid, idempotencyKey: `${key}-${suffix}`, operation, target: { kind, id, workspaceId: targetWorkspace } })}`;
}
async function assertDeniedSideEffects(uid: string, operation: string, kind: string, id: string, key: string, targetWorkspace = workspaceId): Promise<void> {
  assert.equal((await firestore.doc(idempotencyPath(uid, key)).get()).exists, false);
  assert.equal((await firestore.doc(auditPath(uid, operation, kind, id, key, targetWorkspace)).get()).exists, false);
}
async function assertSuccessSideEffects(uid: string, operation: string, kind: string, id: string, key: string, targetWorkspace = workspaceId): Promise<void> {
  assert.equal((await firestore.doc(idempotencyPath(uid, key)).get()).exists, true);
  assert.equal((await firestore.doc(auditPath(uid, operation, kind, id, key, targetWorkspace)).get()).exists, true);
}

try {
  await Promise.all([
    firestore.doc(track(`systemOwners/${ownerUid}`)).set({ schemaVersion: 1, uid: ownerUid, status: "active", source: "system_bootstrap" }),
    firestore.doc(track(`workspaces/${workspaceId}`)).set({ workspaceId, status: "active", disabled: false, archived: false }),
    firestore.doc(track(`workspaces/${secondWorkspaceId}`)).set({ workspaceId: secondWorkspaceId, status: "active", disabled: false, archived: false }),
    firestore.doc(track(`workspaces/${workspaceId}/members/${managerUid}`)).set({ schemaVersion: 1, uid: managerUid, workspaceId, role: "super_manager", status: "active", active: true, disabled: false, source: "system_bootstrap" }),
    firestore.doc(track(`workspaces/${workspaceId}/members/${teacherUid}`)).set({ schemaVersion: 1, uid: teacherUid, workspaceId, role: "teacher", status: "active", active: true, disabled: false, source: "system_bootstrap" }),
    ...matrixRoles.map((role) => firestore.doc(track(`workspaces/${workspaceId}/members/c2e1_role_${role}_${suffix}`)).set(membership(`c2e1_role_${role}_${suffix}`, role))),
    firestore.doc(track(`workspaces/${workspaceId}/members/c2e1_unknown_${suffix}`)).set(membership(`c2e1_unknown_${suffix}`, "unknown")),
    firestore.doc(track(`workspaces/${workspaceId}/members/c2e1_inactive_${suffix}`)).set(membership(`c2e1_inactive_${suffix}`, "super_manager", "inactive")),
    firestore.doc(track(`workspaces/${workspaceId}/classRegistry/class-a`)).set(registry("class", "class-a")),
    firestore.doc(track(`workspaces/${workspaceId}/classRegistry/class-b`)).set(registry("class", "class-b")),
    firestore.doc(track(`workspaces/${workspaceId}/subjectRegistry/subject-a`)).set(registry("subject", "subject-a")),
    firestore.doc(track(`workspaces/${workspaceId}/subjectRegistry/subject-b`)).set(registry("subject", "subject-b")),
    firestore.doc(track(`workspaces/${workspaceId}/studentRegistry/race-student`)).set(registry("student", "race-student")),
    firestore.doc(track(`workspaces/${workspaceId}/studentRegistry/matrix-owner`)).set(registry("student", "matrix-owner")),
    firestore.doc(track(`workspaces/${workspaceId}/studentRegistry/matrix-manager`)).set(registry("student", "matrix-manager")),
  ]);

  const registries = createRegistryMutationService({ runner, createId: () => `stable${suffix}` });
  const enrollments = createEnrollmentMutationService({ runner });
  const createStudent = request("student_registry.create", "student_registry", "create", { metadata: { displayName: "Fixture student" } }, "create-student");
  const first = await registries.createStudentRegistry(actor(ownerUid), createStudent);
  const replay = await registries.createStudentRegistry(actor(ownerUid), createStudent);
  const studentId = String(first.result.targetId);
  track(`workspaces/${workspaceId}/studentRegistry/${studentId}`);
  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.match(studentId, /^student_[A-Za-z0-9_-]+$/);
  assert.notEqual(studentId, "Fixture student");
  assert.equal((await firestore.doc(`workspaces/${workspaceId}/studentRegistry/${studentId}`).get()).data()?.version, 1);

  const updateA = request("student_registry.update", "student_registry", studentId, { expectedVersion: 1, metadata: { studentNumber: "A" } }, "cas-a");
  const updateB = request("student_registry.update", "student_registry", studentId, { expectedVersion: 1, metadata: { displayName: "Changed" } }, "cas-b");
  const race = await Promise.allSettled([registries.updateStudentRegistryMetadata(actor(ownerUid), updateA), registries.updateStudentRegistryMetadata(actor(ownerUid), updateB)]);
  assert.equal(race.filter((value) => value.status === "fulfilled").length, 1);
  assert.equal(race.filter((value) => value.status === "rejected").length, 1);
  const afterRace = await firestore.doc(`workspaces/${workspaceId}/studentRegistry/${studentId}`).get();
  assert.equal(afterRace.data()?.version, 2);
  await assert.rejects(registries.updateStudentRegistryMetadata(actor(ownerUid), request("student_registry.update", "student_registry", studentId, { expectedVersion: 1, metadata: { displayName: "Stale" } }, "cas-stale")), expectCode("CONFLICT"));

  await assert.rejects(registries.deactivateStudentRegistry(actor(teacherUid), request("student_registry.deactivate", "student_registry", "does-not-exist", { expectedVersion: 1 }, "teacher-deny")), expectCode("FORBIDDEN"));
  await assert.rejects(registries.deactivateStudentRegistry(actor(managerUid), request("student_registry.deactivate", "student_registry", "does-not-exist", { expectedVersion: 1 }, "cross-deny", secondWorkspaceId)), expectCode("FORBIDDEN"));

  // C2E2: every policy role is exercised through the real transaction-backed services.
  const deniedActors = [
    ...matrixRoles.map((role) => ({ label: role, uid: `c2e1_role_${role}_${suffix}` })),
    { label: "unknown", uid: `c2e1_unknown_${suffix}` },
    { label: "inactive", uid: `c2e1_inactive_${suffix}` },
  ];
  const allowedActors = [
    { label: "owner", uid: ownerUid, student: "matrix-owner" },
    { label: "super", uid: managerUid, student: "matrix-manager" },
  ];
  for (const entry of allowedActors) {
    const service = createRegistryMutationService({ runner, createId: () => `matrix${entry.label}${suffix}` });
    const studentKey = `matrix-student-${entry.label}`;
    const classKey = `matrix-class-${entry.label}`;
    const subjectKey = `matrix-subject-${entry.label}`;
    const studentResult = await service.createStudentRegistry(actor(entry.uid), request("student_registry.create", "student_registry", "create", { metadata: { displayName: `Student ${entry.label}` } }, studentKey));
    const classResult = await service.createClassRegistry(actor(entry.uid), request("class_registry.create", "class_registry", "create", { metadata: { displayName: `Class ${entry.label}` } }, classKey));
    const subjectResult = await service.createSubjectRegistry(actor(entry.uid), request("subject_registry.create", "subject_registry", "create", { metadata: { displayName: `Subject ${entry.label}` } }, subjectKey));
    const enrollmentKey = `matrix-enrollment-${entry.label}`;
    await enrollments.createStudentEnrollment(actor(entry.uid), request("student_enrollment.create", "student_enrollment", "create", { studentId: entry.student, classId: "class-a", subjectIds: ["subject-a"] }, enrollmentKey));
    assert.equal(studentResult.result.created, true);
    assert.equal(classResult.result.created, true);
    assert.equal(subjectResult.result.created, true);
    assert.equal((await firestore.doc(`workspaces/${workspaceId}/studentRegistry/${studentResult.result.targetId}`).get()).exists, true);
    assert.equal((await firestore.doc(`workspaces/${workspaceId}/classRegistry/${classResult.result.targetId}`).get()).exists, true);
    assert.equal((await firestore.doc(`workspaces/${workspaceId}/subjectRegistry/${subjectResult.result.targetId}`).get()).exists, true);
    await assertSuccessSideEffects(entry.uid, "student_registry.create", "student_registry", "create", studentKey);
    await assertSuccessSideEffects(entry.uid, "class_registry.create", "class_registry", "create", classKey);
    await assertSuccessSideEffects(entry.uid, "subject_registry.create", "subject_registry", "create", subjectKey);
    await assertSuccessSideEffects(entry.uid, "student_enrollment.create", "student_enrollment", "create", enrollmentKey);
  }
  for (const entry of deniedActors) {
    const service = createRegistryMutationService({ runner, createId: () => `denied${entry.label}${suffix}` });
    const studentKey = `deny-student-${entry.label}`;
    const classKey = `deny-class-${entry.label}`;
    const subjectKey = `deny-subject-${entry.label}`;
    const enrollmentKey = `deny-enrollment-${entry.label}`;
    await assert.rejects(service.createStudentRegistry(actor(entry.uid), request("student_registry.create", "student_registry", "create", { metadata: { displayName: "Denied" } }, studentKey)), expectCode("FORBIDDEN"));
    await assert.rejects(service.createClassRegistry(actor(entry.uid), request("class_registry.create", "class_registry", "create", { metadata: { displayName: "Denied" } }, classKey)), expectCode("FORBIDDEN"));
    await assert.rejects(service.createSubjectRegistry(actor(entry.uid), request("subject_registry.create", "subject_registry", "create", { metadata: { displayName: "Denied" } }, subjectKey)), expectCode("FORBIDDEN"));
    await assert.rejects(enrollments.createStudentEnrollment(actor(entry.uid), request("student_enrollment.create", "student_enrollment", "create", { studentId: "nonexistent-student", classId: "class-a", subjectIds: ["subject-a"] }, enrollmentKey)), expectCode("FORBIDDEN"));
    await assertDeniedSideEffects(entry.uid, "student_registry.create", "student_registry", "create", studentKey);
    await assertDeniedSideEffects(entry.uid, "class_registry.create", "class_registry", "create", classKey);
    await assertDeniedSideEffects(entry.uid, "subject_registry.create", "subject_registry", "create", subjectKey);
    await assertDeniedSideEffects(entry.uid, "student_enrollment.create", "student_enrollment", "create", enrollmentKey);
  }
  const crossKey = "deny-cross-matrix";
  await assert.rejects(registries.createStudentRegistry(actor(managerUid), request("student_registry.create", "student_registry", "create", { metadata: { displayName: "Denied" } }, crossKey, secondWorkspaceId)), expectCode("FORBIDDEN"));
  await assertDeniedSideEffects(managerUid, "student_registry.create", "student_registry", "create", crossKey, secondWorkspaceId);
  const crossClassKey = "deny-cross-class";
  const crossSubjectKey = "deny-cross-subject";
  const crossEnrollmentKey = "deny-cross-enrollment";
  await assert.rejects(registries.createClassRegistry(actor(managerUid), request("class_registry.create", "class_registry", "create", { metadata: { displayName: "Denied" } }, crossClassKey, secondWorkspaceId)), expectCode("FORBIDDEN"));
  await assert.rejects(registries.createSubjectRegistry(actor(managerUid), request("subject_registry.create", "subject_registry", "create", { metadata: { displayName: "Denied" } }, crossSubjectKey, secondWorkspaceId)), expectCode("FORBIDDEN"));
  await assert.rejects(enrollments.createStudentEnrollment(actor(managerUid), request("student_enrollment.create", "student_enrollment", "create", { studentId: "nonexistent-student", classId: "class-a", subjectIds: ["subject-a"] }, crossEnrollmentKey, secondWorkspaceId)), expectCode("FORBIDDEN"));
  await assertDeniedSideEffects(managerUid, "class_registry.create", "class_registry", "create", crossClassKey, secondWorkspaceId);
  await assertDeniedSideEffects(managerUid, "subject_registry.create", "subject_registry", "create", crossSubjectKey, secondWorkspaceId);
  await assertDeniedSideEffects(managerUid, "student_enrollment.create", "student_enrollment", "create", crossEnrollmentKey, secondWorkspaceId);

  const enrollmentInput = request("student_enrollment.create", "student_enrollment", "create", { studentId, classId: "class-a", subjectIds: ["subject-a"] }, "enrollment-create");
  await enrollments.createStudentEnrollment(actor(managerUid), enrollmentInput);
  track(`workspaces/${workspaceId}/studentEnrollments/${studentId}`);
  assert.equal((await firestore.doc(`workspaces/${workspaceId}/studentEnrollments/${studentId}`).get()).data()?.version, 1);
  await assert.rejects(enrollments.replaceStudentEnrollmentSubjects(actor(managerUid), request("student_enrollment.subject_replace", "student_enrollment", studentId, { expectedVersion: 1, subjectIds: ["subject-a", "missing"] }, "subjects-invalid")), expectCode("FAILED_PRECONDITION"));
  assert.deepEqual((await firestore.doc(`workspaces/${workspaceId}/studentEnrollments/${studentId}`).get()).data()?.subjectIds, ["subject-a"]);

  const raceEnrollmentKey = "race-enrollment-create";
  await enrollments.createStudentEnrollment(actor(managerUid), request("student_enrollment.create", "student_enrollment", "create", { studentId: "race-student", classId: "class-a", subjectIds: ["subject-a"] }, raceEnrollmentKey));
  const raceClassKey = "race-class-change";
  const raceSubjectKey = "race-subject-replace";
  const enrollmentRace = await Promise.allSettled([
    enrollments.changeStudentEnrollmentClass(actor(managerUid), request("student_enrollment.class_change", "student_enrollment", "race-student", { expectedVersion: 1, newClassId: "class-b" }, raceClassKey)),
    enrollments.replaceStudentEnrollmentSubjects(actor(managerUid), request("student_enrollment.subject_replace", "student_enrollment", "race-student", { expectedVersion: 1, subjectIds: ["subject-b"] }, raceSubjectKey)),
  ]);
  assert.equal(enrollmentRace.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(enrollmentRace.filter((result) => result.status === "rejected").length, 1);
  const raceEnrollment = await firestore.doc(`workspaces/${workspaceId}/studentEnrollments/race-student`).get();
  const raceData = raceEnrollment.data();
  assert.equal(raceData?.version, 2);
  const classWon = raceData?.classId === "class-b" && JSON.stringify(raceData.subjectIds) === JSON.stringify(["subject-a"]);
  const subjectsWon = raceData?.classId === "class-a" && JSON.stringify(raceData.subjectIds) === JSON.stringify(["subject-b"]);
  assert.equal(classWon || subjectsWon, true);
  assert.equal(parseCanonicalStudentEnrollment(raceData).state, "VALID");
  assert.equal((await runner.run((transaction) => validateEnrollmentReferences({ workspaceId, studentId: "race-student", classId: String(raceData?.classId), subjectIds: raceData?.subjectIds as string[] }, createEntityRegistryRepository(transaction)))).decision, "REFERENCES_VALID");
  const raceAudit = await Promise.all([firestore.doc(auditPath(managerUid, "student_enrollment.class_change", "student_enrollment", "race-student", raceClassKey)).get(), firestore.doc(auditPath(managerUid, "student_enrollment.subject_replace", "student_enrollment", "race-student", raceSubjectKey)).get()]);
  const raceIdempotency = await Promise.all([firestore.doc(idempotencyPath(managerUid, raceClassKey)).get(), firestore.doc(idempotencyPath(managerUid, raceSubjectKey)).get()]);
  assert.equal(raceAudit.filter((snapshot) => snapshot.exists).length, 1);
  assert.equal(raceIdempotency.filter((snapshot) => snapshot.exists).length, 1);

  await registries.deactivateSubjectRegistry(actor(managerUid), request("subject_registry.deactivate", "subject_registry", "subject-a", { expectedVersion: 1 }, "subject-deactivate"));
  assert.equal((await firestore.doc(`workspaces/${workspaceId}/subjectRegistry/subject-a`).get()).data()?.status, "inactive");
  assert.equal((await firestore.doc(`workspaces/${workspaceId}/studentEnrollments/${studentId}`).get()).data()?.status, "active");
  const referenceResult = await runner.run((transaction) => validateEnrollmentReferences({ workspaceId, studentId, classId: "class-a", subjectIds: ["subject-a"] }, createEntityRegistryRepository(transaction)));
  assert.equal(referenceResult.decision, "REFERENCES_INVALID");
  await enrollments.deactivateStudentEnrollment(actor(managerUid), request("student_enrollment.deactivate", "student_enrollment", studentId, { expectedVersion: 1 }, "enrollment-deactivate"));
  assert.equal((await firestore.doc(`workspaces/${workspaceId}/studentEnrollments/${studentId}`).get()).data()?.status, "inactive");

  const auditCount = (await firestore.collection("securityAuditLogs").get()).docs.filter((doc) => String(doc.data().workspaceId || "") === workspaceId).length;
  assert.ok(auditCount >= 4);
  console.log("C2E2 real Firestore Emulator mutation coverage passed; production access=0");
} finally {
  const batch = firestore.batch();
  const roots = await Promise.all([...paths].map((path) => firestore.doc(path).get()));
  for (const snapshot of roots) if (snapshot.exists) batch.delete(snapshot.ref);
  const audit = await firestore.collection("securityAuditLogs").get();
  const idem = await firestore.collection("trustedOperationIdempotency").get();
  for (const snapshot of [...audit.docs, ...idem.docs]) {
    if (String(snapshot.data().workspaceId || "") === workspaceId || JSON.stringify(snapshot.data()).includes(suffix)) batch.delete(snapshot.ref);
  }
  await batch.commit();
}
