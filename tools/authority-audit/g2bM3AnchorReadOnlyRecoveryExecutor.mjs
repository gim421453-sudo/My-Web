import { createG2BRecoveryAnchorStore, recoverG2BAnchorPolicy } from "./g2bRecoveryAnchor.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";
import { resolveLocalGcloudExecutable, runWindowsProcess } from "./windowsGcloudProcessAdapter.mjs";

export const G2B_M3_ANCHOR_RECOVERY_RUNTIME_ID = "G2B_M3_READ_ONLY_ANCHOR_RECOVERY_V2";

function safeResult({
  recoveryResult,
  approvalConsumed = false,
  anchorState = "NOT_VALIDATED",
  policyReadUsed = 0,
  canonicalPolicyParseResult = "NOT_EVALUATED",
  hmacMatchCountCategory = "NOT_EVALUATED",
  anchorTransitioned = false,
} = {}) {
  const currentM3State = recoveryResult === "PRESENT_CONFIRMED"
    ? "EXACT_BINDING_CONFIRMED_BY_ANCHOR_RECOVERY"
    : recoveryResult === "MEMBER_ABSENT_CONFIRMED"
      ? "CONFIRMED_ABSENT_AFTER_INDETERMINATE_MUTATION"
      : "M3_RECOVERY_BLOCKED";
  return Object.freeze({
    runtimeId: G2B_M3_ANCHOR_RECOVERY_RUNTIME_ID,
    recoveryResult,
    currentM3State,
    approvalConsumed,
    approvalStatus: approvalConsumed ? "CONSUMED_NON_REUSABLE" : "NOT_REACHED_NON_REUSABLE",
    recoveryAnchorValid: anchorState === "VALID",
    recoverySecretValid: anchorState === "VALID",
    anchorState,
    canonicalPolicyParseResult,
    hmacMatchCountCategory,
    anchorTransitioned,
    counters: Object.freeze({
      opAUsed: 0,
      localIdentityDiscoveryUsed: 0,
      writerSaIamReadsUsed: policyReadUsed,
      iamPolicyReadsUsed: policyReadUsed,
      physicalRemotePolicyReadsUsed: policyReadUsed,
      projectIamReads: 0,
      retries: 0,
      rollbacks: 0,
      mutations: 0,
      m3Mutations: 0,
      m4Mutations: 0,
      firestoreCalls: 0,
      accessTokenCalls: 0,
      cloudLoggingReads: 0,
      testIamPermissionsCalls: 0,
      serviceAccountKeyOperations: 0,
    }),
  });
}

function selectIndeterminateAnchor(store) {
  const directory = store?.directory;
  if (typeof directory !== "string") return Object.freeze({ ok: false, reason: "ANCHOR_INVALID" });
  // The store intentionally exposes only safe record metadata. The caller never
  // enumerates or returns an IAM member, a policy, or a DPAPI secret.
  const entries = Object.keys(store).length >= 0 ? null : null;
  void entries;
  return null;
}

/**
 * Runs the one approved recovery read only when a caller has already selected
 * exactly one locally validated indeterminate anchor. The executor has no
 * OP-A, no retry, and no mutation path.
 */
