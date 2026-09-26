import assert from "node:assert/strict";
import { OLD_WRITER_CONTAINMENT_EXECUTION, verifyOldWriterContainmentExecution } from "../authority-audit/oldWriterContainmentEvidence.mjs";

assert.equal(verifyOldWriterContainmentExecution(OLD_WRITER_CONTAINMENT_EXECUTION).ok, true);
for (const [field, value] of [["poststateResult", "ENABLED"], ["disableMutationAttemptUsed", 2], ["retryCount", 1], ["historicalM3StatePreserved", "RESOLVED"]]) {
  assert.equal(verifyOldWriterContainmentExecution({ ...OLD_WRITER_CONTAINMENT_EXECUTION, [field]: value }).ok, false, field);
}
assert.equal(verifyOldWriterContainmentExecution({
  ...OLD_WRITER_CONTAINMENT_EXECUTION,
  forbiddenOperationCounts: { ...OLD_WRITER_CONTAINMENT_EXECUTION.forbiddenOperationCounts, m3: 1 },
}).ok, false);
console.log("old writer containment evidence verifier passed; additional remote operations=0");
