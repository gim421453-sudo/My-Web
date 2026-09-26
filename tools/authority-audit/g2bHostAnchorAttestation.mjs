import { createHash, createPrivateKey, createPublicKey, randomUUID, sign, verify, timingSafeEqual } from "node:crypto";
import { closeSync, existsSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { G2B_SOURCE_FINGERPRINT_SCHEMA_VERSION, computeCanonicalSourceFingerprint, currentG2BCasSourceEntries } from "./g2bCanonicalSourceFingerprint.mjs";

export const G2B_HOST_ANCHOR_ATTESTATION_SCHEMA = "myweb.g2b.host-anchor-attestation.v3";
export const G2B_HOST_ANCHOR_ATTESTATION_MAX_AGE_MS = 120_000;
export const G2B_HOST_ANCHOR_ATTESTATION_PUBLIC_KEY_SPKI = "MCowBQYDK2VwAyEAvSdUpJjqlDD7ByiTT7HC9p5KfP/tVFbmIq/9SPHOB8A=";
const PRIVATE_KEY_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const PUBLIC_KEY = Buffer.from(G2B_HOST_ANCHOR_ATTESTATION_PUBLIC_KEY_SPKI, "base64");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[a-f0-9]{64}$/;

const canonical = (value) => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const sha = (value) => createHash("sha256").update(typeof value === "string" ? value : canonical(value), "utf8").digest("hex");
const signaturePayload = (value) => Buffer.from(canonical(value), "utf8");
const publicKeyFingerprint = sha(G2B_HOST_ANCHOR_ATTESTATION_PUBLIC_KEY_SPKI);
function verifyPinnedSignature(attestation) {
  try {
    const { attestationDigest, attestationSignature, publicKeyFingerprint: fingerprint, ...unsigned } = attestation;
    if (fingerprint !== publicKeyFingerprint || !SHA256.test(attestationDigest || "") || typeof attestationSignature !== "string"
      || sha({ unsigned, attestationSignature }) !== attestationDigest) return false;
    return verify(null, signaturePayload(unsigned), createPublicKey({ key: PUBLIC_KEY, format: "der", type: "spki" }), Buffer.from(attestationSignature, "base64"));
  } catch { return false; }
}

export function g2bHostContextFingerprint(environment = process.env) {
  return sha({ user: environment.USERNAME || "", domain: environment.USERDOMAIN || "", profile: environment.USERPROFILE || "", machine: environment.COMPUTERNAME || "" });
}

export function g2bHostAnchorSourceFingerprint({ repositoryRoot = process.cwd() } = {}) {
  return computeCanonicalSourceFingerprint(currentG2BCasSourceEntries({ repositoryRoot }));
}

export function buildG2BHostAnchorAttestation({
  secret, secretKeyId, generationId, account, member, anchorRecord, validationProvider = "WINDOWS_DPAPI_CURRENT_USER",
  validationEnvironment = "TRUSTED_WINDOWS_HOST", environment = process.env, repositoryRoot = process.cwd(),
  validationId = randomUUID(), validatedAt = new Date().toISOString(),
} = {}) {
  if (!Buffer.isBuffer(secret) || secret.length !== 32 || !UUID.test(secretKeyId || "") || !UUID.test(generationId || "")
    || !UUID.test(validationId) || !Number.isFinite(Date.parse(validatedAt))
    || typeof account !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)
    || typeof member !== "string" || !/^(?:user|serviceAccount):[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member)
    || anchorRecord?.operationGenerationId !== generationId || anchorRecord?.secretKeyId !== secretKeyId
    || anchorRecord?.anchorState !== "ANCHOR_VERIFIED"
    || validationProvider !== "WINDOWS_DPAPI_CURRENT_USER" || validationEnvironment !== "TRUSTED_WINDOWS_HOST") {
    return Object.freeze({ ok: false, code: "HOST_ANCHOR_ATTESTATION_INPUT_INVALID" });
  }
  const unsigned = Object.freeze({
    schemaVersion: G2B_HOST_ANCHOR_ATTESTATION_SCHEMA,
    validationId,
    validatedAt,
    validationProvider,
    validationEnvironment,
    userContextFingerprint: g2bHostContextFingerprint(environment),
    machineContextFingerprint: sha(environment.COMPUTERNAME || ""),
    generationId,
    pinnedIdentityFingerprint: sha({ account, member }),
    anchorFingerprint: sha({ anchorDigest: anchorRecord.anchorDigest, integrityDigest: anchorRecord.integrityDigest, generationId, state: anchorRecord.anchorState }),
    secretKeyIdFingerprint: sha(secretKeyId),
    sourceFingerprintSchemaVersion: G2B_SOURCE_FINGERPRINT_SCHEMA_VERSION,
    sourceFingerprint: g2bHostAnchorSourceFingerprint({ repositoryRoot }),
    unprotectSucceeded: true,
    generationBindingSucceeded: true,
    identityBindingSucceeded: true,
    anchorValidationSucceeded: true,
    result: "VALID",
  });
  try {
    const privateKey = createPrivateKey({ key: Buffer.concat([PRIVATE_KEY_PREFIX, secret]), format: "der", type: "pkcs8" });
    const derivedPublicKey = createPublicKey(privateKey).export({ format: "der", type: "spki" });
    if (!timingSafeEqual(derivedPublicKey, PUBLIC_KEY)) return Object.freeze({ ok: false, code: "HOST_ATTESTATION_SIGNING_KEY_MISMATCH" });
    const attestationSignature = sign(null, signaturePayload(unsigned), privateKey).toString("base64");
    const attestationDigest = sha({ unsigned, attestationSignature });
    return Object.freeze({ ok: true, attestation: Object.freeze({ ...unsigned, publicKeyFingerprint, attestationSignature, attestationDigest }) });
  } catch {
    return Object.freeze({ ok: false, code: "HOST_ATTESTATION_SIGNING_FAILED" });
  }
}

