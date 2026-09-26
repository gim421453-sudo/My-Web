import { createHash } from "node:crypto";

export const M3L3_R3_RECOVERY_PLAN_SCHEMA = "myweb.m3l3.r3.canonical-policy-recovery-plan.v1";
const ATTESTATION_SHA256 = "a455d5df0210395c4c8625e5774384838ffcd8980f3e46321af03c28e6735455";

function stable(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
const exact = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));

export function buildM3L3R3CanonicalPolicyRecoveryPlan() {
  return {
    schema: M3L3_R3_RECOVERY_PLAN_SCHEMA,
    parserAttestationSha256: ATTESTATION_SHA256,
    currentM3State: "READ_FAILURE",
    approval: { required: true, reusable: false, consumedOnPolicyReadStart: true },
    sequence: ["ACTIVE_CALLER_DISCOVERY_MAX_1", "WRITER_SA_GET_IAM_POLICY_MAX_1", "LOCAL_CANONICAL_PARSE", "STOP"],
    budget: { localIdentityDiscoveryMax: 1, writerSaGetIamPolicyReadsMax: 1, projectIamReadsMax: 0, retriesMax: 0, iamMutationsMax: 0, m3MutationsMax: 0, m4MutationsMax: 0, tokenCallsMax: 0, firestoreCallsMax: 0, cloudLoggingReadsMax: 0, testIamPermissionsMax: 0, serviceAccountKeyOperationsMax: 0 },
    allowedResults: ["PRESENT_CONFIRMED", "ZERO_BINDINGS_ABSENT", "MEMBER_ABSENT", "AMBIGUOUS", "READ_FAILURE", "IDENTITY_FAILURE"],
    nextStep: { PRESENT_CONFIRMED: "STOP_NEW_APPROVAL_REQUIRED", ZERO_BINDINGS_ABSENT: "STOP_NEW_APPROVAL_REQUIRED", MEMBER_ABSENT: "STOP_NEW_APPROVAL_REQUIRED", AMBIGUOUS: "STOP", READ_FAILURE: "STOP", IDENTITY_FAILURE: "STOP" },
    privacy: { rawPolicyPersisted: false, rawIdentityPersisted: false, rawMemberPersisted: false, rawEtagPersisted: false, rawProcessOutputPersisted: false },
    execution: { executed: false, remoteCalls: 0, mutations: 0 },
  };
}

export function canonicalizeM3L3R3CanonicalPolicyRecoveryPlan(payload) {
  if (!exact(payload, buildM3L3R3CanonicalPolicyRecoveryPlan())) throw new Error("invalid-r3-recovery-plan");
  return JSON.stringify(stable(payload));
}

export function computeM3L3R3CanonicalPolicyRecoveryPlanSha256(payload) {
  return createHash("sha256").update(canonicalizeM3L3R3CanonicalPolicyRecoveryPlan(payload)).digest("hex");
}

export function verifyM3L3R3CanonicalPolicyRecoveryPlan(payload) {
  return exact(payload, buildM3L3R3CanonicalPolicyRecoveryPlan())
    ? Object.freeze({ ok: true, code: "R3_READ_ONLY_RECOVERY_PLAN_LOCKED", sha256: computeM3L3R3CanonicalPolicyRecoveryPlanSha256(payload) })
    : Object.freeze({ ok: false, code: "INVALID_R3_RECOVERY_PLAN" });
}
