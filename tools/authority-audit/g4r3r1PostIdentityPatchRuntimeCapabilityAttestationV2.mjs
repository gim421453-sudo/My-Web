import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const G4R3R1_V2_SCHEMA = "myweb.m3l2.g4r3r1.post-identity-patch-runtime-capability.v2";
const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_PATH = /^(tools|docs|sdk)\/[A-Za-z0-9._/-]+$/;
const GRAPH_NODES = ["ROLE_STAGE1", "ROLE_CANONICAL", "OP_A", "OP_B", "OP_C_PRE", "OP_D_PRE", "OP_E", "OP_C_POST", "OP_D_POST"];
const PINNED_OPS = ["OP_B", "OP_C_PRE", "OP_D_PRE", "OP_E", "OP_C_POST", "OP_D_POST"];
const FORBIDDEN_KEY = /^(timestamp|createdAt|updatedAt|principal|member|email|uid|token|credential|configRootValue|absolutePath|rawArgv|rawEnvironment|rawPolicy|rawOutput)$/i;
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const hash = (value) => typeof value === "string" && SHA256.test(value);
const falseMap = (value) => plain(value) && Object.values(value).every((item) => item === false);

function noForbiddenKeys(value) {
  if (Array.isArray(value)) return value.every(noForbiddenKeys);
  if (!plain(value)) return true;
  return Object.entries(value).every(([key, child]) => !FORBIDDEN_KEY.test(key) && noForbiddenKeys(child));
}

function validRepoLocks(value) {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => plain(entry)
    && Object.keys(entry).length === 3 && SAFE_PATH.test(entry.path) && !entry.path.startsWith("sdk/")
    && !entry.path.includes("..") && hash(entry.sha256) && typeof entry.role === "string");
}

function validSdkLocks(value) {
  return Array.isArray(value) && value.length === 15 && value.every((entry) => plain(entry)
    && Object.keys(entry).length === 4 && entry.path.startsWith("sdk/") && SAFE_PATH.test(entry.path)
    && hash(entry.sha256) && /^CAP_[0-9]{2}$/.test(entry.logicalId)
    && Array.isArray(entry.operations) && entry.operations.length > 0);
}