export function verifyG2BHostAnchorAttestation(attestation, {
  secretKeyId, generationId, account, member, anchorRecord, environment = process.env,
  repositoryRoot = process.cwd(), now = Date.now(), maxAgeMs = G2B_HOST_ANCHOR_ATTESTATION_MAX_AGE_MS,
} = {}) {
  try {
    if (!attestation || typeof attestation !== "object"
      || attestation.schemaVersion !== G2B_HOST_ANCHOR_ATTESTATION_SCHEMA || attestation.result !== "VALID"
      || !UUID.test(attestation.validationId || "") || !Number.isFinite(Date.parse(attestation.validatedAt))
      || now < Date.parse(attestation.validatedAt) || now - Date.parse(attestation.validatedAt) > maxAgeMs
      || attestation.validationProvider !== "WINDOWS_DPAPI_CURRENT_USER" || attestation.validationEnvironment !== "TRUSTED_WINDOWS_HOST"
      || attestation.unprotectSucceeded !== true || attestation.generationBindingSucceeded !== true
      || attestation.identityBindingSucceeded !== true || attestation.anchorValidationSucceeded !== true
      || attestation.userContextFingerprint !== g2bHostContextFingerprint(environment)
      || attestation.machineContextFingerprint !== sha(environment.COMPUTERNAME || "")
      || attestation.generationId !== generationId || attestation.generationId !== anchorRecord?.operationGenerationId
      || attestation.pinnedIdentityFingerprint !== sha({ account, member })
      || attestation.anchorFingerprint !== sha({ anchorDigest: anchorRecord?.anchorDigest, integrityDigest: anchorRecord?.integrityDigest, generationId, state: anchorRecord?.anchorState })
      || attestation.secretKeyIdFingerprint !== sha(secretKeyId) || anchorRecord?.secretKeyId !== secretKeyId
      || attestation.sourceFingerprintSchemaVersion !== G2B_SOURCE_FINGERPRINT_SCHEMA_VERSION
      || attestation.sourceFingerprint !== g2bHostAnchorSourceFingerprint({ repositoryRoot })
      || attestation.publicKeyFingerprint !== publicKeyFingerprint
      || !SHA256.test(attestation.attestationDigest || "") || typeof attestation.attestationSignature !== "string") return Object.freeze({ ok: false, result: "UNKNOWN", code: "HOST_ATTESTATION_BINDING_OR_FRESHNESS_FAILED" });
    if (!verifyPinnedSignature(attestation)) return Object.freeze({ ok: false, result: "INVALID", code: "HOST_ATTESTATION_SIGNATURE_INVALID" });
    return Object.freeze({ ok: true, result: "VALID", validationId: attestation.validationId });
  } catch {
    return Object.freeze({ ok: false, result: "UNKNOWN", code: "HOST_ATTESTATION_VALIDATION_FAILED" });
  }
}