export async function executeG2BM3AnchorReadOnlyRecovery({
  enabled = false,
  record,
  store = createG2BRecoveryAnchorStore(),
  secretProvider = createWindowsDpapiSecretProvider(),
  executable = null,
  runProcess = runWindowsProcess,
  environment = process.env,
} = {}) {
  if (enabled !== true) return safeResult({ recoveryResult: "ANCHOR_INVALID" });
  if (!record || record.anchorState !== "MUTATION_INDETERMINATE") {
    return safeResult({ recoveryResult: "ANCHOR_INVALID" });
  }

  const secretResult = secretProvider.read();
  const localCheck = recoverG2BAnchorPolicy({ record, secretResult, policyText: '{"etag":"local-anchor-validation","bindings":[]}' });
  if (localCheck.state === "SECRET_UNAVAILABLE") {
    return safeResult({ recoveryResult: "SECRET_UNAVAILABLE", anchorState: "SECRET_UNAVAILABLE" });
  }
  if (localCheck.state !== "MEMBER_ABSENT_CONFIRMED") {
    return safeResult({ recoveryResult: "ANCHOR_INVALID", anchorState: "ANCHOR_INVALID" });
  }

  const selectedExecutable = executable || resolveLocalGcloudExecutable({ environment });
  if (!selectedExecutable) return safeResult({ recoveryResult: "READ_FAILURE", anchorState: "VALID" });

  const args = ["iam", "service-accounts", "get-iam-policy", record.targetResource, "--format=json", "--verbosity=error"];
  let remote;
  try {
    remote = await runProcess({ executable: selectedExecutable, args, timeoutMs: 30_000, environment });
  } catch {
    remote = null;
  }
  if (!remote || remote.exitCode !== 0 || remote.timedOut === true) {
    return safeResult({ recoveryResult: "READ_FAILURE", approvalConsumed: true, anchorState: "VALID", policyReadUsed: 1 });
  }

  const recovered = recoverG2BAnchorPolicy({ record, secretResult, policyText: remote.stdout });
  const parseResult = recovered.state === "POLICY_PARSE_FAILURE" ? "FAILURE" : "PARSED_CANONICAL_POLICY";
  const category = recovered.semanticMatchCount || "NOT_EVALUATED";
  if (!recovered.ok) {
    return safeResult({
      recoveryResult: recovered.state,
      approvalConsumed: true,
      anchorState: recovered.state === "SECRET_UNAVAILABLE" ? "SECRET_UNAVAILABLE" : "ANCHOR_INVALID",
      policyReadUsed: 1,
      canonicalPolicyParseResult: parseResult,
      hmacMatchCountCategory: category,
    });
  }

  let transitioned = false;
  if (recovered.state === "PRESENT_CONFIRMED") {
    transitioned = store.transition(record.operationGenerationId, "MUTATION_INDETERMINATE", "RECOVERY_CONFIRMED_PRESENT").ok;
  } else if (recovered.state === "MEMBER_ABSENT_CONFIRMED") {
    transitioned = store.transition(record.operationGenerationId, "MUTATION_INDETERMINATE", "RECOVERY_CONFIRMED_ABSENT").ok;
  } else if (recovered.state === "AMBIGUOUS") {
    transitioned = store.transition(record.operationGenerationId, "MUTATION_INDETERMINATE", "RECOVERY_AMBIGUOUS").ok;
  }
  if (!transitioned && ["PRESENT_CONFIRMED", "MEMBER_ABSENT_CONFIRMED", "AMBIGUOUS"].includes(recovered.state)) {
    return safeResult({ recoveryResult: "ANCHOR_INVALID", approvalConsumed: true, anchorState: "ANCHOR_INVALID", policyReadUsed: 1, canonicalPolicyParseResult: parseResult, hmacMatchCountCategory: category });
  }
  return safeResult({
    recoveryResult: recovered.state,
    approvalConsumed: true,
    anchorState: "VALID",
    policyReadUsed: 1,
    canonicalPolicyParseResult: parseResult,
    hmacMatchCountCategory: category,
    anchorTransitioned: transitioned,
  });
}

export const G2B_M3_ANCHOR_RECOVERY_CONTRACT = Object.freeze({
  defaultLiveEnabled: false,
  opAMax: 0,
  localIdentityDiscoveryMax: 0,
  physicalRemotePolicyReadsMax: 1,
  projectIamReadsMax: 0,
  retriesMax: 0,
  mutationsMax: 0,
  m3MutationsMax: 0,
  m4MutationsMax: 0,
  rawMemberPersisted: false,
  rawPolicyPersisted: false,
});