function valid(payload) {
  if (!plain(payload) || payload.schema !== G4R3R1_V2_SCHEMA || !noForbiddenKeys(payload)) return false;
  if (!hash(payload.g4r3hR2AttestationSha256) || !hash(payload.g4r3hR2ResultDocumentSha256)) return false;
  if (!validRepoLocks(payload.repositoryLocks) || !validSdkLocks(payload.sdkSourceLocks)) return false;
  const graph = payload.runtimeGraph;
  if (!plain(graph) || graph.nodeCount !== 9 || graph.metadataEdgeCount !== 7 || graph.executionEdgeCount !== 8
    || JSON.stringify(graph.nodes) !== JSON.stringify(GRAPH_NODES) || !hash(graph.graphIdentitySha256)) return false;
  const identity = payload.identityContract;
  if (!plain(identity) || identity.legacyFingerprintAuthorizationReachability !== 0 || identity.opACardinality !== "EXACTLY_ONE"
    || identity.opAConfigRootEqualsSession !== "BY_CONSTRUCTION" || identity.contextCreatedCountMax !== 1
    || identity.contextImmutable !== true || identity.exactMemberConstructedCount !== 1 || identity.memberRederivationAfterContext !== 0) return false;
  const session = payload.sessionEnvironment;
  if (!plain(session) || session.childSnapshotCreatedCount !== 1 || session.configRootPinned !== true
    || session.configRootReread !== false || session.mutableParentEnvironmentReused !== false
    || JSON.stringify(session.sanitizedOverrideSurfaces) !== JSON.stringify(["CLOUDSDK_AUTH_ACCESS_TOKEN", "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE", "CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT"])) return false;
  const commands = payload.commandSurfaces;
  if (!plain(commands) || JSON.stringify(commands.accountPinnedOperations) !== JSON.stringify(PINNED_OPS)
    || commands.configurationNone !== true || commands.conflictingAccountFlagReachable !== false
    || commands.conflictingConfigurationFlagReachable !== false || commands.flagsFileReachable !== false
    || commands.unpinnedRetryReachable !== false) return false;
  const prestate = payload.prestate;
  if (!plain(prestate) || prestate.resultDomain !== "TARGET_MEMBER_PRESENT|TARGET_MEMBER_ABSENT|AMBIGUOUS|READ_FAILURE"
    || prestate.inspection !== "TRANSIENT_EXACT_COMPARE_ONLY" || prestate.memberEqualsMutation !== "BY_CONSTRUCTION"
    || prestate.effectiveCallerContext !== "SAME_SESSION_IDENTITY_CONTEXT") return false;
  const classifier = payload.classifier;
  if (!plain(classifier) || classifier.unknownNonzero !== "INDETERMINATE" || classifier.timeoutAfterMutationStart !== "INDETERMINATE"
    || classifier.errorPrefixProvesRemoteNonApplication !== false || !Array.isArray(classifier.confirmedFailureRules)
    || classifier.confirmedFailureRules.length !== 0 || classifier.mutationMax !== 1 || classifier.retry !== 0
    || classifier.rollback !== 0 || classifier.secondMutationReachable !== false) return false;
  if (payload.externalCapabilities?.sdkVersion !== "580.0.0" || payload.externalCapabilities?.count !== 15
    || payload.externalCapabilities?.bound !== 15 || payload.externalCapabilities?.unbound !== 0) return false;
  const adapter = payload.windowsAdapterSecurity;
  if (!plain(adapter) || adapter.argumentArrayBoundary !== "PASS" || adapter.rawIdentityShellInterpolation !== false
    || adapter.sessionEnvironmentPassedExplicitly !== true || adapter.sensitiveEnvironmentProjected !== false) return false;
  if (!falseMap(payload.forbiddenReachability) || !falseMap(payload.privacy)) return false;
  return payload.futureAuthority?.newFinalCompositeRequired === true && payload.futureAuthority?.m3l3LiveApprovalGranted === false
    && payload.verdict === "P1_5_C2H2E3D_W1C_M3L2_G4R3R1_POST_IDENTITY_PATCH_RUNTIME_CAPABILITY_REATTESTATION_PASS_G4R3R2_REQUIRED";
}

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseG4R3R1_V2(text) { try { const payload = JSON.parse(text); return valid(payload) ? payload : null; } catch { return null; } }
export function canonicalizeG4R3R1_V2(payload) { if (!valid(payload)) throw new Error("invalid-g4r3r1-v2-payload"); return JSON.stringify(sortValue(payload)); }
export function computeG4R3R1_V2Sha256(payload) { return createHash("sha256").update(canonicalizeG4R3R1_V2(payload), "utf8").digest("hex"); }
export function verifyG4R3R1_V2(payload) { return valid(payload) ? Object.freeze({ ok: true, code: "POST_IDENTITY_PATCH_RUNTIME_CAPABILITY_REATTESTATION_PASS", sha256: computeG4R3R1_V2Sha256(payload) }) : Object.freeze({ ok: false, code: "INVALID_ATTESTATION" }); }
export function verifyG4R3R1_V2SourceLocks(payload, { repositoryRoot = process.cwd(), sdkRoot = null } = {}) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_ATTESTATION", checked: 0 });
  let checked = 0;
  for (const entry of [...payload.repositoryLocks, ...payload.sdkSourceLocks]) {
    const root = entry.path.startsWith("sdk/") ? sdkRoot : repositoryRoot;
    const relative = entry.path.startsWith("sdk/") ? entry.path.slice(4) : entry.path;
    if (!root) return Object.freeze({ ok: false, code: "SOURCE_ROOT_UNAVAILABLE", checked });
    const target = resolve(root, relative);
    if (!target.startsWith(resolve(root)) || !existsSync(target)) return Object.freeze({ ok: false, code: "SOURCE_LOCK_MISSING", checked });
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== entry.sha256) return Object.freeze({ ok: false, code: "SOURCE_LOCK_DRIFT", checked, path: entry.path });
    checked += 1;
  }
  return Object.freeze({ ok: true, code: "SOURCE_LOCKS_MATCH", checked });
}
