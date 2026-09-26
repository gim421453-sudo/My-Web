import assert from "node:assert/strict";
import {
  buildG2BV3ExactPermissionExecutionEvidence,
  buildG2BV3ExactPermissionResultDocument,
  verifyG2BV3ExactPermissionResultArtifacts,
} from "../authority-audit/g2bV3ExactPermissionResultEvidence.mjs";

const executionEvidence = buildG2BV3ExactPermissionExecutionEvidence();
const resultDocument = buildG2BV3ExactPermissionResultDocument(executionEvidence);
assert.equal(verifyG2BV3ExactPermissionResultArtifacts({ executionEvidence, resultDocument }).ok, true);
assert.equal(executionEvidence.testIamPermissionsCallsUsed, 1);
assert.equal(executionEvidence.forbiddenOperationCounts.iamMutations, 0);
assert.equal(executionEvidence.privacy.rawCredentialOutput, false);
assert.equal(resultDocument.result, "PERMISSION_PRESENT_CONFIRMED");

const tampered = structuredClone(executionEvidence);
tampered.forbiddenOperationCounts.retries = 1;
assert.equal(verifyG2BV3ExactPermissionResultArtifacts({ executionEvidence: tampered, resultDocument }).ok, false);

console.log("G2B V3 exact permission result evidence passed; additional remote operations=0");
