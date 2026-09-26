import { createHash } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, writeSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { resolveG2BLocalPinnedIdentity } from "./g2bLocalPinnedIdentityResolver.mjs";
import { G2B_CAS_SOURCE_PATHS, currentG2BCasSourceEntries, computeCanonicalSourceFingerprint } from "./g2bCanonicalSourceFingerprint.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { createG2BCleanGenerationStore, resolveG2BCanonicalAuthorityStorePaths,
  resolveG2BCleanCanonicalGeneration, verifyG2BCleanCasReadPacket } from "./g2bCleanGenerationBootstrap.mjs";
import { createG2BCleanCanonicalManifestStore, sha256G2BCanonical } from "./g2bCanonicalGenerationManifest.mjs";
import { hasExplicitRemoteExecutionIntent } from "./g2bCurrentRunExecutionIntent.mjs";
import { buildG2BCleanGenerationAttestation, buildG2BCleanGenerationAttestationV2, verifyG2BCleanGenerationAttestation,
  verifyG2BCleanGenerationAttestationSignature, verifyG2BCleanGenerationAttestationV2,
  writeG2BCleanGenerationAttestation, writeG2BCleanGenerationAttestationV2 } from "./g2bCleanGenerationAttestation.mjs";
import { verifyG2BRecoveryAnchor } from "./g2bRecoveryAnchor.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";

export const G2B_CLEAN_CAS_READ_PACKET_SCHEMA = "myweb.g2b.clean-generation.cas-read-packet.v2";
export const G2B_CLEAN_CAS_READ_PACKET_V3_SCHEMA = "myweb.g2b.clean-generation.cas-read-packet.v3";
export const G2B_CLEAN_CAS_READ_PACKET_V4_SCHEMA = "myweb.g2b.clean-generation.cas-read-packet.v4";
export const G2B_CLEAN_CAS_PHASES = Object.freeze([
  "PACKET_FILE_HASH_VERIFIED", "PACKET_DIGEST_VERIFIED", "PACKET_SCHEMA_ACCEPTED", "CANONICAL_GENERATION_RESOLVED",
  "MANIFEST_VERIFIED", "ANCHOR_EVIDENCE_VERIFIED", "ATTESTATION_VERIFIED", "SOURCE_LOCK_VERIFIED",
  "SOURCE_FINGERPRINT_VERIFIED", "REQUEST_IDENTITY_VERIFIED", "ATTESTATION_FRESHNESS_CONFIRMED", "CREDENTIAL_READY", "HELPER_STARTED",
  "HELPER_INPUT_ACCEPTED", "REQUEST_BUILT", "PROVIDER_REQUEST_STARTED", "PROVIDER_RESPONSE_RECEIVED",
  "POLICY_EXTRACTED", "CAS_EVIDENCE_CAPTURED",
]);

