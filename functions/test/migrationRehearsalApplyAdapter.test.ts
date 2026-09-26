import assert from "node:assert/strict";
import test from "node:test";
import { OperationError } from "../src/operations/operationErrors.js";
import { sha256Canonical } from "../src/operations/operationContract.js";
import { createMigrationRehearsalApplyAdapter, type MigrationCanonicalProposal } from "../src/migrations/migrationRehearsalApplyAdapter.js";
import type { MigrationPlan } from "../src/migrations/migrationDryRunOrchestrator.js";
import { InMemoryMigrationRehearsalJournal } from "../src/migrations/migrationRehearsalJournal.js";
import { buildMigrationPlan } from "../src/migrations/migrationDryRunOrchestrator.js";
import { createCanonicalMigrationPreview, CANONICAL_MIGRATION_CLASSIFIER_VERSION } from "../src/migrations/canonicalMigrationClassifier.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";
import { fixtureActor, FIXTURE_UID, FIXTURE_WORKSPACE, membershipV1, ownerV1 } from "./support/authzFixtures.js";

type EntityType = "student" | "class" | "subject" | "enrollment";

function plan(operations: readonly Readonly<{ entityType: EntityType; targetId: string; sourceFingerprint: string }>[]): MigrationPlan {
  return Object.freeze({
    planVersion: "CANONICAL_MIGRATION_PLAN_V1",
    classifierVersion: "CANONICAL_MIGRATION_CLASSIFIER_V1",
    planId: "migration-plan-fixture-0001",
    mappingFingerprint: "mapping-fixture",
    sourceFingerprintSet: Object.freeze(operations.map((operation) => operation.sourceFingerprint)),
    operations: Object.freeze(operations.map((operation, index) => Object.freeze({ phase: index + 1, entityType: operation.entityType, sourceFingerprint: operation.sourceFingerprint, workspaceFingerprint: sha256Canonical({ workspaceId: FIXTURE_WORKSPACE }).slice(0, 16), destination: `${operation.entityType === "student" ? "studentRegistry" : operation.entityType === "class" ? "classRegistry" : operation.entityType === "subject" ? "subjectRegistry" : "studentEnrollments"}/${operation.targetId}`, operationKey: `operation-${index + 1}` }))),
    blockingRecords: Object.freeze([]),
    applyable: true,
  });
}

function fixtures(role: Parameters<typeof membershipV1>[0] = "super_manager", owner = true) {
  return {
    ...(owner ? { [`systemOwners/${FIXTURE_UID}`]: ownerV1() } : {}),
    [`workspaces/${FIXTURE_WORKSPACE}`]: { workspaceId: FIXTURE_WORKSPACE, status: "active" },
    [`workspaces/${FIXTURE_WORKSPACE}/members/${FIXTURE_UID}`]: membershipV1(role),
  };
}

function proposal(targetId: string, sourceFingerprint: string, extra: Partial<MigrationCanonicalProposal> = {}): MigrationCanonicalProposal {
  return Object.freeze({ workspaceId: FIXTURE_WORKSPACE, targetId, sourceFingerprint, ...extra });
}

function code(expected: string) {
  return (error: unknown) => error instanceof OperationError && error.code === expected;
}

test("C2G1-A2 applies a planned migration create atomically and replays across migration run IDs", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  const journal = new InMemoryMigrationRehearsalJournal();
  const adapter = createMigrationRehearsalApplyAdapter({ runner, journal });
  const currentPlan = plan([{ entityType: "student", targetId: "student-m1", sourceFingerprint: "source-student-1" }]);
  const command = adapter.createCommand(currentPlan, "operation-1", "student", proposal("student-m1", "source-student-1", { metadata: { displayName: "Migration Student" } }));
  const first = await adapter.apply(fixtureActor(), command, "run-one");
  const second = await adapter.apply(fixtureActor(), command, "run-two");
  assert.equal(first.state, "CREATED");
  assert.equal(second.state, "REPLAYED");
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(runner.store.get(`workspaces/${FIXTURE_WORKSPACE}/studentRegistry/student-m1`)?.source, "migration");
  assert.equal(runner.store.get(`workspaces/${FIXTURE_WORKSPACE}/studentRegistry/student-m1`)?.version, 1);
  assert.equal([...runner.store.keys()].filter((path) => path.startsWith("securityAuditLogs/")).length, 1);
  assert.equal([...runner.store.keys()].filter((path) => path.startsWith("trustedOperationIdempotency/")).length, 1);
  assert.equal(journal.get(currentPlan.planId, "operation-1")?.createdByPlan, true);
});

test("C2G1-A2 rejects unplanned targets and denied actors before target creation", async () => {
  const currentPlan = plan([{ entityType: "class", targetId: "class-m1", sourceFingerprint: "source-class-1" }]);
  const allowed = createMigrationRehearsalApplyAdapter({ runner: new MemoryTransactionRunner(fixtures()) });
  assert.throws(() => allowed.createCommand(currentPlan, "operation-1", "class", proposal("class-other", "source-class-1", { metadata: { displayName: "Other" } })), /INVALID_ARGUMENT/);
  const deniedRunner = new MemoryTransactionRunner(fixtures("teacher", false));
  const denied = createMigrationRehearsalApplyAdapter({ runner: deniedRunner });
  const command = denied.createCommand(currentPlan, "operation-1", "class", proposal("class-m1", "source-class-1", { metadata: { displayName: "Class" } }));
  await assert.rejects(denied.apply(fixtureActor(), command, "run-one"), code("FORBIDDEN"));
  assert.equal(deniedRunner.writes.length, 0);
});

