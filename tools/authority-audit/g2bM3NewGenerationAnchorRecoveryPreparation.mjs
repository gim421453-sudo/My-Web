import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  G2B_TARGET_RESOURCE,
  G2B_TARGET_ROLE,
  createG2BRecoveryAnchorStore,
  recoverG2BAnchorPolicy,
} from "./g2bRecoveryAnchor.mjs";
import {
  G2B_M3_ANCHOR_RECOVERY_CONTRACT,
  G2B_M3_ANCHOR_RECOVERY_RUNTIME_ID,
} from "./g2bM3AnchorReadOnlyRecoveryExecutor.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";
import { sha256Canonical } from "./g2bM3CurrentLiveAttestation.mjs";

export const G2B_NEW_GENERATION_RECOVERY_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-NEW-GENERATION-ANCHOR-READ-ONLY-RECOVERY";
export const G2B_NEW_GENERATION_RECOVERY_TYPE =
  "M3_INDETERMINATE_ANCHOR_BASED_READ_ONLY_RECOVERY";
export const G2B_NEW_GENERATION_OPERATION_GENERATION =
  "214348c8-3be0-44f8-a010-adbe1ac68090";

const LIVE_EVIDENCE_PATH = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-new-generation-live-execution-evidence-v1.json";
const LIVE_RESULT_PATH = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-new-generation-live-result-v1.json";
const SOURCE_LOCK_PATHS = Object.freeze([
  "tools/authority-audit/g2bM3NewGenerationAnchorRecoveryPreparation.mjs",
  "tools/authority-audit/g2bM3AnchorReadOnlyRecoveryExecutor.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/invokeWindowsExecutable.ps1",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/invokeWindowsDpapi.ps1",
]);
const TEST_LOCK_PATHS = Object.freeze([
  "tools/authority-audit-tests/g2bM3AnchorReadOnlyRecoveryExecutor.test.mjs",
  "tools/authority-audit-tests/g2bM3NewGenerationAnchorRecoveryPreparation.test.mjs",
]);
const ARTIFACT_NAMES = Object.freeze({
  sourceLockManifest: "p1-5-c2h2e3d-w1c-m3l3-g2b-m3-new-generation-anchor-recovery-source-lock-manifest-v1.json",
  implementation: "p1-5-c2h2e3d-w1c-m3l3-g2b-m3-new-generation-anchor-recovery-implementation-attestation-v1.json",
  runtimeCapability: "p1-5-c2h2e3d-w1c-m3l3-g2b-m3-new-generation-anchor-recovery-runtime-capability-attestation-v1.json",
  composite: "p1-5-c2h2e3d-w1c-m3l3-g2b-m3-new-generation-anchor-recovery-execution-composite-v1.json",
  packet: "p1-5-c2h2e3d-w1c-m3l3-g2b-m3-new-generation-anchor-recovery-approval-packet-v1.json",
});

function sourceHash(repositoryRoot, path) {
  return createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex");
}

function rawHash(repositoryRoot, path) {
  return createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex");
}

function sourceLocks(repositoryRoot, paths) {
  return Object.freeze(paths.map((path) => Object.freeze({ path, sha256: sourceHash(repositoryRoot, path) })));
}

function validAnchorRecord(record, generation) {
  return record
    && record.operationGenerationId === generation
    && record.targetResource === G2B_TARGET_RESOURCE
    && record.targetRole === G2B_TARGET_ROLE
    && record.anchorState === "MUTATION_INDETERMINATE";
}

/**
 * Local-only inspection. The empty canonical policy is used solely to verify
 * the generation-bound HMAC; it cannot establish remote binding absence.
 */