const SHA256 = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MEMBER = /^(?:user|serviceAccount):[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESOURCE = `projects/my-management-app-8a933/serviceAccounts/${G2B_TARGET_RESOURCE}`;
const BASELINE_ID_SCHEMA = "myweb.g2b.policy-baseline-id.v1";
const BASELINE_INTEGRITY_SCHEMA = "myweb.g2b.policy-baseline-evidence-integrity.v1";
const POLICY_DIGEST_SCHEMA = "myweb.g2b.iam-policy-semantic.v1";

const FAILURE_CODES = Object.freeze({
  PACKET_SCHEMA: "CLEAN_PACKET_SCHEMA_INVALID", PACKET_HASH: "CLEAN_PACKET_FILE_HASH_MISMATCH",
  PACKET_DIGEST: "CLEAN_PACKET_DIGEST_MISMATCH", SOURCE_LOCK: "CLEAN_SOURCE_LOCK_MISMATCH",
  SOURCE: "CLEAN_SOURCE_FINGERPRINT_MISMATCH", GENERATION: "CLEAN_GENERATION_MISMATCH",
  MANIFEST: "CLEAN_MANIFEST_INVALID", ANCHOR: "CLEAN_ANCHOR_EVIDENCE_INVALID",
  ATTESTATION: "CLEAN_ATTESTATION_INVALID", IDENTITY: "CLEAN_REQUEST_IDENTITY_INVALID",
  BUDGET: "CLEAN_BUDGET_INVALID", REQUEST: "CLEAN_REQUEST_BUILD_FAILED",
  PROVIDER: "CLEAN_PROVIDER_REQUEST_FAILED", EXTRACTION: "CLEAN_POLICY_EXTRACTION_FAILED",
});

function digestBytes(value) { return createHash("sha256").update(value).digest("hex"); }
function safeFailureCode(error) { return /^[A-Z0-9_-]{1,96}$/.test(String(error?.message || "")) ? error.message : "CLEAN_EXECUTOR_UNKNOWN"; }
function identityDigest(account, member) { return sha256G2BCanonical({ account, member }); }
function compareCanonical(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function canonicalCondition(condition) {
  if (condition === undefined) return undefined;
  if (!condition || typeof condition !== "object" || Array.isArray(condition)
    || Object.keys(condition).some((key) => !["title", "description", "expression", "location"].includes(key))) {
    throw new Error("CLEAN_POLICY_CONDITION_INVALID");
  }
  const field = (name) => !Object.hasOwn(condition, name)
    ? Object.freeze({ state: "UNSET", value: null })
    : condition[name] === null ? Object.freeze({ state: "NULL", value: null })
      : typeof condition[name] === "string" ? Object.freeze({ state: "PRESENT", value: condition[name] })
        : (() => { throw new Error("CLEAN_POLICY_CONDITION_FIELD_INVALID"); })();
  return Object.freeze({ title: field("title"), description: field("description"), expression: field("expression") });
}
function canonicalBindings(bindings) {
  if (!Array.isArray(bindings)) throw new Error("CLEAN_POLICY_BINDINGS_INVALID");
  return bindings.map((binding) => {
    if (!binding || typeof binding.role !== "string" || !Array.isArray(binding.members)
      || !binding.members.every((member) => typeof member === "string")) throw new Error("CLEAN_POLICY_BINDING_INVALID");
    const condition = canonicalCondition(binding.condition);
    return Object.freeze({ role: binding.role, members: Object.freeze([...binding.members].sort(compareCanonical)),
      ...(condition === undefined ? {} : { condition }) });
  }).sort((a, b) => compareCanonical(sha256G2BCanonical(a), sha256G2BCanonical(b))
    || compareCanonical(JSON.stringify(a), JSON.stringify(b)));
}
function baselineDigests(policy, returnedPolicyVersionState, returnedPolicyVersionValue) {
  const bindings = canonicalBindings(policy.bindings);
  const conditions = bindings.filter((binding) => binding.condition !== undefined)
    .map((binding) => binding.condition)
    .sort((a, b) => compareCanonical(JSON.stringify(a), JSON.stringify(b)));
  const conditionBindingCount = conditions.length;
  const withcondMarkerCount = bindings.filter((binding) => /_withcond_/i.test(binding.role)).length;
  const conditionCanonicalDigest = sha256G2BCanonical(conditions);
  const fullBindingsCanonicalDigest = sha256G2BCanonical(bindings);
  const policyCanonicalDigest = sha256G2BCanonical({ schema: POLICY_DIGEST_SCHEMA, returnedPolicyVersionState,
    returnedPolicyVersionValue, bindings, conditions });
  return Object.freeze({ bindings, conditions, bindingsCount: bindings.length, conditionBindingCount,
    unconditionalBindingCount: bindings.length - conditionBindingCount,
    withcondMarkerCount, conditionsPresent: conditionBindingCount > 0 || withcondMarkerCount > 0,
    conditionCanonicalDigest, fullBindingsCanonicalDigest, policyCanonicalDigest });
}

export function computeG2BCleanCasPolicyCanonicalDigest({ policy, returnedPolicyVersionState, returnedPolicyVersionValue } = {}) {
  if (!policy || typeof policy !== "object" || !Array.isArray(policy.bindings)
    || !["UNSET", "EXPLICIT"].includes(returnedPolicyVersionState)
    || returnedPolicyVersionState === "UNSET" && (returnedPolicyVersionValue !== null || policy.version !== null)
    || returnedPolicyVersionState === "EXPLICIT" && (policy.version !== returnedPolicyVersionValue
      || ![0, 1, 3].includes(returnedPolicyVersionValue))) return null;
  try { return baselineDigests(policy, returnedPolicyVersionState, returnedPolicyVersionValue).policyCanonicalDigest; }
  catch { return null; }
}

function baselineVersionState(state, value) {
  if (state === "UNSET" && value === null) return "UNSET";
  if (state === "EXPLICIT" && [0, 1, 3].includes(value)) return `EXPLICIT_${value}`;
  return "UNKNOWN";
}

function baselineIntegrityPayload(evidence) {
  const { evidenceIntegrityDigest: _digest, baselineCapable: _capable, missingBaselineFields: _missing,
    baselineIdDigest: _baselineId, ...payload } = evidence;
  return payload;
}

export function verifyG2BCleanCasBaselineEvidence(evidence) {
  if (!evidence || typeof evidence !== "object" || evidence.schema !== "myweb.g2b.clean-generation-cas-read-evidence.v2"
    || !SHA256.test(evidence.evidenceIntegrityDigest || "")) return false;
  return sha256G2BCanonical({ schema: BASELINE_INTEGRITY_SCHEMA, evidence: baselineIntegrityPayload(evidence) })
    === evidence.evidenceIntegrityDigest;
}

export function computeG2BCleanCasBaselineId(evidence) {
  if (!evidence || typeof evidence !== "object") throw new Error("CLEAN_BASELINE_ID_INPUT_INVALID");
  return sha256G2BCanonical({ schema: BASELINE_ID_SCHEMA,
    targetIdentity: { targetResource: evidence.targetResource, targetRole: evidence.targetRole, targetMember: evidence.targetMember },
    policyCanonicalDigest: evidence.policyCanonicalDigest, etagSha256: evidence.etagSha256,
    readEvidenceIdentity: { operationId: evidence.operationId, generationId: evidence.generationId,
      sourceFingerprint: evidence.sourceFingerprint, packetRawSha256: evidence.packetRawSha256,
      packetInternalDigest: evidence.packetInternalDigest, readTimestamp: evidence.readTimestamp,
      evidenceIntegrityDigest: evidence.evidenceIntegrityDigest } });
}

export function compareG2BCleanCasPolicyBaselines(before, after) {
  if (![before, after].every((evidence) => evidence?.baselineCapable === true
    && evidence.casState === "RESOLVED" && verifyG2BCleanCasBaselineEvidence(evidence))) {
    return Object.freeze({ ok: false, code: "CLEAN_BASELINE_EVIDENCE_INVALID" });
  }
  return Object.freeze({ ok: true,
    RESOURCE_CHANGED: before.targetResource !== after.targetResource,
    POLICY_SEMANTIC_CHANGED: before.policyCanonicalDigest !== after.policyCanonicalDigest,
    FULL_BINDINGS_CHANGED: before.fullBindingsCanonicalDigest !== after.fullBindingsCanonicalDigest,
    RELEVANT_BINDINGS_CHANGED: before.relevantBindingsDigest !== after.relevantBindingsDigest,
    CONDITIONS_CHANGED: before.conditionCanonicalDigest !== after.conditionCanonicalDigest,
    ETAG_CHANGED: before.etagSha256 !== after.etagSha256,
    TARGET_BINDING_CHANGED: before.targetBindingState !== after.targetBindingState });
}

function createOnlyJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const fd = openSync(path, "wx", 0o600);
  try { writeSync(fd, `${JSON.stringify(value)}\n`, undefined, "utf8"); fsyncSync(fd); }
  finally { closeSync(fd); }
  return path;
}

const SAFE_TRANSPORT_DIAGNOSTIC_KEYS = Object.freeze([
  "failureClass", "transportFailureClass", "transportStage", "spawnAttempted", "spawnReturned", "childPidPresent", "spawnErrorCode",
  "spawnErrorName", "spawnErrorErrno", "spawnErrorSyscall", "childStarted", "executableBasename",
  "executablePathSha256", "helperPathSha256", "cwdSha256", "argvCount", "argvSha256", "envKeyCount",
  "safeEnvPresence", "protocolEnvelopePresent", "protocolEnvelopeType", "helperStartedMarker",
  "providerDispatchMarker", "exitCode", "signal", "timedOut", "stdoutPresent", "stderrPresent",
  "stdoutByteLength", "stderrByteLength", "stdoutSha256", "stderrSha256", "jsonParseSucceeded",
  "schemaValidationSucceeded", "requestStarted", "providerRequestStarted", "providerResponseReceived",
  "httpStatusKnown", "httpStatus", "helperFailureCode", "nodeFailureClass", "unknownReason",
  "lastCompletedPhase", "failedPhase", "resourceValidationState", "policyParseState", "etagState",
  "policyVersionState", "policyExtractionPath", "providerResponseObjectType", "helperFailureEnvelopeValid",
  "lifecycleShapeValid", "stdinEncoding", "stdinWriteAttempted", "stdinByteLength", "stdinWritten",
  "stdinWriteCompleted", "stdinClosed", "stdinBomPresent", "stdinNewlineKind",
  "helperSuccess", "helperLastCompletedPhase", "helperFailedPhase", "requestBuilt",
  "providerRequestPrepared", "policyExtracted", "requestMetadataAvailable",
  "returnedPolicyVersionState", "returnedPolicyVersionValue",
]);

function safeTransportDiagnostics(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const safe = {};
  for (const key of SAFE_TRANSPORT_DIAGNOSTIC_KEYS) {
    const item = value[key];
    if (item === null || typeof item === "string" || typeof item === "boolean" || Number.isSafeInteger(item)) safe[key] = item;
  }
  if (value.safeEnvPresence && typeof value.safeEnvPresence === "object" && !Array.isArray(value.safeEnvPresence)) {
    safe.safeEnvPresence = Object.fromEntries(Object.entries(value.safeEnvPresence)
      .filter(([, item]) => typeof item === "boolean"));
  }
  const nestedKeys = {
    failureVersionDiagnostic: new Set(["versionFieldPresent", "versionRawType", "versionRawPrimitiveValue",
      "versionAllowedSet", "versionNormalizationResult", "versionNormalizationFailureReason", "versionSource"]),
    responseFieldDiagnostic: new Set(["protobufVersionFieldPresent", "protobufVersionType", "protobufVersionValue",
      "apitoolsPolicyClassVerified", "apitoolsBindingsState", "apitoolsDirectEtagPresent", "apitoolsDirectEtagType", "apitoolsDirectEtagSha256",
      "apitoolsDirectVersionType", "apitoolsDirectVersionValue",
      "versionDirectPresent", "versionDirectType", "versionDirectValue",
      "versionDescriptorType", "versionHasPresence", "versionDefaultValue", "versionListedInListFields",
      "messageToDictVersionPresent", "messageToDictVersionType", "messageToDictVersionValue",
      "messageToDictDefaultsVersionPresent", "messageToDictDefaultsVersionType", "messageToDictDefaultsVersionValue",
      "etagPresent", "etagType", "etagSha256", "bindingsPresent", "bindingsCount", "conditionCount", "withcondMarkerCount",
      "conditionBindingCount", "conditionsPresent", "withcondRoleMarkerPresent"]),
  };
  for (const key of Object.keys(nestedKeys)) {
    const diagnostic = value[key];
    if (diagnostic && typeof diagnostic === "object" && !Array.isArray(diagnostic)) {
      safe[key] = Object.freeze(Object.fromEntries(Object.entries(diagnostic).filter(([name, item]) => nestedKeys[key].has(name)
        && (item === null || typeof item === "boolean" || Number.isSafeInteger(item) && Math.abs(item) <= 100000
          || typeof item === "string" && item.length <= 64 && /^[A-Za-z0-9_-]*$/.test(item)
          || name === "versionAllowedSet" && Array.isArray(item) && item.every((version) => [0, 1, 3].includes(version))))));
    }
  }
  if (value.helperExecution && typeof value.helperExecution === "object" && !Array.isArray(value.helperExecution)) {
    const helper = value.helperExecution;
    safe.helperExecution = Object.freeze({
      schemaVersion: helper.schemaVersion,
      success: helper.success,
      lastCompletedPhase: helper.lastCompletedPhase,
      failedPhase: helper.failedPhase,
      failureCode: helper.failureCode,
      requestBuilt: helper.requestBuilt,
      providerRequestPrepared: helper.providerRequestPrepared,
      providerRequestStarted: helper.providerRequestStarted,
      providerResponseReceived: helper.providerResponseReceived,
      policyExtracted: helper.policyExtracted,
      requestMetadataAvailable: helper.requestMetadataAvailable,
      safeDiagnostics: helper.safeDiagnostics && typeof helper.safeDiagnostics === "object"
        ? Object.fromEntries(Object.entries(helper.safeDiagnostics).filter(([, item]) => item === null
          || typeof item === "string" || typeof item === "boolean" || Number.isSafeInteger(item))) : {},
    });
  }
  return Object.keys(safe).length ? Object.freeze(safe) : null;
}

function safeRelativePath(root, candidate) {
  if (typeof candidate !== "string" || !candidate || isAbsolute(candidate) || candidate.includes("..")) return null;
  const absolute = resolve(root, candidate);
  const relativePath = absolute.slice(resolve(root).length).replace(/^[/\\]/, "");
  if (!relativePath || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) return null;
  try { if (lstatSync(absolute).isSymbolicLink()) return null; } catch { return null; }
  return absolute;
}

function verifySourceLock({ packet, repositoryRoot }) {
  const path = safeRelativePath(repositoryRoot, packet.sourceLockPath);
  if (!path || !packet.sourceLockPath.startsWith("docs/evidence/")) return null;
  let lock;
  try { lock = JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
  const manifestDigest = sha256G2BCanonical(lock);
  const actual = currentG2BCasSourceEntries({ repositoryRoot });
  const fingerprint = computeCanonicalSourceFingerprint(actual);
  if (lock.schema !== "myweb.g2b.clean-generation.source-lock.v1"
    || lock.expectedFileCount !== packet.sourceCount || lock.sourceLocks?.length !== packet.sourceCount
    || packet.sourceCount !== G2B_CAS_SOURCE_PATHS.length || manifestDigest !== packet.sourceLockDigest
    || (packet.schemaVersion === G2B_CLEAN_CAS_READ_PACKET_V4_SCHEMA
      && digestBytes(readFileSync(path)) !== packet.sourceLockRawSha256)
    || packet.sourceFingerprintSchemaVersion !== 2 || fingerprint !== packet.sourceFingerprint
    || JSON.stringify(lock.sourceLocks) !== JSON.stringify(actual)) return null;
  return Object.freeze({ path, lock, manifestDigest, count: actual.length, sourceFingerprint: fingerprint });
}

function validateTrustBinding(packet, trust, { requireFresh = true, allowRefreshedAttestation = false } = {}) {
  if (!trust?.generation || trust.generation.generationId !== packet.canonicalGenerationId
    || trust.generation.sourceFingerprint !== packet.sourceFingerprint) return FAILURE_CODES.GENERATION;
  if (!trust.manifest || trust.manifest.manifestVersion !== packet.manifestVersion
    || trust.manifest.manifestDigest !== packet.manifestDigest
    || trust.manifest.canonicalGenerationId !== packet.canonicalGenerationId
    || trust.manifest.sourceFingerprint !== packet.sourceFingerprint) return FAILURE_CODES.MANIFEST;
  if (!trust.anchorEvidence || trust.anchorEvidence.evidenceDigest !== packet.anchorVerifiedEvidenceDigest
    || trust.anchorEvidence.generationId !== packet.canonicalGenerationId
    || trust.anchorEvidence.sourceFingerprint !== packet.sourceFingerprint) return FAILURE_CODES.ANCHOR;
  const v3 = packet.schemaVersion === G2B_CLEAN_CAS_READ_PACKET_V3_SCHEMA;
  const v4 = packet.schemaVersion === G2B_CLEAN_CAS_READ_PACKET_V4_SCHEMA;
  const policy = packet.attestationBindingPolicy;
  const attestationBindingValid = v4
    ? trust.attestation?.schemaVersion === "myweb.g2b.clean-generation-host-attestation.v2"
      && trust.attestation?.operationId === packet.operationId
      && trust.attestation?.sourceLockDigest === packet.sourceLockDigest
      && trust.attestation?.sourceFingerprint === packet.sourceFingerprint
      && trust.attestation?.generationId === packet.canonicalGenerationId
      && trust.attestation?.anchorEvidenceDigest === packet.anchorVerifiedEvidenceDigest
      && trust.attestation?.identityFingerprint === packet.requestIdentity.identityFingerprint
      && trust.attestation?.hostContextFingerprint === packet.hostContextFingerprint
      && trust.attestation?.anchorFingerprint === packet.anchorFingerprint
      && (allowRefreshedAttestation || trust.attestation?.attestationDigest === packet.attestationDigest)
      && trust.attestationBindingValid === true
      && (!requireFresh || trust.attestationFresh === true)
    : v3
    ? trust.attestation?.schemaVersion === "myweb.g2b.clean-generation-host-attestation.v1"
      && trust.attestation?.generationId === policy.generationId
      && trust.attestation?.anchorEvidenceDigest === policy.anchorEvidenceDigest
      && trust.attestation?.anchorFingerprint === policy.anchorFingerprint
      && trust.attestation?.identityFingerprint === policy.identityFingerprint
      && trust.attestation?.memberFingerprint === policy.memberFingerprint
      && trust.attestation?.hostContextFingerprint === policy.hostContextFingerprint
      && trust.attestation?.sourceFingerprintSchemaVersion === policy.sourceFingerprintSchemaVersion
      && trust.attestation?.sourceFingerprint === policy.sourceFingerprint
      && trust.attestation?.publicKeyFingerprint === policy.signerFingerprint
      && trust.attestationBindingValid === true
      && (!requireFresh || trust.attestationFresh === true)
    : trust.attestation?.attestationDigest === packet.attestationDigest;
  if (!trust.attestation || !attestationBindingValid
    || trust.attestation.generationId !== packet.canonicalGenerationId
    || trust.attestation.anchorEvidenceDigest !== packet.anchorVerifiedEvidenceDigest
    || trust.attestation.sourceFingerprint !== packet.sourceFingerprint
    || trust.attestation.identityFingerprint !== packet.requestIdentity.identityFingerprint
    || (v3 && (trust.generation.identityFingerprint !== policy.identityFingerprint
      || trust.generation.hostContextFingerprint !== policy.hostContextFingerprint
      || trust.anchorEvidence.anchorFingerprint !== policy.anchorFingerprint
      || trust.anchorEvidence.hostContextFingerprint !== policy.hostContextFingerprint
      || trust.anchorEvidence.identityFingerprint !== policy.identityFingerprint))
    || (v4 && (trust.generation.identityFingerprint !== packet.requestIdentity.identityFingerprint
      || trust.generation.hostContextFingerprint !== packet.hostContextFingerprint
      || trust.anchorEvidence.anchorFingerprint !== packet.anchorFingerprint
      || trust.anchorEvidence.hostContextFingerprint !== packet.hostContextFingerprint
      || trust.anchorEvidence.identityFingerprint !== packet.requestIdentity.identityFingerprint))
    || !SHA256.test(trust.attestation.hostContextFingerprint || "")
    || (requireFresh && (trust.resolved?.ok !== true || trust.resolved.readEligible !== true
      || trust.resolved.canonicalGeneration !== packet.canonicalGenerationId
      || trust.resolved.manifestDigest !== packet.manifestDigest
      || trust.resolved.anchorEvidenceDigest !== packet.anchorVerifiedEvidenceDigest))) return FAILURE_CODES.ATTESTATION;
  if (!trust.identity || !trust.identity.exactPrincipal || !trust.identity.exactIamMember
    || trust.identityFingerprint !== packet.requestIdentity.identityFingerprint
    || identityDigest(trust.identity.exactPrincipal, trust.identity.exactIamMember) !== packet.requestIdentity.identityFingerprint
    || sha256G2BCanonical({ member: trust.identity.exactIamMember }) !== packet.targetMemberFingerprint
    || packet.requestIdentity.principalKind !== (trust.identity.exactIamMember.startsWith("serviceAccount:") ? "serviceAccount" : "user")) {
    return FAILURE_CODES.IDENTITY;
  }
  return null;
}

function sameAttestationBinding(attestation, packet, { allowTestSignature = false } = {}) {
  if (packet.schemaVersion === G2B_CLEAN_CAS_READ_PACKET_V4_SCHEMA) {
    return Boolean(attestation?.schemaVersion === "myweb.g2b.clean-generation-host-attestation.v2"
      && attestation.result === "VALID" && attestation.generationId === packet.canonicalGenerationId
      && attestation.anchorState === "ANCHOR_VERIFIED" && attestation.anchorEvidenceDigest === packet.anchorVerifiedEvidenceDigest
      && attestation.anchorFingerprint === packet.anchorFingerprint
      && attestation.identityFingerprint === packet.requestIdentity.identityFingerprint
      && attestation.hostContextFingerprint === packet.hostContextFingerprint
      && attestation.sourceFingerprint === packet.sourceFingerprint
      && attestation.sourceLockDigest === packet.sourceLockDigest && attestation.operationId === packet.operationId
      && attestation.validationProvider === "WINDOWS_DPAPI_CURRENT_USER"
      && attestation.validationEnvironment === "TRUSTED_WINDOWS_HOST"
      && attestation.dpapiUnprotectSucceeded === true && attestation.hmacValid === true
      && attestation.generationMatch === true && attestation.identityMatch === true
      && attestation.hostMatch === true && attestation.sourceMatch === true
      && Date.parse(attestation.expiresAt) > Date.parse(attestation.issuedAt)
      && Date.parse(attestation.expiresAt) - Date.parse(attestation.issuedAt) <= 120_000
      && (allowTestSignature || verifyG2BCleanGenerationAttestationSignature(attestation).ok));
  }
  const policy = packet.attestationBindingPolicy;
  return Boolean(policy && attestation?.schemaVersion === "myweb.g2b.clean-generation-host-attestation.v1"
    && attestation.result === "VALID" && Number.isFinite(Date.parse(attestation.validatedAt))
    && attestation.validationProvider === "WINDOWS_DPAPI_CURRENT_USER"
    && attestation.validationEnvironment === "TRUSTED_WINDOWS_HOST"
    && attestation.dpapiUnprotectSucceeded === true && attestation.hmacValid === true
    && attestation.generationMatch === true && attestation.identityMatch === true
    && attestation.hostMatch === true && attestation.sourceMatch === true
    && attestation?.generationId === policy.generationId
    && attestation.anchorEvidenceDigest === policy.anchorEvidenceDigest
    && attestation.anchorFingerprint === policy.anchorFingerprint
    && attestation.identityFingerprint === policy.identityFingerprint
    && attestation.hostContextFingerprint === policy.hostContextFingerprint
    && attestation.sourceFingerprintSchemaVersion === policy.sourceFingerprintSchemaVersion
    && attestation.sourceFingerprint === policy.sourceFingerprint
    && attestation.publicKeyFingerprint === policy.signerFingerprint
    && attestation.validationProvider === "WINDOWS_DPAPI_CURRENT_USER"
    && attestation.validationEnvironment === "TRUSTED_WINDOWS_HOST"
    && attestation.dpapiUnprotectSucceeded === true && attestation.hmacValid === true
    && attestation.generationMatch === true && attestation.identityMatch === true
    && attestation.hostMatch === true && attestation.sourceMatch === true
    && (allowTestSignature || verifyG2BCleanGenerationAttestationSignature(attestation).ok));
}

function loadTrust({ packet, repositoryRoot, storeDirectory, manifestDirectory, attestationDirectory, environment, identityResolver, now }) {
  const identityResult = identityResolver || resolveG2BLocalPinnedIdentity({ environment });
  if (identityResult?.ok !== true || !identityResult.context?.exactPrincipal || !identityResult.context?.exactIamMember) return null;
  const identity = identityResult.context;
  const store = createG2BCleanGenerationStore({ directory: storeDirectory });
  const manifestStore = createG2BCleanCanonicalManifestStore({ directory: manifestDirectory });
  const chain = manifestStore.readChain();
  const candidates = store.activeCandidates();
  if (!chain.ok || !chain.latest || candidates.length !== 1 || candidates[0].generationId !== packet.canonicalGenerationId) return null;
  const generation = candidates[0];
  const anchor = store.readAnchor(generation.generationId);
  const anchorEvidence = store.readEvent(generation.generationId, "anchor-verified");
  if (anchor.state !== "READY" || anchorEvidence.state !== "READY") return null;
  let attestation = null;
  try {
    for (const name of readdirSync(attestationDirectory)) {
      if (!name.startsWith(`${generation.generationId}-`) || !name.endsWith(".json")) continue;
      const candidate = JSON.parse(readFileSync(join(attestationDirectory, name), "utf8"));
      if (packet.schemaVersion === G2B_CLEAN_CAS_READ_PACKET_V3_SCHEMA
        ? candidate.attestationDigest === packet.initialAttestationDigest && sameAttestationBinding(candidate, packet)
        : candidate.attestationDigest === packet.attestationDigest) { attestation = candidate; break; }
    }
  } catch { return null; }
  const member = identity.exactIamMember;
  const currentIdentityFingerprint = identityDigest(identity.exactPrincipal, member);
  const manifest = chain.latest;
  if (!attestation || manifest.manifestVersion !== packet.manifestVersion || manifest.manifestDigest !== packet.manifestDigest
    || manifest.canonicalGenerationId !== packet.canonicalGenerationId || manifest.anchorEvidenceDigest !== packet.anchorVerifiedEvidenceDigest
    || manifest.sourceFingerprint !== packet.sourceFingerprint || anchorEvidence.value.evidenceDigest !== packet.anchorVerifiedEvidenceDigest
    || generation.identityFingerprint !== currentIdentityFingerprint || packet.requestIdentity.identityFingerprint !== currentIdentityFingerprint
    || packet.targetMemberFingerprint !== sha256G2BCanonical({ member })
    || ([G2B_CLEAN_CAS_READ_PACKET_SCHEMA, G2B_CLEAN_CAS_READ_PACKET_V3_SCHEMA, G2B_CLEAN_CAS_READ_PACKET_V4_SCHEMA]
      .includes(packet.schemaVersion) && attestation.attestationDigest !== packet.attestationDigest
      && packet.schemaVersion !== G2B_CLEAN_CAS_READ_PACKET_V3_SCHEMA)
    || attestation.generationId !== packet.canonicalGenerationId || attestation.anchorEvidenceDigest !== packet.anchorVerifiedEvidenceDigest
    || attestation.sourceFingerprint !== packet.sourceFingerprint) return null;
  const bindings = { secretKeyId: anchor.value.secretKeyId, environment, repositoryRoot,
    ...(packet.schemaVersion === G2B_CLEAN_CAS_READ_PACKET_V4_SCHEMA
      ? { operationId: packet.operationId, sourceLockDigest: packet.sourceLockDigest,
        hostContextFingerprint: packet.hostContextFingerprint } : {}) };
  if (packet.schemaVersion === G2B_CLEAN_CAS_READ_PACKET_V4_SCHEMA) {
    const issuedAt = Date.parse(attestation.issuedAt);
    const expiresAt = Date.parse(attestation.expiresAt);
    if (!sameAttestationBinding(attestation, packet) || !Number.isFinite(issuedAt) || issuedAt > now
      || !Number.isFinite(expiresAt)) return null;
    const attestationFresh = now < expiresAt;
    const check = attestationFresh ? verifyG2BCleanGenerationAttestationV2(attestation, { ...bindings,
      generationId: packet.canonicalGenerationId, anchorEvidenceDigest: packet.anchorVerifiedEvidenceDigest,
      identityFingerprint: currentIdentityFingerprint, anchorFingerprint: packet.anchorFingerprint,
      sourceFingerprint: packet.sourceFingerprint, now }) : null;
    if (attestationFresh && !check?.ok) return null;
    const resolved = attestationFresh ? resolveG2BCleanCanonicalGeneration({ generationStore: store, manifestStore, attestation,
      attestationBindings: bindings, now }) : Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_EXPIRED",
      readEligible: false, mutationEligible: false });
    return Object.freeze({ identity, identityFingerprint: currentIdentityFingerprint, store, manifest, generation,
      anchor: anchor.value, anchorEvidence: anchorEvidence.value, attestation, bindings, resolved, manifestStore,
      attestationDirectory, repositoryRoot, environment, now, attestationBindingValid: true,
      attestationFresh, attestationAgeMs: now - issuedAt });
  }
  const resolved = resolveG2BCleanCanonicalGeneration({ generationStore: store, manifestStore, attestation,
    attestationBindings: bindings, now });
  if (packet.schemaVersion === G2B_CLEAN_CAS_READ_PACKET_V3_SCHEMA) {
    const validatedAtMs = Date.parse(attestation.validatedAt);
    const attestationAgeMs = now - validatedAtMs;
    if (!Number.isFinite(validatedAtMs) || now < validatedAtMs) return null;
    const attestationFresh = Number.isFinite(attestationAgeMs) && attestationAgeMs >= 0
      && attestationAgeMs <= packet.attestationBindingPolicy.ttlMillis;
    if (attestationAgeMs < 0 || !sameAttestationBinding(attestation, packet)) return null;
    return Object.freeze({ identity, identityFingerprint: currentIdentityFingerprint, store, manifest, generation,
      anchor: anchor.value, anchorEvidence: anchorEvidence.value, attestation, bindings, resolved, manifestStore, attestationDirectory,
      attestationBindingValid: true, attestationFresh, attestationAgeMs });
  }
  if (!resolved.ok || resolved.canonicalGeneration !== packet.canonicalGenerationId || !resolved.readEligible
    || resolved.manifestDigest !== packet.manifestDigest || resolved.anchorEvidenceDigest !== packet.anchorVerifiedEvidenceDigest) return null;
  return Object.freeze({ identity, identityFingerprint: currentIdentityFingerprint, store, manifest, generation,
    anchor: anchor.value, anchorEvidence: anchorEvidence.value, attestation, bindings, resolved, manifestStore, attestationDirectory,
    attestationBindingValid: true, attestationFresh: true,
    attestationAgeMs: resolved.attestationAgeMs });
}