test("C2G1-A2 reuses exact workspace role policy and rejects cross-workspace authority", async () => {
  const currentPlan = plan([{ entityType: "student", targetId: "student-role", sourceFingerprint: "source-role" }]);
  for (const role of ["manager", "teacher", "normal", "viewer", "print_account"] as const) {
    const runner = new MemoryTransactionRunner(fixtures(role, false));
    const adapter = createMigrationRehearsalApplyAdapter({ runner });
    const command = adapter.createCommand(currentPlan, "operation-1", "student", proposal("student-role", "source-role"));
    await assert.rejects(adapter.apply(fixtureActor(), command, `run-${role}`), code("FORBIDDEN"));
    assert.equal(runner.writes.length, 0);
  }
  const crossWorkspaceRunner = new MemoryTransactionRunner(fixtures("super_manager", false));
  const crossWorkspace = createMigrationRehearsalApplyAdapter({ runner: crossWorkspaceRunner });
  assert.throws(() => crossWorkspace.createCommand(currentPlan, "operation-1", "student", proposal("student-role", "source-role", { workspaceId: "other-workspace" })), /INVALID_ARGUMENT/);
  assert.equal(crossWorkspaceRunner.writes.length, 0);
});

test("C2G1-A2 distinguishes equivalent canonical targets from conflicts without overwrite", async () => {
  const currentPlan = plan([{ entityType: "subject", targetId: "subject-m1", sourceFingerprint: "source-subject-1" }]);
  const existing = { schemaVersion: 1, version: 1, workspaceId: FIXTURE_WORKSPACE, subjectId: "subject-m1", status: "active", source: "migration", createdAt: 1, updatedAt: 1, createdBy: "someone", displayName: "Science" };
  const runner = new MemoryTransactionRunner({ ...fixtures(), [`workspaces/${FIXTURE_WORKSPACE}/subjectRegistry/subject-m1`]: existing });
  const adapter = createMigrationRehearsalApplyAdapter({ runner });
  const command = adapter.createCommand(currentPlan, "operation-1", "subject", proposal("subject-m1", "source-subject-1", { metadata: { displayName: "Science" } }));
  assert.equal((await adapter.apply(fixtureActor(), command, "run-one")).state, "ALREADY_CANONICAL");
  assert.equal(runner.writes.length, 0);
  const conflictRunner = new MemoryTransactionRunner({ ...fixtures(), [`workspaces/${FIXTURE_WORKSPACE}/subjectRegistry/subject-m1`]: { ...existing, displayName: "Different" } });
  const conflict = createMigrationRehearsalApplyAdapter({ runner: conflictRunner });
  const conflictCommand = conflict.createCommand(currentPlan, "operation-1", "subject", proposal("subject-m1", "source-subject-1", { metadata: { displayName: "Science" } }));
  await assert.rejects(conflict.apply(fixtureActor(), conflictCommand, "run-one"), code("CONFLICT"));
  assert.equal(conflictRunner.writes.length, 0);
});

test("C2G1-A2 stops a plan on failure and resumes deterministic completed operations", async () => {
  const runner = new MemoryTransactionRunner(fixtures());
  const adapter = createMigrationRehearsalApplyAdapter({ runner });
  const currentPlan = plan([
    { entityType: "student", targetId: "student-m2", sourceFingerprint: "source-student-2" },
    { entityType: "class", targetId: "class-m2", sourceFingerprint: "source-class-2" },
    { entityType: "subject", targetId: "subject-m2", sourceFingerprint: "source-subject-2" },
  ]);
  const student = adapter.createCommand(currentPlan, "operation-1", "student", proposal("student-m2", "source-student-2"));
  const invalidClass = adapter.createCommand(currentPlan, "operation-2", "class", proposal("class-m2", "source-class-2"));
  const subject = adapter.createCommand(currentPlan, "operation-3", "subject", proposal("subject-m2", "source-subject-2", { metadata: { displayName: "Subject" } }));
  const stopped = await adapter.applyPlan(fixtureActor(), [student, invalidClass, subject], "run-one");
  assert.equal(stopped.state, "STOPPED_PARTIAL");
  assert.equal(stopped.completed.length, 1);
  assert.equal(runner.store.has(`workspaces/${FIXTURE_WORKSPACE}/subjectRegistry/subject-m2`), false);
  const validClass = adapter.createCommand(currentPlan, "operation-2", "class", proposal("class-m2", "source-class-2", { metadata: { displayName: "Class" } }));
  const resumed = await adapter.applyPlan(fixtureActor(), [student, validClass, subject], "run-two");
  assert.equal(resumed.state, "COMPLETED");
  assert.equal(resumed.completed[0]?.state, "REPLAYED");
  assert.equal(runner.store.has(`workspaces/${FIXTURE_WORKSPACE}/subjectRegistry/subject-m2`), true);
});

test("C2G1-A2 retains C2G stale-plan checks without binding a Firestore runner", () => {
  const input = Object.freeze({ classifierVersion: CANONICAL_MIGRATION_CLASSIFIER_VERSION, classMappings: [], subjectMappings: [], students: [{ sourceKind: "operational_student", workspaceId: FIXTURE_WORKSPACE, sourceId: "student-s", sourceStudentId: "student-s" }], classes: [], subjects: [], enrollments: [] });
  const currentPlan = buildMigrationPlan(createCanonicalMigrationPreview(input));
  const adapter = createMigrationRehearsalApplyAdapter({ runner: new MemoryTransactionRunner(fixtures()) });
  adapter.assertCurrentPlan(currentPlan, input);
  assert.throws(() => adapter.assertCurrentPlan(currentPlan, { ...input, students: [{ sourceKind: "operational_student", workspaceId: FIXTURE_WORKSPACE, sourceId: "student-s", sourceStudentId: "student-changed" }] }), /STALE_PLAN/);
});
