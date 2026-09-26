import assert from "node:assert/strict";
import test from "node:test";
import { CANONICAL_MIGRATION_CLASSIFIER_VERSION, createCanonicalMigrationPreview } from "../src/migrations/canonicalMigrationClassifier.js";

const workspaceId = "fixture_workspace";
const mappings = {
  classMappings: [{ workspaceId, legacyRef: "grade-1-class-1", canonicalId: "class_fixture_a" }],
  subjectMappings: [{ workspaceId, legacyRef: "legacy-math", canonicalId: "subject_math" }],
};
function input(extra: Record<string, unknown> = {}) {
  return { classifierVersion: CANONICAL_MIGRATION_CLASSIFIER_VERSION, ...mappings, students: [], classes: [], subjects: [], enrollments: [], ...extra };
}
function classifications(preview: ReturnType<typeof createCanonicalMigrationPreview>) { return preview.records.map((item) => item.classification); }

test("C2F produces safe deterministic canonical proposals from exact operational evidence", () => {
  const preview = createCanonicalMigrationPreview(input({
    students: [{ sourceKind: "operational_student", workspaceId, sourceStudentId: "student_a", sourceId: "row-a", displayName: "Synthetic Student", studentNumber: "1" }],
    classes: [{ sourceKind: "operational_class_ref", workspaceId, sourceClassRef: "grade-1-class-1", sourceId: "class-row" }],
    subjects: [{ sourceKind: "operational_subject", workspaceId, sourceId: "subject_math", subjectName: "Math" }, { sourceKind: "legacy_subject", workspaceId, sourceSubjectRef: "legacy-math", sourceId: "subject-legacy" }],
    enrollments: [{ sourceKind: "operational_enrollment", workspaceId, sourceStudentId: "student_a", sourceClassRef: "grade-1-class-1", sourceSubjectRefs: ["subject_math"] }],
  }));
  assert.deepEqual(classifications(preview), Array(5).fill("SAFE_TO_CANONICALIZE"));
  assert.equal(preview.records.some((item) => JSON.stringify(item).includes("Synthetic Student")), false);
  assert.equal(preview.records.some((item) => item.proposedDestination === "studentEnrollments/student_a"), true);
  assert.equal(preview.summary.safeEnrollments, 1);
  assert.equal(preview.summary.fallbackDependencies, 1);
});

test("C2F denies fallback identity, fuzzy-looking values, duplicates, malformed and unknown sources", () => {
  const preview = createCanonicalMigrationPreview(input({
    students: [
      { sourceKind: "people_fallback", workspaceId, sourceId: "person-a", displayName: "Name Only" },
      { sourceKind: "operational_student", workspaceId, sourceStudentId: "student_duplicate", sourceId: "row-a" },
      { sourceKind: "operational_student", workspaceId, sourceStudentId: "student_duplicate", sourceId: "row-b" },
      { sourceKind: "operational_student", workspaceId, sourceStudentId: "bad/id", sourceId: "row-c" },
      { sourceKind: "unexpected", workspaceId, sourceStudentId: "student_unknown", sourceId: "row-d" },
    ],
    classes: [{ sourceKind: "operational_class_ref", workspaceId, sourceClassRef: "grade 1 class 1", sourceId: "class-unmapped" }, { sourceKind: "operational_class_ref", workspaceId, sourceClassRef: "grade-1-class-1", sourceId: "class-cross", declaredWorkspaceId: "other_workspace" }],
  }));
  const seen = new Set(classifications(preview));
  for (const expected of ["MISSING_STUDENT_ID", "DUPLICATE_STUDENT", "MALFORMED", "UNKNOWN_SOURCE", "MISSING_CLASS_ID", "CROSS_WORKSPACE"]) assert.equal(seen.has(expected as never), true);
});