function refreshV3Attestation({ packet, trust, environment, repositoryRoot, secretProvider, now }) {
  const policy = packet.attestationBindingPolicy;
  const provider = secretProvider || createWindowsDpapiSecretProvider({ environment });
  const secretResult = provider.read();
  if (secretResult?.state !== "READY" || !Buffer.isBuffer(secretResult.secret) || secretResult.secret.length !== 32
    || secretResult.keyId !== trust.anchor.secretKeyId) {
    if (Buffer.isBuffer(secretResult?.secret)) secretResult.secret.fill(0);
    return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_REFRESH_SECRET_BLOCKED" });
  }
  try {
    const anchorCheck = verifyG2BRecoveryAnchor({ record: trust.anchor, member: trust.identity.exactIamMember,
      secret: secretResult.secret, secretKeyId: secretResult.keyId });
    if (!anchorCheck.ok || anchorCheck.state !== "PRESENT_CONFIRMED") return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_REFRESH_ANCHOR_INVALID" });
    const bindings = { generationId: packet.canonicalGenerationId, anchorEvidenceDigest: packet.anchorVerifiedEvidenceDigest,
      identityFingerprint: packet.requestIdentity.identityFingerprint, anchorFingerprint: policy.anchorFingerprint,
      memberFingerprint: policy.memberFingerprint, sourceFingerprint: packet.sourceFingerprint, hostContextFingerprint: policy.hostContextFingerprint,
      secretKeyId: secretResult.keyId, environment, repositoryRoot };
    const built = buildG2BCleanGenerationAttestation({ secret: secretResult.secret, ...bindings, validatedAt: new Date(now).toISOString() });
    if (!built.ok || !sameAttestationBinding(built.attestation, packet)) return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_REFRESH_BINDING_MISMATCH" });
    const checked = verifyG2BCleanGenerationAttestation(built.attestation, { ...bindings, now });
    if (!checked.ok) return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_REFRESH_INVALID" });
    const persisted = writeG2BCleanGenerationAttestation(built.attestation, { directory: trust.attestationDirectory,
      ...bindings, now });
    const resolved = resolveG2BCleanCanonicalGeneration({ generationStore: trust.store,
      manifestStore: trust.manifestStore, attestation: built.attestation,
      attestationBindings: { secretKeyId: secretResult.keyId, environment, repositoryRoot }, now });
    if (!resolved.ok || !resolved.readEligible || resolved.canonicalGeneration !== packet.canonicalGenerationId
      || resolved.manifestDigest !== packet.manifestDigest || resolved.anchorEvidenceDigest !== packet.anchorVerifiedEvidenceDigest) {
      return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_REFRESH_RESOLUTION_FAILED" });
    }
    return Object.freeze({ ok: true, attestation: built.attestation, resolved, ageMs: checked.ageMs, persistedPath: persisted.path });
  } finally { secretResult.secret.fill(0); }
}

