import assert from "node:assert/strict";
import {
  classifyM3MutationOutcome,
  M3_CONFIRMED_FAILURE_RULES,
  M3_MUTATION_OUTCOME_DOMAIN,
  projectSafeMutationDiagnostic,
} from "../authority-audit/m3RuntimeCommandGraph.mjs";

const startedNonzero = (stderr = "ERROR: generic") => ({
  mutationCommandStarted: true,
  result: { exitCode: 1, timedOut: false, stderr },
});

assert.deepEqual(M3_MUTATION_OUTCOME_DOMAIN, [
  "NOT_ATTEMPTED", "CONFIRMED_SUCCESS", "CONFIRMED_FAILURE", "INDETERMINATE",
]);
assert.deepEqual(M3_CONFIRMED_FAILURE_RULES, []);
assert.equal(classifyM3MutationOutcome(startedNonzero()).toString(), "INDETERMINATE");
assert.equal(classifyM3MutationOutcome({ ...startedNonzero("ERROR: generic"), remoteNonApplicationProven: true }), "INDETERMINATE");
assert.equal(classifyM3MutationOutcome({ mutationCommandStarted: true, result: { exitCode: null, timedOut: true } }), "INDETERMINATE");
assert.equal(classifyM3MutationOutcome({ mutationCommandStarted: true, result: { exitCode: 17, timedOut: false } }), "INDETERMINATE");
assert.equal(classifyM3MutationOutcome({ mutationCommandStarted: true, result: null }), "INDETERMINATE");
assert.equal(classifyM3MutationOutcome({ mutationCommandStarted: false, result: { exitCode: 1 } }), "NOT_ATTEMPTED");
assert.equal(classifyM3MutationOutcome({
  mutationCommandStarted: true,
  result: { exitCode: 0, timedOut: false },
  normalResponseCompleted: true,
}), "CONFIRMED_SUCCESS");

for (const fixture of [
  startedNonzero("ERROR: permission denied"),
  startedNonzero("unexpected local wrapper error"),
  { mutationCommandStarted: true, result: { exitCode: 1, timedOut: false, stderr: "" } },
  { mutationCommandStarted: true, result: { exitCode: null, timedOut: true, stderr: "" } },
  { mutationCommandStarted: true, result: { exitCode: 1, timedOut: false, stderr: "post-response local failure" } },
]) {
  assert.notEqual(classifyM3MutationOutcome(fixture), "CONFIRMED_FAILURE");
  const diagnostic = projectSafeMutationDiagnostic(fixture.result, "CONFIRMED_FAILURE");
  assert.notEqual(diagnostic.mutationOutcome, "CONFIRMED_FAILURE");
}

assert.equal(projectSafeMutationDiagnostic({ exitCode: 1, timedOut: false, stderr: "ERROR: generic" }, "CONFIRMED_FAILURE").mutationOutcome, "INDETERMINATE");
assert.equal(projectSafeMutationDiagnostic(null, "CONFIRMED_FAILURE", { mutationCommandStarted: false }).mutationOutcome, "NOT_ATTEMPTED");
assert.equal(JSON.stringify(projectSafeMutationDiagnostic({ exitCode: 1, timedOut: false, stderr: "secret@example.com token=hidden" }, "CONFIRMED_FAILURE")).includes("secret@example.com"), false);

console.log("G4 fail-closed M3 mutation outcome classifier tests passed; live execution=0");