export function readFreshG2BHostAnchorAttestation({ directory = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "MY-WEB", "authority-audit", "host-anchor-attestations") : null, secretKeyId, generationId, account, member, anchorRecord, environment = process.env, repositoryRoot = process.cwd(), now = Date.now() } = {}) {
  const classified = classifyG2BHostAnchorAttestationFreshness({ directory, secretKeyId, generationId, account, member, anchorRecord, environment, repositoryRoot, now });
  if (classified.state !== "FRESH") return Object.freeze({ ok: false, result: "UNKNOWN", code: classified.code || "HOST_ATTESTATION_STALE_OR_MISMATCH" });
  return Object.freeze({ ok: true, result: "VALID", attestation: classified.attestation });
}

export function classifyG2BHostAnchorAttestationFreshness({ directory = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "MY-WEB", "authority-audit", "host-anchor-attestations") : null, secretKeyId, generationId, account, member, anchorRecord, environment = process.env, repositoryRoot = process.cwd(), now = Date.now() } = {}) {
  try {
    if (!directory || !existsSync(directory)) return Object.freeze({ state: "UNKNOWN_BINDING_STATE", code: "HOST_ATTESTATION_MISSING" });
    const prefix = `${generationId}-`;
    const names = readdirSync(directory).filter((name) => name.startsWith(prefix) && name.endsWith(".json"));
    if (names.length === 0) return Object.freeze({ state: "UNKNOWN_BINDING_STATE", code: "HOST_ATTESTATION_MISSING" });
    const sourceFingerprint = g2bHostAnchorSourceFingerprint({ repositoryRoot });
    const candidates = names.map((name) => {
      const value = JSON.parse(readFileSync(resolve(directory, name), "utf8"));
      const issuedAt = Date.parse(value.validatedAt);
      const states = Object.freeze({
        signature: verifyPinnedSignature(value) ? "VALID" : "INVALID",
        contract: value.result === "VALID" && UUID.test(value.validationId || "")
          && name === `${generationId}-${value.validationId}.json`
          && value.validationProvider === "WINDOWS_DPAPI_CURRENT_USER"
          && value.validationEnvironment === "TRUSTED_WINDOWS_HOST"
          && value.unprotectSucceeded === true && value.generationBindingSucceeded === true
          && value.identityBindingSucceeded === true && value.anchorValidationSucceeded === true ? "MATCH" : "MISMATCH",
        generation: value.generationId === generationId && anchorRecord?.operationGenerationId === generationId ? "MATCH" : "MISMATCH",
        identity: value.pinnedIdentityFingerprint === sha({ account, member }) ? "MATCH" : "MISMATCH",
        anchor: value.anchorFingerprint === sha({ anchorDigest: anchorRecord?.anchorDigest, integrityDigest: anchorRecord?.integrityDigest, generationId, state: anchorRecord?.anchorState })
          && value.secretKeyIdFingerprint === sha(secretKeyId) && anchorRecord?.secretKeyId === secretKeyId ? "MATCH" : "MISMATCH",
        hostContext: value.userContextFingerprint === g2bHostContextFingerprint(environment)
          && value.machineContextFingerprint === sha(environment.COMPUTERNAME || "") ? "MATCH" : "MISMATCH",
        sourceFingerprint: value.schemaVersion === G2B_HOST_ANCHOR_ATTESTATION_SCHEMA
          && value.sourceFingerprintSchemaVersion === G2B_SOURCE_FINGERPRINT_SCHEMA_VERSION
          && value.sourceFingerprint === sourceFingerprint ? "MATCH" : "MISMATCH",
        freshness: Number.isFinite(issuedAt) && issuedAt <= now
          ? now - issuedAt <= G2B_HOST_ANCHOR_ATTESTATION_MAX_AGE_MS ? "FRESH" : "EXPIRED" : "UNKNOWN",
      });
      return { value, states, ageMs: now - issuedAt };
    });
    if (candidates.some(({ states }) => states.signature === "INVALID")) return Object.freeze({ state: "SIGNATURE_INVALID", code: "HOST_ATTESTATION_SIGNATURE_INVALID" });
    const exact = candidates.filter(({ states }) => states.contract === "MATCH" && states.generation === "MATCH" && states.identity === "MATCH"
      && states.anchor === "MATCH" && states.hostContext === "MATCH" && states.sourceFingerprint === "MATCH");
    const newest = (list) => list.reduce((best, item) => !best || item.ageMs < best.ageMs ? item : best, null);
    if (exact.length) {
      const selected = newest(exact);
      if (selected.states.freshness === "FRESH") return Object.freeze({ state: "FRESH", attestation: Object.freeze(selected.value), ageMs: selected.ageMs,
        boundCandidateCount: exact.length, bindingStates: selected.states });
      if (selected.states.freshness === "EXPIRED") return Object.freeze({ state: "ATTESTATION_EXPIRED_ONLY", ageMs: selected.ageMs,
        boundCandidateCount: exact.length, bindingStates: selected.states });
      return Object.freeze({ state: "UNKNOWN_BINDING_STATE", code: "HOST_ATTESTATION_TIME_INVALID", bindingStates: selected.states });
    }
    const selected = newest(candidates);
    const failures = ["contract", "generation", "identity", "anchor", "hostContext", "sourceFingerprint"].filter((key) => selected.states[key] !== "MATCH");
    const state = failures.length === 1 ? ({ generation: "GENERATION_MISMATCH", identity: "IDENTITY_MISMATCH", anchor: "ANCHOR_MISMATCH",
      hostContext: "HOST_CONTEXT_MISMATCH", sourceFingerprint: "SOURCE_FINGERPRINT_MISMATCH", contract: "UNKNOWN_BINDING_STATE" })[failures[0]] : "MULTIPLE_BINDING_FAILURES";
    return Object.freeze({ state, code: `HOST_ATTESTATION_${state}`, bindingStates: selected.states,
      historicalFingerprintAlgorithmSuperseded: selected.value.sourceFingerprintSchemaVersion !== G2B_SOURCE_FINGERPRINT_SCHEMA_VERSION });
  } catch {
    return Object.freeze({ state: "UNKNOWN_BINDING_STATE", code: "HOST_ATTESTATION_UNCLASSIFIABLE" });
  }
}