function refreshV2Attestation({ packet, trust, environment, repositoryRoot, secretProvider, now }) {
  const provider = secretProvider || createWindowsDpapiSecretProvider({ environment });
  const secretResult = provider.read();
  if (secretResult?.state !== "READY" || !Buffer.isBuffer(secretResult.secret) || secretResult.secret.length !== 32
    || secretResult.keyId !== trust.anchor.secretKeyId) {
    if (Buffer.isBuffer(secretResult?.secret)) secretResult.secret.fill(0);
    return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_REFRESH_SECRET_BLOCKED" });
  }
  try {
    const anchorCheck = verifyG2BRecoveryAnchor({ record: trust.anchor, member: trust.identity.exactIamMember,
      secret: secretResult.secret, secretKeyId: secretResult.keyId });
    if (!anchorCheck.ok || anchorCheck.state !== "PRESENT_CONFIRMED") {
      return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_REFRESH_ANCHOR_INVALID" });
    }
    const bindings = { generationId: packet.canonicalGenerationId,
      anchorEvidenceDigest: packet.anchorVerifiedEvidenceDigest,
      identityFingerprint: packet.requestIdentity.identityFingerprint, anchorFingerprint: packet.anchorFingerprint,
      memberFingerprint: packet.targetMemberFingerprint, sourceFingerprint: packet.sourceFingerprint,
      sourceLockDigest: packet.sourceLockDigest, operationId: packet.operationId,
      hostContextFingerprint: packet.hostContextFingerprint, secretKeyId: secretResult.keyId,
      environment, repositoryRoot, issuedAt: new Date(now).toISOString() };
    const built = buildG2BCleanGenerationAttestationV2({ secret: secretResult.secret, ...bindings });
    if (!built.ok || !sameAttestationBinding(built.attestation, packet)) {
      return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_REFRESH_BINDING_MISMATCH" });
    }
    const checked = verifyG2BCleanGenerationAttestationV2(built.attestation, { ...bindings, now });
    if (!checked.ok) return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_REFRESH_INVALID" });
    const persisted = writeG2BCleanGenerationAttestationV2(built.attestation,
      { directory: trust.attestationDirectory, ...bindings, now });
    const resolved = resolveG2BCleanCanonicalGeneration({ generationStore: trust.store,
      manifestStore: trust.manifestStore, attestation: built.attestation,
      attestationBindings: { secretKeyId: secretResult.keyId, environment, repositoryRoot,
        operationId: packet.operationId, sourceLockDigest: packet.sourceLockDigest,
        hostContextFingerprint: packet.hostContextFingerprint }, now });
    if (!resolved.ok || !resolved.readEligible || resolved.canonicalGeneration !== packet.canonicalGenerationId
      || resolved.manifestDigest !== packet.manifestDigest
      || resolved.anchorEvidenceDigest !== packet.anchorVerifiedEvidenceDigest) {
      return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_REFRESH_RESOLUTION_FAILED" });
    }
    return Object.freeze({ ok: true, attestation: built.attestation, resolved,
      ageMs: checked.ageMs, persistedPath: persisted.path });
  } finally { secretResult.secret.fill(0); }
}

