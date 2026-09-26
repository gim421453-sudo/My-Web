import assert from "node:assert/strict";
import {
  REPLACEMENT_WRITER_G2B_PREFLIGHT_EXECUTION,
  verifyReplacementWriterG2BPreflightExecution,
} from "../authority-audit/replacementWriterG2BPreflightExecutionEvidence.mjs";

assert.equal(verifyReplacementWriterG2BPreflightExecution(REPLACEMENT_WRITER_G2B_PREFLIGHT_EXECUTION).ok, true);
for (const [field, value] of [["metadataReadUsed", 2], ["preflightResult", "READ_FAILURE"], ["retryCount", 1], ["g1FrozenGuard", false]]) {
  assert.equal(verifyReplacementWriterG2BPreflightExecution({ ...REPLACEMENT_WRITER_G2B_PREFLIGHT_EXECUTION, [field]: value }).ok, false, field);
}
assert.equal(verifyReplacementWriterG2BPreflightExecution({
  ...REPLACEMENT_WRITER_G2B_PREFLIGHT_EXECUTION,
  forbiddenOperationCounts: { ...REPLACEMENT_WRITER_G2B_PREFLIGHT_EXECUTION.forbiddenOperationCounts, serviceAccountCreate: 1 },
}).ok, false);
console.log("G2B preflight execution evidence matrix passed; remote operations=0");
