import assert from "node:assert/strict";
import {
  canonicalizeG4Attestation,
  computeG4AttestationSha256,
  G4_ATTESTATION_CONTRACT,
  parseG4Attestation,
  verifyG4Attestation,
} from "../authority-audit/g4FailClosedOutcomeClassifierAttestation.mjs";

const sha = (char) => char.repeat(64);
const lock = (path, char) => ({ path, sha256: sha(char) });
const payload = () => ({
  schema: "myweb.m3l2.g4.fail-closed-outcome-classifier.v1",
  r1b4EvidenceSha256: sha("a"), r1b4ResultDocumentSha256: sha("b"),
  r1b4Verdict: "P1_5_C2H2E3D_W1C_M3L2_R1B4_TARGET_ROLE_ABSENCE_PROVEN",
  currentM3State: "ABSENT_PROVEN", historicalClassifierDefect: "INDETERMINATE",
  preG4RuntimeLocks: [lock("tools/authority-audit/m3RuntimeCommandGraph.mjs", "c")],
  postG4RuntimeLocks: [lock("tools/authority-audit/m3RuntimeCommandGraph.mjs", "d")],
  testLocks: [lock("tools/authority-audit-tests/m3MutationOutcomeClassifierG4.test.mjs", "e")],
  classifierSemantics: {
    unknownNonzeroClassification: "INDETERMINATE", errorPrefixV1ProvesRemoteNonApplication: "no",
    timeoutAfterMutationStart: "INDETERMINATE", unknownMutationResultDefault: "INDETERMINATE",
    confirmedFailureStandard: "REMOTE_NON_APPLICATION_PROVEN_BY_CLOSED_RULE", confirmedFailureRuleIds: [],
    successSemantics: "EXIT_0_NORMAL_RESPONSE_CONFIRMED_SUCCESS", historicalM3L2ForensicOverride: "INDETERMINATE",
  },
  runtimeInvariants: { automaticMutationRetryAdded: false, automaticRollbackAdded: false, externalCommandSurfaceChanged: false, opEArgvChanged: false, opCArgvChanged: false },
  privacy: { rawPolicyPersisted: false, rawStdoutPersisted: false, rawStderrPersisted: false, memberIdentityPersisted: false, etagPersisted: false, conditionPersisted: false, tokenPersisted: false, personalPathPersisted: false },
  futureAuthority: { historicalRg2cReusable: false, historicalG2R1Reusable: false, freshRuntimeReattestationRequired: true, newMutationCompositeRequired: true, newLiveApprovalRequired: true },
});

const base = payload();
assert.equal(verifyG4Attestation(base).ok, true);
assert.equal(parseG4Attestation(JSON.stringify(base))?.schema, base.schema);
const reordered = { ...base, classifierSemantics: { ...base.classifierSemantics, confirmedFailureRuleIds: [] } };
assert.equal(computeG4AttestationSha256(base), computeG4AttestationSha256(reordered));
assert.notEqual(computeG4AttestationSha256(base), computeG4AttestationSha256({ ...base, classifierSemantics: { ...base.classifierSemantics, unknownNonzeroClassification: "CONFIRMED_FAILURE" } }));
assert.notEqual(computeG4AttestationSha256(base), computeG4AttestationSha256({ ...base, runtimeInvariants: { ...base.runtimeInvariants, opEArgvChanged: true } }));
assert.equal(verifyG4Attestation({ ...base, classifierSemantics: { ...base.classifierSemantics, unknownNonzeroClassification: "CONFIRMED_FAILURE" } }).ok, false);
assert.equal(parseG4Attestation(JSON.stringify({ ...base, timestamp: "now" })), null);
assert.equal(parseG4Attestation(JSON.stringify({ ...base, rawPolicy: "forbidden" })), null);
assert.equal(parseG4Attestation(JSON.stringify({ ...base, privacy: { ...base.privacy, rawStderrPersisted: true } })), null);
assert.equal(parseG4Attestation(JSON.stringify({ ...base, postG4RuntimeLocks: [{ path: "C:/private", sha256: sha("1") }] })), null);
assert.equal(G4_ATTESTATION_CONTRACT.networkAccess, false);
assert.equal(G4_ATTESTATION_CONTRACT.processSpawn, false);
assert.equal(canonicalizeG4Attestation(base).includes("forbidden"), false);

console.log("G4 attestation reproducibility tests passed; live execution=0");
