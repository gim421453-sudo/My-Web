import assert from "node:assert/strict";
import {
  canonicalizeR1B4RecoveryEvidence,
  computeR1B4RecoveryEvidenceSha256,
  parseR1B4RecoveryEvidence,
  R1B4_RECOVERY_EVIDENCE_CONTRACT,
  verifyR1B4RecoveryEvidence,
} from "../authority-audit/r1b4RecoveryEvidence.mjs";

const sha = (char) => char.repeat(64);
const evidence = () => ({
  schema: "myweb.m3l2.r1b4.helper-v2-locked-recovery-evidence.v1",
  r1b3hAttestationSha256: sha("a"), r1b3hResultDocumentSha256: sha("b"), r1c1CompositeSha256: sha("c"),
  logicalProjectIdentity: "LOCKED_PROJECT_ID",
  logicalWriterServiceAccountIdentity: "LOCKED_WRITER_SERVICE_ACCOUNT",
  targetRole: "roles/iam.serviceAccountTokenCreator",
  readSurface: { identity: "EXISTING_LOCKED_OP_C_SURFACE", argvLock: "MATCH", externalCapabilityLock: "MATCH", sdkPathContainment: "PASS" },
  read: { count: 1, retryCount: 0, exitCode: 0, timedOut: false },
  parser: { strictStatus: "PASS" },
  helper: { executionStatus: "PASS", result: "ABSENT_PROVEN", reasonId: "COMPLETE_ETAG_ONLY_ZERO_BINDINGS" },
  recovery: { identityIndependentState: "ABSENT_PROVEN", currentM3EffectiveState: "ABSENT_PROVEN" },
  counters: { cloudLoggingReads: 0, callerDiscoveryCalls: 0, projectIamReads: 0, testIamPermissionsCalls: 0, iamMutations: 0, m3Mutations: 0, m4Mutations: 0, accessTokenCalls: 0, firestoreCalls: 0, classWrites: 0 },
  approval: { consumed: true, reusable: false },
  safety: { canReturnPresentProven: false, memberValueInspectionUsed: false, fingerprintFallbackUsed: false, currentM3OutcomeClassifierSafety: "DEFECT_PROVEN", m3l2ApprovalReusable: false, m3l2MutationBudget: "EXHAUSTED", m3l2RetryAllowed: false, m4Readiness: "BLOCKED_M3_REQUIRED_BINDING_ABSENT", m4Approval: "NOT_GRANTED", liveBudgetViolation: false },
});

const base = evidence();
assert.equal(verifyR1B4RecoveryEvidence(base).ok, true);
assert.equal(parseR1B4RecoveryEvidence(JSON.stringify(base))?.schema, base.schema);
const reordered = { ...base, read: { timedOut: false, exitCode: 0, retryCount: 0, count: 1 } };
assert.equal(computeR1B4RecoveryEvidenceSha256(base), computeR1B4RecoveryEvidenceSha256(reordered));
assert.notEqual(computeR1B4RecoveryEvidenceSha256(base), computeR1B4RecoveryEvidenceSha256({ ...base, read: { ...base.read, count: 2 } }));
assert.notEqual(computeR1B4RecoveryEvidenceSha256(base), computeR1B4RecoveryEvidenceSha256({ ...base, helper: { ...base.helper, reasonId: "COMPLETE_NO_TARGET_ROLE" } }));
assert.equal(parseR1B4RecoveryEvidence(JSON.stringify({ ...base, timestamp: "now" })), null);
assert.equal(parseR1B4RecoveryEvidence(JSON.stringify({ ...base, rawPolicy: "forbidden" })), null);
assert.equal(verifyR1B4RecoveryEvidence({ ...base, counters: { ...base.counters, iamMutations: 1 } }).ok, false);
assert.equal(R1B4_RECOVERY_EVIDENCE_CONTRACT.networkAccess, false);
assert.equal(R1B4_RECOVERY_EVIDENCE_CONTRACT.rawIamMaterialPersisted, false);
assert.equal(canonicalizeR1B4RecoveryEvidence(base).includes("forbidden"), false);

console.log("R1B4 bounded recovery evidence reproducibility tests passed; live read=1");
