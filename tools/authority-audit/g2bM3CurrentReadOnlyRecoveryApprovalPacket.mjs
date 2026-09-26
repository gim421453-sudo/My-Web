import { createHash } from "node:crypto";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";

export const CURRENT_READ_ONLY_RECOVERY_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-CURRENT-OPERATION-READ-ONLY-ANCHOR-RECOVERY";
export const CURRENT_READ_ONLY_RECOVERY_OPERATION_GENERATION = "9662e385-82ab-4a73-8a5a-e8a25a9f4478";
export const CURRENT_READ_ONLY_RECOVERY_EXECUTION_EVIDENCE_SHA256 = "4c9cfa2300a63aceb9b3e0dcfcc39a506ed1964b10a71ea99a4a36866a7c7796";
export const CURRENT_READ_ONLY_RECOVERY_RESULT_DOCUMENT_SHA256 = "ceff2226fbdc6fbfc5e6f0bb9a1569b6a20c70b5b5800b8967db374f297d23cf";
export const SUPERSEDED_INCOMPLETE_RECOVERY_PACKET_SHA256 = "3f99d2a6cdc7f964cb8e9ee7f826fee866dbb9a8705f69a98f2afad5bd0e4f06";

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function canonicalJson(value) { return JSON.stringify(sortValue(value)); }
export function sha256Canonical(value) { return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex"); }

function withoutSelfHash(packet) {
  const { recoveryApprovalPacketSha256: _ignored, ...unsigned } = packet;
  return unsigned;
}

export function buildCurrentReadOnlyRecoveryPacket() {
  const unsigned = {
    schema: "myweb.g2b.current-operation.read-only-anchor-recovery.v1",
    stage: CURRENT_READ_ONLY_RECOVERY_STAGE,
    type: "READ_ONLY_ANCHOR_BASED_M3_RECOVERY",
    purpose: "recover the exact current G2B M3 binding state after the single consumed mutation for the current operation generation returned INDETERMINATE",
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    operationGeneration: CURRENT_READ_ONLY_RECOVERY_OPERATION_GENERATION,
    executionEvidenceSha256: CURRENT_READ_ONLY_RECOVERY_EXECUTION_EVIDENCE_SHA256,
    resultDocumentSha256: CURRENT_READ_ONLY_RECOVERY_RESULT_DOCUMENT_SHA256,
    supersededIncompletePacketSha256: SUPERSEDED_INCOMPLETE_RECOVERY_PACKET_SHA256,
    currentState: "INDETERMINATE_AFTER_SINGLE_MUTATION_ATTEMPT",
    existingVerifiedAnchorRequired: true,
    recoveryAnchorStateRequirement: "EXACTLY_ONE_PRESERVED_MUTATION_INDETERMINATE_ANCHOR_FOR_CURRENT_OPERATION_GENERATION",
    recoverySecretStateRequirement: "READY_CURRENTUSER_DPAPI_EXPECTED_GENERATION_NO_SILENT_ROTATION",
    recoveryRequiresNewOpA: false,
    localIdentityDiscoveryMax: 0,
    writerIamPolicyReadsMax: 1,
    iamPolicyReadsMax: 1,
    physicalRemotePolicyReadsMax: 1,
    projectIamReadsMax: 0,
    approvalConsumptionPoint: "WHEN_FIRST_APPROVED_CURRENT_GENERATION_WRITER_IAM_POLICY_RECOVERY_READ_BEGINS",
    canonicalPolicyParserRequired: true,
    legacyPolicyParserFallbackAllowed: false,
    anchorTargetContextMatchRequired: true,
    anchorSecretGenerationMatchRequired: true,
    anchorOperationGenerationMatchRequired: true,
    recoveryResultDomain: ["PRESENT_CONFIRMED", "MEMBER_ABSENT_CONFIRMED", "AMBIGUOUS", "READ_FAILURE", "POLICY_PARSE_FAILURE", "ANCHOR_INVALID", "SECRET_UNAVAILABLE", "PRIVACY_GUARD_FAILURE"],
    oneMatchPolicy: "EXACTLY_ONE_AUTHORIZATION_GRADE_HMAC_MATCH_REQUIRED_FOR_PRESENT_CONFIRMED",
    zeroMatchPolicy: "VALID_FULL_PARSE_ALL_EXACT_TARGET_ROLE_MEMBERS_EVALUATED_ZERO_HMAC_MATCHES_REQUIRED_FOR_MEMBER_ABSENT_CONFIRMED",
    multipleMatchPolicy: "MULTIPLE_AUTHORIZATION_GRADE_HMAC_MATCHES_ALWAYS_AMBIGUOUS",
    presentConfirmedSemantics: "anchor-valid-secret-valid-context-exact-canonical-full-parse-exactly-one-match",
    memberAbsentConfirmedSemantics: "anchor-valid-secret-valid-context-exact-canonical-full-parse-zero-matches",
    ambiguousSemantics: "uniqueness-not-proven-stop-without-inference",
    readFailureSemantics: "authoritative-policy-read-unavailable-stop-without-inference",
    policyParseFailureSemantics: "canonical-policy-parse-incomplete-or-invalid-stop-without-inference",
    anchorInvalidSemantics: "current-operation-recovery-authority-invalid-stop",
    secretUnavailableSemantics: "expected-dpapi-secret-unavailable-or-mismatched-stop",
    privacyGuardFailureSemantics: "raw-authority-material-would-be-exposed-stop",
    currentRecoveryRuntimeChangeRequired: false,
    retries: 0,
    rollbacks: 0,
    mutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    secondMutationAllowed: false,
    m4Allowed: false,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false,
    serviceAccountKeyAllowed: false,
    rawMemberPersisted: false,
    rawPrincipalPersisted: false,
    rawPolicyPersisted: false,
    allRequiredLocalLocksMatch: true,
    packetReproducible: true,
    recoveryPacketComplete: true,
    safeToContinueWithoutApproval: false,
  };
  return Object.freeze({ ...unsigned, recoveryApprovalPacketSha256: sha256Canonical(unsigned) });
}

export function verifyCurrentReadOnlyRecoveryPacket(packet) {
  if (!packet || typeof packet !== "object" || packet.targetResource !== G2B_TARGET_RESOURCE || packet.targetRole !== G2B_TARGET_ROLE) {
    return Object.freeze({ ok: false, code: "TARGET_CONTEXT_MISMATCH" });
  }
  if (packet.operationGeneration !== CURRENT_READ_ONLY_RECOVERY_OPERATION_GENERATION || packet.recoveryRequiresNewOpA !== false || packet.mutationsMax !== 0 || packet.m3MutationsMax !== 0 || packet.m4MutationsMax !== 0 || packet.projectIamReadsMax !== 0 || packet.retries !== 0 || packet.rollbacks !== 0) {
    return Object.freeze({ ok: false, code: "RECOVERY_POLICY_MISMATCH" });
  }
  if (packet.recoveryPacketComplete !== true || packet.packetReproducible !== true || packet.safeToContinueWithoutApproval !== false) {
    return Object.freeze({ ok: false, code: "RECOVERY_PACKET_INCOMPLETE" });
  }
  const expected = sha256Canonical(withoutSelfHash(packet));
  return Object.freeze(expected === packet.recoveryApprovalPacketSha256
    ? { ok: true, code: "CURRENT_GENERATION_RECOVERY_PACKET_LOCKED", sha256: expected }
    : { ok: false, code: "RECOVERY_PACKET_HASH_MISMATCH", sha256: expected });
}
