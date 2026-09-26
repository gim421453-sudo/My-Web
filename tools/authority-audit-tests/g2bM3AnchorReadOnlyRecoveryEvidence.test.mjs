import assert from "node:assert/strict";
import { buildG2BM3AnchorRecoveryEvidence, sha256RecoveryEvidence } from "../authority-audit/g2bM3AnchorReadOnlyRecoveryEvidence.mjs";

const evidence = buildG2BM3AnchorRecoveryEvidence();
assert.equal(evidence.recoveryResult, "MEMBER_ABSENT_CONFIRMED");
assert.equal(evidence.currentM3State, "CONFIRMED_ABSENT_AFTER_INDETERMINATE_MUTATION");
assert.equal(evidence.physicalPolicyReadsUsed, 1);
assert.equal(evidence.forbiddenOperationCounts.mutations, 0);
assert.equal(evidence.forbiddenOperationCounts.m4Mutations, 0);
assert.equal(evidence.privacy.rawMemberPersisted, false);
assert.equal(sha256RecoveryEvidence(evidence), sha256RecoveryEvidence(buildG2BM3AnchorRecoveryEvidence()));
console.log("G2B anchor recovery evidence verifier passed; canonical evidence is deterministic and privacy-safe");
