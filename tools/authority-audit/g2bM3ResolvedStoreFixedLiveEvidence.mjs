import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import {
  G2B_RESOLVED_STORE_FIXED_OPERATION_GENERATION,
  G2B_RESOLVED_STORE_FIXED_STAGE,
} from "./g2bM3ResolvedStoreFixedApprovalPacket.mjs";

export const G2B_RESOLVED_STORE_FIXED_RECOVERY_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-RESOLVEDSTORE-FIXED-READ-ONLY-ANCHOR-RECOVERY";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/g2bM3ResolvedStoreFixedLiveEvidence.mjs",
  "tools/authority-audit-tests/g2bM3ResolvedStoreFixedLiveEvidence.test.mjs",
]);

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function canonicalJson(value) {
  return JSON.stringify(sortValue(value));
}

export function sha256Canonical(value) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function buildSourceLocks(repositoryRoot) {
  return Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({
    path,
    sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex"),
  })));
}

export function buildResolvedStoreFixedLiveExecutionEvidence() {
  return Object.freeze({
    schema: "myweb.g2b.resolved-store-fixed.live-execution-evidence.v1",
    stage: G2B_RESOLVED_STORE_FIXED_STAGE,
    operationGeneration: G2B_RESOLVED_STORE_FIXED_OPERATION_GENERATION,
    approvalPacketSha256: "dde98c71dd6081f86a5895cdf6db60515a5e4a862edece92c41259b76f6861f5",
    approvalPacketDocumentRawSha256: "3679970d0d199c5238fd0739fc6afb4d5f9afde1721d044352a09c07969b64c4",
    implementationAttestationSha256: "1991eeb6c3f43ab5f9aeeb6a1fb28d5ca8cf69e565dfb5b077684b57a434a2c0",
    runtimeCapabilityAttestationSha256: "91e6def2b0791fa864c3a6add5132e9c05ec74b308a485ca75db6566ffd5d0cc",
    finalExecutionCompositeSha256: "e6b3dbe45645ea4353de5b968b1101df6b87218c60223a2bbc0b79032d98b83e",
    graphIdentity: "g2b-current-live-2d8c3f763af9af17",
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    approvalConsumed: true,
    identityContextEstablished: true,
    recoverySecretState: "READY_CURRENTUSER_DPAPI_EXPECTED_GENERATION",
    recoveryAnchorState: "MUTATION_INDETERMINATE",
    recoveryAnchorVerifiedBeforePrestate: true,
    freshOpAUsed: 1,
    prestateWriterIamPolicyReadsUsed: 1,
    prestateProjectIamReadsUsed: 0,
    prestatePhysicalRemoteReadsUsed: 1,
    prestateResult: "MEMBER_ABSENT_CONFIRMED",
    mutationAttemptsUsed: 1,
    mutationOutcome: "INDETERMINATE",
    mutationClassifier: "M3_MUTATION_INDETERMINATE",
    poststateRequired: true,
    poststateWriterIamPolicyReadsUsed: 0,
    poststateProjectIamReadsUsed: 0,
    poststatePhysicalRemoteReadsUsed: 0,
    poststateResult: "NOT_RUN_BY_APPROVAL_POLICY",
    totalPhysicalRemoteReadsUsed: 1,
    retriesUsed: 0,
    rollbacksUsed: 0,
    secondMutationUsed: 0,
    currentG2BM3State: "INDETERMINATE_AFTER_SINGLE_MUTATION_ATTEMPT",
    forbiddenOperationCounts: Object.freeze({
      projectIamReads: 0,
      projectIamMutations: 0,
      m4Mutations: 0,
      firestoreCalls: 0,
      accessTokenCalls: 0,
      cloudLoggingReads: 0,
      testIamPermissionsCalls: 0,
      serviceAccountKeyOperations: 0,
    }),
    privacy: Object.freeze({
      rawMemberPersisted: false,
      rawPrincipalPersisted: false,
      rawPolicyPersisted: false,
      rawSecretPersisted: false,
      stdoutPersisted: false,
      stderrPersisted: false,
    }),
    nextApprovalRequired: true,
    nextApprovalType: "READ_ONLY_ANCHOR_BASED_M3_RECOVERY",
  });
}

export function buildResolvedStoreFixedLiveResult(executionEvidence) {
  if (!executionEvidence) throw new Error("execution-evidence-required");
  return Object.freeze({
    schema: "myweb.g2b.resolved-store-fixed.live-result.v1",
    stage: G2B_RESOLVED_STORE_FIXED_STAGE,
    operationGeneration: G2B_RESOLVED_STORE_FIXED_OPERATION_GENERATION,
    executionEvidenceSha256: sha256Canonical(executionEvidence),
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    result: "M3_MUTATION_INDETERMINATE",
    currentG2BM3State: "INDETERMINATE_AFTER_SINGLE_MUTATION_ATTEMPT",
    approvalConsumed: true,
    mutationAttemptsUsed: 1,
    retriesUsed: 0,
    rollbacksUsed: 0,
    secondMutationUsed: 0,
    poststateReadsUsed: 0,
    recoveryAnchorPreserved: true,
    nextApprovalRequired: true,
    nextApprovalType: "READ_ONLY_ANCHOR_BASED_M3_RECOVERY",
  });
}