export function inspectG2BNewGenerationRecoveryAnchor({
  operationGeneration = G2B_NEW_GENERATION_OPERATION_GENERATION,
  store = createG2BRecoveryAnchorStore(),
  secretProvider = createWindowsDpapiSecretProvider(),
} = {}) {
  const loaded = store.load(operationGeneration);
  const record = loaded?.state === "READY" ? loaded.record : null;
  if (!validAnchorRecord(record, operationGeneration)) {
    return Object.freeze({ present: false, generationMatch: false, state: "ANCHOR_INVALID", hmacValid: false, secretProvider: "NOT_VALIDATED" });
  }
  const secret = secretProvider.read();
  const local = recoverG2BAnchorPolicy({
    record,
    secretResult: secret,
    policyText: '{"etag":"local-anchor-validation","bindings":[]}',
  });
  const hmacValid = secret?.state === "READY" && local?.state === "MEMBER_ABSENT_CONFIRMED";
  return Object.freeze({
    present: true,
    generationMatch: true,
    state: record.anchorState,
    hmacValid,
    secretProvider: hmacValid ? (secretProvider.semantic || "WINDOWS_DPAPI_CURRENT_USER_LOCAL_APPDATA_V1") : "SECRET_OR_HMAC_INVALID",
  });
}

function requireReadyAnchor(anchorInspection, operationGeneration) {
  if (!anchorInspection?.present || !anchorInspection.generationMatch || anchorInspection.state !== "MUTATION_INDETERMINATE" || anchorInspection.hmacValid !== true || operationGeneration !== G2B_NEW_GENERATION_OPERATION_GENERATION) {
    throw new Error("new-generation-recovery-anchor-not-ready");
  }
}

function buildGraph(operationGeneration) {
  const nodes = Object.freeze([
    Object.freeze({ id: "ANCHOR_LOAD", kind: "LOCAL_GENERATION_BOUND_ANCHOR_LOAD", max: 1, remote: false }),
    Object.freeze({ id: "DPAPI_SECRET", kind: "LOCAL_CURRENT_USER_DPAPI_SECRET_READ", max: 1, remote: false }),
    Object.freeze({ id: "ANCHOR_HMAC", kind: "LOCAL_HMAC_MEMBER_MATCHER", max: 1, remote: false }),
    Object.freeze({ id: "OP_C_RECOVERY", kind: "EXACT_WRITER_SERVICE_ACCOUNT_IAM_POLICY_READ", max: 1, remote: true }),
    Object.freeze({ id: "CANONICAL_PARSE", kind: "LOCAL_FAIL_CLOSED_CANONICAL_POLICY_PARSE", max: 1, remote: false }),
    Object.freeze({ id: "ANCHOR_TERMINAL", kind: "LOCAL_TERMINAL_ANCHOR_TRANSITION", max: 1, remote: false }),
  ]);
  const graph = Object.freeze({
    runtimeId: G2B_M3_ANCHOR_RECOVERY_RUNTIME_ID,
    operationGeneration,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    nodes,
    edges: Object.freeze([
      ["ANCHOR_LOAD", "DPAPI_SECRET"], ["DPAPI_SECRET", "ANCHOR_HMAC"], ["ANCHOR_HMAC", "OP_C_RECOVERY"],
      ["OP_C_RECOVERY", "CANONICAL_PARSE"], ["CANONICAL_PARSE", "ANCHOR_TERMINAL"],
    ]),
    transitiveDependencyCount: SOURCE_LOCK_PATHS.length,
    unboundDependencies: 0,
    unboundRemoteCapabilities: 0,
    unboundProcessCapabilities: 0,
    projectIamPolicyReadReachability: 0,
  });
  return Object.freeze({ ...graph, identity: `g2b-new-generation-anchor-recovery-${sha256Canonical(graph).slice(0, 16)}` });
}

