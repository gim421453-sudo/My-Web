import assert from "node:assert/strict";
import { REPLACEMENT_WRITER_CREATE_FAILURE_EXECUTION, verifyReplacementWriterCreateFailureEvidence } from "../authority-audit/replacementWriterCreateFailureEvidence.mjs";

assert.equal(verifyReplacementWriterCreateFailureEvidence(REPLACEMENT_WRITER_CREATE_FAILURE_EXECUTION).ok, true);
for (const [field, value] of [["createMutationAttemptUsed", 2], ["createOutcome", "INDETERMINATE"], ["postcreateReadUsed", 1], ["retryCount", 1], ["finalG2State", "CREATED"]]) {
  assert.equal(verifyReplacementWriterCreateFailureEvidence({ ...REPLACEMENT_WRITER_CREATE_FAILURE_EXECUTION, [field]: value }).ok, false, field);
}
console.log("replacement writer create failure evidence verifier passed; additional remote operations=0");