function unsignedRecoveryPacket({ executionEvidence, result, repositoryRoot }) {
  return {
    schema: "myweb.g2b.resolved-store-fixed.read-only-anchor-recovery-approval.v1",
    stage: G2B_RESOLVED_STORE_FIXED_RECOVERY_STAGE,
    type: "READ_ONLY_ANCHOR_BASED_M3_RECOVERY",
    purpose: "recover the exact G2B M3 binding state after the approved resolvedStore-fixed operation returned INDETERMINATE",
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    operationGeneration: G2B_RESOLVED_STORE_FIXED_OPERATION_GENERATION,
    executionEvidenceSha256: sha256Canonical(executionEvidence),
    resultDocumentSha256: sha256Canonical(result),
    currentState: "INDETERMINATE_AFTER_SINGLE_MUTATION_ATTEMPT",
    existingVerifiedAnchorRequired: true,
    recoveryAnchorStateRequirement: "EXACTLY_ONE_PRESERVED_MUTATION_INDETERMINATE_ANCHOR_FOR_CURRENT_OPERATION_GENERATION",
    recoverySecretStateRequirement: "READY_CURRENTUSER_DPAPI_EXPECTED_GENERATION_NO_SILENT_ROTATION",
    recoveryRequiresNewOpA: false,
    localIdentityDiscoveryMax: 0,
    writerIamPolicyReadsMax: 1,
    physicalRemotePolicyReadsMax: 1,
    projectIamReadsMax: 0,
    approvalConsumptionPoint: "WHEN_FIRST_APPROVED_CURRENT_GENERATION_WRITER_IAM_POLICY_RECOVERY_READ_BEGINS",
    canonicalPolicyParserRequired: true,
    legacyPolicyParserFallbackAllowed: false,
    recoveryResultDomain: Object.freeze([
      "PRESENT_CONFIRMED",
      "MEMBER_ABSENT_CONFIRMED",
      "AMBIGUOUS",
      "READ_FAILURE",
      "POLICY_PARSE_FAILURE",
      "ANCHOR_INVALID",
      "SECRET_UNAVAILABLE",
      "PRIVACY_GUARD_FAILURE",
    ]),
    presentResultSemantics: "exactly-one-authorization-grade-HMAC-match-after-valid-full-canonical-parse",
    absentResultSemantics: "zero-authorization-grade-HMAC-matches-after-valid-full-canonical-parse",
    ambiguousResultSemantics: "uniqueness-not-proven-stop-without-inference",
    readFailureResultSemantics: "authoritative-policy-read-unavailable-stop-without-inference",
    exactMemberReconstructionContract: "evaluate-canonical-policy-members-through-preserved-anchor-HMAC-without-persisting-raw-authority-material",
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
    sourceLocks: buildSourceLocks(repositoryRoot),
    allRequiredLocalLocksMatch: true,
    packetReproducible: true,
    recoveryPacketComplete: true,
    safeToContinueWithoutApproval: false,
  };
}

export function buildResolvedStoreFixedRecoveryApprovalPacket({ repositoryRoot = process.cwd() } = {}) {
  const executionEvidence = buildResolvedStoreFixedLiveExecutionEvidence();
  const result = buildResolvedStoreFixedLiveResult(executionEvidence);
  const unsigned = unsignedRecoveryPacket({ executionEvidence, result, repositoryRoot });
  return Object.freeze({
    executionEvidence,
    result,
    packet: Object.freeze({ ...unsigned, recoveryApprovalPacketSha256: sha256Canonical(unsigned) }),
  });
}

export function verifyResolvedStoreFixedRecoveryApprovalPacket(artifacts, { repositoryRoot = process.cwd() } = {}) {
  let expected;
  try {
    expected = buildResolvedStoreFixedRecoveryApprovalPacket({ repositoryRoot });
  } catch {
    return Object.freeze({ ok: false, code: "RECOVERY_PACKET_BUILD_FAILURE" });
  }
  const ok = canonicalJson(artifacts) === canonicalJson(expected);
  return Object.freeze({ ok, code: ok ? "RESOLVEDSTORE_FIXED_RECOVERY_PACKET_MATCH" : "RESOLVEDSTORE_FIXED_RECOVERY_PACKET_MISMATCH" });
}
