import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, unlinkSync, writeSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { buildG2BRecoveryAnchor, verifyG2BRecoveryAnchor, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { G2B_CAS_SOURCE_PATHS, currentG2BCasSourceEntries, computeCanonicalSourceFingerprint } from "./g2bCanonicalSourceFingerprint.mjs";
import { g2bHostAnchorSourceFingerprint, g2bHostContextFingerprint } from "./g2bHostAnchorAttestation.mjs";
import { buildG2BCleanGenerationAttestation, buildG2BCleanGenerationAttestationV2, validateG2BCleanGenerationSigningKey,
  verifyG2BCleanGenerationAttestation, verifyG2BCleanGenerationAttestationV2, verifyG2BCleanGenerationAttestationSignature,
  writeG2BCleanGenerationAttestation, writeG2BCleanGenerationAttestationV2 } from "./g2bCleanGenerationAttestation.mjs";
import { buildG2BCleanCanonicalManifest, canonicalG2BJson, createG2BCleanCanonicalManifestStore, sha256G2BCanonical, verifyG2BCleanCanonicalManifest } from "./g2bCanonicalGenerationManifest.mjs";

export const G2B_CLEAN_BOOTSTRAP_SCHEMA = "myweb.g2b.clean-generation-bootstrap.v1";
export const G2B_CLEAN_BOOTSTRAP_INTENT_SCHEMA = "myweb.g2b.clean-generation-bootstrap-intent.v1";
export const G2B_CLEAN_BOOTSTRAP_INTENT_SCHEMA_V2 = "myweb.g2b.clean-generation-bootstrap-intent.v2";
export const G2B_CLEAN_HISTORICAL_POLICY_SCHEMA = "myweb.g2b.clean-generation-historical-policy.v1";
export const G2B_CLEAN_BOOTSTRAP_EVENT_SCHEMA = "myweb.g2b.clean-generation-bootstrap-event.v1";
export const G2B_CLEAN_BOOTSTRAP_REASON = "CLEAN_BOOTSTRAP_AFTER_UNRESOLVED_HISTORICAL_LINEAGE";
export const G2B_CLEAN_REVIEW_JSON_SHA256 = "8ed36e28f8c8ede6db7daaef738d01183c0e14445625896a172c49844d86b31a";
export const G2B_CLEAN_REVIEW_MARKDOWN_SHA256 = "918f00eb3b0dc9ad41b5005826ee0e79ed01481a8c0ef98b966a8f849c2371d0";
export const G2B_CLEAN_DESIGN_JSON_SHA256 = "3a59b45d4aee3d2e0cc52d546334d3b3ed0660ccd8fad54c252e918a78692ecf";
export const G2B_CLEAN_DESIGN_MARKDOWN_SHA256 = "9102e3cda1e8e9349b32047cbda16487d2dc7ac167b887dee8b87516291d078e";
export const G2B_HISTORICAL_GENERATIONS = Object.freeze([
  "214348c8-3be0-44f8-a010-adbe1ac68090",
  "8b30e1da-8d4d-4ded-ad94-cf62aabcc981",
  "8c7cf023-ff93-4070-af83-293a2d67a1f0",
  "45367664-0d41-4740-bd62-bec309c2fb4c",
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[a-f0-9]{64}$/;

export function resolveG2BCanonicalAuthorityStorePaths({ environment = process.env, explicitRoot } = {}) {
  const base = explicitRoot === undefined ? environment?.LOCALAPPDATA : explicitRoot;
  if (typeof base !== "string" || !base.trim() || !isAbsolute(base)) {
    return Object.freeze({ ok: false, code: "CANONICAL_AUTHORITY_ROOT_INVALID" });
  }
  const root = explicitRoot === undefined
    ? resolve(base, "MY-WEB", "authority-audit", "clean-generations-v1")
    : resolve(base);
  const relativeRoot = relative(resolve(base), root);
  if (explicitRoot === undefined && (!relativeRoot || relativeRoot.startsWith(`..${"\\"}`) || isAbsolute(relativeRoot))) {
    return Object.freeze({ ok: false, code: "CANONICAL_AUTHORITY_ROOT_ESCAPE" });
  }
  return Object.freeze({ ok: true, root, artifactDirectory: root,
    manifestDirectory: join(root, "canonical-manifests"), attestationDirectory: join(root, "attestations"),
    source: explicitRoot === undefined ? "CURRENT_USER_LOCALAPPDATA" : "EXPLICIT_STORE_OVERRIDE" });
}

function validateAttestationNamespace(directory) {
  if (!existsSync(directory)) return;
  let names;
  try { names = readdirSync(directory); } catch { throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_DIRECTORY_UNREADABLE"); }
  for (const name of names) {
    const match = name.match(/^([0-9a-f-]{36})-([0-9a-f-]{36})(?:-([0-9a-f-]{36})-v2)?\.json$/);
    if (!match || !UUID.test(match[1]) || !UUID.test(match[2]) || (match[3] && !UUID.test(match[3]))) {
      throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_NAMESPACE_COLLISION");
    }
    const path = join(directory, name);
    try {
      if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_LINK_BLOCKED");
    } catch (error) {
      throw error?.message === "CLEAN_BOOTSTRAP_ATTESTATION_LINK_BLOCKED" ? error : new Error("CLEAN_BOOTSTRAP_ATTESTATION_ARTIFACT_INVALID");
    }
    const loaded = readSafeJson(path);
    if (loaded.state !== "READY" || loaded.value.generationId !== match[1] || loaded.value.operationId !== (match[3] ? match[2] : undefined)
      || loaded.value.validationId !== (match[3] || match[2])
      || !verifyG2BCleanGenerationAttestationSignature(loaded.value).ok) {
      throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_ARTIFACT_INVALID");
    }
  }
}

export function evaluateG2BCleanBootstrapTrustedHostPrecondition({ platform = process.platform, provider, identity,
  artifactDirectory, attestationDirectory, sourceLockOutput, packetOutput, executionEvidenceOutput,
  environment = process.env } = {}) {
  const environmentReady = (key) => typeof environment?.[key] === "string" && environment[key].trim().length > 0;
  const bothPathsPresent = typeof sourceLockOutput === "string" && sourceLockOutput.length > 0
    && typeof packetOutput === "string" && packetOutput.length > 0
    && typeof executionEvidenceOutput === "string" && executionEvidenceOutput.length > 0;
  const pathsDistinct = !bothPathsPresent || new Set([sourceLockOutput, packetOutput, executionEvidenceOutput].map((path) => resolve(path))).size === 3;
  const leaves = [
    ["platform", platform === "win32", "TRUSTED_HOST_CONTEXT_INVALID"],
    ["dpapiProviderSemantic", provider?.semantic === "WINDOWS_DPAPI_CURRENT_USER_LOCAL_APPDATA_V1", "TRUSTED_HOST_DPAPI_INVALID"],
    ["identityPrincipalPresent", typeof identity?.exactPrincipal === "string" && identity.exactPrincipal.length > 0, "TRUSTED_HOST_IDENTITY_INVALID"],
    ["identityMemberPresent", typeof identity?.exactIamMember === "string" && identity.exactIamMember.length > 0, "TRUSTED_HOST_IDENTITY_INVALID"],
    ["artifactDirectoryPresent", typeof artifactDirectory === "string" && artifactDirectory.length > 0, "TRUSTED_HOST_SCHEMA_INVALID"],
    ["attestationDirectoryPresent", typeof attestationDirectory === "string" && attestationDirectory.length > 0, "TRUSTED_HOST_SCHEMA_INVALID"],
    ["sourceLockOutputPresent", typeof sourceLockOutput === "string" && sourceLockOutput.length > 0, "TRUSTED_HOST_SCHEMA_INVALID"],
    ["packetOutputPresent", typeof packetOutput === "string" && packetOutput.length > 0, "TRUSTED_HOST_SCHEMA_INVALID"],
    ["executionEvidenceOutputPresent", typeof executionEvidenceOutput === "string" && executionEvidenceOutput.length > 0, "TRUSTED_HOST_SCHEMA_INVALID"],
    ["outputsDistinct", pathsDistinct, "TRUSTED_HOST_SCHEMA_INVALID"],
    ...["USERNAME", "USERDOMAIN", "USERPROFILE", "COMPUTERNAME"].map((key) => ["environment." + key, environmentReady(key), "TRUSTED_HOST_CONTEXT_INVALID"]),
  ].map(([name, passed, failureCode]) => Object.freeze({ name, required: true, normalizedBoolean: passed === true, failureCode }));
  const failures = leaves.filter((leaf) => !leaf.normalizedBoolean);
  return Object.freeze({ ok: failures.length === 0, leaves: Object.freeze(leaves), failures: Object.freeze(failures),
    failureCode: failures[0]?.failureCode || null });
}

function hashRaw(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function safeFailureCode(error) {
  const message = String(error?.message || "");
  return /^[A-Z0-9_-]{1,96}$/.test(message) ? message : "LOCAL_FAILURE_UNCLASSIFIED";
}

function readSafeJson(path) {
  if (!existsSync(path)) return Object.freeze({ state: "MISSING" });
  try { return Object.freeze({ state: "READY", value: Object.freeze(JSON.parse(readFileSync(path, "utf8"))) }); }
  catch { return Object.freeze({ state: "INVALID" }); }
}

function validEvent(value, { eventType, generationId, intent, newState } = {}) {
  const common = ["schemaVersion", "eventType", "generationId", "bootstrapIntentId", "operationId", "evidenceDigest"];
  const eventFields = {
    ANCHOR_PERSISTED: ["previousState", "newState", "anchorFingerprint", "identityFingerprint", "hostContextFingerprint", "sourceFingerprint", "createdAt"],
    ANCHOR_VERIFIED: ["previousState", "newState", "anchorFingerprint", "identityFingerprint", "hostContextFingerprint", "sourceFingerprint",
      "hmacValid", "generationMatch", "identityMatch", "hostMatch", "sourceMatch", "verificationTimestamp"],
    ANCHOR_VERIFICATION_ATTEMPT: ["attemptId", "identityFingerprint", "hostContextFingerprint", "sourceFingerprint", "validationResult", "validationState", "attemptedAt"],
    ATTESTATION_ELIGIBLE: ["attestationDigest", "readEligible", "mutationEligible"],
    CANONICAL_INELIGIBLE: ["failureCode", "at"],
    BOOTSTRAP_ABORTED: ["failureCode", "at"],
  };
  const allowed = eventFields[eventType];
  if (!allowed || Object.keys(value || {}).sort().join(",") !== [...common, ...allowed].sort().join(",")) return false;
  if (!value || value.schemaVersion !== G2B_CLEAN_BOOTSTRAP_EVENT_SCHEMA || value.eventType !== eventType
    || value.generationId !== generationId || value.bootstrapIntentId !== intent.bootstrapIntentId
    || value.operationId !== intent.operationId || (newState && value.newState !== newState)) return false;
  const { evidenceDigest, ...payload } = value;
  return SHA256.test(evidenceDigest || "") && sha256G2BCanonical(payload) === evidenceDigest;
}

function createOrVerifyJson(path, value) {
  const prior = readSafeJson(path);
  if (prior.state === "INVALID") throw new Error("CLEAN_BOOTSTRAP_EXISTING_ARTIFACT_INVALID");
  if (prior.state === "READY") {
    if (canonicalG2BJson(prior.value) !== canonicalG2BJson(value)) throw new Error("CLEAN_BOOTSTRAP_EXISTING_ARTIFACT_MISMATCH");
    return Object.freeze({ path, rawSha256: hashRaw(path), reused: true });
  }
  return createOnlyJson(path, value);
}

export function buildG2BCleanBootstrapIntent({ bootstrapIntentId, operationId, generationId, input, createdAt = new Date().toISOString() } = {}) {
  const inputKeys = input && typeof input === "object" && !Array.isArray(input) ? Object.keys(input).sort() : [];
  if (!UUID.test(bootstrapIntentId || "") || !UUID.test(operationId || "") || !UUID.test(generationId || "")
    || G2B_HISTORICAL_GENERATIONS.includes(generationId) || !input || !SHA256.test(input.identityFingerprint || "")
    || !SHA256.test(input.hostContextFingerprint || "") || !SHA256.test(input.sourceFingerprint || "")
    || !SHA256.test(input.anchorMaterialReferenceFingerprint || "")
    || inputKeys.join(",") !== "anchorMaterialReferenceFingerprint,hostContextFingerprint,identityFingerprint,sourceFingerprint"
    || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error("clean-bootstrap-intent-input-invalid");
  }
  const payload = Object.freeze({ schemaVersion: G2B_CLEAN_BOOTSTRAP_INTENT_SCHEMA, bootstrapIntentId, operationId,
    generationId, bootstrapType: "CLEAN_BOOTSTRAP", historicalLineageStatus: "UNRESOLVED",
    bootstrapReason: G2B_CLEAN_BOOTSTRAP_REASON,
    historicalGenerationIds: G2B_HISTORICAL_GENERATIONS,
    manualReviewEvidenceDigests: Object.freeze([G2B_CLEAN_REVIEW_JSON_SHA256, G2B_CLEAN_REVIEW_MARKDOWN_SHA256]),
    designEvidenceDigests: Object.freeze([G2B_CLEAN_DESIGN_JSON_SHA256, G2B_CLEAN_DESIGN_MARKDOWN_SHA256]),
    input: Object.freeze({ ...input }), createdAt });
  return Object.freeze({ ...payload, inputDigest: sha256G2BCanonical(payload) });
}

export function buildG2BCleanHistoricalPolicy({ generationStore } = {}) {
  const candidates = generationStore?.candidates();
  if (!Array.isArray(candidates) || candidates.some((candidate) => candidate.invalid)) {
    throw new Error("CLEAN_BOOTSTRAP_HISTORICAL_POLICY_INVALID");
  }
  const ineligibleGenerationIds = [];
  for (const candidate of candidates) {
    const state = generationStore.terminalState(candidate.generationId);
    if (state.state === "INVALID") throw new Error("CLEAN_BOOTSTRAP_HISTORICAL_POLICY_INVALID");
    if (state.state === "TERMINAL") ineligibleGenerationIds.push(candidate.generationId);
  }
  return Object.freeze({ schemaVersion: G2B_CLEAN_HISTORICAL_POLICY_SCHEMA,
    historicalGenerationIds: Object.freeze([...new Set([...G2B_HISTORICAL_GENERATIONS,
      ...candidates.map((candidate) => candidate.generationId)])].sort()),
    ineligibleGenerationIds: Object.freeze(ineligibleGenerationIds.sort()),
    lineageStatus: "UNRESOLVED", trustInheritance: "NONE", parentGenerationId: null });
}

export function buildG2BCleanBootstrapIntentV2({ bootstrapIntentId, operationId, generationId, input,
  historicalPolicy, createdAt = new Date().toISOString() } = {}) {
  const inputKeys = input && typeof input === "object" && !Array.isArray(input) ? Object.keys(input).sort() : [];
  if (!UUID.test(bootstrapIntentId || "") || !UUID.test(operationId || "") || !UUID.test(generationId || "")
    || !historicalPolicy || inputKeys.join(",") !== "anchorMaterialReferenceFingerprint,hostContextFingerprint,identityFingerprint,memberFingerprint,sourceFingerprint"
    || !Object.values(input).every((item) => SHA256.test(item || "")) || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error("clean-bootstrap-intent-v2-input-invalid");
  }
  const payload = { schemaVersion: G2B_CLEAN_BOOTSTRAP_INTENT_SCHEMA_V2, bootstrapIntentId, operationId, generationId,
    bootstrapType: "CLEAN_BOOTSTRAP", historicalLineageStatus: "UNRESOLVED", bootstrapReason: G2B_CLEAN_BOOTSTRAP_REASON,
    historicalGenerationIds: historicalPolicy.historicalGenerationIds,
    historicalPolicy, historicalPolicyDigest: sha256G2BCanonical(historicalPolicy),
    attestationSchemaVersion: "myweb.g2b.clean-generation-host-attestation.v2",
    packetSchemaVersion: "myweb.g2b.clean-generation.cas-read-packet.v4",
    manualReviewEvidenceDigests: [G2B_CLEAN_REVIEW_JSON_SHA256, G2B_CLEAN_REVIEW_MARKDOWN_SHA256],
    designEvidenceDigests: [G2B_CLEAN_DESIGN_JSON_SHA256, G2B_CLEAN_DESIGN_MARKDOWN_SHA256], input, createdAt };
  const intent = Object.freeze({ ...payload, inputDigest: sha256G2BCanonical(payload) });
  if (!verifyG2BCleanBootstrapIntent(intent)) throw new Error("clean-bootstrap-intent-v2-input-invalid");
  return intent;
}

export function verifyG2BCleanBootstrapIntent(value) {
  try {
    const { inputDigest, ...payload } = value;
    const allowedKeys = ["bootstrapIntentId", "bootstrapReason", "bootstrapType", "createdAt", "designEvidenceDigests",
      "generationId", "historicalGenerationIds", "historicalLineageStatus", "input", "manualReviewEvidenceDigests",
      "operationId", "schemaVersion"];
    const isV2 = value?.schemaVersion === G2B_CLEAN_BOOTSTRAP_INTENT_SCHEMA_V2;
    const v2Keys = ["historicalPolicy", "historicalPolicyDigest", "attestationSchemaVersion", "packetSchemaVersion"];
    const policy = value?.historicalPolicy;
    const sortedUniqueUuids = (ids) => Array.isArray(ids) && ids.length <= 256
      && ids.every((id) => UUID.test(id)) && [...new Set(ids)].sort().join(",") === ids.join(",");
    const policyValid = !isV2 || (policy?.schemaVersion === G2B_CLEAN_HISTORICAL_POLICY_SCHEMA
      && Object.keys(policy).sort().join(",") === ["schemaVersion", "historicalGenerationIds", "ineligibleGenerationIds",
        "lineageStatus", "trustInheritance", "parentGenerationId"].sort().join(",")
      && sortedUniqueUuids(policy.historicalGenerationIds) && sortedUniqueUuids(policy.ineligibleGenerationIds)
      && G2B_HISTORICAL_GENERATIONS.every((id) => policy.historicalGenerationIds.includes(id))
      && policy.ineligibleGenerationIds.every((id) => policy.historicalGenerationIds.includes(id))
      && !policy.historicalGenerationIds.includes(value.generationId)
      && policy.lineageStatus === "UNRESOLVED" && policy.trustInheritance === "NONE" && policy.parentGenerationId === null
      && SHA256.test(value.historicalPolicyDigest || "")
      && value.historicalPolicyDigest === sha256G2BCanonical(policy)
      && value.historicalGenerationIds.join(",") === policy.historicalGenerationIds.join(",")
      && value.attestationSchemaVersion === "myweb.g2b.clean-generation-host-attestation.v2"
      && value.packetSchemaVersion === "myweb.g2b.clean-generation.cas-read-packet.v4");
    return [G2B_CLEAN_BOOTSTRAP_INTENT_SCHEMA, G2B_CLEAN_BOOTSTRAP_INTENT_SCHEMA_V2].includes(value?.schemaVersion)
      && policyValid && SHA256.test(inputDigest || "")
      && Object.keys(value).sort().join(",") === [...allowedKeys, "inputDigest", ...(isV2 ? v2Keys : [])].sort().join(",")
      && sha256G2BCanonical(payload) === inputDigest && value.historicalLineageStatus === "UNRESOLVED"
      && UUID.test(value.bootstrapIntentId || "") && UUID.test(value.operationId || "") && UUID.test(value.generationId || "")
      && value.bootstrapType === "CLEAN_BOOTSTRAP" && Number.isFinite(Date.parse(value.createdAt))
      && Array.isArray(value.historicalGenerationIds) && value.historicalGenerationIds.length <= 256
      && value.historicalGenerationIds.every((id) => UUID.test(id))
      && new Set(value.historicalGenerationIds).size === value.historicalGenerationIds.length
      && !value.historicalGenerationIds.includes(value.generationId)
      && value.bootstrapReason === G2B_CLEAN_BOOTSTRAP_REASON && value.parentGenerationId === undefined
      && Object.keys(value.input || {}).sort().join(",") === (isV2
        ? "anchorMaterialReferenceFingerprint,hostContextFingerprint,identityFingerprint,memberFingerprint,sourceFingerprint"
        : "anchorMaterialReferenceFingerprint,hostContextFingerprint,identityFingerprint,sourceFingerprint")
      && Object.values(value.input).every((item) => SHA256.test(item || ""))
      && value.manualReviewEvidenceDigests?.join(",") === `${G2B_CLEAN_REVIEW_JSON_SHA256},${G2B_CLEAN_REVIEW_MARKDOWN_SHA256}`
      && value.designEvidenceDigests?.join(",") === `${G2B_CLEAN_DESIGN_JSON_SHA256},${G2B_CLEAN_DESIGN_MARKDOWN_SHA256}`;
  } catch { return false; }
}

export function classifyG2BCleanBootstrapRecovery({ intent, generation, anchorRecord, anchorPersistedEvidence,
  anchorVerifiedEvidence, manifest, attestation, packet, attestationValid = false, packetValid = false,
  artifactsValid = true } = {}) {
  if (!artifactsValid) return "BLOCK_CORRUPT_OR_MISMATCHED_ARTIFACT";
  if (!intent) return "NO_BOOTSTRAP_STATE";
  if (!verifyG2BCleanBootstrapIntent(intent)) return "BLOCK_INVALID_INTENT";
  if (!generation) return "RESUME_GENERATION_CREATE";
  if (!validGenerationRecord(generation) || generation.generationId !== intent.generationId || generation.bootstrapIntentId !== intent.bootstrapIntentId
    || generation.parentGenerationId !== null || generation.historicalLineageStatus !== "UNRESOLVED") return "BLOCK_GENERATION_BINDING_MISMATCH";
  if (!anchorRecord) return "RESUME_ANCHOR_PERSIST";
  if (anchorRecord.operationGenerationId !== intent.generationId || anchorRecord.anchorState !== "ANCHOR_PERSISTED") return "BLOCK_ANCHOR_STATE_MISMATCH";
  if (!anchorPersistedEvidence) return "RECORD_ANCHOR_PERSISTED_EVENT";
  if (!validEvent(anchorPersistedEvidence, { eventType: "ANCHOR_PERSISTED", generationId: intent.generationId,
    intent, newState: "ANCHOR_PERSISTED" }) || anchorPersistedEvidence.identityFingerprint !== intent.input.identityFingerprint
    || anchorPersistedEvidence.hostContextFingerprint !== intent.input.hostContextFingerprint
    || anchorPersistedEvidence.sourceFingerprint !== intent.input.sourceFingerprint) return "BLOCK_ANCHOR_EVENT_MISMATCH";
  if (!anchorVerifiedEvidence) return "REVERIFY_ANCHOR";
  if (!validEvent(anchorVerifiedEvidence, { eventType: "ANCHOR_VERIFIED", generationId: intent.generationId,
    intent, newState: "ANCHOR_VERIFIED" }) || anchorVerifiedEvidence.previousState !== "ANCHOR_PERSISTED"
    || anchorVerifiedEvidence.identityFingerprint !== intent.input.identityFingerprint
    || anchorVerifiedEvidence.hostContextFingerprint !== intent.input.hostContextFingerprint
    || anchorVerifiedEvidence.sourceFingerprint !== intent.input.sourceFingerprint
    || anchorVerifiedEvidence.hmacValid !== true || anchorVerifiedEvidence.generationMatch !== true
    || anchorVerifiedEvidence.identityMatch !== true || anchorVerifiedEvidence.hostMatch !== true
    || anchorVerifiedEvidence.sourceMatch !== true) return "BLOCK_VERIFICATION_EVENT_MISMATCH";
  if (!manifest) return "RESUME_MANIFEST_CAS";
  if (!verifyG2BCleanCanonicalManifest(manifest) || manifest.canonicalGenerationId !== intent.generationId
    || manifest.bootstrapIntentId !== intent.bootstrapIntentId
    || manifest.anchorEvidenceDigest !== anchorVerifiedEvidence.evidenceDigest
    || manifest.identityFingerprint !== intent.input.identityFingerprint
    || manifest.hostContextFingerprint !== intent.input.hostContextFingerprint
    || manifest.sourceFingerprint !== intent.input.sourceFingerprint) return "BLOCK_MANIFEST_MISMATCH";
  if (!attestation || !attestationValid) return "REVALIDATE_THEN_CREATE_ATTESTATION";
  if (attestation.generationId !== intent.generationId || attestation.anchorEvidenceDigest !== anchorVerifiedEvidence.evidenceDigest
    || attestation.sourceFingerprint !== intent.input.sourceFingerprint) return "BLOCK_ATTESTATION_MISMATCH";
  return packet && packetValid ? "BOOTSTRAP_COMPLETE" : "REVALIDATE_THEN_PREPARE_PACKET";
}

function createOnlyJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = openSync(temporary, "wx", 0o600);
    writeSync(fd, `${canonicalG2BJson(value)}\n`, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    try { linkSync(temporary, path); } catch (error) {
      if (error?.code === "EEXIST") throw new Error("CLEAN_BOOTSTRAP_ARTIFACT_COLLISION");
      throw error;
    }
    unlinkSync(temporary);
    const stored = JSON.parse(readFileSync(path, "utf8"));
    if (canonicalG2BJson(stored) !== canonicalG2BJson(value)) throw new Error("CLEAN_BOOTSTRAP_ROUNDTRIP_FAILED");
    return Object.freeze({ path, rawSha256: hashRaw(path) });
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function createPacketExecutionEvidence({ path, packetPath, packet, packetBytes, sourceLock, manifest, anchorEvidence, createdAt }) {
  if (!verifyG2BCleanCasReadPacketV4(packet) || !Buffer.isBuffer(packetBytes)
    || canonicalG2BJson(JSON.parse(packetBytes.toString("utf8"))) !== canonicalG2BJson(packet)
    || packet.packetDigest !== sha256G2BCanonical(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== "packetDigest")))) {
    throw new Error("CLEAN_BOOTSTRAP_PACKET_EVIDENCE_INPUT_INVALID");
  }
  const packetRawSha256 = createHash("sha256").update(packetBytes).digest("hex");
  const evidence = Object.freeze({ schema: "myweb.g2b.clean-generation-packet-execution-evidence.v1",
    operationId: packet.operationId, generationId: packet.canonicalGenerationId, manifestDigest: manifest.manifestDigest,
    anchorVerifiedEvidenceDigest: anchorEvidence.evidenceDigest, sourceFingerprint: sourceLock.sourceFingerprint,
    sourceLockPath: packet.sourceLockPath, sourceLockCanonicalDigest: sourceLock.manifestDigest,
    sourceLockRawSha256: hashRaw(sourceLock.path), packetPath,
    packetRawSha256, packetInternalDigest: packet.packetDigest, packetSchema: packet.schemaVersion,
    requestedPolicyVersion: packet.requestedPolicyVersion, credentialRefreshMax: packet.credentialRefreshMax,
    iamPolicyReadMax: packet.iamPolicyReadMax, totalPhysicalRemoteCallsMax: packet.totalPhysicalRemoteCallsMax,
    automaticRetryMax: packet.automaticRetryMax, setIamPolicyMax: packet.setIamPolicyMax,
    iamMutationMax: packet.iamMutationMax, firestoreMax: packet.firestoreMax, storageWriteMax: packet.storageWriteMax,
    productionWriteMax: packet.productionWriteMax, mutationReachable: packet.mutationReachable, createdAt });
  const artifact = createOnlyJson(path, evidence);
  return Object.freeze({ evidence, path: artifact.path, rawSha256: artifact.rawSha256 });
}

function event(kind, fields) {
  const payload = Object.freeze({ schemaVersion: G2B_CLEAN_BOOTSTRAP_EVENT_SCHEMA, eventType: kind, ...fields });
  return Object.freeze({ ...payload, evidenceDigest: sha256G2BCanonical(payload) });
}

function validGenerationRecord(value) {
  const allowed = ["schemaVersion", "generationId", "bootstrapIntentId", "bootstrapOperationId", "bootstrapType",
    "historicalLineageStatus", "bootstrapReason", "manualReviewEvidenceDigest", "designEvidenceDigest", "parentGenerationId",
    "identityFingerprint", "hostContextFingerprint", "sourceFingerprint", "anchorMaterialReferenceFingerprint", "initialAnchorState", "createdAt", "recordDigest"];
  if (!value || value.schemaVersion !== G2B_CLEAN_BOOTSTRAP_SCHEMA || !UUID.test(value.generationId || "")
    || Object.keys(value).sort().join(",") !== allowed.sort().join(",")
    || !UUID.test(value.bootstrapIntentId || "") || !UUID.test(value.bootstrapOperationId || "")
    || value.bootstrapType !== "CLEAN_BOOTSTRAP" || value.historicalLineageStatus !== "UNRESOLVED"
    || value.bootstrapReason !== G2B_CLEAN_BOOTSTRAP_REASON || value.parentGenerationId !== null
    || value.manualReviewEvidenceDigest !== G2B_CLEAN_REVIEW_JSON_SHA256
    || value.designEvidenceDigest !== G2B_CLEAN_DESIGN_JSON_SHA256
    || value.initialAnchorState !== "ANCHOR_PERSISTED" || !Number.isFinite(Date.parse(value.createdAt))
    || ![value.manualReviewEvidenceDigest, value.designEvidenceDigest, value.identityFingerprint, value.hostContextFingerprint,
      value.sourceFingerprint, value.anchorMaterialReferenceFingerprint].every((item) => SHA256.test(item || ""))) return false;
  const { recordDigest, ...payload } = value;
  return SHA256.test(recordDigest || "") && sha256G2BCanonical(payload) === recordDigest;
}

function cleanAnchorFingerprint(anchorRecord, generationId) {
  return sha256G2BCanonical({ anchorDigest: anchorRecord.anchorDigest, integrityDigest: anchorRecord.integrityDigest,
    generationId, state: "ANCHOR_VERIFIED" });
}

export function createG2BCleanGenerationStore({ directory } = {}) {
  if (typeof directory !== "string" || !directory.trim()) throw new Error("clean-generation-directory-required");
  const generations = join(directory, "generations");
  const generationPath = (id) => join(generations, id, "generation.json");
  const anchorPath = (id) => join(generations, id, "anchor.json");
  const eventPath = (id, kind) => join(generations, id, "events", `${kind}.json`);
  const loadJson = readSafeJson;
  const intents = () => {
    const path = join(directory, "intents");
    if (!existsSync(path)) return Object.freeze([]);
    let names;
    try { names = readdirSync(path); } catch { return Object.freeze([{ invalid: true }]); }
    const result = [];
    for (const name of names) {
      if (!/^[0-9a-f-]{36}\.json$/.test(name)) return Object.freeze([{ invalid: true }]);
      const loaded = loadJson(join(path, name));
      if (loaded.state !== "READY" || !verifyG2BCleanBootstrapIntent(loaded.value)
        || name !== `${loaded.value.bootstrapIntentId}.json`) return Object.freeze([{ invalid: true }]);
      result.push(loaded.value);
    }
    return Object.freeze(result);
  };
  const candidates = () => {
    if (!existsSync(generations)) return Object.freeze([]);
    const result = [];
    for (const id of readdirSync(generations)) {
      if (!UUID.test(id)) return Object.freeze([{ invalid: true }]);
      try { if (lstatSync(join(generations, id)).isSymbolicLink()) return Object.freeze([{ invalid: true }]); }
      catch { return Object.freeze([{ invalid: true }]); }
      const loaded = loadJson(generationPath(id));
      if (loaded.state !== "READY" || loaded.value.generationId !== id || !validGenerationRecord(loaded.value)) return Object.freeze([{ invalid: true }]);
      let contents;
      try { contents = readdirSync(join(generations, id)); } catch { return Object.freeze([{ invalid: true }]); }
      if (contents.some((name) => !["generation.json", "anchor.json", "anchor-verified.json", "events"].includes(name))) return Object.freeze([{ invalid: true }]);
      const eventsDirectory = join(generations, id, "events");
      if (existsSync(eventsDirectory)) {
        let eventNames;
        try { eventNames = readdirSync(eventsDirectory); } catch { return Object.freeze([{ invalid: true }]); }
        const allowedEvents = new Set(["anchor-persisted.json", "anchor-verified.json", "attestation-eligible.json", "canonical-ineligible.json", "bootstrap-aborted.json"]);
        if (eventNames.some((name) => !allowedEvents.has(name) && name !== "verification-attempts")) return Object.freeze([{ invalid: true }]);
        for (const name of eventNames) {
          if (name === "verification-attempts") {
            let attemptNames;
            try { attemptNames = readdirSync(join(eventsDirectory, name)); } catch { return Object.freeze([{ invalid: true }]); }
            for (const attempt of attemptNames) {
              if (!/^[0-9a-f-]{36}\.json$/.test(attempt)) return Object.freeze([{ invalid: true }]);
              const loadedAttempt = loadJson(join(eventsDirectory, name, attempt));
              const value = loadedAttempt.value;
              if (loadedAttempt.state !== "READY" || value.attemptId !== attempt.slice(0, -5)
                || !validEvent(value, { eventType: "ANCHOR_VERIFICATION_ATTEMPT", generationId: id,
                  intent: { bootstrapIntentId: loaded.value.bootstrapIntentId, operationId: loaded.value.bootstrapOperationId } })
                || value.identityFingerprint !== loaded.value.identityFingerprint || value.hostContextFingerprint !== loaded.value.hostContextFingerprint
                || value.sourceFingerprint !== loaded.value.sourceFingerprint) return Object.freeze([{ invalid: true }]);
            }
          } else {
            const loadedEvent = loadJson(join(eventsDirectory, name));
            const value = loadedEvent.value;
            const expectedType = name.slice(0, -5).toUpperCase().replaceAll("-", "_");
            if (loadedEvent.state !== "READY" || !validEvent(value, { eventType: expectedType, generationId: id,
              intent: { bootstrapIntentId: loaded.value.bootstrapIntentId, operationId: loaded.value.bootstrapOperationId },
              newState: expectedType === "ANCHOR_PERSISTED" ? "ANCHOR_PERSISTED" : expectedType === "ANCHOR_VERIFIED" ? "ANCHOR_VERIFIED" : undefined })) {
              return Object.freeze([{ invalid: true }]);
            }
          }
        }
      }
      result.push(loaded.value);
    }
    return Object.freeze(result);
  };
  const terminalState = (generationId) => {
    const terminalEvents = [];
    for (const name of ["bootstrap-aborted", "canonical-ineligible"]) {
      const loaded = loadJson(eventPath(generationId, name));
      if (loaded.state === "INVALID") return Object.freeze({ state: "INVALID" });
      if (loaded.state !== "READY") continue;
      const value = loaded.value;
      const expectedType = name.toUpperCase().replaceAll("-", "_");
      if (!validEvent(value, { eventType: expectedType, generationId,
        intent: { bootstrapIntentId: value.bootstrapIntentId, operationId: value.operationId } })
        || !/^[A-Z0-9_-]{1,96}$/.test(value.failureCode || "") || !Number.isFinite(Date.parse(value.at))) {
        return Object.freeze({ state: "INVALID" });
      }
      terminalEvents.push(name);
    }
    if (terminalEvents.length > 1) return Object.freeze({ state: "INVALID" });
    return terminalEvents.length
      ? Object.freeze({ state: "TERMINAL", reason: terminalEvents[0] })
      : Object.freeze({ state: "ACTIVE" });
  };
  const activeCandidates = () => {
    const all = candidates();
    if (all.some((item) => item.invalid)) return Object.freeze([{ invalid: true }]);
    const active = [];
    for (const candidate of all) {
      const status = terminalState(candidate.generationId);
      if (status.state === "INVALID") return Object.freeze([{ invalid: true }]);
      if (status.state === "ACTIVE") active.push(candidate);
    }
    return Object.freeze(active);
  };
  const activeIntents = () => {
    const allIntents = intents();
    const allCandidates = candidates();
    if (allIntents.some((item) => item.invalid) || allCandidates.some((item) => item.invalid)) {
      return Object.freeze([{ invalid: true }]);
    }
    const active = [];
    for (const intent of allIntents) {
      const candidate = allCandidates.find((item) => item.generationId === intent.generationId);
      if (!candidate) {
        active.push(intent);
        continue;
      }
      const status = terminalState(candidate.generationId);
      if (status.state === "INVALID") return Object.freeze([{ invalid: true }]);
      if (status.state === "ACTIVE") active.push(intent);
    }
    return Object.freeze(active);
  };
  return Object.freeze({ directory, candidates,
    validateRoot() {
      if (!existsSync(directory)) return Object.freeze({ ok: true });
      let names;
      try {
        if (lstatSync(directory).isSymbolicLink()) return Object.freeze({ ok: false, code: "BOOTSTRAP_ROOT_LINK_BLOCKED" });
        names = readdirSync(directory);
      } catch { return Object.freeze({ ok: false, code: "BOOTSTRAP_ROOT_UNREADABLE" }); }
      const allowed = new Set(["intents", "generations", "bootstrap.lock", "canonical-manifests", "attestations"]);
      for (const name of names) {
        if (!allowed.has(name)) return Object.freeze({ ok: false, code: "BOOTSTRAP_ROOT_UNEXPECTED_ARTIFACT" });
        try { if (lstatSync(join(directory, name)).isSymbolicLink()) return Object.freeze({ ok: false, code: "BOOTSTRAP_ROOT_LINK_BLOCKED" }); }
        catch { return Object.freeze({ ok: false, code: "BOOTSTRAP_ROOT_ARTIFACT_UNREADABLE" }); }
      }
      return Object.freeze({ ok: true });
    },
    intents,
    activeCandidates,
    activeIntents,
    terminalState,
    acquireBootstrapLock({ bootstrapIntentId, operationId, acquiredAt = new Date().toISOString() } = {}) {
      if (!UUID.test(bootstrapIntentId || "") || !UUID.test(operationId || "") || !Number.isFinite(Date.parse(acquiredAt))) {
        throw new Error("CLEAN_BOOTSTRAP_LOCK_INPUT_INVALID");
      }
      mkdirSync(directory, { recursive: true });
      const lockPath = join(directory, "bootstrap.lock");
      const lockValue = { bootstrapIntentId, operationId, acquiredAt, lockId: randomUUID() };
      let fd;
      try {
        fd = openSync(lockPath, "wx", 0o600);
        writeSync(fd, `${canonicalG2BJson(lockValue)}\n`, "utf8");
        fsyncSync(fd);
        closeSync(fd);
        fd = undefined;
      } catch (error) {
        if (fd !== undefined) closeSync(fd);
        throw new Error(error?.code === "EEXIST" ? "CLEAN_BOOTSTRAP_LOCK_HELD" : "CLEAN_BOOTSTRAP_LOCK_CREATE_FAILED");
      }
      return Object.freeze({ path: lockPath, value: Object.freeze(lockValue), release() {
        try {
          const lock = JSON.parse(readFileSync(lockPath, "utf8"));
          if (lock.lockId === lockValue.lockId && lock.operationId === operationId
            && lock.bootstrapIntentId === bootstrapIntentId) unlinkSync(lockPath);
        } catch { /* A lock that cannot be proven to belong to this operation remains. */ }
      } });
    },
    intentCount: () => intents().length,
    readIntent: (id) => loadJson(join(directory, "intents", `${id}.json`)),
    createIntent(intent) {
      if (!verifyG2BCleanBootstrapIntent(intent)) throw new Error("CLEAN_BOOTSTRAP_INTENT_INVALID");
      return createOrVerifyJson(join(directory, "intents", `${intent.bootstrapIntentId}.json`), intent);
    },
    createGeneration({ intent, anchorRecord, identityFingerprint, hostContextFingerprint, sourceFingerprint, anchorMaterialReferenceFingerprint, createdAt }) {
      const allCandidates = candidates();
      const active = activeCandidates();
      const existing = allCandidates.find((item) => item.generationId === intent?.generationId);
      if (!verifyG2BCleanBootstrapIntent(intent) || !anchorRecord || anchorRecord.operationGenerationId !== intent.generationId
        || anchorRecord.anchorState !== "ANCHOR_PERSISTED" || allCandidates.some((item) => item.invalid)
        || active.some((item) => item.invalid || item.generationId !== intent.generationId)
        || (existing && terminalState(intent.generationId).state !== "ACTIVE")) {
        throw new Error("CLEAN_GENERATION_CREATE_BLOCKED");
      }
      const payload = Object.freeze({ schemaVersion: G2B_CLEAN_BOOTSTRAP_SCHEMA, generationId: intent.generationId,
        bootstrapIntentId: intent.bootstrapIntentId, bootstrapOperationId: intent.operationId, bootstrapType: "CLEAN_BOOTSTRAP",
        historicalLineageStatus: "UNRESOLVED", bootstrapReason: G2B_CLEAN_BOOTSTRAP_REASON,
        manualReviewEvidenceDigest: G2B_CLEAN_REVIEW_JSON_SHA256, designEvidenceDigest: G2B_CLEAN_DESIGN_JSON_SHA256,
        parentGenerationId: null, identityFingerprint, hostContextFingerprint, sourceFingerprint,
        anchorMaterialReferenceFingerprint, initialAnchorState: "ANCHOR_PERSISTED", createdAt });
      const record = Object.freeze({ ...payload, recordDigest: sha256G2BCanonical(payload) });
      const base = join(generations, intent.generationId);
      mkdirSync(base, { recursive: true });
      const genArtifact = createOrVerifyJson(generationPath(intent.generationId), record);
      const priorAnchor = loadJson(anchorPath(intent.generationId));
      if (priorAnchor.state === "INVALID") throw new Error("CLEAN_GENERATION_ANCHOR_INVALID");
      if (priorAnchor.state === "READY" && canonicalG2BJson(priorAnchor.value) !== canonicalG2BJson(anchorRecord)) {
        throw new Error("CLEAN_GENERATION_ANCHOR_MISMATCH");
      }
      const anchorArtifact = priorAnchor.state === "READY" ? Object.freeze({ path: anchorPath(intent.generationId), rawSha256: hashRaw(anchorPath(intent.generationId)), reused: true })
        : createOnlyJson(anchorPath(intent.generationId), anchorRecord);
      const persisted = event("ANCHOR_PERSISTED", { generationId: intent.generationId, bootstrapIntentId: intent.bootstrapIntentId,
        operationId: intent.operationId, previousState: null, newState: "ANCHOR_PERSISTED",
        anchorFingerprint: anchorMaterialReferenceFingerprint, identityFingerprint, hostContextFingerprint, sourceFingerprint,
        createdAt });
      const persistedEventPath = eventPath(intent.generationId, "anchor-persisted");
      const persistedPrior = loadJson(persistedEventPath);
      if (persistedPrior.state === "INVALID") throw new Error("CLEAN_ANCHOR_PERSISTED_EVENT_INVALID");
      const persistedArtifact = createOrVerifyJson(persistedEventPath, persisted);
      const persistedValue = persistedPrior.state === "READY" ? persistedPrior.value : persisted;
      if (!validEvent(persistedValue, { eventType: "ANCHOR_PERSISTED", generationId: intent.generationId, intent, newState: "ANCHOR_PERSISTED" })
        || persistedValue.anchorFingerprint !== anchorMaterialReferenceFingerprint
        || persistedValue.identityFingerprint !== identityFingerprint || persistedValue.hostContextFingerprint !== hostContextFingerprint
        || persistedValue.sourceFingerprint !== sourceFingerprint) {
        throw new Error("CLEAN_ANCHOR_PERSISTED_EVENT_INVALID");
      }
      return Object.freeze({ record, persistedEvidence: persistedValue, recordArtifact: genArtifact, anchorArtifact, persistedArtifact });
    },
    recordVerifiedEvent({ generationId, intent, anchorRecord, identityFingerprint, hostContextFingerprint, sourceFingerprint, verification, verifiedAt }) {
      const generation = loadJson(generationPath(generationId));
      const anchor = loadJson(anchorPath(generationId));
      if (generation.state !== "READY" || anchor.state !== "READY" || !verifyG2BCleanBootstrapIntent(intent)
        || generation.value.bootstrapIntentId !== intent.bootstrapIntentId || generation.value.initialAnchorState !== "ANCHOR_PERSISTED"
        || anchor.value.anchorState !== "ANCHOR_PERSISTED" || anchorRecord.operationGenerationId !== generationId
        || verification?.ok !== true || verification?.state !== "PRESENT_CONFIRMED"
        || generation.value.identityFingerprint !== identityFingerprint || generation.value.hostContextFingerprint !== hostContextFingerprint
        || generation.value.sourceFingerprint !== sourceFingerprint) throw new Error("CLEAN_ANCHOR_VERIFICATION_BLOCKED");
      const persisted = loadJson(eventPath(generationId, "anchor-persisted"));
      if (persisted.state !== "READY" || !validEvent(persisted.value, { eventType: "ANCHOR_PERSISTED", generationId, intent, newState: "ANCHOR_PERSISTED" })
        || persisted.value.identityFingerprint !== identityFingerprint || persisted.value.hostContextFingerprint !== hostContextFingerprint
        || persisted.value.sourceFingerprint !== sourceFingerprint) throw new Error("CLEAN_ANCHOR_PERSISTED_EVENT_MISSING");
      const verified = event("ANCHOR_VERIFIED", { generationId, bootstrapIntentId: intent.bootstrapIntentId, operationId: intent.operationId,
        previousState: "ANCHOR_PERSISTED", newState: "ANCHOR_VERIFIED", anchorFingerprint: cleanAnchorFingerprint(anchorRecord, generationId),
        identityFingerprint, hostContextFingerprint, sourceFingerprint, hmacValid: true, generationMatch: true, identityMatch: true,
        hostMatch: true, sourceMatch: true, verificationTimestamp: verifiedAt });
      if (!SHA256.test(verified.anchorFingerprint || "")) throw new Error("CLEAN_ANCHOR_FINGERPRINT_INVALID");
      const existingVerified = loadJson(eventPath(generationId, "anchor-verified"));
      if (existingVerified.state === "INVALID") throw new Error("CLEAN_ANCHOR_VERIFIED_EVENT_INVALID");
      if (existingVerified.state === "READY") {
        if (!validEvent(existingVerified.value, { eventType: "ANCHOR_VERIFIED", generationId, intent, newState: "ANCHOR_VERIFIED" })
          || existingVerified.value.previousState !== "ANCHOR_PERSISTED"
          || existingVerified.value.anchorFingerprint !== cleanAnchorFingerprint(anchorRecord, generationId)
          || existingVerified.value.identityFingerprint !== identityFingerprint
          || existingVerified.value.hostContextFingerprint !== hostContextFingerprint
          || existingVerified.value.sourceFingerprint !== sourceFingerprint
          || existingVerified.value.hmacValid !== true || existingVerified.value.generationMatch !== true
          || existingVerified.value.identityMatch !== true || existingVerified.value.hostMatch !== true
          || existingVerified.value.sourceMatch !== true || !Number.isFinite(Date.parse(existingVerified.value.verificationTimestamp))) {
          throw new Error("CLEAN_ANCHOR_VERIFIED_EVENT_MISMATCH");
        }
        const priorSnapshot = loadJson(join(generations, generationId, "anchor-verified.json"));
        if (priorSnapshot.state !== "READY" || canonicalG2BJson(priorSnapshot.value) !== canonicalG2BJson({ ...anchorRecord, anchorState: "ANCHOR_VERIFIED" })) {
          throw new Error("CLEAN_ANCHOR_VERIFIED_SNAPSHOT_MISMATCH");
        }
        return Object.freeze({ evidence: existingVerified.value,
          evidenceArtifact: Object.freeze({ path: eventPath(generationId, "anchor-verified"), rawSha256: hashRaw(eventPath(generationId, "anchor-verified")), reused: true }),
          anchorRecord: priorSnapshot.value,
          anchorVerifiedArtifact: Object.freeze({ path: join(generations, generationId, "anchor-verified.json"), rawSha256: hashRaw(join(generations, generationId, "anchor-verified.json")), reused: true }) });
      }
      const anchorVerified = Object.freeze({ ...anchorRecord, anchorState: "ANCHOR_VERIFIED" });
      const anchorVerifiedArtifact = createOrVerifyJson(join(generations, generationId, "anchor-verified.json"), anchorVerified);
      const evidenceArtifact = createOnlyJson(eventPath(generationId, "anchor-verified"), verified);
      return Object.freeze({ evidence: verified, evidenceArtifact, anchorRecord: anchorVerified, anchorVerifiedArtifact });
    },
    recordVerificationAttempt({ generationId, intent, identityFingerprint, hostContextFingerprint, sourceFingerprint,
      verification, attemptId = randomUUID(), attemptedAt = new Date().toISOString() }) {
      const generation = loadJson(generationPath(generationId));
      if (generation.state !== "READY" || !validGenerationRecord(generation.value)
        || generation.value.bootstrapIntentId !== intent?.bootstrapIntentId || generation.value.bootstrapOperationId !== intent?.operationId
        || generation.value.identityFingerprint !== identityFingerprint || generation.value.hostContextFingerprint !== hostContextFingerprint
        || generation.value.sourceFingerprint !== sourceFingerprint || !UUID.test(attemptId)
        || !Number.isFinite(Date.parse(attemptedAt)) || typeof verification?.ok !== "boolean"
        || !["PRESENT_CONFIRMED", "MEMBER_ABSENT_CONFIRMED", "ANCHOR_INVALID"].includes(verification.state)) {
        throw new Error("CLEAN_ANCHOR_VERIFICATION_ATTEMPT_INVALID");
      }
      const value = event("ANCHOR_VERIFICATION_ATTEMPT", { generationId, bootstrapIntentId: intent.bootstrapIntentId,
        operationId: intent.operationId, attemptId, identityFingerprint, hostContextFingerprint, sourceFingerprint,
        validationResult: verification.ok && verification.state === "PRESENT_CONFIRMED" ? "PASS" : "FAIL",
        validationState: verification.state, attemptedAt });
      const path = join(generations, generationId, "events", "verification-attempts", `${attemptId}.json`);
      const artifact = createOnlyJson(path, value);
      return Object.freeze({ evidence: value, artifact });
    },
    recordOrchestrationEvent(generationId, name, fields) {
      if (!/^[a-z][a-z0-9-]{1,40}$/.test(name)) throw new Error("CLEAN_EVENT_NAME_INVALID");
      const path = eventPath(generationId, name);
      const proposed = event(name.toUpperCase().replaceAll("-", "_"), fields);
      const prior = loadJson(path);
      if (prior.state === "INVALID") throw new Error("CLEAN_ORCHESTRATION_EVENT_INVALID");
      if (prior.state === "READY") {
        if (!validEvent(prior.value, { eventType: proposed.eventType, generationId,
          intent: { bootstrapIntentId: fields.bootstrapIntentId, operationId: fields.operationId } })
          || canonicalG2BJson({ ...prior.value, at: undefined }) !== canonicalG2BJson({ ...proposed, at: undefined })) {
          throw new Error("CLEAN_ORCHESTRATION_EVENT_MISMATCH");
        }
        return Object.freeze({ path, rawSha256: hashRaw(path), reused: true });
      }
      return createOnlyJson(path, proposed);
    },
    readGeneration: (id) => loadJson(generationPath(id)),
    readAnchor: (id) => loadJson(anchorPath(id)),
    readEvent: (id, kind) => loadJson(eventPath(id, kind)),
  });
}

export function resolveG2BCleanCanonicalGeneration({ generationStore, manifestStore, attestation,
  attestationBindings, now = Date.now() } = {}) {
  try {
    const chain = manifestStore?.readChain?.();
    const history = generationStore?.candidates?.();
    const candidates = generationStore?.activeCandidates?.();
    if (!chain?.ok || !chain.latest || !Array.isArray(history) || history.some((item) => item.invalid)
      || !Array.isArray(candidates) || candidates.some((item) => item.invalid)
      || candidates.length !== 1) return Object.freeze({ ok: false, code: "CLEAN_CANONICAL_AMBIGUOUS", readEligible: false, mutationEligible: false });
    const manifest = chain.latest;
    const generation = candidates[0];
    const verified = generationStore.readEvent(generation.generationId, "anchor-verified");
    const anchor = generationStore.readAnchor(generation.generationId);
    const verifiedSnapshot = readSafeJson(join(generationStore.directory, "generations", generation.generationId, "anchor-verified.json"));
    const verificationEvidence = verified.state === "READY" ? verified.value : null;
    const verificationDigestValid = verificationEvidence && validEvent(verificationEvidence, {
      eventType: "ANCHOR_VERIFIED", generationId: generation.generationId,
      intent: { bootstrapIntentId: generation.bootstrapIntentId, operationId: generation.bootstrapOperationId },
      newState: "ANCHOR_VERIFIED",
    });
    if (!verifyG2BCleanCanonicalManifest(manifest) || manifest.canonicalGenerationId !== generation.generationId
      || generation.parentGenerationId !== null || generation.historicalLineageStatus !== "UNRESOLVED"
      || G2B_HISTORICAL_GENERATIONS.includes(generation.generationId) || anchor.state !== "READY"
      || anchor.value.anchorState !== "ANCHOR_PERSISTED" || verifiedSnapshot.state !== "READY"
      || verifiedSnapshot.value.anchorState !== "ANCHOR_VERIFIED" || !verificationDigestValid
      || verificationEvidence.previousState !== "ANCHOR_PERSISTED" || verificationEvidence.hmacValid !== true
      || verificationEvidence.generationMatch !== true || verificationEvidence.identityMatch !== true
      || verificationEvidence.hostMatch !== true || verificationEvidence.sourceMatch !== true
      || verificationEvidence.identityFingerprint !== generation.identityFingerprint
      || verificationEvidence.hostContextFingerprint !== generation.hostContextFingerprint
      || verificationEvidence.sourceFingerprint !== generation.sourceFingerprint
      || verifiedSnapshot.value.anchorDigest !== anchor.value.anchorDigest
      || verifiedSnapshot.value.integrityDigest !== anchor.value.integrityDigest
      || verificationEvidence.bootstrapIntentId !== generation.bootstrapIntentId
      || verificationEvidence.operationId !== generation.bootstrapOperationId
      || verificationEvidence.anchorFingerprint !== cleanAnchorFingerprint(verifiedSnapshot.value, generation.generationId)
      || manifest.anchorEvidenceDigest !== verificationEvidence.evidenceDigest
      || generationStore.readEvent(generation.generationId, "canonical-ineligible").state === "READY"
      || manifest.identityFingerprint !== generation.identityFingerprint || manifest.hostContextFingerprint !== generation.hostContextFingerprint
      || manifest.sourceFingerprint !== generation.sourceFingerprint) return Object.freeze({ ok: false, code: "CLEAN_CANONICAL_BINDING_MISMATCH", readEligible: false, mutationEligible: false });
    const attestationCheck = attestation?.schemaVersion === "myweb.g2b.clean-generation-host-attestation.v2"
      ? verifyG2BCleanGenerationAttestationV2(attestation, { ...attestationBindings,
        generationId: generation.generationId, anchorEvidenceDigest: verificationEvidence.evidenceDigest,
        identityFingerprint: generation.identityFingerprint, anchorFingerprint: verificationEvidence.anchorFingerprint,
        sourceFingerprint: generation.sourceFingerprint, now })
      : verifyG2BCleanGenerationAttestation(attestation, { ...attestationBindings,
        generationId: generation.generationId, anchorEvidenceDigest: verificationEvidence.evidenceDigest,
        identityFingerprint: generation.identityFingerprint, anchorFingerprint: verificationEvidence.anchorFingerprint,
        sourceFingerprint: generation.sourceFingerprint, now });
    if (!attestationCheck.ok) return Object.freeze({ ok: false, code: attestationCheck.code, readEligible: false, mutationEligible: false });
    return Object.freeze({ ok: true, canonicalGeneration: generation.generationId, manifestDigest: manifest.manifestDigest,
      anchorEvidenceDigest: verificationEvidence.evidenceDigest, attestationAgeMs: attestationCheck.ageMs,
      readEligible: true, mutationEligible: false, ambiguity: false });
  } catch { return Object.freeze({ ok: false, code: "CLEAN_CANONICAL_RESOLUTION_FAILED", readEligible: false, mutationEligible: false }); }
}

export function buildG2BCleanCasReadPacket({ operationId, generationId, bootstrapIntentId, manifestVersion = 3, sourceFingerprint,
  sourceLockPath, sourceCount, sourceLockManifestDigest, attestationDigest, anchorEvidenceDigest, manifestDigest,
  identityFingerprint, targetMember, createdAt = new Date().toISOString() } = {}) {
  if (!UUID.test(operationId || "") || !UUID.test(generationId || "") || !UUID.test(bootstrapIntentId || "")
    || !Number.isSafeInteger(manifestVersion) || manifestVersion < 1
    || ![sourceFingerprint, sourceLockManifestDigest, attestationDigest, anchorEvidenceDigest, manifestDigest, identityFingerprint].every((item) => SHA256.test(item || ""))
    || typeof sourceLockPath !== "string" || !sourceLockPath || sourceLockPath.includes("..") || sourceLockPath.startsWith("/")
    || !Number.isSafeInteger(sourceCount) || sourceCount !== G2B_CAS_SOURCE_PATHS.length
    || typeof targetMember !== "string" || !/^(?:user|serviceAccount):[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetMember)
    || G2B_HISTORICAL_GENERATIONS.includes(generationId)) throw new Error("clean-cas-read-packet-input-invalid");
  const payload = Object.freeze({ schemaVersion: "myweb.g2b.clean-generation.cas-read-packet.v2", stage: "P1.5-C2H2E3D-W1C-M3L3-CLEAN-GENERATION-CAS-READ",
    type: "REMOTE_READ_ONLY", status: "APPROVAL_REQUIRED", purpose: "CAS_EVIDENCE_READ_AFTER_CLEAN_GENERATION_BOOTSTRAP",
    operationId, canonicalGenerationId: generationId, bootstrapIntentId, manifestVersion, sourceFingerprint,
    sourceLockPath: sourceLockPath.replace(/\\/g, "/"), sourceCount, sourceFingerprintSchemaVersion: 2,
    sourceLockDigest: sourceLockManifestDigest, requestedPolicyVersion: 3,
    targetMemberFingerprint: sha256G2BCanonical({ member: targetMember }),
    requestIdentity: Object.freeze({ identityFingerprint, principalKind: targetMember.startsWith("serviceAccount:") ? "serviceAccount" : "user" }),
    attestationDigest, anchorVerifiedEvidenceDigest: anchorEvidenceDigest, manifestDigest,
    targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE,
    credentialRefreshMax: 1, iamPolicyReadMax: 1, totalPhysicalRemoteCallsMax: 2, automaticRetryMax: 0,
    setIamPolicyMax: 0, iamMutationMax: 0, firestoreMax: 0, storageWriteMax: 0, productionWriteMax: 0,
    mutationReachable: false, m4Allowed: false, firestoreAllowed: false, accessTokenAllowed: false,
    cloudLoggingAllowed: false, testIamPermissionsAllowed: false, serviceAccountKeyAllowed: false,
    historicalLineageStatus: "UNRESOLVED", historicalTrustInherited: false, createdAt });
  return Object.freeze({ ...payload, packetDigest: sha256G2BCanonical(payload) });
}

export function verifyG2BCleanCasReadPacket(value) {
  if (value?.schemaVersion === "myweb.g2b.clean-generation.cas-read-packet.v3") return verifyG2BCleanCasReadPacketV3(value);
  if (value?.schemaVersion === "myweb.g2b.clean-generation.cas-read-packet.v4") return verifyG2BCleanCasReadPacketV4(value);
  try {
    const allowed = ["schemaVersion", "stage", "type", "status", "purpose", "operationId", "canonicalGenerationId", "bootstrapIntentId",
      "manifestVersion", "sourceFingerprint", "sourceLockPath", "sourceCount", "sourceFingerprintSchemaVersion", "sourceLockDigest",
      "requestedPolicyVersion", "targetMemberFingerprint", "requestIdentity", "attestationDigest", "anchorVerifiedEvidenceDigest", "manifestDigest", "targetResource", "targetRole",
      "credentialRefreshMax", "iamPolicyReadMax", "totalPhysicalRemoteCallsMax", "automaticRetryMax", "setIamPolicyMax", "iamMutationMax",
      "firestoreMax", "storageWriteMax", "productionWriteMax", "mutationReachable", "m4Allowed", "firestoreAllowed", "accessTokenAllowed",
      "cloudLoggingAllowed", "testIamPermissionsAllowed", "serviceAccountKeyAllowed", "historicalLineageStatus", "historicalTrustInherited", "createdAt", "packetDigest"];
    const { packetDigest, ...payload } = value;
    return Object.keys(value || {}).sort().join(",") === allowed.sort().join(",")
      && SHA256.test(packetDigest || "") && sha256G2BCanonical(payload) === packetDigest
      && value?.schemaVersion === "myweb.g2b.clean-generation.cas-read-packet.v2"
      && value?.purpose === "CAS_EVIDENCE_READ_AFTER_CLEAN_GENERATION_BOOTSTRAP"
      && Number.isSafeInteger(value?.manifestVersion) && value.manifestVersion >= 1
      && typeof value?.sourceLockPath === "string" && value.sourceLockPath.length > 0 && !value.sourceLockPath.includes("..")
      && Number.isSafeInteger(value?.sourceCount) && value.sourceCount === G2B_CAS_SOURCE_PATHS.length
      && value?.sourceFingerprintSchemaVersion === 2 && value?.requestedPolicyVersion === 3
      && SHA256.test(value?.sourceLockDigest || "") && SHA256.test(value?.targetMemberFingerprint || "")
      && SHA256.test(value?.anchorVerifiedEvidenceDigest || "")
      && value?.requestIdentity && SHA256.test(value.requestIdentity.identityFingerprint || "")
      && ["user", "serviceAccount"].includes(value.requestIdentity.principalKind)
      && value?.historicalLineageStatus === "UNRESOLVED" && value?.historicalTrustInherited === false
      && value?.type === "REMOTE_READ_ONLY" && value?.status === "APPROVAL_REQUIRED"
      && value?.mutationReachable === false && value?.setIamPolicyMax === 0 && value?.iamMutationMax === 0
      && value?.iamPolicyReadMax === 1 && value?.credentialRefreshMax === 1
      && value?.automaticRetryMax === 0 && value?.totalPhysicalRemoteCallsMax === 2
      && value?.firestoreMax === 0 && value?.storageWriteMax === 0 && value?.productionWriteMax === 0
      && value?.m4Allowed === false && value?.firestoreAllowed === false && value?.accessTokenAllowed === false
      && value?.cloudLoggingAllowed === false && value?.testIamPermissionsAllowed === false && value?.serviceAccountKeyAllowed === false
      && value?.targetResource === G2B_TARGET_RESOURCE && value?.targetRole === G2B_TARGET_ROLE
      && !G2B_HISTORICAL_GENERATIONS.includes(value?.canonicalGenerationId);
  } catch { return false; }
}

export function buildG2BCleanCasReadPacketV4({ operationId, generationId, bootstrapIntentId, manifestVersion,
  sourceFingerprint, sourceLockPath, sourceCount, sourceLockDigest, sourceLockRawSha256, attestationDigest, anchorEvidenceDigest,
  anchorFingerprint, manifestDigest, identityFingerprint, hostContextFingerprint, targetMember,
  createdAt = new Date().toISOString() } = {}) {
  if (![operationId, generationId, bootstrapIntentId].every((item) => UUID.test(item || ""))
    || !Number.isSafeInteger(manifestVersion) || manifestVersion < 1
    || ![sourceFingerprint, sourceLockDigest, sourceLockRawSha256, attestationDigest, anchorEvidenceDigest, anchorFingerprint,
      manifestDigest, identityFingerprint, hostContextFingerprint].every((item) => SHA256.test(item || ""))
    || typeof sourceLockPath !== "string" || !sourceLockPath.startsWith("docs/evidence/") || sourceLockPath.includes("..")
    || sourceCount !== G2B_CAS_SOURCE_PATHS.length
    || typeof targetMember !== "string" || !/^(?:user|serviceAccount):[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetMember)
    || G2B_HISTORICAL_GENERATIONS.includes(generationId) || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error("clean-cas-read-packet-v4-input-invalid");
  }
  const payload = Object.freeze({ schemaVersion: "myweb.g2b.clean-generation.cas-read-packet.v4",
    stage: "P1.5-C2H2E3D-W1C-M3L3-CLEAN-GENERATION-CAS-READ", type: "REMOTE_READ_ONLY", status: "APPROVAL_REQUIRED",
    purpose: "FINAL_FRESH_CAS_READ_AFTER_ATTESTATION_V2", operationId, canonicalGenerationId: generationId,
    bootstrapIntentId, manifestVersion, sourceFingerprint, sourceLockPath: sourceLockPath.replace(/\\/g, "/"),
    sourceCount, sourceFingerprintSchemaVersion: 2, sourceLockDigest, sourceLockRawSha256,
    attestationSchemaVersion: 2, attestationDigest,
    attestationRefreshPolicy: "EXPIRY_ONLY_LOCAL_REFRESH_MAX_1", freshnessRequiredAtExecution: true,
    expiryOnlyLocalRefreshAllowed: true, localRefreshMax: 1,
    requestedPolicyVersion: 3, anchorVerifiedEvidenceDigest: anchorEvidenceDigest, anchorFingerprint,
    manifestDigest, requestIdentity: Object.freeze({ identityFingerprint,
      principalKind: targetMember.startsWith("serviceAccount:") ? "serviceAccount" : "user" }),
    targetMemberFingerprint: sha256G2BCanonical({ member: targetMember }), hostContextFingerprint,
    targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE,
    credentialRefreshMax: 1, iamPolicyReadMax: 1, totalPhysicalRemoteCallsMax: 2, automaticRetryMax: 0,
    setIamPolicyMax: 0, iamMutationMax: 0, firestoreMax: 0, storageWriteMax: 0, productionWriteMax: 0,
    mutationReachable: false, m4Allowed: false, firestoreAllowed: false, accessTokenAllowed: false,
    cloudLoggingAllowed: false, testIamPermissionsAllowed: false, serviceAccountKeyAllowed: false,
    historicalLineageStatus: "UNRESOLVED", historicalTrustInherited: false, createdAt });
  return Object.freeze({ ...payload, packetDigest: sha256G2BCanonical(payload) });
}

export function verifyG2BCleanCasReadPacketV4(value) {
  try {
    const allowed = ["schemaVersion", "stage", "type", "status", "purpose", "operationId", "canonicalGenerationId",
      "bootstrapIntentId", "manifestVersion", "sourceFingerprint", "sourceLockPath", "sourceCount",
      "sourceFingerprintSchemaVersion", "sourceLockDigest", "sourceLockRawSha256", "attestationSchemaVersion", "attestationDigest",
      "attestationRefreshPolicy", "freshnessRequiredAtExecution", "expiryOnlyLocalRefreshAllowed", "localRefreshMax",
      "requestedPolicyVersion", "anchorVerifiedEvidenceDigest", "anchorFingerprint", "manifestDigest", "requestIdentity",
      "targetMemberFingerprint", "hostContextFingerprint", "targetResource", "targetRole", "credentialRefreshMax",
      "iamPolicyReadMax", "totalPhysicalRemoteCallsMax", "automaticRetryMax", "setIamPolicyMax", "iamMutationMax",
      "firestoreMax", "storageWriteMax", "productionWriteMax", "mutationReachable", "m4Allowed", "firestoreAllowed",
      "accessTokenAllowed", "cloudLoggingAllowed", "testIamPermissionsAllowed", "serviceAccountKeyAllowed",
      "historicalLineageStatus", "historicalTrustInherited", "createdAt", "packetDigest"];
    const { packetDigest, ...payload } = value || {};
    return Object.keys(value || {}).sort().join(",") === allowed.sort().join(",")
      && SHA256.test(packetDigest || "") && sha256G2BCanonical(payload) === packetDigest
      && value.schemaVersion === "myweb.g2b.clean-generation.cas-read-packet.v4"
      && value.stage === "P1.5-C2H2E3D-W1C-M3L3-CLEAN-GENERATION-CAS-READ"
      && value.type === "REMOTE_READ_ONLY" && value.status === "APPROVAL_REQUIRED"
      && value.purpose === "FINAL_FRESH_CAS_READ_AFTER_ATTESTATION_V2"
      && UUID.test(value.operationId || "") && UUID.test(value.canonicalGenerationId || "")
      && UUID.test(value.bootstrapIntentId || "") && !G2B_HISTORICAL_GENERATIONS.includes(value.canonicalGenerationId)
      && Number.isSafeInteger(value.manifestVersion) && value.manifestVersion >= 1
      && value.sourceCount === G2B_CAS_SOURCE_PATHS.length && value.sourceFingerprintSchemaVersion === 2
      && value.attestationSchemaVersion === 2 && value.requestedPolicyVersion === 3
      && value.attestationRefreshPolicy === "EXPIRY_ONLY_LOCAL_REFRESH_MAX_1" && value.freshnessRequiredAtExecution === true
      && value.expiryOnlyLocalRefreshAllowed === true && value.localRefreshMax === 1
      && typeof value.sourceLockPath === "string" && value.sourceLockPath.startsWith("docs/evidence/")
      && !value.sourceLockPath.includes("..")
      && [value.sourceFingerprint, value.sourceLockDigest, value.sourceLockRawSha256, value.attestationDigest, value.anchorVerifiedEvidenceDigest,
        value.anchorFingerprint, value.manifestDigest, value.hostContextFingerprint, value.targetMemberFingerprint,
        value.requestIdentity?.identityFingerprint].every((item) => SHA256.test(item || ""))
      && ["user", "serviceAccount"].includes(value.requestIdentity?.principalKind)
      && value.targetResource === G2B_TARGET_RESOURCE && value.targetRole === G2B_TARGET_ROLE
      && value.credentialRefreshMax === 1 && value.iamPolicyReadMax === 1 && value.totalPhysicalRemoteCallsMax === 2
      && value.automaticRetryMax === 0 && value.setIamPolicyMax === 0 && value.iamMutationMax === 0
      && value.firestoreMax === 0 && value.storageWriteMax === 0 && value.productionWriteMax === 0
      && value.mutationReachable === false && value.m4Allowed === false && value.firestoreAllowed === false
      && value.accessTokenAllowed === false && value.cloudLoggingAllowed === false
      && value.testIamPermissionsAllowed === false && value.serviceAccountKeyAllowed === false
      && value.historicalLineageStatus === "UNRESOLVED" && value.historicalTrustInherited === false
      && Number.isFinite(Date.parse(value.createdAt));
  } catch { return false; }
}

export function buildG2BCleanCasReadPacketV3({ operationId, generationId, bootstrapIntentId, manifestVersion,
  sourceFingerprint, sourceLockPath, sourceCount, sourceLockManifestDigest, initialAttestationDigest,
  anchorEvidenceDigest, anchorFingerprint, manifestDigest, identityFingerprint, hostContextFingerprint,
  signerFingerprint, targetMember, createdAt = new Date().toISOString() } = {}) {
  if (!UUID.test(operationId || "") || !UUID.test(generationId || "") || !UUID.test(bootstrapIntentId || "")
    || !Number.isSafeInteger(manifestVersion) || manifestVersion < 1
    || ![sourceFingerprint, sourceLockManifestDigest, initialAttestationDigest, anchorEvidenceDigest, anchorFingerprint,
      manifestDigest, identityFingerprint, hostContextFingerprint, signerFingerprint].every((item) => SHA256.test(item || ""))
    || typeof sourceLockPath !== "string" || !sourceLockPath || sourceLockPath.includes("..") || sourceLockPath.startsWith("/")
    || !Number.isSafeInteger(sourceCount) || sourceCount !== G2B_CAS_SOURCE_PATHS.length
    || typeof targetMember !== "string" || !/^(?:user|serviceAccount):[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetMember)
    || G2B_HISTORICAL_GENERATIONS.includes(generationId)) throw new Error("clean-cas-read-packet-v3-input-invalid");
  const bindingPolicy = Object.freeze({ schemaVersion: 1, generationId, anchorEvidenceDigest, anchorFingerprint,
    identityFingerprint, memberFingerprint: sha256G2BCanonical({ member: targetMember }), hostContextFingerprint,
    sourceFingerprintSchemaVersion: 2, sourceFingerprint, signerFingerprint, ttlMillis: 120_000,
    targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, requestedPolicyVersion: 3,
    credentialRefreshMax: 1, iamPolicyReadMax: 1, totalPhysicalRemoteCallsMax: 2,
    automaticRetryMax: 0, setIamPolicyMax: 0, iamMutationMax: 0, mutationReachable: false });
  const payload = Object.freeze({ schemaVersion: "myweb.g2b.clean-generation.cas-read-packet.v3",
    stage: "P1.5-C2H2E3D-W1C-M3L3-CLEAN-GENERATION-CAS-READ", type: "REMOTE_READ_ONLY", status: "APPROVAL_REQUIRED",
    purpose: "CAS_EVIDENCE_READ_AFTER_CLEAN_GENERATION_BOOTSTRAP", operationId, canonicalGenerationId: generationId,
    bootstrapIntentId, manifestVersion, sourceFingerprint, sourceLockPath: sourceLockPath.replace(/\\/g, "/"), sourceCount,
    sourceFingerprintSchemaVersion: 2, sourceLockDigest: sourceLockManifestDigest, requestedPolicyVersion: 3,
    targetMemberFingerprint: bindingPolicy.memberFingerprint,
    requestIdentity: Object.freeze({ identityFingerprint, principalKind: targetMember.startsWith("serviceAccount:") ? "serviceAccount" : "user" }),
    initialAttestationDigest, attestationBindingPolicy: bindingPolicy,
    attestationRefreshPolicy: "EXPIRY_ONLY_LOCAL_REFRESH_MAX_1", freshnessRequiredAtExecution: true,
    expiryOnlyLocalRefreshAllowed: true, localRefreshMax: 1,
    anchorVerifiedEvidenceDigest: anchorEvidenceDigest, manifestDigest, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE,
    credentialRefreshMax: 1, iamPolicyReadMax: 1, totalPhysicalRemoteCallsMax: 2, automaticRetryMax: 0,
    setIamPolicyMax: 0, iamMutationMax: 0, firestoreMax: 0, storageWriteMax: 0, productionWriteMax: 0,
    mutationReachable: false, m4Allowed: false, firestoreAllowed: false, accessTokenAllowed: false,
    cloudLoggingAllowed: false, testIamPermissionsAllowed: false, serviceAccountKeyAllowed: false,
    historicalLineageStatus: "UNRESOLVED", historicalTrustInherited: false, createdAt });
  return Object.freeze({ ...payload, packetDigest: sha256G2BCanonical(payload) });
}

export function verifyG2BCleanCasReadPacketV3(value) {
  try {
    const allowed = ["schemaVersion", "stage", "type", "status", "purpose", "operationId", "canonicalGenerationId", "bootstrapIntentId",
      "manifestVersion", "sourceFingerprint", "sourceLockPath", "sourceCount", "sourceFingerprintSchemaVersion", "sourceLockDigest",
      "requestedPolicyVersion", "targetMemberFingerprint", "requestIdentity", "initialAttestationDigest", "attestationBindingPolicy",
      "attestationRefreshPolicy", "freshnessRequiredAtExecution", "expiryOnlyLocalRefreshAllowed", "localRefreshMax",
      "anchorVerifiedEvidenceDigest", "manifestDigest", "targetResource", "targetRole", "credentialRefreshMax", "iamPolicyReadMax",
      "totalPhysicalRemoteCallsMax", "automaticRetryMax", "setIamPolicyMax", "iamMutationMax", "firestoreMax", "storageWriteMax",
      "productionWriteMax", "mutationReachable", "m4Allowed", "firestoreAllowed", "accessTokenAllowed", "cloudLoggingAllowed",
      "testIamPermissionsAllowed", "serviceAccountKeyAllowed", "historicalLineageStatus", "historicalTrustInherited", "createdAt", "packetDigest"];
    const { packetDigest, ...payload } = value;
    const policy = value?.attestationBindingPolicy;
    const exactPolicyKeys = ["schemaVersion", "generationId", "anchorEvidenceDigest", "anchorFingerprint", "identityFingerprint",
      "memberFingerprint", "hostContextFingerprint", "sourceFingerprintSchemaVersion", "sourceFingerprint", "signerFingerprint",
      "ttlMillis", "targetResource", "targetRole", "requestedPolicyVersion", "credentialRefreshMax", "iamPolicyReadMax",
      "totalPhysicalRemoteCallsMax", "automaticRetryMax", "setIamPolicyMax", "iamMutationMax", "mutationReachable"];
    return Object.keys(value || {}).sort().join(",") === allowed.sort().join(",")
      && SHA256.test(packetDigest || "") && sha256G2BCanonical(payload) === packetDigest
      && value.schemaVersion === "myweb.g2b.clean-generation.cas-read-packet.v3"
      && value.purpose === "CAS_EVIDENCE_READ_AFTER_CLEAN_GENERATION_BOOTSTRAP"
      && value.type === "REMOTE_READ_ONLY" && value.status === "APPROVAL_REQUIRED"
      && value.stage === "P1.5-C2H2E3D-W1C-M3L3-CLEAN-GENERATION-CAS-READ"
      && UUID.test(value.operationId || "") && UUID.test(value.canonicalGenerationId || "") && UUID.test(value.bootstrapIntentId || "")
      && Number.isSafeInteger(value.manifestVersion) && value.manifestVersion >= 1
      && SHA256.test(value.sourceFingerprint || "") && SHA256.test(value.sourceLockDigest || "")
      && typeof value.sourceLockPath === "string" && value.sourceLockPath.startsWith("docs/evidence/") && !value.sourceLockPath.includes("..")
      && value.sourceCount === G2B_CAS_SOURCE_PATHS.length && value.sourceFingerprintSchemaVersion === 2
      && value.requestedPolicyVersion === 3 && SHA256.test(value.targetMemberFingerprint || "")
      && value.requestIdentity && SHA256.test(value.requestIdentity.identityFingerprint || "")
      && ["user", "serviceAccount"].includes(value.requestIdentity.principalKind)
      && Object.keys(policy || {}).sort().join(",") === exactPolicyKeys.sort().join(",")
      && policy.schemaVersion === 1 && policy.generationId === value.canonicalGenerationId
      && policy.anchorEvidenceDigest === value.anchorVerifiedEvidenceDigest && policy.memberFingerprint === value.targetMemberFingerprint
      && policy.identityFingerprint === value.requestIdentity.identityFingerprint
      && policy.sourceFingerprint === value.sourceFingerprint && policy.sourceFingerprintSchemaVersion === 2
      && policy.targetResource === G2B_TARGET_RESOURCE && policy.targetRole === G2B_TARGET_ROLE
      && policy.requestedPolicyVersion === 3 && policy.ttlMillis === 120_000
      && [policy.anchorFingerprint, policy.identityFingerprint, policy.memberFingerprint, policy.hostContextFingerprint,
        policy.sourceFingerprint, policy.signerFingerprint, value.initialAttestationDigest,
        value.anchorVerifiedEvidenceDigest, value.manifestDigest].every((item) => SHA256.test(item || ""))
      && policy.credentialRefreshMax === 1 && policy.iamPolicyReadMax === 1 && policy.totalPhysicalRemoteCallsMax === 2
      && policy.automaticRetryMax === 0 && policy.setIamPolicyMax === 0 && policy.iamMutationMax === 0 && policy.mutationReachable === false
      && value.attestationRefreshPolicy === "EXPIRY_ONLY_LOCAL_REFRESH_MAX_1" && value.freshnessRequiredAtExecution === true
      && value.expiryOnlyLocalRefreshAllowed === true && value.localRefreshMax === 1
      && value.targetResource === G2B_TARGET_RESOURCE && value.targetRole === G2B_TARGET_ROLE
      && value.credentialRefreshMax === 1 && value.iamPolicyReadMax === 1 && value.totalPhysicalRemoteCallsMax === 2
      && value.automaticRetryMax === 0 && value.setIamPolicyMax === 0 && value.iamMutationMax === 0
      && value.mutationReachable === false && value.firestoreMax === 0 && value.storageWriteMax === 0 && value.productionWriteMax === 0
      && value.m4Allowed === false && value.firestoreAllowed === false && value.accessTokenAllowed === false
      && value.cloudLoggingAllowed === false && value.testIamPermissionsAllowed === false && value.serviceAccountKeyAllowed === false
      && value.historicalLineageStatus === "UNRESOLVED" && value.historicalTrustInherited === false
      && !G2B_HISTORICAL_GENERATIONS.includes(value.canonicalGenerationId);
  } catch { return false; }
}

export function buildG2BCleanSourceLock({ repositoryRoot = process.cwd() } = {}) {
  const sourceLocks = currentG2BCasSourceEntries({ repositoryRoot });
  if (sourceLocks.length !== G2B_CAS_SOURCE_PATHS.length) throw new Error("CLEAN_SOURCE_LOCK_COUNT_MISMATCH");
  const manifest = Object.freeze({ schemaVersion: 1, sourceFingerprintSchemaVersion: 2, schema: "myweb.g2b.clean-generation.source-lock.v1",
    hashAlgorithm: "SHA-256", expectedFileCount: sourceLocks.length, sourceLocks: Object.freeze(sourceLocks) });
  return Object.freeze({ manifest, sourceFingerprint: computeCanonicalSourceFingerprint(sourceLocks),
    manifestDigest: sha256G2BCanonical(manifest), expectedCount: sourceLocks.length, recomputedCount: sourceLocks.length,
    matchedCount: sourceLocks.length, mismatched: 0, missing: 0, unexpected: 0 });
}

export function createG2BCleanBootstrapRuntime({ repositoryRoot = process.cwd(), artifactDirectory, attestationDirectory,
  manifestDirectory, expectedPriorManifestDigest, sourceLockOutput, packetOutput, executionEvidenceOutput,
  environment = process.env, secretProvider, identityResolver, now,
  bootstrapIntentId: requestedIntentId, operationId: requestedOperationId, generationId: requestedGenerationId,
  packetOperationId: requestedPacketOperationId } = {}) {
  const canonicalPaths = resolveG2BCanonicalAuthorityStorePaths({ environment });
  if (!canonicalPaths.ok) throw new Error(canonicalPaths.code);
  artifactDirectory ??= canonicalPaths.artifactDirectory;
  attestationDirectory ??= canonicalPaths.attestationDirectory;
  manifestDirectory ??= canonicalPaths.manifestDirectory;
  const provider = secretProvider;
  const identity = identityResolver?.context || identityResolver;
  const trustedHostGate = evaluateG2BCleanBootstrapTrustedHostPrecondition({ platform: process.platform, provider, identity,
    artifactDirectory, attestationDirectory, sourceLockOutput, packetOutput, executionEvidenceOutput, environment });
  if (!trustedHostGate.ok) {
    throw new Error("CLEAN_BOOTSTRAP_TRUSTED_HOST_" + trustedHostGate.failureCode);
  }
  if (identityResolver?.ok !== true || !identityResolver?.context) {
    throw new Error("CLEAN_BOOTSTRAP_IDENTITY_RESOLUTION_BLOCKED");
  }
  const canonicalMember = `${identity.exactPrincipal.endsWith(".gserviceaccount.com") ? "serviceAccount" : "user"}:${identity.exactPrincipal}`;
  if (identity.exactIamMember !== canonicalMember) throw new Error("CLEAN_BOOTSTRAP_IDENTITY_CANONICALIZATION_FAILED");
  const evidenceRoot = resolve(repositoryRoot, "docs", "evidence") + "\\";
  const resolvedSourceLockOutput = resolve(sourceLockOutput);
  const resolvedPacketOutput = resolve(packetOutput);
  const resolvedExecutionEvidenceOutput = resolve(executionEvidenceOutput);
  if (!resolvedSourceLockOutput.startsWith(evidenceRoot) || !resolvedPacketOutput.startsWith(evidenceRoot)
    || !resolvedExecutionEvidenceOutput.startsWith(evidenceRoot)
    || !resolvedSourceLockOutput.endsWith(".json") || !resolvedPacketOutput.endsWith(".json")
    || !resolvedExecutionEvidenceOutput.endsWith(".json")
    || new Set([resolvedSourceLockOutput, resolvedPacketOutput, resolvedExecutionEvidenceOutput]).size !== 3) {
    throw new Error("CLEAN_BOOTSTRAP_OUTPUT_PATH_INVALID");
  }
  const resolvedArtifactDirectory = resolve(artifactDirectory);
  const resolvedAttestationDirectory = resolve(attestationDirectory);
  const resolvedManifestDirectory = resolve(manifestDirectory || join(resolvedArtifactDirectory, "canonical-manifests"));
  if (resolvedAttestationDirectory !== resolve(resolvedArtifactDirectory, "attestations")) {
    throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_NAMESPACE_INVALID");
  }
  if (expectedPriorManifestDigest !== undefined && expectedPriorManifestDigest !== null
    && !SHA256.test(expectedPriorManifestDigest)) throw new Error("CLEAN_BOOTSTRAP_MANIFEST_PREDECESSOR_INVALID");
  const sourceFingerprint = g2bHostAnchorSourceFingerprint({ repositoryRoot });
  const hostContextFingerprint = g2bHostContextFingerprint(environment);
  const sourceEntries = currentG2BCasSourceEntries({ repositoryRoot });
  if (sourceEntries.length !== G2B_CAS_SOURCE_PATHS.length || sourceEntries.some(({ path }) => !path)) {
    throw new Error("CLEAN_BOOTSTRAP_SOURCE_LOCK_INVALID");
  }
  for (const [path, expected] of [
    ["docs/evidence/g2b-generation-lineage-manual-review-v1.json", G2B_CLEAN_REVIEW_JSON_SHA256],
    ["docs/evidence/g2b-generation-lineage-manual-review-v1.md", G2B_CLEAN_REVIEW_MARKDOWN_SHA256],
    ["docs/evidence/g2b-clean-generation-bootstrap-design-v1.json", G2B_CLEAN_DESIGN_JSON_SHA256],
    ["docs/evidence/g2b-clean-generation-bootstrap-design-v1.md", G2B_CLEAN_DESIGN_MARKDOWN_SHA256],
  ]) {
    if (hashRaw(join(repositoryRoot, path)) !== expected) throw new Error("CLEAN_BOOTSTRAP_CONTEXT_EVIDENCE_MISMATCH");
  }
  const initialSecret = provider.read();
  if (initialSecret.state !== "READY" || !Buffer.isBuffer(initialSecret.secret) || initialSecret.secret.length !== 32
    || !UUID.test(initialSecret.keyId || "")) throw new Error("CLEAN_BOOTSTRAP_DPAPI_VALIDATION_BLOCKED");
  const secret = initialSecret.secret;
  const signingKeyCheck = validateG2BCleanGenerationSigningKey(secret);
  if (!signingKeyCheck.ok) {
    secret.fill(0);
    throw new Error(signingKeyCheck.code);
  }
  try {
    if (g2bHostAnchorSourceFingerprint({ repositoryRoot }) !== sourceFingerprint) throw new Error("CLEAN_BOOTSTRAP_SOURCE_CHANGED");
    const identityFingerprint = sha256G2BCanonical({ account: identity.exactPrincipal, member: identity.exactIamMember });
    const anchorMaterialReferenceFingerprint = createHash("sha256").update(initialSecret.keyId).digest("hex");
    const input = { identityFingerprint, memberFingerprint: sha256G2BCanonical({ member: identity.exactIamMember }),
      hostContextFingerprint, sourceFingerprint, anchorMaterialReferenceFingerprint };
    const store = createG2BCleanGenerationStore({ directory: artifactDirectory });
    const rootState = store.validateRoot();
    if (!rootState.ok || existsSync(join(resolvedManifestDirectory, "activation.lock"))) {
      throw new Error(`CLEAN_BOOTSTRAP_ROOT_PREFLIGHT_${rootState.code || "MANIFEST_LOCK_HELD"}`);
    }
    const allIntents = store.intents();
    const allCandidates = store.candidates();
    const priorIntents = store.activeIntents();
    const priorCandidates = store.activeCandidates();
    if (allIntents.some((item) => item.invalid) || allCandidates.some((item) => item.invalid)
      || priorIntents.some((item) => item.invalid) || priorCandidates.some((item) => item.invalid)
      || priorIntents.length > 1 || priorCandidates.length > 1) throw new Error("CLEAN_BOOTSTRAP_AMBIGUOUS_LOCAL_STATE");
    const existingIntent = priorIntents[0] || null;
    if (existingIntent && ((requestedIntentId && requestedIntentId !== existingIntent.bootstrapIntentId)
      || (requestedOperationId && requestedOperationId !== existingIntent.operationId)
      || (requestedGenerationId && requestedGenerationId !== existingIntent.generationId)
      || canonicalG2BJson(existingIntent.input) !== canonicalG2BJson(input))) {
      throw new Error("CLEAN_BOOTSTRAP_EXISTING_INTENT_MISMATCH");
    }
    const historicalPolicy = buildG2BCleanHistoricalPolicy({ generationStore: store });
    const intent = existingIntent || buildG2BCleanBootstrapIntentV2({ bootstrapIntentId: requestedIntentId || randomUUID(),
      operationId: requestedOperationId || randomUUID(), generationId: requestedGenerationId || randomUUID(), input, historicalPolicy,
      createdAt: now || new Date().toISOString() });
    if (priorCandidates.length && priorCandidates[0].generationId !== intent.generationId) throw new Error("CLEAN_BOOTSTRAP_CANDIDATE_MISMATCH");
    if (["bootstrap-aborted", "canonical-ineligible"].some((name) => store.readEvent(intent.generationId, name).state === "READY")) {
      throw new Error("CLEAN_BOOTSTRAP_PRIOR_TERMINAL_EVENT_BLOCKED");
    }
    if (existsSync(resolvedManifestDirectory) && lstatSync(resolvedManifestDirectory).isSymbolicLink()) {
      throw new Error("CLEAN_BOOTSTRAP_MANIFEST_DIRECTORY_LINK_BLOCKED");
    }
    const manifestStore = createG2BCleanCanonicalManifestStore({ directory: resolvedManifestDirectory });
    const preflightChain = manifestStore.readChain();
    const priorManifestDigest = preflightChain.latest?.manifestDigest ?? null;
    const priorManifest = preflightChain.latest;
    const priorManifestGeneration = priorManifest && allCandidates.find((item) => item.generationId === priorManifest.canonicalGenerationId);
    const priorManifestTerminal = priorManifestGeneration && store.terminalState(priorManifestGeneration.generationId);
    const priorManifestVerified = priorManifestGeneration && store.readEvent(priorManifestGeneration.generationId, "anchor-verified");
    const historicalPredecessorValid = !priorManifest || (priorManifestGeneration
      && priorManifestTerminal?.state === "TERMINAL"
      && priorManifestGeneration.bootstrapIntentId === priorManifest.bootstrapIntentId
      && priorManifestGeneration.identityFingerprint === priorManifest.identityFingerprint
      && priorManifestGeneration.hostContextFingerprint === priorManifest.hostContextFingerprint
      && priorManifestGeneration.sourceFingerprint === priorManifest.sourceFingerprint
      && priorManifestVerified?.state === "READY"
      && priorManifestVerified.value.evidenceDigest === priorManifest.anchorEvidenceDigest);
    if (!preflightChain.ok || !historicalPredecessorValid || (priorManifestDigest !== null && expectedPriorManifestDigest === undefined)
      || (expectedPriorManifestDigest !== undefined && priorManifestDigest !== expectedPriorManifestDigest)
      || (preflightChain.latest && preflightChain.latest.canonicalGenerationId === intent.generationId
        && preflightChain.latest.bootstrapIntentId !== intent.bootstrapIntentId)) {
      throw new Error("CLEAN_BOOTSTRAP_EXISTING_CANONICAL_BLOCKED");
    }
    validateAttestationNamespace(attestationDirectory);
    for (const outputPath of [sourceLockOutput, packetOutput, executionEvidenceOutput]) {
      const existing = readSafeJson(outputPath);
      if (existing.state === "INVALID") throw new Error("CLEAN_BOOTSTRAP_OUTPUT_ARTIFACT_INVALID");
    }
    const bootstrapLock = store.acquireBootstrapLock({ bootstrapIntentId: intent.bootstrapIntentId,
      operationId: intent.operationId, acquiredAt: new Date().toISOString() });
    try {
      if (g2bHostAnchorSourceFingerprint({ repositoryRoot }) !== sourceFingerprint
        || canonicalG2BJson(store.intents().find((item) => item.bootstrapIntentId === intent.bootstrapIntentId)?.input || input) !== canonicalG2BJson(input)
        || !manifestStore.readChain().ok
        || (manifestStore.readChain().latest?.manifestDigest ?? null) !== priorManifestDigest) {
        throw new Error("CLEAN_BOOTSTRAP_FINAL_PREFLIGHT_FAILED");
      }
      const intentArtifact = store.createIntent(intent);
      const candidate = store.readGeneration(intent.generationId);
      if (candidate.state === "INVALID" || (candidate.state === "READY" && !validGenerationRecord(candidate.value))) {
        throw new Error("CLEAN_BOOTSTRAP_EXISTING_GENERATION_INVALID");
      }
      const priorAnchor = store.readAnchor(intent.generationId);
      if (priorAnchor.state === "INVALID") throw new Error("CLEAN_BOOTSTRAP_EXISTING_ANCHOR_INVALID");
      const anchorRecord = priorAnchor.state === "READY" ? priorAnchor.value : buildG2BRecoveryAnchor({
        member: identity.exactIamMember, secret, secretKeyId: initialSecret.keyId,
        operationGenerationId: intent.generationId, now: intent.createdAt });
      if (candidate.state === "READY" && (candidate.value.bootstrapIntentId !== intent.bootstrapIntentId
        || candidate.value.bootstrapOperationId !== intent.operationId || candidate.value.identityFingerprint !== identityFingerprint
        || candidate.value.hostContextFingerprint !== hostContextFingerprint || candidate.value.sourceFingerprint !== sourceFingerprint
        || candidate.value.anchorMaterialReferenceFingerprint !== anchorMaterialReferenceFingerprint)) {
        throw new Error("CLEAN_BOOTSTRAP_EXISTING_GENERATION_MISMATCH");
      }
      const initial = store.createGeneration({ intent, anchorRecord, ...input, createdAt: intent.createdAt });
      const freshRead = provider.read();
      if (freshRead.state !== "READY" || freshRead.keyId !== initialSecret.keyId || !Buffer.isBuffer(freshRead.secret)
        || freshRead.secret.length !== 32) throw new Error("CLEAN_BOOTSTRAP_SECRET_RECHECK_FAILED");
      let verification;
      try {
        verification = verifyG2BRecoveryAnchor({ record: anchorRecord, member: identity.exactIamMember,
          secret: freshRead.secret, secretKeyId: freshRead.keyId });
      } finally { freshRead.secret.fill(0); }
      const verificationAttempt = store.recordVerificationAttempt({ generationId: intent.generationId, intent, identityFingerprint,
        hostContextFingerprint, sourceFingerprint, verification, attemptedAt: new Date().toISOString() });
      if (!verification.ok || verification.state !== "PRESENT_CONFIRMED") throw new Error("CLEAN_BOOTSTRAP_ANCHOR_VERIFY_FAILED");
      const verifiedResult = store.recordVerifiedEvent({ generationId: intent.generationId, intent, anchorRecord,
        identityFingerprint, hostContextFingerprint, sourceFingerprint, verification,
        verifiedAt: now || new Date().toISOString() });
      const chain = manifestStore.readChain();
      if (!chain.ok) throw new Error(`CLEAN_BOOTSTRAP_MANIFEST_${chain.code}`);
      let manifestResult;
      if (chain.latest?.canonicalGenerationId === intent.generationId
        && chain.latest.bootstrapIntentId === intent.bootstrapIntentId) {
        const current = chain.latest;
        if (current.anchorEvidenceDigest !== verifiedResult.evidence.evidenceDigest
          || current.identityFingerprint !== identityFingerprint || current.hostContextFingerprint !== hostContextFingerprint
          || current.sourceFingerprint !== sourceFingerprint) throw new Error("CLEAN_BOOTSTRAP_EXISTING_CANONICAL_MISMATCH");
        manifestResult = { ok: true, manifest: current, path: join(resolvedManifestDirectory, `manifest-${String(current.manifestVersion).padStart(8, "0")}.json`), reused: true };
      } else {
        manifestResult = manifestStore.activate({ canonicalGenerationId: intent.generationId,
          anchorEvidenceDigest: verifiedResult.evidence.evidenceDigest, identityFingerprint, hostContextFingerprint,
          sourceFingerprint, bootstrapIntentId: intent.bootstrapIntentId }, { expectedPriorDigest: priorManifestDigest,
          operationId: intent.operationId, now: now || new Date().toISOString() });
        if (!manifestResult.ok) throw new Error(`CLEAN_BOOTSTRAP_MANIFEST_${manifestResult.code}`);
      if (manifestResult.manifest.previousManifestDigest !== priorManifestDigest) {
          throw new Error("CLEAN_BOOTSTRAP_MANIFEST_PREDECESSOR_MISMATCH");
        }
      }
      const sourceLock = buildG2BCleanSourceLock({ repositoryRoot });
      if (sourceLock.sourceFingerprint !== sourceFingerprint) throw new Error("CLEAN_BOOTSTRAP_SOURCE_CHANGED_BEFORE_ATTESTATION");
      const sourceLockArtifact = createOrVerifyJson(sourceLockOutput, sourceLock.manifest);
      const sourceLockWithPath = Object.freeze({ ...sourceLock, path: sourceLockArtifact.path });
      const packetOperationId = requestedPacketOperationId || intent.operationId;
      if (!UUID.test(packetOperationId || "")) throw new Error("CLEAN_BOOTSTRAP_PACKET_OPERATION_INVALID");
      const attestationBindings = { generationId: intent.generationId, anchorEvidenceDigest: verifiedResult.evidence.evidenceDigest,
        identityFingerprint, anchorFingerprint: verifiedResult.evidence.anchorFingerprint,
        memberFingerprint: sha256G2BCanonical({ member: identity.exactIamMember }), hostContextFingerprint, sourceFingerprint,
        sourceLockDigest: sourceLock.manifestDigest, operationId: packetOperationId,
        secretKeyId: initialSecret.keyId, environment, repositoryRoot };
      let attestationValue = null;
      let attestationArtifact = null;
      if (existsSync(attestationDirectory)) {
        let names;
        try { names = readdirSync(attestationDirectory); } catch { throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_DIRECTORY_UNREADABLE"); }
        validateAttestationNamespace(attestationDirectory);
        for (const name of names) {
          if (!name.startsWith(`${intent.generationId}-`) || !name.endsWith(".json")) continue;
          try {
            if (lstatSync(join(attestationDirectory, name)).isSymbolicLink()) throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_LINK_BLOCKED");
          } catch (error) {
            throw error?.message === "CLEAN_BOOTSTRAP_ATTESTATION_LINK_BLOCKED" ? error : new Error("CLEAN_BOOTSTRAP_ATTESTATION_ARTIFACT_INVALID");
          }
          const loaded = readSafeJson(join(attestationDirectory, name));
          if (loaded.state !== "READY") throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_ARTIFACT_INVALID");
          if (loaded.value.schemaVersion !== "myweb.g2b.clean-generation-host-attestation.v2") continue;
          const check = verifyG2BCleanGenerationAttestationV2(loaded.value, { ...attestationBindings, now: Date.now() });
          if (check.ok && (!attestationValue || Date.parse(loaded.value.issuedAt) > Date.parse(attestationValue.issuedAt))) {
            attestationValue = loaded.value;
            attestationArtifact = Object.freeze({ path: join(attestationDirectory, name), rawSha256: hashRaw(join(attestationDirectory, name)), ageMs: check.ageMs, reused: true });
          }
        }
      }
      if (!attestationValue) {
        const built = buildG2BCleanGenerationAttestationV2({ secret, ...attestationBindings,
          issuedAt: now || new Date().toISOString() });
        if (!built.ok) throw new Error(built.code);
        if (built.attestation.schemaVersion !== "myweb.g2b.clean-generation-host-attestation.v2") {
          throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_SCHEMA_MISMATCH");
        }
        attestationValue = built.attestation;
        const attestationCheck = verifyG2BCleanGenerationAttestationV2(attestationValue, { ...attestationBindings, now: Date.now() });
        if (!attestationCheck.ok) throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_NOT_FRESH");
        attestationArtifact = writeG2BCleanGenerationAttestationV2(attestationValue, { directory: attestationDirectory,
          ...attestationBindings, now: Date.now() });
      }
      if (attestationValue.schemaVersion !== "myweb.g2b.clean-generation-host-attestation.v2") {
        throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_SCHEMA_MISMATCH");
      }
      const attestationCheck = verifyG2BCleanGenerationAttestationV2(attestationValue, { ...attestationBindings, now: Date.now() });
      if (!attestationCheck.ok) throw new Error("CLEAN_BOOTSTRAP_ATTESTATION_NOT_FRESH");
      const resolved = resolveG2BCleanCanonicalGeneration({ generationStore: store, manifestStore,
        attestation: attestationValue, attestationBindings: { secretKeyId: initialSecret.keyId, environment, repositoryRoot,
          operationId: packetOperationId, sourceLockDigest: sourceLock.manifestDigest, hostContextFingerprint }, now: Date.now() });
      if (!resolved.ok || !resolved.readEligible || resolved.canonicalGeneration !== intent.generationId) {
        store.recordOrchestrationEvent(intent.generationId, "canonical-ineligible", { generationId: intent.generationId,
          bootstrapIntentId: intent.bootstrapIntentId, operationId: intent.operationId, failureCode: resolved.code, at: new Date().toISOString() });
        throw new Error(`CLEAN_BOOTSTRAP_RESOLVER_${resolved.code}`);
      }
      const priorPacket = readSafeJson(packetOutput);
      if (priorPacket.state === "INVALID") throw new Error("CLEAN_BOOTSTRAP_PACKET_ARTIFACT_INVALID");
      let packet;
      let packetArtifact;
      if (priorPacket.state === "READY") {
        packet = priorPacket.value;
        if (packet.schemaVersion !== "myweb.g2b.clean-generation.cas-read-packet.v4"
          || !verifyG2BCleanCasReadPacket(packet) || packet.operationId !== packetOperationId
          || packet.canonicalGenerationId !== intent.generationId
          || packet.bootstrapIntentId !== intent.bootstrapIntentId || packet.sourceFingerprint !== sourceFingerprint
          || packet.sourceLockDigest !== sourceLock.manifestDigest
          || packet.sourceLockRawSha256 !== hashRaw(sourceLockOutput)
          || packet.attestationDigest !== attestationValue.attestationDigest
          || packet.anchorVerifiedEvidenceDigest !== verifiedResult.evidence.evidenceDigest || packet.manifestDigest !== manifestResult.manifest.manifestDigest) {
          throw new Error("CLEAN_BOOTSTRAP_PACKET_BINDING_MISMATCH");
        }
        packetArtifact = Object.freeze({ path: packetOutput, rawSha256: hashRaw(packetOutput), reused: true });
      } else {
        packet = buildG2BCleanCasReadPacketV4({ operationId: packetOperationId, generationId: intent.generationId,
          bootstrapIntentId: intent.bootstrapIntentId, manifestVersion: manifestResult.manifest.manifestVersion, sourceFingerprint,
          sourceLockPath: relative(repositoryRoot, resolve(sourceLockOutput)).replace(/\\/g, "/"), sourceCount: sourceLock.expectedCount,
          sourceLockDigest: sourceLock.manifestDigest, sourceLockRawSha256: hashRaw(sourceLockOutput),
          attestationDigest: attestationValue.attestationDigest, anchorEvidenceDigest: verifiedResult.evidence.evidenceDigest,
          anchorFingerprint: verifiedResult.evidence.anchorFingerprint, hostContextFingerprint,
          identityFingerprint, targetMember: identity.exactIamMember,
          manifestDigest: manifestResult.manifest.manifestDigest, createdAt: new Date().toISOString() });
        if (packet.schemaVersion !== "myweb.g2b.clean-generation.cas-read-packet.v4") {
          throw new Error("CLEAN_BOOTSTRAP_PACKET_SCHEMA_MISMATCH");
        }
        packetArtifact = createOnlyJson(packetOutput, packet);
      }
      if (packet.schemaVersion !== "myweb.g2b.clean-generation.cas-read-packet.v4"
        || !verifyG2BCleanCasReadPacket(packet) || g2bHostAnchorSourceFingerprint({ repositoryRoot }) !== sourceFingerprint
        || sourceLock.sourceFingerprint !== packet.sourceFingerprint || attestationValue.sourceFingerprint !== packet.sourceFingerprint
        || attestationValue.operationId !== packet.operationId || attestationValue.sourceLockDigest !== packet.sourceLockDigest
        || packet.sourceLockRawSha256 !== hashRaw(sourceLockOutput)
        || resolved.canonicalGeneration !== packet.canonicalGenerationId) throw new Error("CLEAN_BOOTSTRAP_FINAL_BINDING_CHECK_FAILED");
      const packetBytes = readFileSync(packetOutput);
      const packetExecutionEvidence = createPacketExecutionEvidence({ path: executionEvidenceOutput,
        packetPath: relative(repositoryRoot, resolve(packetOutput)).replace(/\\/g, "/"), packet, packetBytes,
        sourceLock: sourceLockWithPath, manifest: manifestResult.manifest, anchorEvidence: verifiedResult.evidence,
        createdAt: new Date().toISOString() });
      store.recordOrchestrationEvent(intent.generationId, "attestation-eligible", { generationId: intent.generationId,
        bootstrapIntentId: intent.bootstrapIntentId, operationId: intent.operationId,
        attestationDigest: attestationValue.attestationDigest, readEligible: true, mutationEligible: false });
      return Object.freeze({ ok: true, intent, intentArtifact, generation: initial.record, generationArtifact: initial.recordArtifact,
        anchorArtifact: initial.anchorArtifact, anchorPersistedEvidence: initial.persistedEvidence, verificationAttempt,
        anchorPersistedEvidenceArtifact: initial.persistedArtifact, anchorVerifiedEvidence: verifiedResult.evidence,
        anchorVerifiedEvidenceArtifact: verifiedResult.evidenceArtifact, anchorVerifiedRecordArtifact: verifiedResult.anchorVerifiedArtifact,
        manifest: manifestResult.manifest, manifestPath: manifestResult.path, attestation: attestationValue,
        attestationArtifact, resolution: resolved, sourceLock: sourceLockWithPath, sourceLockArtifact, packet, packetArtifact,
        packetExecutionEvidence, executionEvidenceArtifact: packetExecutionEvidence,
        reusedProtectedSecretAsset: true, inheritedTrust: Object.freeze([]), remoteCalls: 0, mutationReachable: false });
    } catch (error) {
      try {
        if (store.readGeneration(intent.generationId).state === "READY") {
          const active = manifestStore.readChain();
          const canonicalActive = active.ok && active.latest?.canonicalGenerationId === intent.generationId;
          store.recordOrchestrationEvent(intent.generationId, canonicalActive ? "canonical-ineligible" : "bootstrap-aborted", {
            generationId: intent.generationId, bootstrapIntentId: intent.bootstrapIntentId, operationId: intent.operationId,
            failureCode: safeFailureCode(error), at: new Date().toISOString(),
          });
        }
      } catch { /* Preserve immutable partial state when an outcome record cannot be safely created. */ }
      throw error;
    } finally {
      bootstrapLock.release();
    }
  } finally {
    secret.fill(0);
  }
}