export function createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot = process.cwd(), environment = process.env, storeDirectory,
  manifestDirectory, attestationDirectory, secretProvider, testOnlyIdentityResolver, testOnlyTrustResolver,
  testOnlyAttestationRefresher,
  outputDirectory = join(repositoryRoot, "docs", "evidence") } = {}) {
  const canonicalPaths = resolveG2BCanonicalAuthorityStorePaths({ environment });
  if (!canonicalPaths.ok) throw new Error(canonicalPaths.code);
  storeDirectory ??= canonicalPaths.artifactDirectory;
  manifestDirectory ??= canonicalPaths.manifestDirectory;
  attestationDirectory ??= canonicalPaths.attestationDirectory;
  let usedOperations = new Set();
  return Object.freeze({
    async execute({ packetPath, expectedRawPacketSha256, executionEnvelope, transport, now = Date.now() } = {}) {
      const phases = [];
      const counters = { credentialRefreshCalls: 0, iamPolicyReadCalls: 0, physicalRemoteCalls: 0, retries: 0, mutations: 0 };
      let outputs = null;
      let approvalConsumed = false;
      let failureEvidenceWritten = false;
      let currentFailurePhase = G2B_CLEAN_CAS_PHASES[0];
      let failedPhase = null;
      let lastCompletedOrdinal = -1;
      const complete = (phase) => {
        const ordinal = G2B_CLEAN_CAS_PHASES.indexOf(phase);
        if (ordinal < 0 || ordinal <= lastCompletedOrdinal || failedPhase) throw new Error("CLEAN_PHASE_INVARIANT_FAILED");
        phases.push(phase); lastCompletedOrdinal = ordinal;
        currentFailurePhase = G2B_CLEAN_CAS_PHASES[ordinal + 1] || phase;
      };
      const fail = (phase, code, diagnostic = null) => {
        const ordinal = G2B_CLEAN_CAS_PHASES.indexOf(phase);
        if (ordinal < 0 || (lastCompletedOrdinal >= ordinal) || failedPhase) return Object.freeze({ ok: false, code: "CLEAN_PHASE_INVARIANT_FAILED" });
        failedPhase = phase;
        if (approvalConsumed && outputs && !failureEvidenceWritten) {
          try {
            createOnlyJson(outputs[2], { schema: "myweb.g2b.clean-generation-cas-read-failure.v1",
              operationId: packet.operationId, rawPacketFileSha256: expectedRawPacketSha256,
              internalPacketDigest: packet.packetDigest, failureCode: code, failedPhase: phase,
              lastCompletedPhase: phases.at(-1) || null, phases: [...phases], requestStarted: counters.iamPolicyReadCalls > 0,
              transportFailureCode: typeof diagnostic?.transportFailureCode === "string"
                && /^[A-Z0-9_-]{1,96}$/.test(diagnostic.transportFailureCode) ? diagnostic.transportFailureCode : null,
              helperFailureCode: typeof diagnostic?.helperFailureCode === "string"
                && /^[A-Z0-9_-]{1,96}$/.test(diagnostic.helperFailureCode) ? diagnostic.helperFailureCode : null,
              helperExecution: diagnostic?.helperExecution ? safeTransportDiagnostics({ helperExecution: diagnostic.helperExecution })?.helperExecution || null : null,
              transportDiagnostics: safeTransportDiagnostics(diagnostic?.transportDiagnostics),
              counters: { ...counters }, approvalConsumed: true, mutations: 0, retries: 0,
              failedAt: new Date(now).toISOString() });
            failureEvidenceWritten = true;
          } catch {}
        }
        return Object.freeze({ ok: false, code, failedPhase: phase, lastCompletedOrdinal, phases: Object.freeze([...phases]),
          counters: Object.freeze({ ...counters }) });
      };
      let packet;
      let raw;
      let attestationRefreshEvidence = Object.freeze({ originalAttestationDigest: null, originalAttestationState: "NOT_APPLICABLE",
        refreshPerformed: false, refreshedAttestationDigest: null, refreshedAgeMs: null, bindingComparisonResult: "NOT_APPLICABLE" });
      try {
        if (typeof packetPath !== "string" || !SHA256.test(expectedRawPacketSha256 || "")) return fail("PACKET_FILE_HASH_VERIFIED", FAILURE_CODES.PACKET_HASH);
        const safePacketPath = safeRelativePath(repositoryRoot, packetPath);
        if (!safePacketPath) return fail("PACKET_FILE_HASH_VERIFIED", FAILURE_CODES.PACKET_SCHEMA);
        raw = readFileSync(safePacketPath);
        if (digestBytes(raw) !== expectedRawPacketSha256) return fail("PACKET_FILE_HASH_VERIFIED", FAILURE_CODES.PACKET_HASH);
        complete("PACKET_FILE_HASH_VERIFIED");
        packet = JSON.parse(raw.toString("utf8"));
        if (packet?.packetDigest !== sha256G2BCanonical(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== "packetDigest")))) {
          return fail("PACKET_DIGEST_VERIFIED", FAILURE_CODES.PACKET_DIGEST);
        }
        complete("PACKET_DIGEST_VERIFIED");
        if (!verifyG2BCleanCasReadPacket(packet)
          || ![G2B_CLEAN_CAS_READ_PACKET_SCHEMA, G2B_CLEAN_CAS_READ_PACKET_V3_SCHEMA,
            G2B_CLEAN_CAS_READ_PACKET_V4_SCHEMA].includes(packet.schemaVersion)) {
          return fail("PACKET_SCHEMA_ACCEPTED", FAILURE_CODES.PACKET_SCHEMA);
        }
        complete("PACKET_SCHEMA_ACCEPTED");
        if (!UUID.test(packet.operationId || "") || usedOperations.has(packet.operationId)
          || !hasExplicitRemoteExecutionIntent(executionEnvelope) || executionEnvelope.operationInstance !== packet.operationId
          || executionEnvelope.approvalPacketSha256 !== expectedRawPacketSha256
          || executionEnvelope.sourceLockDigest !== packet.sourceLockDigest) return fail("CANONICAL_GENERATION_RESOLVED", FAILURE_CODES.PACKET_SCHEMA);
        if (packet.credentialRefreshMax !== 1 || packet.iamPolicyReadMax !== 1 || packet.totalPhysicalRemoteCallsMax !== 2
          || packet.automaticRetryMax !== 0 || packet.setIamPolicyMax !== 0 || packet.iamMutationMax !== 0
          || packet.mutationReachable !== false || executionEnvelope.setIamPolicyMax !== 0
          || executionEnvelope.credentialRefreshMax !== 1 || executionEnvelope.iamReadMax !== 1) return fail("CANONICAL_GENERATION_RESOLVED", FAILURE_CODES.BUDGET);
        if (packet.targetResource !== G2B_TARGET_RESOURCE || packet.targetRole !== G2B_TARGET_ROLE || packet.requestedPolicyVersion !== 3
          || G2B_CAS_SOURCE_PATHS.length !== packet.sourceCount) return fail("CANONICAL_GENERATION_RESOLVED", FAILURE_CODES.PACKET_SCHEMA);
        const trust = (testOnlyTrustResolver || loadTrust)({ packet, repositoryRoot, storeDirectory, manifestDirectory,
          attestationDirectory, environment, identityResolver: testOnlyIdentityResolver, now });
        const v3Packet = packet.schemaVersion === "myweb.g2b.clean-generation.cas-read-packet.v3";
        const v4Packet = packet.schemaVersion === G2B_CLEAN_CAS_READ_PACKET_V4_SCHEMA;
        const trustFailure = validateTrustBinding(packet, trust,
          { requireFresh: !(v3Packet || v4Packet) || trust?.attestationFresh === true });
        if (trustFailure) return fail("CANONICAL_GENERATION_RESOLVED", trustFailure);
        complete("CANONICAL_GENERATION_RESOLVED");
        complete("MANIFEST_VERIFIED");
        complete("ANCHOR_EVIDENCE_VERIFIED");
        complete("ATTESTATION_VERIFIED");
        const sourceLock = verifySourceLock({ packet, repositoryRoot });
        if (!sourceLock) return fail("SOURCE_LOCK_VERIFIED", FAILURE_CODES.SOURCE_LOCK);
        complete("SOURCE_LOCK_VERIFIED");
        if (sourceLock.sourceFingerprint !== trust.generation.sourceFingerprint) return fail("SOURCE_FINGERPRINT_VERIFIED", FAILURE_CODES.SOURCE);
        complete("SOURCE_FINGERPRINT_VERIFIED");
        if (trust.identityFingerprint !== packet.requestIdentity.identityFingerprint
          || sha256G2BCanonical({ member: trust.identity.exactIamMember }) !== packet.targetMemberFingerprint) return fail("REQUEST_IDENTITY_VERIFIED", FAILURE_CODES.IDENTITY);
        complete("REQUEST_IDENTITY_VERIFIED");
        if (!transport || typeof transport.prepareDirectContextCredentialRefresh !== "function"
          || typeof transport.executeDirectContextCredentialRefresh !== "function"
          || typeof transport.readGenerationBoundRecoveryPolicy !== "function") return fail("ATTESTATION_FRESHNESS_CONFIRMED", FAILURE_CODES.REQUEST);
        const artifactBase = `g2b-clean-cas-read-${packet.operationId}`;
        outputs = ["journal", "result", "failure", "attestation-refresh-attempt"].map((suffix) => join(outputDirectory, `${artifactBase}-${suffix}.json`));
        if (usedOperations.has(packet.operationId) || outputs.some((path) => existsSync(path))) {
          return fail("ATTESTATION_FRESHNESS_CONFIRMED", "CLEAN_ARTIFACT_COLLISION");
        }
        let executionTrust = trust;
        if (v3Packet || v4Packet) {
          const policy = v3Packet ? packet.attestationBindingPolicy : packet;
          const originalAttestationDigest = trust.attestation.attestationDigest;
          if (trust.attestationFresh !== true) {
            const expiredOnly = v3Packet
              ? trust.attestationAgeMs > policy.ttlMillis
              : now >= Date.parse(trust.attestation.expiresAt)
                && Date.parse(trust.attestation.expiresAt) - Date.parse(trust.attestation.issuedAt) <= 120_000;
            if (!expiredOnly || packet.attestationRefreshPolicy !== "EXPIRY_ONLY_LOCAL_REFRESH_MAX_1"
              || packet.expiryOnlyLocalRefreshAllowed !== true || packet.localRefreshMax !== 1) {
              return fail("ATTESTATION_FRESHNESS_CONFIRMED", FAILURE_CODES.ATTESTATION);
            }
            try {
              createOnlyJson(outputs[3], { schema: "myweb.g2b.clean-generation-attestation-refresh-attempt.v1",
                operationId: packet.operationId, rawPacketFileSha256: expectedRawPacketSha256,
                internalPacketDigest: packet.packetDigest, originalAttestationDigest,
                refreshAttempt: 1, startedAt: new Date(now).toISOString() });
              usedOperations.add(packet.operationId);
              approvalConsumed = true;
            } catch { return fail("ATTESTATION_FRESHNESS_CONFIRMED", "CLEAN_ATTESTATION_REFRESH_ATTEMPT_COLLISION"); }
            let refreshed;
            try {
              refreshed = testOnlyAttestationRefresher
                ? testOnlyAttestationRefresher({ packet, trust, now })
                : v4Packet
                  ? refreshV2Attestation({ packet, trust, environment, repositoryRoot, secretProvider, now })
                  : refreshV3Attestation({ packet, trust, environment, repositoryRoot, secretProvider, now });
            } catch { refreshed = null; }
            if (refreshed?.ok !== true || !refreshed.attestation || refreshed.attestation.attestationDigest === originalAttestationDigest
              || !sameAttestationBinding(refreshed.attestation, packet, { allowTestSignature: typeof testOnlyAttestationRefresher === "function" })) {
              return fail("ATTESTATION_FRESHNESS_CONFIRMED", "CLEAN_ATTESTATION_REFRESH_FAILED");
            }
            const refreshedTime = Date.parse(v4Packet ? refreshed.attestation.issuedAt : refreshed.attestation.validatedAt);
            const refreshedAgeMs = now - refreshedTime;
            if (!Number.isFinite(refreshedAgeMs) || refreshedAgeMs < 0 || refreshedAgeMs > (v3Packet ? policy.ttlMillis : 120_000)
              || (testOnlyAttestationRefresher === undefined && !verifyG2BCleanGenerationAttestationSignature(refreshed.attestation).ok)) {
              return fail("ATTESTATION_FRESHNESS_CONFIRMED", "CLEAN_ATTESTATION_REFRESH_INVALID");
            }
            const rereadRaw = readFileSync(safePacketPath);
            if (!rereadRaw.equals(raw) || digestBytes(rereadRaw) !== expectedRawPacketSha256
              || packet.packetDigest !== sha256G2BCanonical(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== "packetDigest")))) {
              return fail("ATTESTATION_FRESHNESS_CONFIRMED", "CLEAN_PACKET_CHANGED_DURING_REFRESH");
            }
            const resolved = refreshed.resolved || resolveG2BCleanCanonicalGeneration({ generationStore: trust.store,
              manifestStore: trust.manifestStore, attestation: refreshed.attestation,
              attestationBindings: { secretKeyId: trust.anchor.secretKeyId, environment, repositoryRoot,
                ...(v4Packet ? { operationId: packet.operationId, sourceLockDigest: packet.sourceLockDigest,
                  hostContextFingerprint: packet.hostContextFingerprint } : {}) }, now });
            executionTrust = Object.freeze({ ...trust, attestation: refreshed.attestation, resolved,
              attestationFresh: true, attestationAgeMs: refreshedAgeMs, attestationBindingValid: true });
            if (validateTrustBinding(packet, executionTrust, { allowRefreshedAttestation: v4Packet }) !== null
              || resolved?.ok !== true || resolved.readEligible !== true) {
              return fail("ATTESTATION_FRESHNESS_CONFIRMED", "CLEAN_ATTESTATION_REFRESH_RESOLUTION_FAILED");
            }
            attestationRefreshEvidence = Object.freeze({ originalAttestationDigest,
              originalAttestationState: "EXPIRED_ONLY", refreshPerformed: true,
              refreshedAttestationDigest: refreshed.attestation.attestationDigest, refreshedAgeMs,
              bindingComparisonResult: "EXACT_IMMUTABLE_BINDING_MATCH" });
          } else {
            if (validateTrustBinding(packet, executionTrust) !== null) return fail("ATTESTATION_FRESHNESS_CONFIRMED", FAILURE_CODES.ATTESTATION);
            attestationRefreshEvidence = Object.freeze({ originalAttestationDigest,
              originalAttestationState: "FRESH", refreshPerformed: false,
              refreshedAttestationDigest: null, refreshedAgeMs: trust.attestationAgeMs,
              bindingComparisonResult: "EXACT_IMMUTABLE_BINDING_MATCH" });
          }
        }
        complete("ATTESTATION_FRESHNESS_CONFIRMED");
        const journal = { schema: "myweb.g2b.clean-generation-cas-read-journal.v1", operationId: packet.operationId,
          rawPacketFileSha256: expectedRawPacketSha256, internalPacketDigest: packet.packetDigest, state: "APPROVAL_CONSUMED",
          consumedAt: new Date(now).toISOString(), phase: "CREDENTIAL_READY", attestationRefresh: attestationRefreshEvidence };
        usedOperations.add(packet.operationId);
        try { createOnlyJson(outputs[0], journal); } catch { return fail("CREDENTIAL_READY", "CLEAN_JOURNAL_CREATE_FAILED"); }
        approvalConsumed = true;
        complete("CREDENTIAL_READY");
        const refreshReadiness = await transport.prepareDirectContextCredentialRefresh();
        if (refreshReadiness?.ok !== true || refreshReadiness.physicalCalls !== 0) return fail("HELPER_STARTED", "CLEAN_CREDENTIAL_REFRESH_NOT_READY");
        const refresh = await transport.executeDirectContextCredentialRefresh(executionEnvelope);
        if (Number.isSafeInteger(refresh?.physicalCalls) && refresh.physicalCalls >= 0) {
          counters.credentialRefreshCalls += refresh.physicalCalls;
          counters.physicalRemoteCalls += refresh.physicalCalls;
        }
        if (refresh?.ok !== true || refresh.physicalCalls !== 1) return fail("HELPER_STARTED", "CLEAN_CREDENTIAL_REFRESH_FAILED");
        const read = await transport.readGenerationBoundRecoveryPolicy({ account: trust.identity.exactPrincipal,
          member: trust.identity.exactIamMember, targetResource: packet.targetResource, targetRole: packet.targetRole, executionEnvelope });
        if (Number.isSafeInteger(read?.physicalCalls) && read.physicalCalls >= 0) {
          counters.iamPolicyReadCalls += read.physicalCalls;
          counters.physicalRemoteCalls += read.physicalCalls;
        }
        const helperExecution = read?.helperExecution;
        if (!read?.childProcessStarted || !helperExecution
          || helperExecution.schemaVersion !== "myweb.g2b.helper-execution.v1") return fail("HELPER_STARTED", "CLEAN_HELPER_EXECUTION_ENVELOPE_INVALID", {
          transportFailureCode: read?.code, helperFailureCode: read?.helperFailureCode,
          helperExecution, transportDiagnostics: read?.failureEvidence,
        });
        complete("HELPER_STARTED");
        complete("HELPER_INPUT_ACCEPTED");
        if (helperExecution.success !== true || read.ok !== true) {
          const helperPhase = helperExecution.failedPhase;
          const failurePhase = helperPhase === "PHASE_06_PROVIDER_REQUEST_STARTED" ? "PROVIDER_REQUEST_STARTED"
            : helperPhase === "PHASE_07_PROVIDER_RESPONSE_RECEIVED" ? "PROVIDER_RESPONSE_RECEIVED"
            : helperPhase === "PHASE_08_HELPER_SERIALIZATION" ? "POLICY_EXTRACTED" : "REQUEST_BUILT";
          const concrete = helperExecution.failureCode || read.helperFailureCode || "HELPER_FAILURE_CODE_MISSING";
          return fail(failurePhase, `CLEAN_HELPER_${concrete}`, { helperFailureCode: concrete,
            helperExecution, transportFailureCode: read.code, transportDiagnostics: read.failureEvidence });
        }
        if (helperExecution.requestBuilt !== true || helperExecution.providerRequestPrepared !== true
          || helperExecution.requestMetadataAvailable !== true || read.physicalCalls !== 1) {
          return fail("REQUEST_BUILT", "CLEAN_HELPER_REQUEST_BUILD_STATE_INVALID", { helperExecution,
            transportFailureCode: read.code, transportDiagnostics: read.failureEvidence });
        }
        if (read.requestMetadata?.requestBodyOptionsVersionValidated !== true || read.requestMetadata?.requestedPolicyVersion !== 3
          || read.requestMetadata?.resourceValidatedBeforeDispatch !== true) return fail("REQUEST_BUILT", FAILURE_CODES.REQUEST);
        complete("REQUEST_BUILT");
        if (helperExecution.providerRequestStarted !== true || read.requestStarted !== true || read.transportLifecycle?.providerRequestStarted !== true
          || read.requestMetadata?.requestPathValidatedBeforeDispatch !== true) return fail("PROVIDER_REQUEST_STARTED", FAILURE_CODES.PROVIDER);
        complete("PROVIDER_REQUEST_STARTED");
        if (helperExecution.providerResponseReceived !== true || !read.ok || read.providerMetadata?.responseReceived !== true || read.providerMetadata?.httpStatus !== 200) {
          return fail("PROVIDER_RESPONSE_RECEIVED", FAILURE_CODES.PROVIDER, {
            transportFailureCode: read?.code,
            transportDiagnostics: read?.failureEvidence,
          });
        }
        complete("PROVIDER_RESPONSE_RECEIVED");
        const policy = read.policy;
        if (!policy || !Array.isArray(policy.bindings) || typeof policy.etag !== "string" || !policy.etag
          || !(read.returnedPolicyVersionState === "UNSET" && read.returnedPolicyVersionValue === null && policy.version === null
            || read.returnedPolicyVersionState === "EXPLICIT" && Number.isSafeInteger(read.returnedPolicyVersionValue)
              && [0, 1, 3].includes(read.returnedPolicyVersionValue) && policy.version === read.returnedPolicyVersionValue)
          || read.requestedPolicyVersion !== 3 || read.returnedPolicyVersion !== read.returnedPolicyVersionValue
          || read.versionSourceLayer !== "PYTHON_MESSAGE_TO_DICT") return fail("POLICY_EXTRACTED", FAILURE_CODES.EXTRACTION);
        if (helperExecution.policyExtracted !== true) return fail("POLICY_EXTRACTED", "CLEAN_HELPER_POLICY_EXTRACTION_STATE_INVALID", { helperExecution });
        complete("POLICY_EXTRACTED");
        const evidenceVersionState = baselineVersionState(read.returnedPolicyVersionState, read.returnedPolicyVersionValue);
        const baseline = baselineDigests(policy, evidenceVersionState, read.returnedPolicyVersionValue);
        const roleBindings = baseline.bindings.filter((binding) => binding.role === packet.targetRole);
        const targetDirect = roleBindings.some((binding) => binding.condition === undefined && binding.members.includes(trust.identity.exactIamMember));
        const targetConditional = roleBindings.some((binding) => binding.condition !== undefined && binding.members.includes(trust.identity.exactIamMember));
        const targetBindingState = targetDirect ? "PRESENT" : targetConditional ? "CONDITIONALLY_PRESENT" : "ABSENT";
        const relevantBindingsDigest = sha256G2BCanonical(roleBindings);
        const responseShape = read.serializationMetadata?.providerResponseShape;
        const responseFieldDiagnostic = read.responseFieldDiagnostic || {};
        if (responseFieldDiagnostic.bindingsPresent === true
          && responseFieldDiagnostic.bindingsCount !== policy.bindings.length
          || Number.isSafeInteger(responseFieldDiagnostic.conditionBindingCount)
            && responseFieldDiagnostic.conditionBindingCount !== baseline.conditionBindingCount) {
          return fail("CAS_EVIDENCE_CAPTURED", "CLEAN_BASELINE_METADATA_CONFLICT");
        }
        const readTimestamp = new Date(now).toISOString();
        const targetMember = trust.identity.exactIamMember;
        const packetBindingEquality = packet.targetResource === G2B_TARGET_RESOURCE
          && packet.targetRole === G2B_TARGET_ROLE
          && packet.targetMemberFingerprint === sha256G2BCanonical({ member: targetMember });
        if (!packetBindingEquality) return fail("CAS_EVIDENCE_CAPTURED", "CLEAN_BASELINE_PACKET_BINDING_MISMATCH");
        const directEtagSha256 = responseFieldDiagnostic.apitoolsDirectEtagSha256;
        const etagSha256 = SHA256.test(directEtagSha256 || "") ? directEtagSha256
          : SHA256.test(responseFieldDiagnostic.etagSha256 || "") ? responseFieldDiagnostic.etagSha256 : null;
        const etagType = ["BYTES", "STRING"].includes(responseFieldDiagnostic.apitoolsDirectEtagType)
          ? responseFieldDiagnostic.apitoolsDirectEtagType : responseFieldDiagnostic.etagType;
        const etagPresent = responseFieldDiagnostic.apitoolsDirectEtagPresent === true
          ? ["BYTES", "STRING"].includes(responseFieldDiagnostic.apitoolsDirectEtagType)
          : responseFieldDiagnostic.etagPresent === true;
        const versionStateKnown = ["UNSET", "EXPLICIT_0", "EXPLICIT_1", "EXPLICIT_3"].includes(evidenceVersionState)
          && (evidenceVersionState === "UNSET" ? read.returnedPolicyVersionValue === null
            : Number.isSafeInteger(read.returnedPolicyVersionValue) && [0, 1, 3].includes(read.returnedPolicyVersionValue));
        const identityFields = {
          targetResource: packet.targetResource, targetRole: packet.targetRole, targetMember,
          operationId: packet.operationId, generationId: packet.canonicalGenerationId,
          sourceFingerprint: packet.sourceFingerprint, packetRawSha256: expectedRawPacketSha256,
          packetInternalDigest: packet.packetDigest,
        };
        const evidencePayload = {
          schema: "myweb.g2b.clean-generation-cas-read-evidence.v2", ...identityFields,
          manifestVersion: packet.manifestVersion, manifestDigest: packet.manifestDigest,
          sourceLockDigest: packet.sourceLockDigest, anchorEvidenceDigest: packet.anchorVerifiedEvidenceDigest,
          providerSuccess: read.ok === true && helperExecution.success === true,
          providerRequestStarted: helperExecution.providerRequestStarted === true && read.requestStarted === true,
          providerResponseReceived: helperExecution.providerResponseReceived === true
            && read.providerMetadata?.responseReceived === true,
          httpStatus: read.providerMetadata?.httpStatus ?? null,
          readTimestamp, requestedPolicyVersion: read.requestedPolicyVersion,
          returnedPolicyVersionState: evidenceVersionState,
          returnedPolicyVersionValue: read.returnedPolicyVersionValue,
          returnedPolicyVersion: read.returnedPolicyVersionValue,
          versionSourceLayer: read.versionSourceLayer,
          etagPresent, etagType, etagSha256,
          targetMemberFingerprint: packet.targetMemberFingerprint,
          packetBindingEquality: true,
          targetBindingState, targetBindingStateKnown: targetBindingState !== "UNKNOWN",
          bindingsCount: baseline.bindingsCount,
          relevantBindingCount: roleBindings.length,
          relevantBindingsDigest,
          fullBindingsCanonicalDigest: baseline.fullBindingsCanonicalDigest,
          conditionBindingCount: baseline.conditionBindingCount,
          unconditionalBindingCount: baseline.unconditionalBindingCount,
          conditionsPresent: baseline.conditionsPresent,
          withcondMarkerCount: baseline.withcondMarkerCount,
          conditionCanonicalDigest: baseline.conditionCanonicalDigest,
          policyCanonicalDigest: baseline.policyCanonicalDigest,
          providerResponseObjectModule: typeof responseShape?.providerResponseObjectModule === "string"
            ? responseShape.providerResponseObjectModule : null,
          providerResponseObjectClass: typeof responseShape?.providerResponseObjectClass === "string"
            ? responseShape.providerResponseObjectClass : null,
          providerResponseWrapperType: typeof responseShape?.providerResponseWrapperType === "string"
            ? responseShape.providerResponseWrapperType : null,
          casState: "RESOLVED", CAS_STATE: "RESOLVED",
          policyDrift: "NOT_COMPARABLE_WITHOUT_PRIOR_POLICY_BASELINE",
          transportLifecycle: read.transportLifecycle || null,
          etagDigest: etagSha256,
          providerRequestResource: RESOURCE,
          attestationRefresh: attestationRefreshEvidence,
          privacy: Object.freeze({ rawPolicyPersisted: false, rawPrincipalPersisted: true,
            credentialPersisted: false, tokenPersisted: false }),
        };
        const evidenceIntegrityDigest = sha256G2BCanonical({ schema: BASELINE_INTEGRITY_SCHEMA, evidence: evidencePayload });
        const candidateEvidence = { ...evidencePayload, evidenceIntegrityDigest };
        const requiredBaselineChecks = [
          ["targetResource", candidateEvidence.targetResource === G2B_TARGET_RESOURCE],
          ["targetRole", candidateEvidence.targetRole === G2B_TARGET_ROLE],
          ["targetMember", typeof candidateEvidence.targetMember === "string" && MEMBER.test(candidateEvidence.targetMember)],
          ["packetBindingEquality", candidateEvidence.packetBindingEquality === true],
          ["operationId", UUID.test(candidateEvidence.operationId)],
          ["generationId", UUID.test(candidateEvidence.generationId)],
          ["sourceFingerprint", SHA256.test(candidateEvidence.sourceFingerprint)],
          ["packetRawSha256", SHA256.test(candidateEvidence.packetRawSha256)],
          ["packetInternalDigest", SHA256.test(candidateEvidence.packetInternalDigest)],
          ["providerRequestStarted", candidateEvidence.providerRequestStarted === true],
          ["providerResponseReceived", candidateEvidence.providerResponseReceived === true],
          ["providerSuccess", candidateEvidence.providerSuccess === true],
          ["httpStatus", candidateEvidence.httpStatus === 200],
          ["readTimestamp", Number.isFinite(Date.parse(candidateEvidence.readTimestamp))],
          ["requestedPolicyVersion", candidateEvidence.requestedPolicyVersion === 3],
          ["returnedPolicyVersionState", versionStateKnown],
          ["etagPresent", candidateEvidence.etagPresent === true],
          ["etagType", ["BYTES", "STRING"].includes(candidateEvidence.etagType)],
          ["etagSha256", SHA256.test(candidateEvidence.etagSha256)],
          ["bindingsCount", Number.isSafeInteger(candidateEvidence.bindingsCount)],
          ["fullBindingsCanonicalDigest", SHA256.test(candidateEvidence.fullBindingsCanonicalDigest)],
          ["relevantBindingsDigest", SHA256.test(candidateEvidence.relevantBindingsDigest)],
          ["conditionBindingCount", Number.isSafeInteger(candidateEvidence.conditionBindingCount)],
          ["unconditionalBindingCount", Number.isSafeInteger(candidateEvidence.unconditionalBindingCount)],
          ["conditionsPresent", typeof candidateEvidence.conditionsPresent === "boolean"],
          ["withcondMarkerCount", Number.isSafeInteger(candidateEvidence.withcondMarkerCount)],
          ["conditionCanonicalDigest", SHA256.test(candidateEvidence.conditionCanonicalDigest)],
          ["policyCanonicalDigest", SHA256.test(candidateEvidence.policyCanonicalDigest)],
          ["providerResponseObjectModule", typeof candidateEvidence.providerResponseObjectModule === "string"
            && candidateEvidence.providerResponseObjectModule.length > 0],
          ["providerResponseObjectClass", typeof candidateEvidence.providerResponseObjectClass === "string"
            && candidateEvidence.providerResponseObjectClass.length > 0],
          ["providerResponseWrapperType", ["DIRECT_POLICY", "KNOWN_PROVIDER_WRAPPER", "SDK_POLICY_MESSAGE"]
            .includes(candidateEvidence.providerResponseWrapperType)],
          ["targetBindingState", candidateEvidence.targetBindingStateKnown === true],
          ["casState", candidateEvidence.casState === "RESOLVED"],
          ["evidenceIntegrityDigest", verifyG2BCleanCasBaselineEvidence(candidateEvidence)],
        ];
        const missingBaselineFields = requiredBaselineChecks.filter(([, passed]) => !passed).map(([name]) => name);
        const baselineCapable = missingBaselineFields.length === 0;
        const evidence = Object.freeze({ ...candidateEvidence, baselineCapable, missingBaselineFields: Object.freeze(missingBaselineFields),
          baselineIdDigest: baselineCapable ? computeG2BCleanCasBaselineId(candidateEvidence) : null });
        const providerShape = responseShape;
        const result = Object.freeze({ schema: "myweb.g2b.clean-generation-cas-read-result.v2", status: "READ_COMPLETED",
          operationId: packet.operationId, generationId: packet.canonicalGenerationId, sourceFingerprint: packet.sourceFingerprint,
          packetRawSha256: expectedRawPacketSha256, packetInternalDigest: packet.packetDigest,
          targetResource: packet.targetResource, targetRole: packet.targetRole,
          targetMember, targetMemberFingerprint: packet.targetMemberFingerprint,
          providerSuccess: evidence.providerSuccess, providerRequestStarted: evidence.providerRequestStarted,
          providerResponseReceived: evidence.providerResponseReceived, httpStatus: evidence.httpStatus, readTimestamp,
          requestedPolicyVersion: evidence.requestedPolicyVersion,
          returnedPolicyVersionState: evidenceVersionState,
          returnedPolicyVersionValue: evidence.returnedPolicyVersionValue,
          returnedPolicyVersion: evidence.returnedPolicyVersionValue,
          etagPresent, etagType, etagSha256,
          bindingsCount: baseline.bindingsCount, unconditionalBindingCount: baseline.unconditionalBindingCount,
          conditionBindingCount: baseline.conditionBindingCount, conditionsPresent: baseline.conditionsPresent,
          withcondMarkerCount: baseline.withcondMarkerCount, conditionCanonicalDigest: baseline.conditionCanonicalDigest,
          fullBindingsCanonicalDigest: baseline.fullBindingsCanonicalDigest,
          relevantBindingsDigest, policyCanonicalDigest: baseline.policyCanonicalDigest,
          providerResponseObjectModule: providerShape.providerResponseObjectModule,
          providerResponseObjectClass: providerShape.providerResponseObjectClass,
          providerResponseWrapperType: providerShape.providerResponseWrapperType,
          targetBindingState, CAS_STATE: "RESOLVED", baselineCapable,
          missingBaselineFields: evidence.missingBaselineFields, baselineIdDigest: evidence.baselineIdDigest,
          evidenceIntegrityDigest,
          approvalConsumed: true, attestationRefresh: attestationRefreshEvidence,
          physicalRemoteCalls: Object.freeze({ ...counters }), setIamPolicyCalls: 0, iamMutations: 0,
          firestoreWrites: 0, storageWrites: 0, productionWrites: 0, retries: 0,
          phases: Object.freeze([...phases]), failedPhase: null });
        const finalEvidence = evidence;
        complete("CAS_EVIDENCE_CAPTURED");
        const persistedResult = Object.freeze({ ...result, evidenceDigest: sha256G2BCanonical(finalEvidence) });
        try { createOnlyJson(outputs[1], finalEvidence); createOnlyJson(outputs[2], persistedResult); }
        catch { return Object.freeze({ ok: false, code: "CLEAN_RESULT_PERSISTENCE_FAILED", counters: result.physicalRemoteCalls, phases: Object.freeze([...phases]) }); }
        return Object.freeze({ ok: true, evidence: finalEvidence, result: persistedResult, outputPaths: Object.freeze({ journal: outputs[0], evidence: outputs[1], result: outputs[2] }),
          phases: Object.freeze([...phases]), counters: Object.freeze({ ...counters }) });
      } catch (error) {
        const errorType = error?.name || error?.constructor?.name || typeof error;
        const localFailure = safeFailureCode(error) === "CLEAN_EXECUTOR_UNKNOWN"
          ? `CLEAN_LOCAL_${/^[A-Za-z]+Error$/.test(errorType) ? errorType.replace(/Error$/, "_ERROR").toUpperCase() : "UNCLASSIFIED_ERROR"}`
          : safeFailureCode(error);
        return fail(currentFailurePhase, localFailure);
      }
    },
  });
}

export const G2B_CLEAN_CAS_EXECUTOR_CONTRACT = Object.freeze({ packetSchema: G2B_CLEAN_CAS_READ_PACKET_SCHEMA,
  sourcePathCount: G2B_CAS_SOURCE_PATHS.length, legacyM3ExecutorUsed: false, requestedPolicyVersion: 3,
  retries: 0, credentialRefreshMax: 1, iamPolicyReadMax: 1, totalPhysicalRemoteCallsMax: 2,
  setIamPolicyMax: 0, iamMutationMax: 0, mutationReachable: false });
