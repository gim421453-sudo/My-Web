import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildG2BM3IndeterminateRecoveryApprovalPacketV2, verifyG2BM3IndeterminateRecoveryApprovalPacketV2 } from "../authority-audit/g2bM3IndeterminateRecoveryApprovalPacketV2.mjs";

const packet = buildG2BM3IndeterminateRecoveryApprovalPacketV2();
assert.equal(verifyG2BM3IndeterminateRecoveryApprovalPacketV2(packet).ok, true);
for (const key of Object.keys(packet)) {
  const missing = { ...packet };
  delete missing[key];
  assert.equal(verifyG2BM3IndeterminateRecoveryApprovalPacketV2(missing).ok, false, `missing ${key}`);
}
for (const [key, value] of Object.entries({
  recoveryRequiresNewOpA: true, localIdentityDiscoveryMax: 1, writerSaIamReadsMax: 2, physicalRemotePolicyReadsMax: 2,
  canonicalPolicyParserRequired: false, legacyPolicyParserFallbackAllowed: true, anchorTargetContextMatchRequired: false,
  anchorSecretGenerationMatchRequired: false, anchorOperationGenerationMatchRequired: false, mutationsMax: 1,
  secondMutationAllowed: true, m4Allowed: true, firestoreAllowed: true, rawMemberPersisted: true,
})) {
  assert.equal(verifyG2BM3IndeterminateRecoveryApprovalPacketV2({ ...packet, [key]: value }).ok, false, `${key} must fail closed`);
}
const documentText = readFileSync("docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-indeterminate-readonly-recovery-v2-approval.md", "utf8");
const documentFields = Object.fromEntries([...documentText.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map(([, key, value]) => [key, value]));
const mapping = {
  STAGE: "stage", TYPE: "type", PURPOSE: "purpose", TARGET_RESOURCE: "targetResource", TARGET_ROLE: "targetRole",
  M3_EXECUTION_EVIDENCE_SHA256: "m3ExecutionEvidenceSha256", M3_RESULT_DOCUMENT_SHA256: "m3ResultDocumentSha256",
  HISTORICAL_INCOMPLETE_RECOVERY_PACKET_SHA256: "historicalIncompleteRecoveryPacketSha256",
  RECOVERY_ANCHOR_STATE_REQUIREMENT: "recoveryAnchorStateRequirement", RECOVERY_SECRET_STATE_REQUIREMENT: "recoverySecretStateRequirement",
  APPROVAL_CONSUMPTION_POINT: "approvalConsumptionPoint", RECOVERY_RESULT_DOMAIN: "recoveryResultDomain",
  ONE_MATCH_POLICY: "oneMatchPolicy", ZERO_MATCH_POLICY: "zeroMatchPolicy", MULTIPLE_MATCH_POLICY: "multipleMatchPolicy",
  PRESENT_CONFIRMED_SEMANTICS: "presentConfirmedSemantics", MEMBER_ABSENT_CONFIRMED_SEMANTICS: "memberAbsentConfirmedSemantics",
  AMBIGUOUS_SEMANTICS: "ambiguousSemantics", READ_FAILURE_SEMANTICS: "readFailureSemantics",
  POLICY_PARSE_FAILURE_SEMANTICS: "policyParseFailureSemantics", ANCHOR_INVALID_SEMANTICS: "anchorInvalidSemantics",
  SECRET_UNAVAILABLE_SEMANTICS: "secretUnavailableSemantics", PRIVACY_GUARD_FAILURE_SEMANTICS: "privacyGuardFailureSemantics",
};
for (const [documentKey, packetKey] of Object.entries(mapping)) assert.equal(documentFields[documentKey], String(packet[packetKey]), documentKey);
for (const [key, value] of Object.entries({ RECOVERY_ANCHOR_REQUIRED: "yes", RECOVERY_REQUIRES_NEW_OP_A: "no", LOCAL_IDENTITY_DISCOVERY_MAX: "0", WRITER_SA_IAM_READS_MAX: "1", IAM_POLICY_READS_MAX: "1", PHYSICAL_REMOTE_POLICY_READS_MAX: "1", PROJECT_IAM_READS_MAX: "0", CANONICAL_POLICY_PARSER_REQUIRED: "yes", LEGACY_POLICY_PARSER_FALLBACK_ALLOWED: "no", ANCHOR_TARGET_CONTEXT_MATCH_REQUIRED: "yes", ANCHOR_SECRET_GENERATION_MATCH_REQUIRED: "yes", ANCHOR_OPERATION_GENERATION_MATCH_REQUIRED: "yes", MUTATIONS: "0", M3_MUTATIONS: "0", M4_MUTATIONS: "0", SECOND_MUTATION_ALLOWED: "no", RAW_MEMBER_PERSISTED: "no", RAW_PRINCIPAL_PERSISTED: "no", RAW_POLICY_PERSISTED: "no", RECOVERY_PACKET_COMPLETE: "yes" })) assert.equal(documentFields[key], value, key);
console.log("G2B M3 read-only recovery V2 packet attack matrix passed; remote operations=0");
