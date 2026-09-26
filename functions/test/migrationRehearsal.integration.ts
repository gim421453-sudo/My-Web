import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getTrustedAdminFirestore } from "../src/runtime/adminFirestore.js";
import { createAdminTransactionRunner } from "../src/repositories/trustedTransaction.js";
import { createCanonicalMigrationPreview, CANONICAL_MIGRATION_CLASSIFIER_VERSION } from "../src/migrations/canonicalMigrationClassifier.js";
import { buildMigrationPlan, assertPlanCurrent, runMigrationDryRun } from "../src/migrations/migrationDryRunOrchestrator.js";
import { createMigrationRehearsalApplyAdapter } from "../src/migrations/migrationRehearsalApplyAdapter.js";
import { createPersistentMigrationRollbackExecutor } from "../src/migrations/persistentMigrationRollbackExecutor.js";
import { createPersistentMigrationRecoveryService } from "../src/migrations/migrationManifestRecovery.js";
import { createPersistentMigrationManifestService, persistentManifestOperationPath, persistentManifestPath } from "../src/migrations/persistentMigrationManifestRepository.js";
import { sha256Canonical } from "../src/operations/operationContract.js";
import { parseStudentRegistryDocument } from "../src/registries/studentRegistryContract.js";
import { parseClassRegistryDocument } from "../src/registries/classRegistryContract.js";
import { parseSubjectRegistryDocument } from "../src/registries/subjectRegistryContract.js";
import { parseCanonicalStudentEnrollment } from "../src/relationships/studentEnrollmentContract.js";
import { fixtureActor } from "./support/authzFixtures.js";

const suffix = randomUUID().replaceAll("-", "");
const workspaceId = `c2g1b_workspace_${suffix}`;
const ownerUid = `c2g1b_owner_${suffix}`;
const managerUid = `c2g1b_manager_${suffix}`;
const firestore = getTrustedAdminFirestore().firestore;
const runner = createAdminTransactionRunner(firestore);
let adapter = createMigrationRehearsalApplyAdapter({ runner });
const rollback = createPersistentMigrationRollbackExecutor({ runner });
const paths = new Set<string>();
const track = (path: string) => (paths.add(path), path);
const source = Object.freeze({
  classifierVersion: CANONICAL_MIGRATION_CLASSIFIER_VERSION,
  classMappings: [{ workspaceId, legacyRef: "legacy-class-a", canonicalId: "class-c1" }],
  subjectMappings: [{ workspaceId, legacyRef: "legacy-subject-u2", canonicalId: "subject-u2" }],
  students: [{ sourceKind: "operational_student", workspaceId, sourceId: "student-s1", sourceStudentId: "student-s1" }, { sourceKind: "operational_student", workspaceId, sourceId: "student-s2", sourceStudentId: "student-s2" }],
  classes: [{ sourceKind: "operational_class_ref", workspaceId, sourceId: "legacy-class-a", sourceClassRef: "legacy-class-a" }],
  subjects: [{ sourceKind: "operational_subject", workspaceId, sourceId: "subject-u1" }, { sourceKind: "legacy_subject", workspaceId, sourceId: "legacy-subject-u2", sourceSubjectRef: "legacy-subject-u2" }],
  enrollments: [{ sourceKind: "operational_enrollment", workspaceId, sourceId: "enrollment-s1", sourceStudentId: "student-s1", sourceClassRef: "legacy-class-a", sourceSubjectRefs: ["subject-u1", "legacy-subject-u2"] }],
});

function commandFor(candidatePlan: typeof plan, candidateAdapter: ReturnType<typeof createMigrationRehearsalApplyAdapter>, candidateWorkspaceId: string, operationKey: string) {
  const operation = candidatePlan.operations.find((candidate) => candidate.operationKey === operationKey)!;
  const metadata = operation.entityType === "class" ? { displayName: "C1" } : operation.entityType === "subject" ? { displayName: operation.destination.endsWith("subject-u1") ? "U1" : "U2" } : undefined;
  return candidateAdapter.createCommand(candidatePlan, operation.operationKey, operation.entityType, {
    workspaceId: candidateWorkspaceId, sourceFingerprint: operation.sourceFingerprint, targetId: operation.destination.split("/")[1]!,
    ...(metadata ? { metadata } : {}),
    ...(operation.entityType === "enrollment" ? { classId: "class-c1", subjectIds: ["subject-u1", "subject-u2"] } : {}),
  });
}

