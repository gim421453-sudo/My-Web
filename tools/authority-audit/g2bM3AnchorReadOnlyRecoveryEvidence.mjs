import { createHash } from "node:crypto";

export const G2B_M3_ANCHOR_RECOVERY_EVIDENCE_SCHEMA = "myweb.g2b.m3.anchor-read-only-recovery-evidence.v1";

function canonicalize(value) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") throw new Error("invalid-evidence-value");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

export function canonicalEvidenceJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256RecoveryEvidence(value) {
  return createHash("sha256").update(canonicalEvidenceJson(value), "utf8").digest("hex");
}

export function buildG2BM3AnchorRecoveryEvidence() {
  return Object.freeze({
    schema: G2B_M3_ANCHOR_RECOVERY_EVIDENCE_SCHEMA,
    stage: "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-READ_ONLY-ANCHOR-RECOVERY-V2",
    approvalPacketSha256: "2fe32f4481eba3c559e41cd684e84aa740853df8e034fab693d01404b1b28968",
    m3ExecutionEvidenceSha256: "e040333f84a2c154c5804057b705929897122a4888968f6e04c6737427429822",
    m3ResultDocumentSha256: "32d8e79d9cea3a772daa770ef06e1566f16af75612bfe142f94328108ac22691",
    targetResource: "myweb-class-mig-writer-g2@my-management-app-8a933.iam.gserviceaccount.com",
    targetRole: "roles/iam.serviceAccountTokenCreator",
    approvalConsumed: true,
    anchorStateCategory: "RECOVERY_CONFIRMED_ABSENT",
    secretStateCategory: "READY_CURRENTUSER_DPAPI_EXPECTED_GENERATION",
    anchorContextValid: true,
    physicalPolicyReadsUsed: 1,
    canonicalParserResult: "PARSED_CANONICAL_POLICY",
    hmacMatchCountCategory: "ZERO",
    recoveryResult: "MEMBER_ABSENT_CONFIRMED",
    currentM3State: "CONFIRMED_ABSENT_AFTER_INDETERMINATE_MUTATION",
    retryCount: 0,
    forbiddenOperationCounts: Object.freeze({
      opA: 0, projectIamReads: 0, mutations: 0, m3Mutations: 0, m4Mutations: 0,
      firestoreCalls: 0, accessTokenCalls: 0, cloudLoggingReads: 0,
      testIamPermissionsCalls: 0, serviceAccountKeyOperations: 0, rollbacks: 0,
    }),
    privacy: Object.freeze({ rawMemberPersisted: false, rawPrincipalPersisted: false, rawPolicyPersisted: false, rawSecretPersisted: false }),
    finalVerdict: "G2B_M3_ANCHOR_RECOVERY_COMPLETE_MEMBER_ABSENT_NO_RETRY",
  });
}
