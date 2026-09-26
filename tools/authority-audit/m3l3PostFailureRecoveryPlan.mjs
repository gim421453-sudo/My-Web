import { createHash } from "node:crypto";

export const M3L3_RECOVERY_PLAN_SCHEMA = "myweb.m3l3.post-failure-read-only-recovery-plan.v1";
export const M3L3_RECOVERY_PLAN_VERDICT = "P1_5_C2H2E3D_W1C_M3L3_R1_READ_ONLY_RECOVERY_PLAN_READY_APPROVAL_REQUIRED";

const AUTHORITY = Object.freeze({
  g4r3r2Composite: "1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195",
  g4r3r1Attestation: "82e72c67adf78a837c82c877505ab6265cfa64fda8e14e280964860c1e7909b9",
  g4r3hR2Attestation: "dd488891964eeac9427557b95c5cf46a42bb2f5969bbc6bcba6f55c176c79adc",
  correctedLiveEvidence: "8595cabe34d7f04b8433ef0db99faf364ab51ec337e4764c4b8fbb637b7de322",
});

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

function exact(value, expected) {
  return JSON.stringify(sortValue(value)) === JSON.stringify(sortValue(expected));
}

export function buildM3L3PostFailureRecoveryPlan() {
  return {
    schema: M3L3_RECOVERY_PLAN_SCHEMA,
    authority: { ...AUTHORITY },
    currentRemoteState: "UNKNOWN_AFTER_CONSUMED_M3L3_SESSION",
    identityStrategy: {
      selectedOption: "CURRENT_EXACT_OP_A_AND_DETERMINISTIC_MEMBER_CONSTRUCTION",
      historicalIdentityReconstruction: false,
      fingerprintAuthority: false,
      exactIdentityPersisted: false,
      ambiguityRule: "FAIL_CLOSED_IF_CURRENT_EXACT_MEMBER_CANNOT_BE_ESTABLISHED",
    },
    nodes: [
      {
        id: "RECOVERY_OP_A",
        location: "LOCAL",
        operation: "ACTIVE_CALLER_DISCOVERY",
        commandSurface: "surface.auth.list",
        maxExecutions: 1,
        retryMax: 0,
        output: "IMMUTABLE_TRANSIENT_IDENTITY_CONTEXT",
      },
      {
        id: "RECOVERY_OP_C",
        location: "REMOTE",
        operation: "READ_ONLY_SERVICE_ACCOUNT_IAM_POLICY",
        commandSurface: "surface.iam.service_accounts.get_iam_policy",
        resource: "myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com",
        role: "roles/iam.serviceAccountTokenCreator",
        predecessor: "RECOVERY_OP_A=EXACT_IDENTITY_CONTEXT",
        maxExecutions: 1,
        retryMax: 0,
        output: "BOUNDED_EXACT_MEMBER_PREDICATE_ONLY",
      },
    ],
    budget: {
      localIdentityDiscoveryMax: 1,
      remoteIamReadsMax: 1,
      serviceAccountIamPolicyReadsMax: 1,
      projectIamReadsMax: 0,
      iamMutationAttemptsMax: 0,
      retriesMax: 0,
      rollbacksMax: 0,
      accessTokenCallsMax: 0,
      firestoreCallsMax: 0,
      cloudLoggingReadsMax: 0,
      testIamPermissionsMax: 0,
      m4MutationsMax: 0,
      serviceAccountKeyOperationsMax: 0,
    },
    resultDomain: [
      "TARGET_MEMBER_PRESENT_CONFIRMED",
      "TARGET_ROLE_ZERO_BINDINGS_ABSENT_PROVEN",
      "TARGET_MEMBER_ABSENT_CONFIRMED",
      "AMBIGUOUS",
      "READ_FAILURE",
      "IDENTITY_FAILURE",
    ],
    branchActions: {
      TARGET_MEMBER_PRESENT_CONFIRMED: "PREPARE_M4_APPROVAL_GATE_ONLY",
      TARGET_ROLE_ZERO_BINDINGS_ABSENT_PROVEN: "PREPARE_NEW_M3_MUTATION_APPROVAL_PACKET",
      TARGET_MEMBER_ABSENT_CONFIRMED: "PREPARE_NEW_M3_MUTATION_APPROVAL_PACKET",
      AMBIGUOUS: "STOP_NO_MUTATION",
      READ_FAILURE: "STOP_NO_RETRY",
      IDENTITY_FAILURE: "STOP_NO_REMOTE_READ",
    },
    privacy: {
      rawIdentityPersisted: false,
      exactIamMemberPersisted: false,
      rawIamPolicyPersisted: false,
      rawProcessOutputPersisted: false,
      configRootPersisted: false,
      credentialPersisted: false,
      tokenPersisted: false,
    },
    execution: {
      approved: false,
      executed: false,
      productionCalls: 0,
      mutations: 0,
    },
    verdict: M3L3_RECOVERY_PLAN_VERDICT,
  };
}

function valid(payload) {
  const expected = buildM3L3PostFailureRecoveryPlan();
  return exact(payload, expected);
}

export function canonicalizeM3L3PostFailureRecoveryPlan(payload) {
  if (!valid(payload)) throw new Error("invalid-m3l3-recovery-plan");
  return JSON.stringify(sortValue(payload));
}

export function computeM3L3PostFailureRecoveryPlanSha256(payload) {
  return createHash("sha256").update(canonicalizeM3L3PostFailureRecoveryPlan(payload), "utf8").digest("hex");
}

export function verifyM3L3PostFailureRecoveryPlan(payload) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_RECOVERY_PLAN" });
  return Object.freeze({
    ok: true,
    code: "READ_ONLY_RECOVERY_PLAN_LOCKED_APPROVAL_REQUIRED",
    sha256: computeM3L3PostFailureRecoveryPlanSha256(payload),
  });
}

export const M3L3_RECOVERY_PLAN_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  mutationAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
