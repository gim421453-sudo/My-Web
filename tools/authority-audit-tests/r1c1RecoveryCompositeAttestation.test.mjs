import assert from "node:assert/strict";
import {
  canonicalizeR1C1RecoveryComposite,
  computeR1C1RecoveryCompositeSha256,
  parseR1C1RecoveryComposite,
  R1C1_RECOVERY_COMPOSITE_CONTRACT,
  verifyR1C1RecoveryComposite,
} from "../authority-audit/r1c1RecoveryCompositeAttestation.mjs";

const sha = (char) => char.repeat(64);
const payload = () => ({
  schema: "myweb.m3l2.r1c1.recovery-composite.v1",
  legacyR1B1: { hash: sha("a"), status: "HISTORICAL_UNREPRODUCIBLE_REFERENCE", usedAsCurrentAuthority: false },
  sourceDocumentLocks: [
    { path: "docs/a.md", sha256: sha("b"), role: "SEMANTICS" },
    { path: "docs/b.md", sha256: sha("c"), role: "IMPLEMENTATION" },
  ],
  runtimeLocks: [{ path: "tools/a.mjs", sha256: sha("d"), role: "OP_C" }],
  helper: { path: "tools/helper.mjs", sha256: sha("e"), purity: "PASS" },
  helperTest: { path: "tools/helper.test.mjs", sha256: sha("f") },
  recoverySemantics: {
    resultDomain: ["ABSENT_PROVEN", "AMBIGUOUS"], failClosedDefault: "AMBIGUOUS",
    emptyObjectResult: "AMBIGUOUS", missingBindingsResult: "AMBIGUOUS",
    completeEmptyBindingsResult: "ABSENT_PROVEN", targetRole: "roles/iam.serviceAccountTokenCreator",
    targetRoleMatchMode: "EXACT_STRING", targetRolePresentResult: "AMBIGUOUS",
    memberInspectionRequired: false, fingerprintMatchingUsed: false, malformedDefaultsToAbsent: false,
    collapsedProjectionCanProveAbsence: false,
  },
  logicalProof: { zeroTargetRoleBindingsImpliesAbsent: true, nonzeroTargetRoleBindingsImpliesPresent: false },
  futureReadSurface: {
    identity: "EXISTING_LOCKED_OP_C_SURFACE", argvLockStatus: "MATCH",
    externalCapabilityLockStatus: "MATCH", sdkPathContainment: "PASS",
  },
  futureLiveBudget: {
    writerSaIamPolicyReadsMax: 1, cloudLoggingReadsMax: 0, activeCallerDiscoveryMax: 0,
    projectIamReadsMax: 0, testIamPermissionsMax: 0, iamMutationsMax: 0, m3MutationsMax: 0,
    m4MutationsMax: 0, accessTokenCallsMax: 0, firestoreCallsMax: 0, retriesMax: 0,
  },
  privacy: {
    rawCallerPersisted: false, rawIamPolicyPersisted: false, iamMemberIdentitiesPersisted: false,
    rawStdoutPersisted: false, rawStderrPersisted: false, etagValuePersisted: false,
    conditionExpressionPersisted: false, tokenPersisted: false,
  },
  currentSafetyState: {
    currentM3EffectiveState: "INDETERMINATE", currentM3OutcomeClassifierSafety: "DEFECT_PROVEN",
    m3l2ApprovalReusable: false, m3l2MutationBudget: "EXHAUSTED", m3l2RetryAllowed: false,
    m4Readiness: "BLOCKED", m4Approval: "NOT_GRANTED",
  },
});

const base = payload();
assert.equal(verifyR1C1RecoveryComposite(base).ok, true);
const reordered = { ...base, helperTest: { sha256: base.helperTest.sha256, path: base.helperTest.path } };
assert.equal(computeR1C1RecoveryCompositeSha256(base), computeR1C1RecoveryCompositeSha256(reordered));
assert.notEqual(computeR1C1RecoveryCompositeSha256(base), computeR1C1RecoveryCompositeSha256({ ...base, helper: { ...base.helper, sha256: sha("1") } }));
assert.notEqual(computeR1C1RecoveryCompositeSha256(base), computeR1C1RecoveryCompositeSha256({ ...base, futureLiveBudget: { ...base.futureLiveBudget, retriesMax: 1 } }));
assert.notEqual(computeR1C1RecoveryCompositeSha256(base), computeR1C1RecoveryCompositeSha256({ ...base, recoverySemantics: { ...base.recoverySemantics, targetRole: "roles/viewer" } }));
assert.notEqual(computeR1C1RecoveryCompositeSha256(base), computeR1C1RecoveryCompositeSha256({ ...base, sourceDocumentLocks: [...base.sourceDocumentLocks].reverse() }));
assert.equal(parseR1C1RecoveryComposite(JSON.stringify(base))?.schema, base.schema);
assert.equal(parseR1C1RecoveryComposite(JSON.stringify({ ...base, timestamp: "now" })), null);
assert.equal(parseR1C1RecoveryComposite(JSON.stringify({ ...base, helper: { ...base.helper, path: "C:/secret/file" } })), null);
assert.equal(parseR1C1RecoveryComposite(JSON.stringify({ ...base, rawPrincipal: "synthetic@example.invalid" })), null);
assert.equal(parseR1C1RecoveryComposite(JSON.stringify({ ...base, legacyR1B1: { ...base.legacyR1B1, status: "CURRENT" } })), null);
assert.equal(verifyR1C1RecoveryComposite({ ...base, recoverySemantics: { ...base.recoverySemantics, targetRole: "roles/viewer" } }).code, "SEMANTIC_MISMATCH");
assert.equal(R1C1_RECOVERY_COMPOSITE_CONTRACT.legacyHashTargeting, false);
assert.equal(R1C1_RECOVERY_COMPOSITE_CONTRACT.networkAccess, false);
assert.equal(canonicalizeR1C1RecoveryComposite(base).includes("synthetic@example.invalid"), false);

console.log("R1C1 recovery composite attestation local validation passed; real access=0");
