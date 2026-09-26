import { createHash } from "node:crypto";
import { G2B_CREATE_EVIDENCE_SHA256 } from "./g2bM3AuthorityReattestation.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";

export const RECOVERY_ANCHOR_IMPLEMENTATION_ATTESTATION_SHA256 = "fd4e1551b7c698928e8f779074c16045bd4600f0e54cb48de4e1c6b6d037f814";
export const RUNTIME_CAPABILITY_ATTESTATION_SHA256 = "c3093a9413c2a083c112b4abef9cd8a9959b002c1a13917cfb9facd147abf911";
export const FINAL_EXECUTION_COMPOSITE_SHA256 = "cf3a391c7a3ca311d35aea539f83e71a0e1aa6f61f6c986d78c1acdc5e35a119";

export function buildG2BM3MutationApprovalPacket() {
  return Object.freeze({
    stage: "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-RECOVERY-ANCHOR-HARDENED",
    type: "M3_MUTATION",
    purpose: "grant the exact current transient caller Token Creator on the exact G2B writer using the recovery-anchor-hardened runtime",
    targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE,
    g2bCreateEvidenceSha256: G2B_CREATE_EVIDENCE_SHA256,
    recoveryAnchorImplementationAttestationSha256: RECOVERY_ANCHOR_IMPLEMENTATION_ATTESTATION_SHA256,
    runtimeCapabilityAttestationSha256: RUNTIME_CAPABILITY_ATTESTATION_SHA256,
    finalExecutionCompositeSha256: FINAL_EXECUTION_COMPOSITE_SHA256,
    graphIdentity: "g2b-m3-cc2f7c2ccd1e38c5",
    recoveryAnchorRequired: true, anchorMustBeVerifiedBeforePrestate: true,
    localIdentityDiscoveryMax: 1, prestateRemoteReadsMax: 1, mutationAttemptsMax: 1, poststateRemoteReadsMax: 1, projectIamReadsMax: 0, iamPolicyReadsMax: 2,
    retriesMax: 0, rollbacksMax: 0, secondMutationReachable: false,
    indeterminatePolicy: "SEPARATE_READ_ONLY_ANCHOR_BASED_RECOVERY_NO_RETRY_NO_SECOND_MUTATION_NO_ROLLBACK",
    m4Allowed: false, firestoreAllowed: false, accessTokenAllowed: false, cloudLoggingAllowed: false, testIamPermissionsAllowed: false, serviceAccountKeyAllowed: false,
  });
}

export function verifyG2BM3MutationApprovalPacket(packet) {
  const expected = buildG2BM3MutationApprovalPacket();
  if (!packet || typeof packet !== "object" || Object.keys(expected).some((key) => packet[key] !== expected[key])) return Object.freeze({ ok: false, code: "G2B_M3_APPROVAL_PACKET_LOCK_MISMATCH" });
  return Object.freeze({ ok: true, code: "G2B_M3_APPROVAL_PACKET_FAIL_CLOSED" });
}

export function sha256ExactBytes(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
