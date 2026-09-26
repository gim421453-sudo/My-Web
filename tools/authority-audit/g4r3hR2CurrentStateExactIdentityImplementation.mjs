import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const G4R3H_R2_SCHEMA = "myweb.m3l2.g4r3h-r2.current-state-exact-identity-implementation.v1";
const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_PATH = /^(tools|docs)\/[A-Za-z0-9._/-]+$/;
const FORBIDDEN_KEY = /^(timestamp|createdAt|updatedAt|principal|member|email|uid|token|credential|configRoot|absolutePath|rawArgv|rawEnvironment|rawPolicy)$/i;
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const hash = (value) => typeof value === "string" && SHA256.test(value);
const boolsFalse = (value) => plain(value) && Object.values(value).every((item) => item === false);

function noForbiddenKeys(value) {
  if (Array.isArray(value)) return value.every(noForbiddenKeys);
  if (!plain(value)) return true;
  return Object.entries(value).every(([key, child]) => !FORBIDDEN_KEY.test(key) && noForbiddenKeys(child));
}

function validLocks(value) {
  return Array.isArray(value) && value.length > 0 && value.every((entry) =>
    plain(entry) && Object.keys(entry).length === 3 && SAFE_PATH.test(entry.path)
      && !entry.path.includes("..") && hash(entry.sha256) && typeof entry.role === "string" && entry.role.length > 0);
}

function valid(payload) {
  if (!plain(payload) || payload.schema !== G4R3H_R2_SCHEMA || !noForbiddenKeys(payload)) return false;
  if (payload.generation !== 2 || payload.generation1Status !== "HISTORICAL_INCONSISTENT_ATTESTATION_CHAIN") return false;
  if (!hash(payload.f1AttestationSha256) || !hash(payload.f1ResultDocumentSha256)) return false;
  if (!plain(payload.upstreamLocks) || Object.values(payload.upstreamLocks).some((value) => !hash(value))) return false;
  if (!validLocks(payload.runtimeLocks) || !validLocks(payload.testLocks) || !validLocks(payload.evidenceLocks)) return false;
  const identity = payload.identityContract;
  if (!plain(identity) || identity.activeIdentityCardinality !== "EXACTLY_ONE" || identity.legacyFingerprintAuthorizationReachable !== false
    || identity.exactMemberConstructedCount !== 1 || identity.contextCreatedCountMax !== 1 || identity.contextImmutable !== true
    || identity.memberRederivationAfterContext !== 0 || identity.persisted !== false) return false;
  const session = payload.sessionContract;
  if (!plain(session) || session.opAConfigRootEqualsSession !== "BY_CONSTRUCTION" || session.downstreamConfigRootEqualsSession !== "BY_CONSTRUCTION"
    || session.childEnvironmentSnapshotCount !== 1 || session.mutableParentEnvironmentReread !== false
    || JSON.stringify(session.sanitizedOverrideSurfaces) !== JSON.stringify(["CLOUDSDK_AUTH_ACCESS_TOKEN", "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE", "CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT"])) return false;
  const command = payload.commandContract;
  if (!plain(command) || command.configurationNone !== true || command.duplicateAccountFlagReachable !== false
    || command.duplicateConfigurationFlagReachable !== false || command.unpinnedRetryReachable !== false
    || JSON.stringify(command.accountPinnedOperations) !== JSON.stringify(["OP_B", "OP_C_PRE", "OP_D_PRE", "OP_E", "OP_C_POST", "OP_D_POST"])) return false;
  const prestate = payload.prestateContract;
  if (!plain(prestate) || prestate.resultDomain !== "TARGET_MEMBER_PRESENT|TARGET_MEMBER_ABSENT|AMBIGUOUS|READ_FAILURE"
    || prestate.exactComparison !== true || prestate.sameMemberAtMutation !== "BY_CONSTRUCTION" || prestate.failureBlocksMutation !== true) return false;
  const classifier = payload.classifierContract;
  if (!plain(classifier) || classifier.unknownNonzero !== "INDETERMINATE" || classifier.timeoutAfterMutationStart !== "INDETERMINATE"
    || classifier.errorPrefixProvesNonApplication !== false || !Array.isArray(classifier.confirmedFailureRules)
    || classifier.confirmedFailureRules.length !== 0 || classifier.mutationMax !== 1 || classifier.retry !== 0 || classifier.rollback !== 0) return false;
  if (!boolsFalse(payload.forbiddenReachability) || !boolsFalse(payload.privacy)) return false;
  return payload.futureAuthority?.g4r3r1Eligible === true && payload.futureAuthority?.m3l3LiveApprovalGranted === false
    && payload.verdict === "P1_5_C2H2E3D_W1C_M3L2_G4R3H_R2_CURRENT_STATE_SUPERSEDING_ATTESTATION_PASS_G4R3R1_ELIGIBLE";
}

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseG4R3H_R2(text) { try { const payload = JSON.parse(text); return valid(payload) ? payload : null; } catch { return null; } }
export function canonicalizeG4R3H_R2(payload) { if (!valid(payload)) throw new Error("invalid-g4r3h-r2-payload"); return JSON.stringify(sortValue(payload)); }
export function computeG4R3H_R2Sha256(payload) { return createHash("sha256").update(canonicalizeG4R3H_R2(payload), "utf8").digest("hex"); }
export function verifyG4R3H_R2(payload) { return valid(payload) ? Object.freeze({ ok: true, code: "CURRENT_STATE_SUPERSEDING_ATTESTATION_PASS", sha256: computeG4R3H_R2Sha256(payload) }) : Object.freeze({ ok: false, code: "INVALID_ATTESTATION" }); }
export function verifyG4R3H_R2SourceLocks(payload, repositoryRoot = process.cwd()) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_ATTESTATION", checked: 0 });
  let checked = 0;
  for (const entry of [...payload.runtimeLocks, ...payload.testLocks, ...payload.evidenceLocks]) {
    const target = resolve(repositoryRoot, entry.path);
    if (!target.startsWith(resolve(repositoryRoot)) || !existsSync(target)) return Object.freeze({ ok: false, code: "SOURCE_LOCK_MISSING", checked });
    if (createHash("sha256").update(readFileSync(target)).digest("hex") !== entry.sha256) return Object.freeze({ ok: false, code: "SOURCE_LOCK_DRIFT", checked, path: entry.path });
    checked += 1;
  }
  return Object.freeze({ ok: true, code: "SOURCE_LOCKS_MATCH", checked });
}
