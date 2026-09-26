import { createHash } from "node:crypto";

export const G4R3H_ATTESTATION_SCHEMA = "myweb.m3l2.g4r3h.exact-effective-caller-identity-implementation.v1";
const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_PATH = /^(tools|docs)\/[A-Za-z0-9._/-]+$/;

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sortValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(sortValue);
  if (!plain(value)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

function containsUnsafe(value) {
  if (Array.isArray(value)) return value.some(containsUnsafe);
  if (!plain(value)) return typeof value === "string" && (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || /^[A-Za-z]:[\\/]/.test(value) || /^\//.test(value));
  return Object.entries(value).some(([key, child]) => /^(exactPrincipal|exactIamMember|rawPrincipal|rawMember|rawArgv|rawEnvironment|rawPolicy|credentialPath|configRootValue|tokenValue|email|uid|stdout|stderr)$/i.test(key) || containsUnsafe(child));
}

function lockList(value) {
  return Array.isArray(value) && value.length > 0 && value.every((lock) => plain(lock)
    && typeof lock.path === "string" && SAFE_PATH.test(lock.path)
    && typeof lock.sha256 === "string" && SHA256.test(lock.sha256)
    && typeof lock.role === "string");
}

function validPayload(payload) {
  if (!plain(payload) || payload.schema !== G4R3H_ATTESTATION_SCHEMA || containsUnsafe(payload)) return false;
  for (const key of ["g4r3fPayloadSha256", "g4r3fResultDocumentSha256", "g4r3sPayloadSha256", "g4r3sResultDocumentSha256", "g4r3dPayloadSha256", "g4r2CompositeSha256"]) {
    if (!SHA256.test(payload[key])) return false;
  }
  if (!lockList(payload.postPatchRuntimeLocks) || !lockList(payload.testLocks)) return false;
  if (!plain(payload.identityContract) || payload.identityContract.legacyFingerprintAuthorizationRemoved !== true
    || payload.identityContract.exactPrincipalDiscovery !== "SINGLE_SUPPORTED_PRINCIPAL"
    || payload.identityContract.allowedPrincipalKind !== "user|serviceAccount"
    || payload.identityContract.principalNormalization !== "TRIM_ONLY_EXACT_VALIDATION"
    || payload.identityContract.exactMemberConstruction !== "ONCE_FROM_EXACT_CONTEXT"
    || payload.identityContract.identityContextImmutable !== true
    || payload.identityContract.identityContextPersisted !== false
    || payload.identityContract.memberRederivationCount !== 0) return false;
  if (!plain(payload.callerPinning) || payload.callerPinning.configurationNone !== true
    || payload.callerPinning.configRootPinned !== true || payload.callerPinning.childEnvSnapshot !== true
    || payload.callerPinning.accessTokenOverrideReachable !== false
    || payload.callerPinning.credentialFileOverrideReachable !== false
    || payload.callerPinning.impersonationReachable !== false
    || payload.callerPinning.flagsFileReachable !== false
    || payload.callerPinning.unpinnedRetryReachable !== false) return false;
  if (!plain(payload.prestate) || payload.prestate.resultDomain !== "TARGET_MEMBER_PRESENT|TARGET_MEMBER_ABSENT|AMBIGUOUS|READ_FAILURE"
    || payload.prestate.exactMemberTransientCompare !== true || payload.prestate.sameContextAsMutation !== true) return false;
  if (!plain(payload.mutation) || payload.mutation.maxAttempts !== 1 || payload.mutation.retry !== 0 || payload.mutation.rollback !== 0) return false;
  if (!plain(payload.privacy) || Object.values(payload.privacy).some((value) => value !== false)) return false;
  if (!plain(payload.futureAuthority) || payload.futureAuthority.postPatchReattestationRequired !== true
    || payload.futureAuthority.newFinalCompositeRequired !== true || payload.futureAuthority.m3l3ApprovalGranted !== false) return false;
  return payload.forbiddenReachability?.m4 === false
    && payload.forbiddenReachability?.firestore === false
    && payload.forbiddenReachability?.token === false
    && payload.forbiddenReachability?.key === false
    && payload.forbiddenReachability?.cloudLogging === false;
}

export function parseG4R3HAttestation(text) {
  if (typeof text !== "string") return null;
  try { const payload = JSON.parse(text); return validPayload(payload) ? payload : null; } catch { return null; }
}

export function canonicalizeG4R3HAttestation(payload) {
  if (!validPayload(payload)) throw new Error("invalid-g4r3h-attestation");
  return JSON.stringify(sortValue(payload));
}

export function computeG4R3HAttestationSha256(payload) {
  return createHash("sha256").update(canonicalizeG4R3HAttestation(payload), "utf8").digest("hex");
}

export function verifyG4R3HAttestation(payload) {
  if (!validPayload(payload)) return Object.freeze({ ok: false, code: "INVALID_ATTESTATION" });
  return Object.freeze({ ok: true, code: "EXACT_IDENTITY_CONTRACT_IMPLEMENTED_LOCAL", sha256: computeG4R3HAttestationSha256(payload) });
}
