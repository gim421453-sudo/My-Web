import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_M3_RUNTIME_CONTRACT } from "./g2bM3RecoveryAnchorRuntime.mjs";
import { G2B_RECOVERY_ANCHOR_CONTRACT, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { WINDOWS_DPAPI_SECRET_PROVIDER_CONTRACT } from "./windowsDpapiSecretProvider.mjs";

export const G2B_CREATE_EVIDENCE_SHA256 = "19e844bea7fe4cc8c5a1b972d4345b4c951df9e153e771f2c45400d98f11e12d";
export const G2B_CREATE_RESULT_DOCUMENT_SHA256 = "d0c5e40ef705e8f937d54eadd69912ec80d2d12dd3b9ba4b92a453553e54a4a6";

const LOCK_PATHS = Object.freeze([
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/invokeWindowsDpapi.ps1",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/writerRotationAuthority.mjs",
]);

function plain(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function sortValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  if (!plain(value)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}
export function canonicalJson(value) { return JSON.stringify(sortValue(value)); }
export function sha256Canonical(value) { return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex"); }
export function sourceLocks(repositoryRoot = process.cwd()) {
  return Object.freeze(LOCK_PATHS.map((path) => Object.freeze({ path, sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex") })));
}

export function buildG2BFutureM3Graph() {
  const nodes = Object.freeze([
    { id: "OP_A", kind: "LOCAL_IDENTITY_DISCOVERY", max: 1, predecessors: [] },
    { id: "ANCHOR_SECRET", kind: "LOCAL_DPAPI_SECRET_LOAD_OR_INITIALIZE", max: 1, predecessors: ["OP_A"] },
    { id: "ANCHOR_PERSIST", kind: "LOCAL_ATOMIC_ANCHOR_PERSIST_AND_REREAD", max: 4, predecessors: ["ANCHOR_SECRET"] },
    { id: "ANCHOR_VERIFY", kind: "LOCAL_HMAC_ANCHOR_VERIFY", max: 1, predecessors: ["ANCHOR_PERSIST"] },
    { id: "OP_C_PRE", kind: "WRITER_IAM_POLICY_FRESH_PRESTATE", max: 1, predecessors: ["ANCHOR_VERIFY"] },
    { id: "OP_E", kind: "EXACT_G2B_TOKEN_CREATOR_MUTATION", max: 1, predecessors: ["OP_C_PRE=MEMBER_ABSENT_CONFIRMED"] },
    { id: "OP_C_POST", kind: "WRITER_IAM_POLICY_POSTSTATE", max: 1, predecessors: ["OP_E=CONFIRMED_SUCCESS"] },
  ]);
  const graph = Object.freeze({ runtimeId: G2B_M3_RUNTIME_CONTRACT.runtimeId, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, nodes, externalCapabilities: Object.freeze(["windows-gcloud-process-adapter", "iam.serviceAccounts.getIamPolicy", "iam.serviceAccounts.setIamPolicy-binding"]), unboundCapabilities: 0 });
  return Object.freeze({ ...graph, identity: `g2b-m3-${sha256Canonical(graph).slice(0, 16)}` });
}

export function buildG2BImplementationAttestation({ repositoryRoot = process.cwd() } = {}) {
  return Object.freeze({
    schema: "myweb.g2b.m3.recovery-anchor-implementation-attestation.v1",
    g2bCreateEvidenceSha256: G2B_CREATE_EVIDENCE_SHA256,
    g2bCreateResultDocumentSha256: G2B_CREATE_RESULT_DOCUMENT_SHA256,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    recoveryAnchor: G2B_RECOVERY_ANCHOR_CONTRACT,
    secretProvider: WINDOWS_DPAPI_SECRET_PROVIDER_CONTRACT,
    runtime: G2B_M3_RUNTIME_CONTRACT,
    sourceLocks: sourceLocks(repositoryRoot),
  });
}

export function buildG2BRuntimeCapabilityAttestation() {
  const graph = buildG2BFutureM3Graph();
  return Object.freeze({
    schema: "myweb.g2b.m3.runtime-capability-attestation.v1",
    graphIdentity: graph.identity,
    nodeCount: graph.nodes.length,
    executionEdges: 6,
    metadataPredecessorEdges: 6,
    externalCapabilities: graph.externalCapabilities,
    unboundCapabilities: graph.unboundCapabilities,
    budgets: Object.freeze({ localIdentityDiscoveryMax: 1, localAnchorSecretOperationsMax: 1, localAnchorPersistOperationsMax: 4, prestateRemoteReadsMax: 1, m3MutationAttemptsMax: 1, poststateRemoteReadsMax: 1, projectIamReadsMax: 0, iamPolicyReadsMax: 2, retriesMax: 0, rollbacksMax: 0, m4Max: 0, firestoreMax: 0, tokenMax: 0, loggingMax: 0, testIamPermissionsMax: 0, serviceAccountKeyMax: 0 }),
    contract: G2B_M3_RUNTIME_CONTRACT,
  });
}

export function buildG2BFinalExecutionComposite({ implementation, runtimeCapability }) {
  return Object.freeze({
    schema: "myweb.g2b.m3.final-execution-composite.v1",
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    graphIdentity: runtimeCapability.graphIdentity,
    recoveryAnchorRequired: true,
    anchorMustBeVerifiedBeforePrestate: true,
    canonicalParser: "M3L3_R3_CANONICAL_POLICY_PARSER",
    classifier: "UNKNOWN_NONZERO_INDETERMINATE",
    budgets: runtimeCapability.budgets,
    privacy: Object.freeze({ rawMemberPersisted: false, rawPrincipalPersisted: false, rawPolicyPersisted: false, rawSecretPersisted: false }),
    historicalGuards: Object.freeze({ g1: "DISABLED_CONFIRMED_FROZEN", failedG2: "CONFIRMED_NOT_CREATED_INVALID_ACCOUNT_ID" }),
  });
}

export function verifyG2BReattestation({ implementation, runtimeCapability, composite, repositoryRoot = process.cwd() }) {
  const expectedImplementation = buildG2BImplementationAttestation({ repositoryRoot });
  const expectedRuntime = buildG2BRuntimeCapabilityAttestation();
  const expectedComposite = buildG2BFinalExecutionComposite({ implementation: expectedImplementation, runtimeCapability: expectedRuntime });
  const ok = canonicalJson(implementation) === canonicalJson(expectedImplementation)
    && canonicalJson(runtimeCapability) === canonicalJson(expectedRuntime)
    && canonicalJson(composite) === canonicalJson(expectedComposite)
    && runtimeCapability.unboundCapabilities === 0
    && runtimeCapability.contract.mutationWithoutVerifiedAnchorReachability === 0;
  return Object.freeze({ ok, code: ok ? "G2B_REATTESTATION_LOCKS_MATCH" : "G2B_REATTESTATION_LOCK_MISMATCH" });
}