test("C2F requires exact reviewed mappings and treats conflicting maps as conflicts", () => {
  const preview = createCanonicalMigrationPreview(input({
    classMappings: [{ workspaceId, legacyRef: "same", canonicalId: "class_a" }, { workspaceId, legacyRef: "same", canonicalId: "class_b" }],
    classes: [{ sourceKind: "operational_class_ref", workspaceId, sourceClassRef: "same", sourceId: "class-row" }],
    subjects: [{ sourceKind: "legacy_subject", workspaceId, sourceSubjectRef: "legacy-MATH", sourceId: "subject-row" }],
  }));
  assert.equal(classifications(preview).includes("CONFLICTING_CLASS"), true);
  assert.equal(classifications(preview).includes("INVALID_SUBJECT_ID"), true);
});

test("C2F classifies enrollment atomically and never silently deduplicates mapped subjects", () => {
  const base = { students: [{ sourceKind: "operational_student", workspaceId, sourceStudentId: "student_a", sourceId: "row-a" }], subjects: [{ sourceKind: "operational_subject", workspaceId, sourceId: "subject_math" }] };
  const preview = createCanonicalMigrationPreview(input({ ...base, enrollments: [
    { sourceKind: "operational_enrollment", workspaceId, sourceStudentId: "student_a", sourceClassRef: "grade-1-class-1", sourceSubjectRefs: ["subject_math", "subject_math"] },
    { sourceKind: "operational_enrollment", workspaceId, sourceStudentId: "student_a", sourceClassRef: "missing-class", sourceSubjectRefs: ["subject_math"] },
    { sourceKind: "operational_enrollment", workspaceId, sourceStudentId: "student_a", sourceClassRef: "grade-1-class-1", sourceSubjectRefs: ["missing-subject"] },
  ] }));
  const enrollments = preview.records.filter((item) => item.proposedEntityType === "enrollment");
  assert.deepEqual(enrollments.map((item) => item.classification).sort(), ["CONFLICTING_SUBJECTS", "INVALID_SUBJECT_ID", "MISSING_CLASS_ID"]);
  assert.equal(enrollments.some((item) => item.proposedDestination !== null), false);
});

test("C2F blocks cross-workspace sources and duplicate current enrollment identity", () => {
  const preview = createCanonicalMigrationPreview(input({
    students: [
      { sourceKind: "operational_student", workspaceId, sourceStudentId: "student_a", sourceId: "student-row-a" },
      { sourceKind: "operational_student", workspaceId, sourceStudentId: "student_a", sourceId: "student-row-b" },
    ],
    subjects: [{ sourceKind: "operational_subject", workspaceId, sourceId: "subject_math", declaredWorkspaceId: "other_workspace" }],
    enrollments: [{ sourceKind: "operational_enrollment", workspaceId, sourceStudentId: "student_a", sourceClassRef: "grade-1-class-1", sourceSubjectRefs: ["subject_math"] }],
  }));
  assert.equal(preview.records.some((item) => item.proposedEntityType === "subject" && item.classification === "CROSS_WORKSPACE"), true);
  assert.equal(preview.records.some((item) => item.proposedEntityType === "enrollment" && item.classification === "DUPLICATE_STUDENT"), true);
});

test("C2F preview and mapping fingerprints are independent of input order and object insertion order", () => {
  const first = input({ students: [{ sourceKind: "operational_student", workspaceId, sourceStudentId: "student_b", sourceId: "b" }, { sourceKind: "operational_student", workspaceId, sourceStudentId: "student_a", sourceId: "a" }], classes: [{ sourceKind: "operational_class_ref", workspaceId, sourceClassRef: "grade-1-class-1", sourceId: "c" }] });
  const second = input({ students: [...(first.students as unknown[])].reverse(), classes: [...(first.classes as unknown[])].reverse(), classMappings: [...mappings.classMappings].reverse() });
  assert.deepEqual(createCanonicalMigrationPreview(first), createCanonicalMigrationPreview(second));
});

test("C2F recognizes explicit already-canonical input without duplicate creation", () => {
  const preview = createCanonicalMigrationPreview(input({ students: [{ sourceKind: "already_canonical", workspaceId, sourceStudentId: "student_a", sourceId: "canonical-a", alreadyCanonical: true }] }));
  assert.equal(preview.records[0]?.classification, "ALREADY_CANONICAL");
  assert.equal(preview.records[0]?.proposedDestination, null);
});