export function g2bHostAnchorAttestationPath({ directory = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "MY-WEB", "authority-audit", "host-anchor-attestations") : null, generationId, validationId } = {}) {
  if (!directory || !UUID.test(generationId || "") || !UUID.test(validationId || "")) throw new Error("host-attestation-path-input-invalid");
  return resolve(directory, `${generationId}-${validationId}.json`);
}

export function writeG2BHostAnchorAttestation(attestation, path) {
  if (attestation?.schemaVersion !== G2B_HOST_ANCHOR_ATTESTATION_SCHEMA || attestation.result !== "VALID" || !verifyPinnedSignature(attestation)) throw new Error("host-attestation-not-valid");
  const bytes = `${canonical(attestation)}\n`;
  if (existsSync(path)) throw new Error("ARTIFACT_PATH_COLLISION");
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = openSync(temporary, "wx", 0o600);
    writeFileSync(fd, bytes, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    try { linkSync(temporary, path); } catch (error) {
      if (error?.code === "EEXIST") throw new Error("ARTIFACT_PATH_COLLISION");
      throw error;
    }
    unlinkSync(temporary);
    const persisted = JSON.parse(readFileSync(path, "utf8"));
    if (canonical(persisted) !== canonical(attestation)) throw new Error("HOST_ATTESTATION_ROUNDTRIP_FAILED");
    return Object.freeze({ path, rawSha256: createHash("sha256").update(readFileSync(path)).digest("hex") });
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export const G2B_HOST_ANCHOR_ATTESTATION_CONTRACT = Object.freeze({
  resultDomain: Object.freeze(["VALID", "INVALID", "ENVIRONMENT_BLOCKED", "UNKNOWN"]),
  remoteReadAcceptsOnly: "VALID",
  maxAgeMs: G2B_HOST_ANCHOR_ATTESTATION_MAX_AGE_MS,
  secretPersisted: false,
  rawIdentityPersisted: false,
  tamperProtection: "ED25519_SIGNATURE_FROM_CURRENTUSER_DPAPI_SECRET_WITH_PINNED_PUBLIC_KEY",
  sourceFingerprintBound: true,
  overwriteExisting: false,
});
