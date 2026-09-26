import assert from "node:assert/strict";
import {
  canonicalizeR1B3HHelperV2Attestation,
  computeR1B3HHelperV2AttestationSha256,
  parseR1B3HHelperV2Attestation,
  R1B3H_HELPER_V2_ATTESTATION_CONTRACT,
  verifyR1B3HHelperV2Attestation,
} from "../authority-audit/r1b3hHelperV2Attestation.mjs";

const sha = (char) => char.repeat(64);
const payload = () => ({
  schema: "myweb.m3l2.r1b3h.helper-v2-attestation.v1",
  r1c1CompositeSha256: sha("a"),
  r1b2R2ResultDocumentSha256: sha("b"),
  r1b3dSourceDocumentSha256: sha("c"),
  r1b3dVerdict: "R1B3D_SEMANTICS_RESOLVED",
  helperV1Sha256: sha("d"),
  helperV2: { path: "tools/authority-audit/writerPolicyTargetRoleAbsenceDiagnosticV2.mjs", sha256: sha("e"), purity: "PASS" },
  helperV2Test: { path: "tools/authority-audit-tests/writerPolicyTargetRoleAbsenceDiagnosticV2.test.mjs", sha256: sha("f") },
  serviceAccountPolicySemantics: {
    opCSurface: "EXACT_MATCH",
    outputCompleteness: "STRUCTURED_JSON_NO_FIELD_SUPPRESSION",
    localOutputCanDropNonemptyBindings: "PROVEN_NO",
    etagOnlySemantic: "ZERO_ROLE_BINDINGS",
    etagStructuralPredicate: "own etag property; string; non-empty",
    missingVersionEtageOnlySemantics: "SAFE",
    version1ExplicitEmptyBindings: "ABSENT_SAFE",
    version3ExplicitEmptyBindings: "ABSENT_SAFE",
    conditionalRoleRepresentationSafety: "VERSION3_OBJECT_CONDITION_ONLY",
  },
  helperV2Semantics: {
    resultDomain: ["ABSENT_PROVEN", "AMBIGUOUS"],
    canReturnPresentProven: false,
    failClosedDefault: "AMBIGUOUS",
    emptyObjectResult: "AMBIGUOUS",
    etagOnlyResult: "ABSENT_PROVEN",
    bindingsMissingAndEtagMissingResult: "AMBIGUOUS",
    targetRole: "roles/iam.serviceAccountTokenCreator",
    targetRoleMatchMode: "EXACT_STRING",
    memberInspectionRequired: false,
    fingerprintMatchingUsed: false,
    absentReasonAllowlist: [
      "COMPLETE_ETAG_ONLY_ZERO_BINDINGS", "COMPLETE_EXPLICIT_EMPTY_BINDINGS", "COMPLETE_NO_TARGET_ROLE",
    ],
  },
  futureR1B4Surface: "EXISTING_LOCKED_OP_C_SURFACE",
  futureR1B4Budget: {
    writerSaIamPolicyReadsMax: 1, retriesMax: 0, cloudLoggingReadsMax: 0, activeCallerDiscoveryMax: 0,
    projectIamReadsMax: 0, testIamPermissionsMax: 0, iamMutationsMax: 0, m3MutationsMax: 0,
    m4MutationsMax: 0, accessTokenCallsMax: 0, firestoreCallsMax: 0,
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
assert.equal(verifyR1B3HHelperV2Attestation(base).ok, true);
assert.equal(parseR1B3HHelperV2Attestation(JSON.stringify(base))?.schema, base.schema);
const reordered = { ...base, helperV2: { purity: "PASS", sha256: base.helperV2.sha256, path: base.helperV2.path } };
assert.equal(computeR1B3HHelperV2AttestationSha256(base), computeR1B3HHelperV2AttestationSha256(reordered));
assert.notEqual(computeR1B3HHelperV2AttestationSha256(base), computeR1B3HHelperV2AttestationSha256({
  ...base, helperV2: { ...base.helperV2, sha256: sha("1") },
}));
assert.notEqual(computeR1B3HHelperV2AttestationSha256(base), computeR1B3HHelperV2AttestationSha256({
  ...base, serviceAccountPolicySemantics: { ...base.serviceAccountPolicySemantics, etagOnlySemantic: "UNKNOWN" },
}));
assert.notEqual(computeR1B3HHelperV2AttestationSha256(base), computeR1B3HHelperV2AttestationSha256({
  ...base, helperV2Semantics: { ...base.helperV2Semantics, targetRole: "roles/viewer" },
}));
assert.notEqual(computeR1B3HHelperV2AttestationSha256(base), computeR1B3HHelperV2AttestationSha256({
  ...base, futureR1B4Budget: { ...base.futureR1B4Budget, retriesMax: 1 },
}));
for (const invalid of [
  { ...base, timestamp: "now" },
  { ...base, helperV2: { ...base.helperV2, path: "C:/secret/file" } },
  { ...base, rawPrincipal: "synthetic@example.invalid" },
  { ...base, helperV2Semantics: { ...base.helperV2Semantics, resultDomain: ["ABSENT_PROVEN", "AMBIGUOUS", "PRESENT_PROVEN"] } },
  { ...base, helperV2Semantics: { ...base.helperV2Semantics, memberInspectionRequired: true } },
  { ...base, helperV2Semantics: { ...base.helperV2Semantics, fingerprintMatchingUsed: true } },
]) {
  assert.equal(parseR1B3HHelperV2Attestation(JSON.stringify(invalid)), null);
}
assert.equal(R1B3H_HELPER_V2_ATTESTATION_CONTRACT.networkAccess, false);
assert.equal(R1B3H_HELPER_V2_ATTESTATION_CONTRACT.processSpawn, false);
assert.equal(canonicalizeR1B3HHelperV2Attestation(base).includes("synthetic@example.invalid"), false);

console.log("R1B3H attestation builder/verifier reproducibility tests passed; real access=0");