function liveEvidenceBinding(repositoryRoot) {
  const execution = JSON.parse(readFileSync(resolve(repositoryRoot, LIVE_EVIDENCE_PATH), "utf8"));
  const result = JSON.parse(readFileSync(resolve(repositoryRoot, LIVE_RESULT_PATH), "utf8"));
  const valid = execution.operationGeneration === G2B_NEW_GENERATION_OPERATION_GENERATION
    && result.operationGeneration === G2B_NEW_GENERATION_OPERATION_GENERATION
    && execution.code === "M3_MUTATION_INDETERMINATE"
    && execution.anchorState === "MUTATION_INDETERMINATE"
    && execution.prestateResult === "MEMBER_ABSENT_CONFIRMED"
    && execution.mutationAttemptsUsed === 1
    && execution.poststateResult === "NOT_RUN"
    && execution.mutationProcessMetadata?.processStartState === "STARTED"
    && execution.mutationProcessMetadata?.exitCodeCategory === "NONZERO"
    && execution.mutationProcessMetadata?.timeout === false
    && execution.mutationProcessMetadata?.safeFailureStage === "PROCESS_EXIT"
    && execution.mutationProcessMetadata?.classifierOutputClass === "INDETERMINATE";
  if (!valid) throw new Error("new-generation-live-evidence-invalid");
  return Object.freeze({
    executionEvidenceSha256: rawHash(repositoryRoot, LIVE_EVIDENCE_PATH),
    resultDocumentSha256: rawHash(repositoryRoot, LIVE_RESULT_PATH),
    executionEvidencePath: LIVE_EVIDENCE_PATH,
    resultDocumentPath: LIVE_RESULT_PATH,
  });
}

export function buildG2BNewGenerationAnchorRecoveryPreparation({
  operationGeneration = G2B_NEW_GENERATION_OPERATION_GENERATION,
  repositoryRoot = process.cwd(),
  anchorInspection = inspectG2BNewGenerationRecoveryAnchor({ operationGeneration }),
} = {}) {
  requireReadyAnchor(anchorInspection, operationGeneration);
  const evidence = liveEvidenceBinding(repositoryRoot);
  const runtimeGraph = buildGraph(operationGeneration);
  const sourceLockManifest = Object.freeze({
    schema: "myweb.g2b.new-generation.anchor-recovery.source-lock-manifest.v1",
    stage: G2B_NEW_GENERATION_RECOVERY_STAGE,
    operationGeneration,
    sourceLocks: sourceLocks(repositoryRoot, SOURCE_LOCK_PATHS),
    testLocks: sourceLocks(repositoryRoot, TEST_LOCK_PATHS),
  });
  const implementation = Object.freeze({
    schema: "myweb.g2b.new-generation.anchor-recovery.implementation-attestation.v1",
    stage: G2B_NEW_GENERATION_RECOVERY_STAGE,
    operationGeneration,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    recoveryExecutorContract: G2B_M3_ANCHOR_RECOVERY_CONTRACT,
    recoveryMemberMatchMethod: "HMAC_COMPARE_IN_MEMORY",
    freshIdentityDiscoveryRequired: false,
    opARequired: false,
    canonicalPolicyParser: "M3L3_R3_CANONICAL_POLICY_PARSER",
    parseFailureFailsClosed: true,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    privacy: Object.freeze({ rawMemberPersisted: false, rawPrincipalPersisted: false, rawCredentialPersisted: false, rawPolicyPersisted: false, rawStdoutPersisted: false, rawStderrPersisted: false, anchorSecretPersistedInEvidence: false }),
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.new-generation.anchor-recovery.runtime-capability-attestation.v1",
    stage: G2B_NEW_GENERATION_RECOVERY_STAGE,
    operationGeneration,
    graphIdentity: runtimeGraph.identity,
    graph: runtimeGraph,
    budgets: Object.freeze({ iamPolicyReadsMax: 1, totalPhysicalRemoteRecoveryCallsMax: 1, opAMax: 0, projectIamReadsMax: 0, iamMutationsMax: 0, m3MutationsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0, testIamPermissionsCallsMax: 0, credentialRefreshCallsMax: 0, oauthCallsMax: 0, tokenGenerationMax: 0, serviceAccountTokenGenerationMax: 0, serviceAccountKeyOperationsMax: 0, retriesMax: 0, rollbacksMax: 0, secondRecoveryReadMax: 0 }),
    unboundDependencies: 0,
    unboundRemoteCapabilities: 0,
    unboundProcessCapabilities: 0,
  });
  const composite = Object.freeze({
    schema: "myweb.g2b.new-generation.anchor-recovery.execution-composite.v1",
    stage: G2B_NEW_GENERATION_RECOVERY_STAGE,
    operationGeneration,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    liveEvidence: evidence,
    anchor: anchorInspection,
    recoveryMemberMatchMethod: "HMAC_COMPARE_IN_MEMORY",
    canonicalPolicyParser: "M3L3_R3_CANONICAL_POLICY_PARSER",
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    graphIdentity: runtimeGraph.identity,
  });
  const packet = Object.freeze({
    schema: "myweb.g2b.new-generation.anchor-recovery.approval-packet.v1",
    stage: G2B_NEW_GENERATION_RECOVERY_STAGE,
    type: G2B_NEW_GENERATION_RECOVERY_TYPE,
    purpose: "recover exact G2B binding state after one indeterminate new-generation mutation without retrying it",
    operationGeneration,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    liveExecutionEvidenceSha256: evidence.executionEvidenceSha256,
    liveResultDocumentSha256: evidence.resultDocumentSha256,
    anchorStateRequirement: "MUTATION_INDETERMINATE",
    anchorHmacValidRequired: true,
    recoveryMemberMatchMethod: "HMAC_COMPARE_IN_MEMORY",
    freshIdentityDiscoveryRequired: false,
    opAMax: 0,
    canonicalPolicyParseRequired: true,
    approvalConsumptionPoint: "WHEN_FIRST_APPROVED_EXACT_G2B_WRITER_IAM_POLICY_RECOVERY_READ_BEGINS",
    firstRemoteOperationCannotOccurBeforeApprovalConsumption: true,
    resultDomain: Object.freeze(["MEMBER_PRESENT_CONFIRMED", "MEMBER_ABSENT_CONFIRMED", "RECOVERY_READ_FAILURE", "RECOVERY_AUTH_FAILURE", "RECOVERY_PARSE_FAILURE", "RECOVERY_ANCHOR_FAILURE", "RECOVERY_PRIVACY_GUARD_FAILURE", "RECOVERY_UNEXPECTED_RESPONSE"]),
    budgets: runtimeCapability.budgets,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    executionCompositeSha256: sha256Canonical(composite),
    historicalGenerationReusable: false,
    mutationRetryReachable: false,
    privacy: implementation.privacy,
    packetComplete: true,
    safeToContinueWithoutApproval: false,
  });
  return Object.freeze({ sourceLockManifest, implementation, runtimeCapability, composite, packet });
}

