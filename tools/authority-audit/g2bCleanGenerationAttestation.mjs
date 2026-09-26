import { createHash, createPrivateKey, createPublicKey, randomUUID, sign, verify } from "node:crypto";
import { closeSync, existsSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { G2B_HOST_ANCHOR_ATTESTATION_PUBLIC_KEY_SPKI, g2bHostAnchorSourceFingerprint, g2bHostContextFingerprint } from "./g2bHostAnchorAttestation.mjs";
import { canonicalG2BJson, sha256G2BCanonical } from "./g2bCanonicalGenerationManifest.mjs";

export const G2B_CLEAN_ATTESTATION_SCHEMA = "myweb.g2b.clean-generation-host-attestation.v1";
export const G2B_CLEAN_ATTESTATION_V2_SCHEMA = "myweb.g2b.clean-generation-host-attestation.v2";
export const G2B_CLEAN_ATTESTATION_TTL_MS = 120_000;
const PRIVATE_KEY_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const PUBLIC_KEY = Buffer.from(G2B_HOST_ANCHOR_ATTESTATION_PUBLIC_KEY_SPKI, "base64");
const publicKeyFingerprint = createHash("sha256").update(G2B_HOST_ANCHOR_ATTESTATION_PUBLIC_KEY_SPKI).digest("hex");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[a-f0-9]{64}$/;

export function validateG2BCleanGenerationSigningKey(secret) {
  if (!Buffer.isBuffer(secret) || secret.length !== 32) return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_SIGNING_KEY_INPUT_INVALID" });
  try {
    const privateKey = createPrivateKey({ key: Buffer.concat([PRIVATE_KEY_PREFIX, secret]), format: "der", type: "pkcs8" });
    const derived = createPublicKey(privateKey).export({ format: "der", type: "spki" });
    return derived.equals(PUBLIC_KEY) ? Object.freeze({ ok: true, publicKeyFingerprint })
      : Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_SIGNING_KEY_MISMATCH" });
  } catch { return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_SIGNING_KEY_INVALID" }); }
}

function attestationPayload(value) {
  const { attestationDigest, attestationSignature, publicKeyFingerprint: ignored, ...payload } = value;
  return payload;
}

export function buildG2BCleanGenerationAttestation({ secret, secretKeyId, generationId, anchorEvidenceDigest,
  identityFingerprint, anchorFingerprint, memberFingerprint, sourceFingerprint, hostContextFingerprint: hostFingerprint,
  environment = process.env, repositoryRoot = process.cwd(), validationId = randomUUID(), validatedAt = new Date().toISOString() } = {}) {
  if (!Buffer.isBuffer(secret) || secret.length !== 32 || !UUID.test(secretKeyId || "") || !UUID.test(generationId || "")
    || !UUID.test(validationId) || !SHA256.test(anchorEvidenceDigest || "") || !SHA256.test(identityFingerprint || "")
    || !SHA256.test(anchorFingerprint || "") || !SHA256.test(sourceFingerprint || "") || !SHA256.test(hostFingerprint || "")
    || !Number.isFinite(Date.parse(validatedAt)) || hostFingerprint !== g2bHostContextFingerprint(environment)
    || sourceFingerprint !== g2bHostAnchorSourceFingerprint({ repositoryRoot })) return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_INPUT_INVALID" });
  try {
    const signingCheck = validateG2BCleanGenerationSigningKey(secret);
    if (!signingCheck.ok) return signingCheck;
    const privateKey = createPrivateKey({ key: Buffer.concat([PRIVATE_KEY_PREFIX, secret]), format: "der", type: "pkcs8" });
    const payload = Object.freeze({ schemaVersion: G2B_CLEAN_ATTESTATION_SCHEMA, validationId, validatedAt,
      validationProvider: "WINDOWS_DPAPI_CURRENT_USER", validationEnvironment: "TRUSTED_WINDOWS_HOST", generationId,
      anchorEvidenceDigest, identityFingerprint, anchorFingerprint, hostContextFingerprint: hostFingerprint,
      sourceFingerprintSchemaVersion: 2, sourceFingerprint, secretKeyIdFingerprint: createHash("sha256").update(secretKeyId).digest("hex"),
      ...(memberFingerprint ? { memberFingerprint } : {}),
      dpapiUnprotectSucceeded: true, hmacValid: true, generationMatch: true, identityMatch: true, hostMatch: true, sourceMatch: true, result: "VALID" });
    const signature = sign(null, Buffer.from(canonicalG2BJson(payload), "utf8"), privateKey).toString("base64");
    const attestationDigest = sha256G2BCanonical({ payload, signature });
    return Object.freeze({ ok: true, attestation: Object.freeze({ ...payload, publicKeyFingerprint, attestationSignature: signature, attestationDigest }) });
  } catch { return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_SIGNING_FAILED" }); }
}

export function verifyG2BCleanGenerationAttestation(value, { generationId, anchorEvidenceDigest, identityFingerprint,
  anchorFingerprint, memberFingerprint, sourceFingerprint, secretKeyId, environment = process.env, repositoryRoot = process.cwd(), now = Date.now() } = {}) {
  try {
    if (!value || value.schemaVersion !== G2B_CLEAN_ATTESTATION_SCHEMA || value.result !== "VALID"
      || value.generationId !== generationId || value.anchorEvidenceDigest !== anchorEvidenceDigest
      || value.identityFingerprint !== identityFingerprint || value.anchorFingerprint !== anchorFingerprint
      || (memberFingerprint !== undefined && value.memberFingerprint !== memberFingerprint)
      || value.sourceFingerprint !== sourceFingerprint || value.sourceFingerprint !== g2bHostAnchorSourceFingerprint({ repositoryRoot })
      || value.hostContextFingerprint !== g2bHostContextFingerprint(environment) || value.sourceFingerprintSchemaVersion !== 2
      || value.validationProvider !== "WINDOWS_DPAPI_CURRENT_USER" || value.validationEnvironment !== "TRUSTED_WINDOWS_HOST"
      || value.dpapiUnprotectSucceeded !== true || value.hmacValid !== true || value.generationMatch !== true
      || value.identityMatch !== true || value.hostMatch !== true || value.sourceMatch !== true
      || value.publicKeyFingerprint !== publicKeyFingerprint || value.secretKeyIdFingerprint !== createHash("sha256").update(secretKeyId || "").digest("hex")
      || !UUID.test(value.validationId || "") || !Number.isFinite(Date.parse(value.validatedAt))
      || now < Date.parse(value.validatedAt) || now - Date.parse(value.validatedAt) > G2B_CLEAN_ATTESTATION_TTL_MS) return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_BINDING_OR_FRESHNESS_FAILED" });
    const signatureCheck = verifyG2BCleanGenerationAttestationSignature(value);
    if (!signatureCheck.ok) return signatureCheck;
    return Object.freeze({ ok: true, ageMs: now - Date.parse(value.validatedAt) });
  } catch { return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_INVALID" }); }
}

export function buildG2BCleanGenerationAttestationV2({ secret, secretKeyId, generationId, anchorEvidenceDigest,
  identityFingerprint, anchorFingerprint, memberFingerprint, sourceFingerprint, sourceLockDigest, operationId,
  hostContextFingerprint: hostFingerprint, environment = process.env, repositoryRoot = process.cwd(),
  validationId = randomUUID(), issuedAt = new Date().toISOString(), expiresAt,
  nonce = randomUUID() } = {}) {
  const issuedMs = Date.parse(issuedAt);
  const expiry = expiresAt || (Number.isFinite(issuedMs) ? new Date(issuedMs + G2B_CLEAN_ATTESTATION_TTL_MS).toISOString() : "");
  const expiryMs = Date.parse(expiry);
  if (!Buffer.isBuffer(secret) || secret.length !== 32 || !UUID.test(secretKeyId || "") || !UUID.test(generationId || "")
    || !UUID.test(operationId || "") || !UUID.test(validationId || "") || !UUID.test(nonce || "")
    || ![anchorEvidenceDigest, identityFingerprint, anchorFingerprint, sourceFingerprint, sourceLockDigest, hostFingerprint]
      .every((item) => SHA256.test(item || "")) || !Number.isFinite(issuedMs) || !Number.isFinite(expiryMs)
    || expiryMs <= issuedMs || expiryMs - issuedMs > G2B_CLEAN_ATTESTATION_TTL_MS
    || hostFingerprint !== g2bHostContextFingerprint(environment)
    || sourceFingerprint !== g2bHostAnchorSourceFingerprint({ repositoryRoot })) {
    return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_V2_INPUT_INVALID" });
  }
  try {
    const signingCheck = validateG2BCleanGenerationSigningKey(secret);
    if (!signingCheck.ok) return signingCheck;
    const privateKey = createPrivateKey({ key: Buffer.concat([PRIVATE_KEY_PREFIX, secret]), format: "der", type: "pkcs8" });
    const payload = Object.freeze({ schemaVersion: G2B_CLEAN_ATTESTATION_V2_SCHEMA, validationId, nonce, issuedAt,
      expiresAt: expiry, validationProvider: "WINDOWS_DPAPI_CURRENT_USER", validationEnvironment: "TRUSTED_WINDOWS_HOST",
      generationId, anchorState: "ANCHOR_VERIFIED", anchorEvidenceDigest, identityFingerprint, anchorFingerprint,
      hostContextFingerprint: hostFingerprint, sourceFingerprintSchemaVersion: 2, sourceFingerprint, sourceLockDigest,
      operationId, secretKeyIdFingerprint: createHash("sha256").update(secretKeyId).digest("hex"),
      ...(memberFingerprint ? { memberFingerprint } : {}), dpapiUnprotectSucceeded: true, hmacValid: true,
      generationMatch: true, identityMatch: true, hostMatch: true, sourceMatch: true, result: "VALID" });
    const signature = sign(null, Buffer.from(canonicalG2BJson(payload), "utf8"), privateKey).toString("base64");
    const attestationDigest = sha256G2BCanonical({ payload, signature });
    return Object.freeze({ ok: true, attestation: Object.freeze({ ...payload, publicKeyFingerprint,
      attestationSignature: signature, attestationDigest }) });
  } catch { return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_SIGNING_FAILED" }); }
}

export function verifyG2BCleanGenerationAttestationV2(value, { generationId, anchorEvidenceDigest, identityFingerprint,
  anchorFingerprint, memberFingerprint, sourceFingerprint, sourceLockDigest, operationId, secretKeyId,
  hostContextFingerprint: expectedHostContextFingerprint, environment = process.env,
  repositoryRoot = process.cwd(), now = Date.now() } = {}) {
  try {
    if (!value || value.schemaVersion !== G2B_CLEAN_ATTESTATION_V2_SCHEMA || value.result !== "VALID"
      || value.generationId !== generationId || value.anchorState !== "ANCHOR_VERIFIED"
      || value.anchorEvidenceDigest !== anchorEvidenceDigest || value.identityFingerprint !== identityFingerprint
      || value.anchorFingerprint !== anchorFingerprint || value.sourceFingerprint !== sourceFingerprint
      || value.sourceFingerprint !== g2bHostAnchorSourceFingerprint({ repositoryRoot })
      || value.sourceLockDigest !== sourceLockDigest || value.operationId !== operationId
      || (memberFingerprint !== undefined && value.memberFingerprint !== memberFingerprint)
      || value.hostContextFingerprint !== expectedHostContextFingerprint
      || value.hostContextFingerprint !== g2bHostContextFingerprint(environment) || value.sourceFingerprintSchemaVersion !== 2
      || value.validationProvider !== "WINDOWS_DPAPI_CURRENT_USER" || value.validationEnvironment !== "TRUSTED_WINDOWS_HOST"
      || value.dpapiUnprotectSucceeded !== true || value.hmacValid !== true || value.generationMatch !== true
      || value.identityMatch !== true || value.hostMatch !== true || value.sourceMatch !== true
      || value.publicKeyFingerprint !== publicKeyFingerprint
      || value.secretKeyIdFingerprint !== createHash("sha256").update(secretKeyId || "").digest("hex")
      || !UUID.test(value.validationId || "") || !UUID.test(value.nonce || "")
      || !Number.isFinite(Date.parse(value.issuedAt)) || !Number.isFinite(Date.parse(value.expiresAt))
      || now < Date.parse(value.issuedAt) || now >= Date.parse(value.expiresAt)
      || Date.parse(value.expiresAt) - Date.parse(value.issuedAt) > G2B_CLEAN_ATTESTATION_TTL_MS) {
      return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_V2_BINDING_OR_FRESHNESS_FAILED" });
    }
    const signatureCheck = verifyG2BCleanGenerationAttestationSignature(value);
    return signatureCheck.ok ? Object.freeze({ ok: true, ageMs: now - Date.parse(value.issuedAt) }) : signatureCheck;
  } catch { return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_INVALID" }); }
}

export function verifyG2BCleanGenerationAttestationSignature(value) {
  try {
    const isV1 = value?.schemaVersion === G2B_CLEAN_ATTESTATION_SCHEMA;
    const isV2 = value?.schemaVersion === G2B_CLEAN_ATTESTATION_V2_SCHEMA;
    if (!value || (!isV1 && !isV2) || value.result !== "VALID"
      || !UUID.test(value.generationId || "") || !UUID.test(value.validationId || "")
      || (isV2 && (!UUID.test(value.operationId || "") || !UUID.test(value.nonce || "")
        || !SHA256.test(value.sourceLockDigest || "") || !Number.isFinite(Date.parse(value.issuedAt))
        || !Number.isFinite(Date.parse(value.expiresAt))))
      || !SHA256.test(value.attestationDigest || "") || value.publicKeyFingerprint !== publicKeyFingerprint
      || typeof value.attestationSignature !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.attestationSignature)) {
      return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_SIGNATURE_INPUT_INVALID" });
    }
    const payload = attestationPayload(value);
    if (sha256G2BCanonical({ payload, signature: value.attestationSignature }) !== value.attestationDigest
      || !verify(null, Buffer.from(canonicalG2BJson(payload), "utf8"), createPublicKey({ key: PUBLIC_KEY, format: "der", type: "spki" }), Buffer.from(value.attestationSignature, "base64"))) {
      return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_SIGNATURE_INVALID" });
    }
    return Object.freeze({ ok: true });
  } catch { return Object.freeze({ ok: false, code: "CLEAN_ATTESTATION_SIGNATURE_INVALID" }); }
}

export function writeG2BCleanGenerationAttestation(value, { directory, now = Date.now(), ...bindings } = {}) {
  const checked = verifyG2BCleanGenerationAttestation(value, { ...bindings, now });
  if (!checked.ok || typeof directory !== "string" || !directory.trim()) throw new Error("clean-attestation-not-valid");
  const path = resolve(directory, `${value.generationId}-${value.validationId}.json`);
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
      if (error?.code === "EEXIST") throw new Error("clean-attestation-artifact-collision");
      throw error;
    }
    unlinkSync(temporary);
    const persisted = JSON.parse(readFileSync(path, "utf8"));
    if (canonicalG2BJson(persisted) !== canonicalG2BJson(value)) throw new Error("clean-attestation-roundtrip-failed");
    return Object.freeze({ path, rawSha256: createHash("sha256").update(readFileSync(path)).digest("hex"), ageMs: checked.ageMs });
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export function writeG2BCleanGenerationAttestationV2(value, { directory, now = Date.now(), ...bindings } = {}) {
  const checked = verifyG2BCleanGenerationAttestationV2(value, { ...bindings, now });
  if (!checked.ok || typeof directory !== "string" || !directory.trim()) throw new Error("clean-attestation-v2-not-valid");
  const path = resolve(directory, `${value.generationId}-${value.operationId}-${value.validationId}-v2.json`);
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
      if (error?.code === "EEXIST") throw new Error("clean-attestation-artifact-collision");
      throw error;
    }
    unlinkSync(temporary);
    const bytes = readFileSync(path);
    if (canonicalG2BJson(JSON.parse(bytes.toString("utf8"))) !== canonicalG2BJson(value)) {
      throw new Error("clean-attestation-roundtrip-failed");
    }
    return Object.freeze({ path, rawSha256: createHash("sha256").update(bytes).digest("hex"), ageMs: checked.ageMs });
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}
