import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const G4R3R1_ATTESTATION_SCHEMA = "myweb.m3l2.g4r3r1.post-identity-patch-runtime-capability.v1";
const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_PATH = /^(tools|docs|sdk)\/[A-Za-z0-9._/-]+$/;
const GRAPH_IDS = ["ROLE_STAGE1", "ROLE_CANONICAL", "OP_A", "OP_B", "OP_C_PRE", "OP_D_PRE", "OP_E", "OP_C_POST", "OP_D_POST"];
const FORBIDDEN_KEY = /^(principal|member|email|uid|workspace|token|credential|absolutePath|rawOutput|rawPolicy|configRootValue)$/i;

const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const safePath = (value) => typeof value === "string" && SAFE_PATH.test(value) && !value.includes("..") && !/^[A-Za-z]:|^[/\\]/.test(value);
const noForbiddenKeys = (value) => Array.isArray(value) ? value.every(noForbiddenKeys) : !plain(value) || Object.entries(value).every(([key, child]) => !FORBIDDEN_KEY.test(key) && noForbiddenKeys(child));
const lockList = (value) => Array.isArray(value) && value.length > 0 && value.every((entry) => exactKeys(entry, ["path", "sha256"]) && safePath(entry.path) && SHA256.test(entry.sha256));

function valid(payload) {
  if (!plain(payload) || payload.schema !== G4R3R1_ATTESTATION_SCHEMA || !noForbiddenKeys(payload)) return false;
  for (const key of ["g4r3hAttestationSha256", "g4r3fPayloadSha256", "g4r3sPayloadSha256", "g4r3dPayloadSha256", "g4r2CompositeSha256"]) if (!SHA256.test(payload[key])) return false;
  if (!exactKeys(payload.historicalBaseline, ["freshPrePatchCaptureAvailable", "prePatchLockSource", "perFileHistoricalAttestedPrePatchLocks"]) || payload.historicalBaseline.freshPrePatchCaptureAvailable !== false || payload.historicalBaseline.prePatchLockSource !== "G4R1_G4R2_HISTORICAL_ATTESTATION") return false;
  if (!lockList(payload.postPatchRuntimeLocks) || !lockList(payload.postPatchTestLocks) || !Array.isArray(payload.sdkSourceLocks) || payload.sdkSourceLocks.length !== 15 || payload.sdkSourceLocks.some((entry) => !exactKeys(entry, ["path", "sha256", "role"]) || !safePath(entry.path) || !SHA256.test(entry.sha256))) return false;
  const graph = payload.runtimeGraph;
  if (!exactKeys(graph, ["nodeCount", "edgeCount", "graphIdentity", "opEIdentityGated", "mutationMax", "retry", "rollback"]) || graph.nodeCount !== 9 || graph.edgeCount !== 8 || JSON.stringify(graph.graphIdentity) !== JSON.stringify(GRAPH_IDS) || graph.opEIdentityGated !== true || graph.mutationMax !== 1 || graph.retry !== 0 || graph.rollback !== 0) return false;
  if (!exactKeys(payload.identityContract, ["legacyFingerprintAuthorizationReachable", "exactPrincipalFlow", "allowedPrincipalKind", "exactMemberConstruction", "contextCreatedMax", "contextImmutable", "memberRederivation", "persistence"]) || payload.identityContract.legacyFingerprintAuthorizationReachable !== false || payload.identityContract.exactPrincipalFlow !== "OP_A_TO_VALIDATOR_TO_ONCE_MEMBER_TO_IMMUTABLE_CONTEXT" || payload.identityContract.allowedPrincipalKind !== "user|serviceAccount" || payload.identityContract.exactMemberConstruction !== "ONCE" || payload.identityContract.contextCreatedMax !== 1 || payload.identityContract.contextImmutable !== true || payload.identityContract.memberRederivation !== 0 || payload.identityContract.persistence !== "NONE") return false;
  const session = payload.sessionEnvironment;
  if (!exactKeys(session, ["snapshotCreatedOnce", "configRootPinned", "opAUsesSessionRoot", "downstreamUsesSessionRoot", "sanitizedAuthOverrides", "configRootReread", "mutableParentEnvReuse"]) || session.snapshotCreatedOnce !== true || session.configRootPinned !== true || session.opAUsesSessionRoot !== "BY_CONSTRUCTION" || session.downstreamUsesSessionRoot !== "BY_CONSTRUCTION" || !Array.isArray(session.sanitizedAuthOverrides) || session.configRootReread !== false || session.mutableParentEnvReuse !== false) return false;
  const surfaces = payload.commandSurfaces;
  if (!exactKeys(surfaces, ["opA", "opB", "opC", "opD", "opE", "accountPinnedOperations", "configurationNone", "duplicateAccountFlag", "duplicateConfigurationFlag", "rawPrincipalShellInterpolation", "argumentArrayBoundary"]) || surfaces.configurationNone !== true || surfaces.duplicateAccountFlag !== false || surfaces.duplicateConfigurationFlag !== false || surfaces.rawPrincipalShellInterpolation !== false || surfaces.argumentArrayBoundary !== "PASS") return false;
  if (!exactKeys(payload.prestate, ["resultDomain", "exactMemberCompare", "sameMemberByConstruction", "effectiveCallerContext"]) || payload.prestate.resultDomain !== "TARGET_MEMBER_PRESENT|TARGET_MEMBER_ABSENT|AMBIGUOUS|READ_FAILURE" || payload.prestate.exactMemberCompare !== "TRANSIENT_EXACT_COMPARE_ONLY" || payload.prestate.sameMemberByConstruction !== true || payload.prestate.effectiveCallerContext !== "SAME_SESSION_IDENTITY_CONTEXT") return false;
  if (!exactKeys(payload.classifier, ["unknownNonzero", "timeoutAfterMutationStart", "errorPrefixV1ProvesRemoteNonApplication", "confirmedFailureRules"]) || payload.classifier.unknownNonzero !== "INDETERMINATE" || payload.classifier.timeoutAfterMutationStart !== "INDETERMINATE" || payload.classifier.errorPrefixV1ProvesRemoteNonApplication !== "no" || payload.classifier.confirmedFailureRules.length !== 0) return false;
  if (!exactKeys(payload.externalCapabilities, ["count", "bound", "unbound"]) || payload.externalCapabilities.count !== 15 || payload.externalCapabilities.bound !== 15 || payload.externalCapabilities.unbound !== 0) return false;
  if (!exactKeys(payload.windowsAdapterSecurity, ["sessionEnvironmentPassed", "sensitiveEnvironmentProjected", "shellInterpolation", "argumentArrayBoundary"]) || payload.windowsAdapterSecurity.sessionEnvironmentPassed !== true || payload.windowsAdapterSecurity.sensitiveEnvironmentProjected !== false || payload.windowsAdapterSecurity.shellInterpolation !== false || payload.windowsAdapterSecurity.argumentArrayBoundary !== "PASS") return false;
  if (!plain(payload.forbiddenReachability) || Object.values(payload.forbiddenReachability).some((value) => value !== false)) return false;
  if (!plain(payload.privacy) || Object.values(payload.privacy).some((value) => value !== false)) return false;
  if (!exactKeys(payload.historicalAuthorityStatus, ["g4r1", "g4r2"]) || payload.historicalAuthorityStatus.g4r1 !== "HISTORICAL_ONLY_FOR_PRE_IDENTITY_PATCH_RUNTIME" || payload.historicalAuthorityStatus.g4r2 !== "HISTORICAL_STRUCTURALLY_VALID_BUT_BLOCKED_PRE_IDENTITY_PATCH_COMPOSITE") return false;
  if (!exactKeys(payload.futureAuthority, ["newFinalCompositeRequired", "m3l3ApprovalGranted"]) || payload.futureAuthority.newFinalCompositeRequired !== true || payload.futureAuthority.m3l3ApprovalGranted !== false) return false;
  return true;
}

function sortValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(sortValue);
  if (!plain(value)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseG4R3R1Attestation(text) {
  if (typeof text !== "string") return null;
  try { const payload = JSON.parse(text); return valid(payload) ? payload : null; } catch { return null; }
}
export function canonicalizeG4R3R1Attestation(payload) { if (!valid(payload)) throw new Error("invalid-g4r3r1-attestation"); return JSON.stringify(sortValue(payload)); }
export function computeG4R3R1AttestationSha256(payload) { return createHash("sha256").update(canonicalizeG4R3R1Attestation(payload), "utf8").digest("hex"); }
export function verifyG4R3R1Attestation(payload) { if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_ATTESTATION" }); return Object.freeze({ ok: true, code: "POST_IDENTITY_PATCH_RUNTIME_CAPABILITY_REATTESTATION_PASS", sha256: computeG4R3R1AttestationSha256(payload) }); }

export function verifyG4R3R1SourceLocks(payload, { repositoryRoot = process.cwd(), sdkRoot = null } = {}) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_ATTESTATION", checked: 0 });
  let checked = 0;
  for (const entry of [...payload.postPatchRuntimeLocks, ...payload.postPatchTestLocks, ...payload.sdkSourceLocks]) {
    const base = entry.path.startsWith("sdk/") ? sdkRoot : repositoryRoot;
    const relative = entry.path.startsWith("sdk/") ? entry.path.slice(4) : entry.path;
    if (!base) return Object.freeze({ ok: false, code: "SDK_ROOT_UNAVAILABLE", checked });
    const target = resolve(join(base, relative));
    if (!existsSync(target)) return Object.freeze({ ok: false, code: "SOURCE_LOCK_MISSING", checked });
    const hash = createHash("sha256").update(readFileSync(target)).digest("hex");
    if (hash !== entry.sha256) return Object.freeze({ ok: false, code: "SOURCE_LOCK_DRIFT", checked, path: entry.path });
    checked += 1;
  }
  return Object.freeze({ ok: true, code: "SOURCE_LOCKS_MATCH", checked });
}