export function verifyG2BNewGenerationAnchorRecoveryPreparation(value, options = {}) {
  try {
    const expected = buildG2BNewGenerationAnchorRecoveryPreparation(options);
    const ok = JSON.stringify(value) === JSON.stringify(expected);
    return Object.freeze({ ok, code: ok ? "NEW_GENERATION_ANCHOR_RECOVERY_PREPARATION_MATCH" : "NEW_GENERATION_ANCHOR_RECOVERY_PREPARATION_MISMATCH" });
  } catch {
    return Object.freeze({ ok: false, code: "NEW_GENERATION_ANCHOR_RECOVERY_PREPARATION_INVALID" });
  }
}

export function writeG2BNewGenerationAnchorRecoveryArtifacts(artifacts, { directory = "docs/evidence" } = {}) {
  if (!artifacts || typeof artifacts !== "object") throw new Error("recovery-artifacts-required");
  mkdirSync(directory, { recursive: true });
  const paths = {};
  for (const [key, name] of Object.entries(ARTIFACT_NAMES)) {
    const path = resolve(directory, name);
    if (existsSync(path)) throw new Error("recovery-artifact-already-exists");
    writeFileSync(path, `${JSON.stringify(artifacts[key], null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    paths[key] = path;
  }
  return Object.freeze({ paths: Object.freeze(paths), packetDocumentRawSha256: createHash("sha256").update(readFileSync(paths.packet)).digest("hex") });
}
