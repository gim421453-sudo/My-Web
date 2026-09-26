import assert from "node:assert/strict";
import {
  REPLACEMENT_WRITER_G2B_CREATE_EXECUTION,
  verifyReplacementWriterG2BCreateExecution,
} from "../authority-audit/replacementWriterG2BCreateExecutionEvidence.mjs";

assert.equal(verifyReplacementWriterG2BCreateExecution(REPLACEMENT_WRITER_G2B_CREATE_EXECUTION).ok, true);
for (const [field, value] of [["freshPrecreateReadUsed", 2], ["createMutationAttemptUsed", 2], ["postcreateResult", "ABSENT"], ["secondCreateUsed", 1], ["rollbackCount", 1]]) {
  assert.equal(verifyReplacementWriterG2BCreateExecution({ ...REPLACEMENT_WRITER_G2B_CREATE_EXECUTION, [field]: value }).ok, false, field);
}
assert.equal(verifyReplacementWriterG2BCreateExecution({
  ...REPLACEMENT_WRITER_G2B_CREATE_EXECUTION,
  forbiddenOperationCounts: { ...REPLACEMENT_WRITER_G2B_CREATE_EXECUTION.forbiddenOperationCounts, m3: 1 },
}).ok, false);
console.log("G2B create execution evidence matrix passed; remote operations=0");