function command(operationKey: string) {
  return commandFor(plan, adapter, workspaceId, operationKey);
}

const dry = runMigrationDryRun(source);
const plan = buildMigrationPlan(createCanonicalMigrationPreview(source));
const commands = plan.operations.map((operation) => command(operation.operationKey));

function plannedPayloadHash(operation: typeof plan.operations[number]): string {
  const targetId = operation.destination.split("/")[1]!;
  const base = { schemaVersion: 1, version: 1, workspaceId, status: "active", source: "migration" };
  const semantic = operation.entityType === "student" ? { ...base, studentId: targetId }
    : operation.entityType === "class" ? { ...base, classId: targetId, displayName: "C1" }
      : operation.entityType === "subject" ? { ...base, subjectId: targetId, displayName: targetId === "subject-u1" ? "U1" : "U2" }
        : { ...base, studentId: targetId, classId: "class-c1", subjectIds: ["subject-u1", "subject-u2"] };
  return sha256Canonical(semantic);
}

function persistentTargetFingerprint(document: Readonly<Record<string, unknown>>): string {
  const { createdAt: _createdAt, updatedAt: _updatedAt, createdBy: _createdBy, ...semantic } = document;
  return sha256Canonical(semantic);
}

try {
  assert.equal(dry.firestoreAccess, 0);
  assert.equal(dry.firestoreWrites, 0);
  assert.equal(plan.applyable, true);
  assert.doesNotThrow(() => assertPlanCurrent(plan, source));
  await Promise.all([
    firestore.doc(track(`systemOwners/${ownerUid}`)).set({ schemaVersion: 1, status: "active", source: "system_bootstrap" }),
    firestore.doc(track(`workspaces/${workspaceId}`)).set({ workspaceId, status: "active", disabled: false, archived: false }),
    firestore.doc(track(`workspaces/${workspaceId}/members/${managerUid}`)).set({ schemaVersion: 1, uid: managerUid, workspaceId, role: "manager", status: "active", active: true, disabled: false, source: "system_bootstrap" }),
  ]);
  const manifest = createPersistentMigrationManifestService(runner);
  await manifest.prepare(plan, workspaceId, ownerUid, plan.operations.map((operation) => ({ operationKey: operation.operationKey, entityType: operation.entityType, targetId: operation.destination.split("/")[1]!, sourceFingerprint: operation.sourceFingerprint, plannedPayloadHash: plannedPayloadHash(operation) })));
  adapter = createMigrationRehearsalApplyAdapter({ runner, manifest: manifest.port });

  // A failure after the manifest write has been queued still aborts the whole
  // Firestore transaction: no target or CREATED ownership evidence survives.
  const firstCommand = commands[0]!;
  const firstOperation = plan.operations[0]!;
  const firstCollection = firstOperation.entityType === "student" ? "studentRegistry" : firstOperation.entityType === "class" ? "classRegistry" : firstOperation.entityType === "subject" ? "subjectRegistry" : "studentEnrollments";
  const failingCreate = createMigrationRehearsalApplyAdapter({ runner, manifest: manifest.port, beforeCommit: () => { throw new Error("test-create-abort"); } });
  await assert.rejects(() => failingCreate.apply(fixtureActor(ownerUid), firstCommand, "run-fail-create"));
  assert.equal((await firestore.doc(track(`workspaces/${workspaceId}/${firstCollection}/${firstOperation.destination.split("/")[1]!}`)).get()).exists, false);
  assert.equal((await firestore.doc(track(persistentManifestOperationPath(workspaceId, plan.planId, firstOperation.operationKey).join("/"))).get()).data()?.status, "PLANNED");

  const denied = await Promise.allSettled([adapter.apply(fixtureActor(managerUid), commands[0]!, "run-denied")]);
  assert.equal(denied[0]?.status, "rejected");

  // Two independent recovery services race for the same PREPARED root. The
  // Firestore transaction CAS permits one owner only, before any business write.
  const recoveryA = createPersistentMigrationRecoveryService({ runner });
  const recoveryB = createPersistentMigrationRecoveryService({ runner });
  const ownership = await Promise.allSettled([
    recoveryA.acquire(fixtureActor(ownerUid), plan, workspaceId, "run-owner-a"),
    recoveryB.acquire(fixtureActor(ownerUid), plan, workspaceId, "run-owner-b"),
  ]);
  assert.equal(ownership.filter((result) => result.status === "fulfilled").length, 1);
  const winner = ownership[0]?.status === "fulfilled" ? "run-owner-a" : "run-owner-b";
  const rootAfterRace = (await firestore.doc(track(persistentManifestPath(workspaceId, plan.planId).join("/"))).get()).data();
  assert.equal(rootAfterRace?.status, "APPLYING");
  assert.equal(rootAfterRace?.activeRunId, winner);
  assert.equal(rootAfterRace?.version, 3);
  const recovery = winner === "run-owner-a" ? recoveryA : recoveryB;
  const partialAdapter = createMigrationRehearsalApplyAdapter({
    runner,
    manifest: createPersistentMigrationManifestService(runner).port,
    beforeCommit: (candidate) => {
      if (candidate.operationKey !== firstOperation.operationKey) throw new Error("test-partial-interrupt");
    },
  });
  const partial = await recovery.resume(fixtureActor(ownerUid), plan, workspaceId, commands, partialAdapter, winner);
  assert.equal(partial.state, "STOPPED_PARTIAL");
  assert.equal((await firestore.doc(`workspaces/${workspaceId}/${firstCollection}/${firstOperation.destination.split("/")[1]!}`).get()).exists, true);
  assert.equal((await firestore.doc(persistentManifestOperationPath(workspaceId, plan.planId, firstOperation.operationKey).join("/")).get()).data()?.status, "CREATED");
  assert.equal((await firestore.doc(persistentManifestPath(workspaceId, plan.planId).join("/")).get()).data()?.status, "PARTIAL");
  // Discard the partial executor and race two wholly fresh recovery stacks on
  // the durable PARTIAL manifest. They share only the Emulator database.
  const interruptBeforeApplied = () => { throw new Error("test-pre-applied-finalization-interrupt"); };
  const resumeA = createPersistentMigrationRecoveryService({ runner, beforeFinalizeApplied: interruptBeforeApplied });
  const resumeB = createPersistentMigrationRecoveryService({ runner, beforeFinalizeApplied: interruptBeforeApplied });
  const resumed = await Promise.allSettled([
    resumeA.resume(fixtureActor(ownerUid), plan, workspaceId, commands, createMigrationRehearsalApplyAdapter({ runner, manifest: createPersistentMigrationManifestService(runner).port }), "run-partial-a"),
    resumeB.resume(fixtureActor(ownerUid), plan, workspaceId, commands, createMigrationRehearsalApplyAdapter({ runner, manifest: createPersistentMigrationManifestService(runner).port }), "run-partial-b"),
  ]);
  assert.equal(resumed.filter((result) => result.status === "fulfilled").length, 0);
  assert.equal(resumed.filter((result) => result.status === "rejected").length, 2);
  for (const result of plan.operations) {
    const targetId = result.destination.split("/")[1]!;
    const collection = result.entityType === "student" ? "studentRegistry" : result.entityType === "class" ? "classRegistry" : result.entityType === "subject" ? "subjectRegistry" : "studentEnrollments";
    const snapshot = await firestore.doc(track(`workspaces/${workspaceId}/${collection}/${targetId}`)).get();
    assert.equal(snapshot.exists, true);
    const data = snapshot.data();
    assert.equal(data?.source, "migration"); assert.equal(data?.version, 1);
    const parsed = result.entityType === "student" ? parseStudentRegistryDocument(data, { workspaceId, entityId: targetId }) : result.entityType === "class" ? parseClassRegistryDocument(data, { workspaceId, entityId: targetId }) : result.entityType === "subject" ? parseSubjectRegistryDocument(data, { workspaceId, entityId: targetId }) : parseCanonicalStudentEnrollment(data);
    assert.equal(parsed.state, "VALID");
    const operation = await firestore.doc(track(persistentManifestOperationPath(workspaceId, plan.planId, result.operationKey).join("/"))).get();
    assert.equal(operation.data()?.status, "CREATED");
    assert.equal(operation.data()?.createdByPlan, true);
  }
  const preAppliedRoot = await firestore.doc(track(persistentManifestPath(workspaceId, plan.planId).join("/"))).get();
  const preAppliedVersion = preAppliedRoot.data()?.version;
  assert.equal(preAppliedRoot.data()?.status, "APPLYING");
  const preFinalClassOperation = plan.operations.find((operation) => operation.entityType === "class")!;
  const preFinalClassPath = `workspaces/${workspaceId}/classRegistry/${preFinalClassOperation.destination.split("/")[1]!}`;
  const preFinalClass = await firestore.doc(track(preFinalClassPath)).get();
  await firestore.doc(preFinalClassPath).update({ version: 2 });
  await assert.rejects(() => createPersistentMigrationRecoveryService({ runner }).resume(
    fixtureActor(ownerUid), plan, workspaceId, commands,
    createMigrationRehearsalApplyAdapter({ runner, manifest: createPersistentMigrationManifestService(runner).port }),
    "run-pre-applied-negative",
  ), /CONFLICT/);
  assert.equal((await firestore.doc(persistentManifestPath(workspaceId, plan.planId).join("/")).get()).data()?.status, "APPLYING");
  await firestore.doc(preFinalClassPath).set(preFinalClass.data()!);
  // Fresh process boundary: no journal, manifest service, or adapter instance is reused.
  const finalizerA = createPersistentMigrationRecoveryService({ runner });
  const finalizerB = createPersistentMigrationRecoveryService({ runner });
  const finalizers = await Promise.allSettled([
    finalizerA.resume(fixtureActor(ownerUid), plan, workspaceId, commands, createMigrationRehearsalApplyAdapter({ runner, manifest: createPersistentMigrationManifestService(runner).port }), "run-two-a"),
    finalizerB.resume(fixtureActor(ownerUid), plan, workspaceId, commands, createMigrationRehearsalApplyAdapter({ runner, manifest: createPersistentMigrationManifestService(runner).port }), "run-two-b"),
  ]);
  assert.equal(finalizers.filter((result) => result.status === "fulfilled").length, 2);
  const finalizedRoot = await firestore.doc(track(persistentManifestPath(workspaceId, plan.planId).join("/"))).get();
  assert.equal(finalizedRoot.data()?.status, "APPLIED");
  assert.equal(finalizedRoot.data()?.version, preAppliedVersion + 1);
  // Each CREATED reconciliation corruption starts from the same independently
  // restored durable baseline and uses fresh recovery objects only.
  const classOperation = plan.operations.find((operation) => operation.entityType === "class")!;
  const classTargetId = classOperation.destination.split("/")[1]!;
  const classPath = `workspaces/${workspaceId}/classRegistry/${classTargetId}`;
  const classTarget = await firestore.doc(track(classPath)).get();
  const classTargetData = classTarget.data()!;
  const classManifestPath = persistentManifestOperationPath(workspaceId, plan.planId, classOperation.operationKey).join("/");
  const classManifest = await firestore.doc(track(classManifestPath)).get();
  const idempotencyKey = sha256Canonical({ planId: plan.planId, operationKey: classOperation.operationKey });
  const idempotencyPath = `trustedOperationIdempotency/${sha256Canonical({ actorUid: ownerUid, idempotencyKey })}`;
  const idempotency = await firestore.doc(track(idempotencyPath)).get();
  const reconcile = async () => assert.rejects(() => createPersistentMigrationRecoveryService({ runner }).resume(
    fixtureActor(ownerUid), plan, workspaceId, commands,
    createMigrationRehearsalApplyAdapter({ runner, manifest: createPersistentMigrationManifestService(runner).port }),
    "run-negative-reconcile",
  ), /CONFLICT/);
  await firestore.doc(classPath).delete();
  await reconcile();
  await firestore.doc(classPath).set(classTargetData);
  await firestore.doc(classPath).update({ version: 2 });
  const versionMismatchTarget = await firestore.doc(track(classPath)).get();
  assert.equal(versionMismatchTarget.exists, true);
  assert.equal(versionMismatchTarget.data()?.version, 2);
  assert.equal(parseClassRegistryDocument(versionMismatchTarget.data(), { workspaceId, entityId: classTargetId }).state, "VALID");
  assert.equal(classManifest.data()?.status, "CREATED");
  assert.equal(classManifest.data()?.versionAfter, 1);
  await reconcile();
  await firestore.doc(classPath).set(classTargetData);
  await firestore.doc(classPath).update({ displayName: "C1-different" });
  await reconcile();
  await firestore.doc(classPath).set(classTargetData);
  await firestore.doc(classPath).update({ source: "manual_admin" });
  await reconcile();
  await firestore.doc(classPath).set(classTargetData);
  await firestore.doc(idempotencyPath).delete();
  await reconcile();
  await firestore.doc(idempotencyPath).set(idempotency.data()!);
  await firestore.doc(idempotencyPath).update({ payloadHash: sha256Canonical({ mismatched: true }) });
  await reconcile();
  await firestore.doc(idempotencyPath).set(idempotency.data()!);
  assert.equal((await firestore.doc(classManifestPath).get()).data()?.status, "CREATED");
  // Manifest ownership is mandatory: a migration-looking canonical target plus
  // its audit/idempotency evidence cannot authorize recovery after root loss.
  const rootPath = persistentManifestPath(workspaceId, plan.planId).join("/");
  const savedRoot = await firestore.doc(rootPath).get();
  await firestore.doc(rootPath).delete();
  await assert.rejects(() => createPersistentMigrationRecoveryService({ runner }).resume(
    fixtureActor(ownerUid), plan, workspaceId, commands,
    createMigrationRehearsalApplyAdapter({ runner, manifest: createPersistentMigrationManifestService(runner).port }),
    "run-manifest-loss",
  ));
  assert.equal((await firestore.doc(classPath).get()).exists, true);
  assert.equal((await firestore.doc(rootPath).get()).exists, false);
  await firestore.doc(rootPath).set(savedRoot.data()!);
  // Independent rollback-side loss proof: neither migration-looking source nor
  // audit/idempotency can replace missing root + exact operation ownership.
  const savedOperation = await firestore.doc(classManifestPath).get();
  const a2TargetBefore = await firestore.doc(track(classPath)).get();
  const a2TargetData = a2TargetBefore.data()!;
  const a2TargetFingerprint = persistentTargetFingerprint(a2TargetData);
  const a2AuditPath = `securityAuditLogs/${sha256Canonical({ actorUid: ownerUid, idempotencyKey, operation: "migration.class.create", target: { kind: "migration_class_registry", id: classTargetId, workspaceId } })}`;
  assert.equal(savedRoot.exists, true);
  assert.equal(savedOperation.exists, true);
  assert.equal(a2TargetBefore.exists, true);
  assert.equal(a2TargetData.source, "migration");
  assert.equal(a2TargetData.version, 1);
  assert.equal(a2TargetFingerprint, savedOperation.data()?.afterFingerprint);
  assert.equal((await firestore.doc(track(idempotencyPath)).get()).exists, true);
  assert.equal((await firestore.doc(track(a2AuditPath)).get()).exists, true);
  await firestore.doc(rootPath).delete();
  await firestore.doc(classManifestPath).delete();
  assert.equal((await firestore.doc(rootPath).get()).exists, false);
  assert.equal((await firestore.doc(classManifestPath).get()).exists, false);
  await assert.rejects(() => createPersistentMigrationRollbackExecutor({ runner }).rollback(
    fixtureActor(ownerUid), plan, workspaceId, classOperation.operationKey,
  ));
  const a2TargetAfter = await firestore.doc(track(classPath)).get();
  assert.equal(a2TargetAfter.exists, true);
  assert.equal(a2TargetAfter.data()?.version, a2TargetData.version);
  assert.equal(persistentTargetFingerprint(a2TargetAfter.data()!), a2TargetFingerprint);
  assert.deepEqual(a2TargetAfter.data(), a2TargetData);
  assert.equal((await firestore.doc(rootPath).get()).exists, false);
  assert.equal((await firestore.doc(classManifestPath).get()).exists, false);
  await firestore.doc(rootPath).set(savedRoot.data()!);
  await firestore.doc(classManifestPath).set(savedOperation.data()!);
  assert.throws(() => assertPlanCurrent(plan, { ...source, students: [{ ...source.students[0]!, sourceStudentId: "student-change" }] }), /STALE_PLAN/);
  assert.throws(() => assertPlanCurrent(plan, { ...source, classMappings: [{ workspaceId, legacyRef: "legacy-class-a", canonicalId: "class-changed" }] }), /STALE_PLAN/);

  const enrollment = plan.operations.find((operation) => operation.entityType === "enrollment")!;
  const failingRollback = createPersistentMigrationRollbackExecutor({ runner, beforeCommit: () => { throw new Error("test-rollback-abort"); } });
  await assert.rejects(() => failingRollback.rollback(fixtureActor(ownerUid), plan, workspaceId, enrollment.operationKey));
  assert.equal((await firestore.doc(`workspaces/${workspaceId}/studentEnrollments/${enrollment.destination.split("/")[1]!}`).get()).exists, true);
  assert.equal((await firestore.doc(persistentManifestOperationPath(workspaceId, plan.planId, enrollment.operationKey).join("/")).get()).data()?.status, "CREATED");
  const rollbackSequenceBeforeRestart: string[] = [];
  const interruptedRollback = createPersistentMigrationRollbackExecutor({
    runner,
    afterRollbackCommitted: (operationKey) => {
      rollbackSequenceBeforeRestart.push(operationKey);
      throw new Error("test-rollback-interrupt-after-checkpoint");
    },
  });
  await assert.rejects(() => interruptedRollback.rollbackPlan(fixtureActor(ownerUid), plan, workspaceId, "rollback-run-one"));
  assert.deepEqual(rollbackSequenceBeforeRestart, [enrollment.operationKey]);
  const partialRoot = await firestore.doc(track(rootPath)).get();
  assert.equal(partialRoot.data()?.status, "ROLLING_BACK");
  assert.equal(partialRoot.data()?.activeRunId, null);
  assert.equal((await firestore.doc(`workspaces/${workspaceId}/studentEnrollments/${enrollment.destination.split("/")[1]!}`).get()).exists, false);
  assert.equal((await firestore.doc(persistentManifestOperationPath(workspaceId, plan.planId, enrollment.operationKey).join("/")).get()).data()?.status, "ROLLED_BACK");
  const pendingBeforeRestart = plan.operations.filter((operation) => operation.operationKey !== enrollment.operationKey);
  assert.deepEqual(await Promise.all(pendingBeforeRestart.map(async (operation) => (await firestore.doc(persistentManifestOperationPath(workspaceId, plan.planId, operation.operationKey).join("/")).get()).data()?.status)), pendingBeforeRestart.map(() => "CREATED"));
  // The interrupted executor and all of its process-local bookkeeping are never reused.
  const rollbackSequenceAfterRestart: string[] = [];
  const interruptBeforeRolledBack = () => { throw new Error("test-pre-rolled-back-finalization-interrupt"); };
  const freshRollbackA = createPersistentMigrationRollbackExecutor({ runner, afterRollbackCommitted: (operationKey) => rollbackSequenceAfterRestart.push(operationKey), beforeFinalizeRolledBack: interruptBeforeRolledBack });
  const freshRollbackB = createPersistentMigrationRollbackExecutor({ runner, afterRollbackCommitted: (operationKey) => rollbackSequenceAfterRestart.push(operationKey), beforeFinalizeRolledBack: interruptBeforeRolledBack });
  const resumedRollbacks = await Promise.allSettled([
    freshRollbackA.rollbackPlan(fixtureActor(ownerUid), plan, workspaceId, "rollback-run-two"),
    freshRollbackB.rollbackPlan(fixtureActor(ownerUid), plan, workspaceId, "rollback-run-three"),
  ]);
  assert.equal(resumedRollbacks.filter((result) => result.status === "fulfilled").length, 0);
  assert.equal(resumedRollbacks.filter((result) => result.status === "rejected").length, 2);
  assert.deepEqual(rollbackSequenceAfterRestart, pendingBeforeRestart.sort((left, right) => {
    const phase = (type: string) => type === "enrollment" ? 1 : type === "subject" ? 2 : type === "class" ? 3 : 4;
    return phase(left.entityType) - phase(right.entityType) || left.operationKey.localeCompare(right.operationKey);
  }).map((operation) => operation.operationKey));
  const globalRollbackSequence = [...rollbackSequenceBeforeRestart, ...rollbackSequenceAfterRestart];
  assert.deepEqual(globalRollbackSequence, [...plan.operations].sort((left, right) => {
    const phase = (type: string) => type === "enrollment" ? 1 : type === "subject" ? 2 : type === "class" ? 3 : 4;
    return phase(left.entityType) - phase(right.entityType) || left.operationKey.localeCompare(right.operationKey);
  }).map((operation) => operation.operationKey));
  const preRolledBackRoot = await firestore.doc(rootPath).get();
  assert.equal(preRolledBackRoot.data()?.status, "ROLLING_BACK");
  assert.equal(preRolledBackRoot.data()?.activeRunId, null);
  for (const result of plan.operations) {
    const targetId = result.destination.split("/")[1]!;
    const collection = result.entityType === "student" ? "studentRegistry" : result.entityType === "class" ? "classRegistry" : result.entityType === "subject" ? "subjectRegistry" : "studentEnrollments";
    assert.equal((await firestore.doc(`workspaces/${workspaceId}/${collection}/${targetId}`).get()).exists, false);
  }
  const rollbackFinalizerA = createPersistentMigrationRollbackExecutor({ runner });
  const rollbackFinalizerB = createPersistentMigrationRollbackExecutor({ runner });
  const rollbackFinalizers = await Promise.allSettled([
    rollbackFinalizerA.rollbackPlan(fixtureActor(ownerUid), plan, workspaceId, "rollback-finalizer-a"),
    rollbackFinalizerB.rollbackPlan(fixtureActor(ownerUid), plan, workspaceId, "rollback-finalizer-b"),
  ]);
  assert.equal(rollbackFinalizers.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(rollbackFinalizers.filter((result) => result.status === "rejected").length, 1);
  assert.equal((await firestore.doc(persistentManifestPath(workspaceId, plan.planId).join("/")).get()).data()?.status, "ROLLED_BACK");
  assert.equal((await createPersistentMigrationRollbackExecutor({ runner }).rollbackPlan(fixtureActor(ownerUid), plan, workspaceId, "rollback-finalizer-c")).state, "ROLLED_BACK");

  // Keep the C2E2 negative control outside the BE fixture. Its intentional
  // interruption must not consume BE operations before the reverse-order
  // restart assertion runs.
  const negativeWorkspaceId = `c2g1c2e2_workspace_${suffix}`;
  const negativeSource = Object.freeze({
    classifierVersion: CANONICAL_MIGRATION_CLASSIFIER_VERSION,
    classMappings: [],
    subjectMappings: [],
    students: [
      { sourceKind: "operational_student" as const, workspaceId: negativeWorkspaceId, sourceId: "negative-student-a", sourceStudentId: "negative-student-a" },
      { sourceKind: "operational_student" as const, workspaceId: negativeWorkspaceId, sourceId: "negative-student-b", sourceStudentId: "negative-student-b" },
    ],
    classes: [], subjects: [], enrollments: [],
  });
  const negativePlan = buildMigrationPlan(createCanonicalMigrationPreview(negativeSource));
  assert.equal(negativePlan.operations.length, 2);
  await firestore.doc(track(`workspaces/${negativeWorkspaceId}`)).set({ workspaceId: negativeWorkspaceId, status: "active", disabled: false, archived: false });
  const negativeManifest = createPersistentMigrationManifestService(runner);
  const negativePayloadHash = (operation: typeof negativePlan.operations[number]) => sha256Canonical({ schemaVersion: 1, version: 1, workspaceId: negativeWorkspaceId, status: "active", source: "migration", studentId: operation.destination.split("/")[1]! });
  await negativeManifest.prepare(negativePlan, negativeWorkspaceId, ownerUid, negativePlan.operations.map((operation) => ({ operationKey: operation.operationKey, entityType: operation.entityType, targetId: operation.destination.split("/")[1]!, sourceFingerprint: operation.sourceFingerprint, plannedPayloadHash: negativePayloadHash(operation) })));
  const negativeAdapter = createMigrationRehearsalApplyAdapter({ runner, manifest: negativeManifest.port });
  const negativeCommands = negativePlan.operations.map((operation) => commandFor(negativePlan, negativeAdapter, negativeWorkspaceId, operation.operationKey));
  await createPersistentMigrationRecoveryService({ runner }).resume(fixtureActor(ownerUid), negativePlan, negativeWorkspaceId, negativeCommands, negativeAdapter, "negative-apply");
  const negativeRootPath = persistentManifestPath(negativeWorkspaceId, negativePlan.planId).join("/");
  const negativeOrder = [...negativePlan.operations].sort((left, right) => left.operationKey.localeCompare(right.operationKey));
  const negativeFirst = negativeOrder[0]!;
  const negativeUnresolved = negativeOrder[1]!;
  const negativeCommitted: string[] = [];
  const negativeInterrupt = createPersistentMigrationRollbackExecutor({
    runner,
    afterRollbackCommitted: (operationKey) => {
      negativeCommitted.push(operationKey);
      throw new Error("test-negative-interrupt-after-first-rollback");
    },
  });
  await assert.rejects(() => negativeInterrupt.rollbackPlan(fixtureActor(ownerUid), negativePlan, negativeWorkspaceId, "negative-rollback-one"));
  assert.deepEqual(negativeCommitted, [negativeFirst.operationKey]);
  const unresolvedTargetPath = `workspaces/${negativeWorkspaceId}/studentRegistry/${negativeUnresolved.destination.split("/")[1]!}`;
  const unresolvedOperationPath = persistentManifestOperationPath(negativeWorkspaceId, negativePlan.planId, negativeUnresolved.operationKey).join("/");
  assert.equal((await firestore.doc(negativeRootPath).get()).data()?.status, "ROLLING_BACK");
  assert.equal((await firestore.doc(unresolvedTargetPath).get()).exists, true);
  assert.equal((await firestore.doc(unresolvedOperationPath).get()).data()?.status, "CREATED");
  let negativeFinalizeHookCalled = false;
  const negativeFinalizer = createPersistentMigrationRollbackExecutor({
    runner,
    beforeRollbackOperation: (operationKey) => {
      if (operationKey === negativeUnresolved.operationKey) throw new Error("test-negative-pre-final-unresolved-operation");
    },
    beforeFinalizeRolledBack: () => { negativeFinalizeHookCalled = true; },
  });
  await assert.rejects(() => negativeFinalizer.rollbackPlan(fixtureActor(ownerUid), negativePlan, negativeWorkspaceId, "negative-fresh-finalizer"));
  assert.equal(negativeFinalizeHookCalled, false);
  assert.equal((await firestore.doc(negativeRootPath).get()).data()?.status, "ROLLING_BACK");
  assert.equal((await firestore.doc(unresolvedTargetPath).get()).exists, true);
  assert.equal((await firestore.doc(unresolvedOperationPath).get()).data()?.status, "CREATED");
  console.log("C2G1-B real Firestore Emulator migration rehearsal passed; production access=0");
} finally {
  const batch = firestore.batch();
  for (const path of paths) batch.delete(firestore.doc(path));
  await batch.commit();
}
