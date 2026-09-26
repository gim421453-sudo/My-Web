import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_CURRENT_LIVE_EXECUTOR_CONTRACT, G2B_CURRENT_LIVE_RUNTIME_ID } from "./g2bM3CurrentLiveExecutor.mjs";
import { G2B_M3_RUNTIME_CONTRACT } from "./g2bM3RecoveryAnchorRuntime.mjs";
import { G2B_RECOVERY_ANCHOR_CONTRACT, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT } from "./m3RuntimeCommandGraph.mjs";

export const G2B_CURRENT_M3_OPERATION_GENERATION = "9662e385-82ab-4a73-8a5a-e8a25a9f4478";
export const G2B_CURRENT_LIVE_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-CURRENT-BOUND-LIVE";

const SOURCE_LOCK_PATHS = Object.freeze([
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/m3RuntimeCommandGraph.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/invokeWindowsDpapi.ps1",
  "tools/authority-audit/g2bM3CurrentLiveAttestation.mjs",
  "tools/authority-audit/g2bM3CurrentLiveApprovalPacket.mjs",
]);

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sortValue(value) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(sortValue);
  if (!plain(value)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function canonicalJson(value) { return JSON.stringify(sortValue(value)); }
export function sha256Canonical(value) { return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex"); }

export function currentSourceLocks(repositoryRoot = process.cwd()) {
  return Object.freeze(SOURCE_LOCK_PATHS.map((path) => Object.freeze({
    path,
    sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex"),
  })));
}

export function buildG2BCurrentLiveGraph({ operationGeneration = G2B_CURRENT_M3_OPERATION_GENERATION } = {}) {
  const nodes = Object.freeze([
    { id: "OP_A", kind: "LOCAL_IDENTITY_DISCOVERY", max: 1, remote: false, projectIam: false },
    { id: "ANCHOR_SECRET", kind: "LOCAL_DPAPI_SECRET_LOAD_OR_INITIALIZE", max: 1, remote: false, projectIam: false },
    { id: "ANCHOR_PERSIST", kind: "LOCAL_ATOMIC_ANCHOR_PERSIST_AND_REREAD", max: 4, remote: false, projectIam: false },
    { id: "ANCHOR_VERIFY", kind: "LOCAL_HMAC_ANCHOR_VERIFY", max: 1, remote: false, projectIam: false },
    { id: "OP_C_PRE", kind: "WRITER_IAM_POLICY_FRESH_PRESTATE", max: 1, remote: true, projectIam: false, physicalProviderCallsMin: 1 },
    { id: "OP_E", kind: "EXACT_G2B_TOKEN_CREATOR_MUTATION", max: 1, remote: true, projectIam: false, physicalProviderCallsMin: M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.mutationProcessPhysicalProviderCallsMin },
    { id: "OP_C_POST", kind: "WRITER_IAM_POLICY_POSTSTATE", max: 1, remote: true, projectIam: false, physicalProviderCallsMin: 1 },
  ]);
  const edges = Object.freeze([
    ["OP_A", "ANCHOR_SECRET"], ["ANCHOR_SECRET", "ANCHOR_PERSIST"], ["ANCHOR_PERSIST", "ANCHOR_VERIFY"],
    ["ANCHOR_VERIFY", "OP_C_PRE"], ["OP_C_PRE", "OP_E"], ["OP_E", "OP_C_POST"],
  ]);
  const graph = Object.freeze({
    runtimeId: G2B_CURRENT_LIVE_RUNTIME_ID,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    operationGeneration,
    nodes,
    edges,
    externalCapabilities: Object.freeze([
      "windows-gcloud-process-adapter",
      "iam.serviceAccounts.getIamPolicy",
      "iam.serviceAccounts.setIamPolicy-binding",
    ]),
    unboundRemoteCapabilities: 0,
    unboundProcessCapabilities: 0,
    projectIamReadReachability: 0,
    prospectiveM3Reachable: false,
    remoteCapabilityAccounting: M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT,
  });
  return Object.freeze({ ...graph, identity: `g2b-current-live-${sha256Canonical(graph).slice(0, 16)}` });
}

export function buildG2BCurrentImplementationAttestation({ repositoryRoot = process.cwd() } = {}) {
  return Object.freeze({
    schema: "myweb.g2b.current-live.implementation-attestation.v1",
    stage: G2B_CURRENT_LIVE_STAGE,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    operationGeneration: G2B_CURRENT_M3_OPERATION_GENERATION,
    coordinator: G2B_M3_RUNTIME_CONTRACT,
    executor: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT,
    recoveryAnchor: G2B_RECOVERY_ANCHOR_CONTRACT,
    sourceLocks: currentSourceLocks(repositoryRoot),
    privacy: Object.freeze({ rawIdentityPersisted: false, rawMemberPersisted: false, rawPolicyPersisted: false, rawOutputPersisted: false }),
  });
}

export function buildG2BCurrentRuntimeCapabilityAttestation({ operationGeneration = G2B_CURRENT_M3_OPERATION_GENERATION } = {}) {
  const graph = buildG2BCurrentLiveGraph({ operationGeneration });
  return Object.freeze({
    schema: "myweb.g2b.current-live.runtime-capability-attestation.v1",
    stage: G2B_CURRENT_LIVE_STAGE,
    graphIdentity: graph.identity,
    graph,
    executorBound: true,
    coordinatorToExecutorBindingVerified: true,
    budgets: Object.freeze({
      localIdentityDiscoveryMax: 1,
      recoverySecretOperationsMax: 1,
      anchorPersistOperationsMax: 4,
      prestateWriterIamPolicyReadsMax: 1,
      prestateProjectIamReadsMax: 0,
      prestatePhysicalRemoteReadsMax: 1,
      m3MutationAttemptsMax: 1,
      poststateWriterIamPolicyReadsMax: 1,
      poststateProjectIamReadsMax: 0,
      poststatePhysicalRemoteReadsMax: 1,
      totalProjectIamReadsMax: 0,
      totalWriterIamPolicyReadsMax: 2,
      totalPhysicalRemoteReadsMax: 2,
      mutationProcessInternalGetIamPolicyMin: 1,
      mutationProcessInternalSetIamPolicyMin: 1,
      mutationProcessPhysicalProviderCallsMin: 2,
      totalPhysicalProviderCallsMin: 4,
      totalPhysicalProviderCallsMax: "UNKNOWN",
      retriesMax: 0,
      rollbacksMax: 0,
      secondMutationMax: 0,
      m4Max: 0,
      firestoreMax: 0,
      tokenMax: 0,
      loggingMax: 0,
      testIamPermissionsMax: 0,
      serviceAccountKeyMax: 0,
    }),
    unboundRemoteCapabilities: 0,
    unboundProcessCapabilities: 0,
    prospectiveM3Reachable: false,
    remoteCapabilityAccounting: M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT,
  });
}

export function buildG2BCurrentFinalExecutionComposite({ implementation, runtimeCapability } = {}) {
  if (!implementation || !runtimeCapability) throw new Error("current-live-attestations-required");
  return Object.freeze({
    schema: "myweb.g2b.current-live.final-execution-composite.v1",
    stage: G2B_CURRENT_LIVE_STAGE,
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    operationGeneration: G2B_CURRENT_M3_OPERATION_GENERATION,
    graphIdentity: runtimeCapability.graphIdentity,
    liveExecutorBound: true,
    liveCoordinatorToExecutorBindingVerified: true,
    projectIamReadReachability: 0,
    unboundRemoteCapabilities: 0,
    unboundProcessCapabilities: 0,
    recoveryAnchorRequired: true,
    newAnchorRequired: true,
    freshOpARequired: true,
    anchorMustBeVerifiedBeforePrestate: true,
    freshPrestateRequired: true,
    canonicalParser: "M3L3_R3_CANONICAL_POLICY_PARSER",
    classifier: "UNKNOWN_NONZERO_INDETERMINATE",
    prospectiveM3Reachable: false,
    remoteCapabilityAccountingRequired: true,
    privacy: Object.freeze({ rawIdentityPersisted: false, rawMemberPersisted: false, rawPolicyPersisted: false, rawOutputPersisted: false }),
    historicalGuards: Object.freeze({ g1: "DISABLED_CONFIRMED_FROZEN", priorG2B: "RECOVERED_MEMBER_ABSENT_NON_REUSABLE" }),
  });
}

export function verifyG2BCurrentLiveAttestations({ implementation, runtimeCapability, composite, repositoryRoot = process.cwd() } = {}) {
  let expected;
  try {
    const expectedImplementation = buildG2BCurrentImplementationAttestation({ repositoryRoot });
    const expectedRuntime = buildG2BCurrentRuntimeCapabilityAttestation();
    expected = buildG2BCurrentFinalExecutionComposite({ implementation: expectedImplementation, runtimeCapability: expectedRuntime });
    const ok = canonicalJson(implementation) === canonicalJson(expectedImplementation)
      && canonicalJson(runtimeCapability) === canonicalJson(expectedRuntime)
      && canonicalJson(composite) === canonicalJson(expected)
      && runtimeCapability.executorBound === true
      && runtimeCapability.coordinatorToExecutorBindingVerified === true
      && runtimeCapability.unboundRemoteCapabilities === 0
      && runtimeCapability.unboundProcessCapabilities === 0;
    return Object.freeze({ ok, code: ok ? "G2B_CURRENT_LIVE_ATTESTATIONS_MATCH" : "G2B_CURRENT_LIVE_ATTESTATIONS_MISMATCH" });
  } catch { return Object.freeze({ ok: false, code: "G2B_CURRENT_LIVE_ATTESTATIONS_INVALID" }); }
}
