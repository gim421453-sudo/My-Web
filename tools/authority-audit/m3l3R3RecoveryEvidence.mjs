import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const M3L3_R3_EVIDENCE_SCHEMA = "myweb.m3l3.r3.canonical-policy-read-result.v1";
const LOCKS = Object.freeze([
  Object.freeze({ path: "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs", sha256: "33a887e60c57383c7b53448a84c63252f7772210e043844f10a8611ba633a7cd" }),
  Object.freeze({ path: "tools/authority-audit/m3l3R3CanonicalPolicyRecoveryExecutor.mjs", sha256: "7328e4ff13c7018ddd415c2e51961d8e05f40d3f0612e8405e232dd29b239427" }),
]);
function stable(value) { if (value === null || typeof value !== "object") return value; if (Array.isArray(value)) return value.map(stable); return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])); }
const exact = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));
const hash = (value) => createHash("sha256").update(value).digest("hex");

export function buildM3L3R3RecoveryEvidence() {
  return {
    schema: M3L3_R3_EVIDENCE_SCHEMA,
    authority: { parserAttestationSha256: "a455d5df0210395c4c8625e5774384838ffcd8980f3e46321af03c28e6735455", recoveryPlanSha256: "220ef3972c120ffc931626bd975e6359f7e4588119f3122359fc63668a26c189", approvalPacketSha256: "444939c4eba2639c46a0372b198fdaebe244deb6091a1fd6e0cbc97c22553fcd", r2EvidenceSha256: "607db23fc03c830d14f9da9e8241a6629ee6cd967cd64b44d6e99d16ad431fae", r2ResultDocumentSha256: "106fab9b3cbc583dd3bff9f97f46b7db7962f16154f79c001d908e7a45566309" },
    sourceLocks: LOCKS.map((lock) => ({ ...lock })),
    approval: { type: "READ_ONLY", writerSaGetIamPolicyMax: 1, retries: 0, mutations: 0, reusable: false, consumed: true, status: "CONSUMED_NON_REUSABLE" },
    identity: { discoveryUsed: 1, exactContextEstablished: true, rawIdentityPersisted: false },
    remoteRead: { started: true, used: 1, writerSaGetIamPolicyReads: 1, projectIamReads: 0 },
    parser: { result: "PARSED_CANONICAL_POLICY", bindingsNormalization: "OMITTED_TO_EMPTY", rawPolicyPersisted: false },
    recoveryResult: "ZERO_BINDINGS_ABSENT",
    currentM3State: "ZERO_BINDINGS_ABSENT",
    safeFailureDiagnostic: { phase: "NOT_APPLICABLE", failureClass: "NOT_APPLICABLE", parserReason: "NOT_APPLICABLE" },
    forbiddenOperationCounts: { iamMutations: 0, m3Mutations: 0, m4Mutations: 0, projectIamReads: 0, projectIamMutations: 0, accessTokenCalls: 0, writerImpersonationCalls: 0, firestoreCalls: 0, cloudLoggingReads: 0, testIamPermissionsCalls: 0, serviceAccountKeyOperations: 0, retries: 0, rollbacks: 0 },
    privacy: { rawStdoutPersisted: false, rawStderrPersisted: false, rawIamPolicyPersisted: false, rawIdentityPersisted: false, rawMemberPersisted: false, rawAccountPersisted: false, rawEtagPersisted: false, rawConditionPersisted: false, tokenPersisted: false },
    nextApproval: { required: true, type: "M3_MUTATION", automaticMutationAllowed: false },
    execution: { productionReads: 1, productionWrites: 0, executed: true },
  };
}
export function canonicalizeM3L3R3RecoveryEvidence(payload) { if (!exact(payload, buildM3L3R3RecoveryEvidence())) throw new Error("invalid-r3-evidence"); return JSON.stringify(stable(payload)); }
export function computeM3L3R3RecoveryEvidenceSha256(payload) { return hash(canonicalizeM3L3R3RecoveryEvidence(payload)); }
export function verifyM3L3R3RecoveryEvidence(payload, { repositoryRoot = process.cwd() } = {}) {
  if (!exact(payload, buildM3L3R3RecoveryEvidence())) return Object.freeze({ ok: false, code: "INVALID_R3_EVIDENCE" });
  if (!LOCKS.every((lock) => hash(readFileSync(resolve(repositoryRoot, lock.path))) === lock.sha256)) return Object.freeze({ ok: false, code: "R3_EVIDENCE_SOURCE_LOCK_DRIFT" });
  return Object.freeze({ ok: true, code: "R3_ZERO_BINDINGS_ABSENT_RECORDED", sha256: computeM3L3R3RecoveryEvidenceSha256(payload) });
}
