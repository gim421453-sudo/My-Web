import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildSourceLockedRecoveryResultArtifacts,
  verifySourceLockedRecoveryResultArtifacts,
} from "../authority-audit/g2bM3SourceLockedRecoveryResult.mjs";

const artifacts = buildSourceLockedRecoveryResultArtifacts();
assert.equal(verifySourceLockedRecoveryResultArtifacts(artifacts).ok, true);
assert.equal(artifacts.executionEvidence.recoveryResult, "MEMBER_ABSENT_CONFIRMED");
assert.equal(artifacts.executionEvidence.physicalRemotePolicyReadsUsed, 1);
assert.equal(artifacts.executionEvidence.forbiddenOperationCounts.mutations, 0);
assert.equal(artifacts.executionEvidence.terminalAnchorState, "RECOVERY_CONFIRMED_ABSENT");
assert.equal(artifacts.result.anotherM3MutationAllowed, false);
assert.equal(artifacts.result.newM3GenerationAllowed, false);
assert.equal(artifacts.result.m4Allowed, false);
assert.equal(artifacts.diagnostic.rootCauseResult, "EXACT_PROVIDER_PROCESS_FAILURE_NOT_ESTABLISHED_FROM_PERSISTED_EVIDENCE");
assert.equal(artifacts.diagnosticApprovalPacket.testIamPermissionsCallsMax, 1);
assert.equal(artifacts.diagnosticApprovalPacket.mutationsMax, 0);
assert.equal(artifacts.diagnosticApprovalPacket.safeToContinueWithoutApproval, false);
assert.equal(artifacts.sourceLockEvidence.activeDependencies.length, 5);
assert.equal(artifacts.privacyEvidence.rawMemberPersisted, false);

const persisted = {
  executionEvidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-source-locked-recovery-execution-v1.json",
  result: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-source-locked-recovery-result-v1.json",
  anchorEvidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-source-locked-recovery-anchor-v1.json",
  privacyEvidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-source-locked-recovery-privacy-v1.json",
  sourceLockEvidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-source-locked-recovery-source-lock-v1.json",
  diagnostic: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-provider-process-local-diagnostic-v1.json",
  diagnosticApprovalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-provider-process-diagnostic-approval-v1.json",
};
for (const [key, path] of Object.entries(persisted)) {
  assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), artifacts[key], path);
}

const changed = structuredClone(artifacts);
changed.executionEvidence.physicalRemotePolicyReadsUsed = 2;
assert.equal(verifySourceLockedRecoveryResultArtifacts(changed).ok, false);

console.log("G2B source-locked recovery result passed; absent confirmed; next diagnostic requires approval");
