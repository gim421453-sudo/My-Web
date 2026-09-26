import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_BOOTSTRAP_INPUT_SCHEMA_VERSION,
  assertBootstrapPlanMatchesInput,
  planCanonicalBootstrapDryRun,
} from "../src/migrations/canonicalBootstrapDryRun.js";

const planId = "a".repeat(64);
function input(extra: Record<string, unknown> = {}) {
  return {
    schemaVersion: CANONICAL_BOOTSTRAP_INPUT_SCHEMA_VERSION,
    workspaceId: "fixture_workspace",
    planId,
    sourceKind: "manual_verified_entry",
    classes: [{ classId: "class_a", displayName: "Class A", status: "active" }],
    enrollments: [{ studentId: "student_a", classId: "class_a", subjectIds: ["subject_b", "subject_a"], status: "active" }],
    prerequisiteSnapshot: { studentIds: ["student_a"], subjectIds: ["subject_a", "subject_b"] },
    ...extra,
  };
}

test("E1 creates a deterministic zero-persistence Class and Enrollment dry-run", () => {
  const result = planCanonicalBootstrapDryRun(input());
  assert.equal(result.status, "READY_FOR_APPROVAL");
  assert.equal(result.intents.length, 2);
  assert.equal(result.firestoreReadCalls + result.firestoreWriteCalls + result.persistenceCalls, 0);
  assert.equal(result.intents[0]?.entityType, "class");
  const enrollmentIntent = result.intents[1];
  assert.ok(enrollmentIntent && enrollmentIntent.entityType === "enrollment");
  assert.equal(enrollmentIntent.payload.subjectIds instanceof Array, true);
  assert.deepEqual(enrollmentIntent.payload.subjectIds, ["subject_a", "subject_b"]);
  assert.equal(result.manifest.workspaceId, result.input?.workspaceId);
});

test("E2AF binds the validated workspace directly in the in-memory manifest without changing identity contracts", () => {
  const synthetic = {
    schemaVersion: CANONICAL_BOOTSTRAP_INPUT_SCHEMA_VERSION,
    workspaceId: "workspace_synthetic_contract_e2a_v1",
    planId: "81c06dcbe154d76a0b6ab53a8b5a853b73dfec1285c78ef003bffd966de19b87",
    sourceKind: "manual_verified_entry",
    classes: [{ classId: "class_test_e2a", displayName: "Synthetic E2A Class", status: "active" }],
    enrollments: [{ studentId: "student_test_e2a", classId: "class_test_e2a", subjectIds: ["subject_test_e2a"], status: "active" }],
    prerequisiteSnapshot: { studentIds: ["student_test_e2a"], subjectIds: ["subject_test_e2a"] },
  };
  const result = planCanonicalBootstrapDryRun(synthetic);
  assert.equal(result.status, "READY_FOR_APPROVAL");
  assert.equal(result.manifest.workspaceId, synthetic.workspaceId);
  assert.equal(result.manifest.workspaceId, result.input?.workspaceId);
  assert.equal(result.sourceFingerprint, "sha256-c14n-v1:6b42c710e50a6ec55d96795bdc98ef69a0666c1dc052d64c3754dfa655b11757");
  assert.equal(result.manifest.casExpectation, "CAS_EXPECTATION_UNRESOLVED");
  assert.equal(result.intents.length, 2);
});

test("E1 rejects invalid and duplicate Class input without producing an executable plan", () => {
  const missing = planCanonicalBootstrapDryRun(input({ classes: [{ classId: "", displayName: "", status: "active" }] }));
  assert.equal(missing.status, "INVALID_INPUT");
  assert.equal(missing.intents.length, 0);
  const duplicate = planCanonicalBootstrapDryRun(input({ classes: [input().classes[0], input().classes[0]] }));
  assert.equal(duplicate.status, "CONFLICTED");
  assert.equal(duplicate.issues.some((entry) => entry.code === "DUPLICATE_CLASS_INPUT"), true);
  assert.equal(duplicate.intents.length, 0);
});

test("E1 blocks duplicate Enrollment and unavailable prerequisite references", () => {
  const duplicate = planCanonicalBootstrapDryRun(input({ enrollments: [input().enrollments[0], input().enrollments[0]] }));
  assert.equal(duplicate.status, "CONFLICTED");
  assert.equal(duplicate.issues.some((entry) => entry.code === "DUPLICATE_ENROLLMENT_INPUT"), true);
  const missing = planCanonicalBootstrapDryRun(input({ prerequisiteSnapshot: { studentIds: [], subjectIds: [] } }));
  assert.equal(missing.status, "REFERENTIAL_BLOCKED");
  assert.equal(missing.issues.every((entry) => entry.code === "REFERENTIAL_BLOCKED"), true);
  assert.equal(missing.intents.length, 0);
});

test("E1 fingerprint ignores record order but changes with meaningful normalized input", () => {
  const first = planCanonicalBootstrapDryRun(input({
    classes: [{ classId: "class_b", displayName: "Class B", status: "active" }, input().classes[0]],
    enrollments: [input().enrollments[0]],
  }));
  const second = planCanonicalBootstrapDryRun(input({
    classes: [input().classes[0], { classId: "class_b", displayName: "Class B", status: "active" }],
    enrollments: [{ ...input().enrollments[0], subjectIds: ["subject_a", "subject_b"] }],
  }));
  assert.equal(first.sourceFingerprint, second.sourceFingerprint);
  const changed = planCanonicalBootstrapDryRun(input({ classes: [{ classId: "class_a", displayName: "Changed", status: "active" }] }));
  assert.notEqual(first.sourceFingerprint, changed.sourceFingerprint);
});

test("E1 is locale independent and requires reapproval for changed input or plan", () => {
  const first = planCanonicalBootstrapDryRun(input({ classes: [{ classId: "class_ko", displayName: "가나다", status: "active" }], enrollments: [] }));
  const second = planCanonicalBootstrapDryRun(input({ classes: [{ classId: "class_ko", displayName: "가나다", status: "active" }], enrollments: [] }));
  assert.equal(first.sourceFingerprint, second.sourceFingerprint);
  assert.doesNotThrow(() => assertBootstrapPlanMatchesInput({ sourceFingerprint: first.sourceFingerprint!, provenance: first.provenance! }, input({ classes: [{ classId: "class_ko", displayName: "가나다", status: "active" }], enrollments: [] })));
  assert.throws(() => assertBootstrapPlanMatchesInput({ sourceFingerprint: first.sourceFingerprint!, provenance: first.provenance! }, input({ classes: [{ classId: "class_ko", displayName: "다라마바사", status: "active" }], enrollments: [] })), /PLAN_REAPPROVAL_REQUIRED/);
  const changedPlan = planCanonicalBootstrapDryRun(input({ planId: "b".repeat(64), classes: [{ classId: "class_ko", displayName: "가나다", status: "active" }], enrollments: [] }));
  assert.notEqual(changedPlan.provenance?.bootstrapBatchId, first.provenance?.bootstrapBatchId);
});

test("E1 rejects raw path-shaped adapter fields and keeps old canonical parsers outside the new input contract", () => {
  const result = planCanonicalBootstrapDryRun(input({ sourcePath: ["C:", "Users", "operator", "input.csv"].join("\\") }));
  assert.equal(result.status, "SCHEMA_UNSUPPORTED");
  assert.equal(JSON.stringify(result).includes("sourcePath"), false);
});
