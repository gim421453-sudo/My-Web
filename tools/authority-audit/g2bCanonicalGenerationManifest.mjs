import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, unlinkSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";

export const G2B_CLEAN_MANIFEST_SCHEMA = "myweb.g2b.clean-generation-manifest.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[a-f0-9]{64}$/;

export function canonicalG2BJson(value) {
  return Array.isArray(value) ? `[${value.map(canonicalG2BJson).join(",")}]`
    : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalG2BJson(value[key])}`).join(",")}}`
      : JSON.stringify(value);
}

export function sha256G2BCanonical(value) {
  return createHash("sha256").update(canonicalG2BJson(value), "utf8").digest("hex");
}

function manifestPayload(value) {
  const { manifestDigest, ...payload } = value;
  return payload;
}

export function buildG2BCleanCanonicalManifest({ manifestVersion, canonicalGenerationId, anchorEvidenceDigest, identityFingerprint,
  hostContextFingerprint, sourceFingerprint, bootstrapIntentId, activatedAt, previousManifestDigest = null } = {}) {
  if (!Number.isSafeInteger(manifestVersion) || manifestVersion < 1 || !UUID.test(canonicalGenerationId || "")
    || !SHA256.test(anchorEvidenceDigest || "") || !SHA256.test(identityFingerprint || "")
    || !SHA256.test(hostContextFingerprint || "") || !SHA256.test(sourceFingerprint || "")
    || !UUID.test(bootstrapIntentId || "") || !Number.isFinite(Date.parse(activatedAt))
    || (manifestVersion === 1 ? previousManifestDigest !== null : !SHA256.test(previousManifestDigest || ""))) {
    throw new Error("clean-generation-manifest-input-invalid");
  }
  const payload = Object.freeze({ schemaVersion: G2B_CLEAN_MANIFEST_SCHEMA, manifestVersion, canonicalGenerationId,
    generationState: "ANCHOR_VERIFIED", anchorEvidenceDigest, identityFingerprint, hostContextFingerprint,
    sourceFingerprint, bootstrapIntentId, activatedAt, previousManifestDigest });
  return Object.freeze({ ...payload, manifestDigest: sha256G2BCanonical(payload) });
}

export function verifyG2BCleanCanonicalManifest(value) {
  try {
    if (!value || typeof value !== "object" || value.schemaVersion !== G2B_CLEAN_MANIFEST_SCHEMA
      || value.generationState !== "ANCHOR_VERIFIED" || !Number.isSafeInteger(value.manifestVersion)
      || !SHA256.test(value.manifestDigest || "") || sha256G2BCanonical(manifestPayload(value)) !== value.manifestDigest) return false;
    return buildG2BCleanCanonicalManifest(value).manifestDigest === value.manifestDigest;
  } catch { return false; }
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
      if (error?.code === "EEXIST") throw new Error("clean-manifest-artifact-collision");
      throw error;
    }
    unlinkSync(temporary);
    const persisted = JSON.parse(readFileSync(path, "utf8"));
    if (canonicalG2BJson(persisted) !== canonicalG2BJson(value)) throw new Error("clean-manifest-roundtrip-failed");
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export function createG2BCleanCanonicalManifestStore({ directory } = {}) {
  if (typeof directory !== "string" || !directory.trim()) throw new Error("clean-manifest-directory-required");
  const manifestPath = (version) => join(directory, `manifest-${String(version).padStart(8, "0")}.json`);
  const lockPath = join(directory, "activation.lock");
  function readChain() {
    if (!existsSync(directory)) return Object.freeze({ ok: true, manifests: Object.freeze([]), latest: null });
    let allNames;
    try { allNames = readdirSync(directory); }
    catch { return Object.freeze({ ok: false, code: "MANIFEST_DIRECTORY_UNREADABLE" }); }
    const names = allNames.filter((name) => /^manifest-[0-9]{8}\.json$/.test(name)).sort();
    if (allNames.some((name) => name !== "activation.lock" && !/^manifest-[0-9]{8}\.json$/.test(name))) {
      return Object.freeze({ ok: false, code: "MANIFEST_DIRECTORY_UNEXPECTED_ARTIFACT" });
    }
    const manifests = [];
    for (let i = 0; i < names.length; i += 1) {
      let value;
      try {
        const path = join(directory, names[i]);
        if (lstatSync(path).isSymbolicLink()) return Object.freeze({ ok: false, code: "MANIFEST_FILE_LINK_BLOCKED" });
        value = JSON.parse(readFileSync(path, "utf8"));
      } catch { return Object.freeze({ ok: false, code: "MANIFEST_FILE_INVALID" }); }
      const expectedVersion = i + 1;
      const previous = manifests.at(-1)?.manifestDigest ?? null;
      if (!verifyG2BCleanCanonicalManifest(value) || value.manifestVersion !== expectedVersion
        || value.previousManifestDigest !== previous || names[i] !== `manifest-${String(expectedVersion).padStart(8, "0")}.json`) {
        return Object.freeze({ ok: false, code: "MANIFEST_CHAIN_INVALID" });
      }
      manifests.push(Object.freeze(value));
    }
    return Object.freeze({ ok: true, manifests: Object.freeze(manifests), latest: manifests.at(-1) || null });
  }
  return Object.freeze({ directory, readChain,
    activate(candidate, { expectedPriorDigest = null, operationId, now = new Date().toISOString() } = {}) {
      if (!UUID.test(operationId || "")) return Object.freeze({ ok: false, code: "MANIFEST_OPERATION_INVALID" });
      mkdirSync(directory, { recursive: true });
      let lockFd;
      const lockValue = { operationId, acquiredAt: now, lockId: randomUUID() };
      try {
        lockFd = openSync(lockPath, "wx", 0o600);
        writeSync(lockFd, `${canonicalG2BJson(lockValue)}\n`, "utf8");
        fsyncSync(lockFd);
        closeSync(lockFd);
        lockFd = undefined;
      } catch (error) {
        if (lockFd !== undefined) closeSync(lockFd);
        return Object.freeze({ ok: false, code: error?.code === "EEXIST" ? "MANIFEST_LOCK_HELD" : "MANIFEST_LOCK_CREATE_FAILED" });
      }
      try {
        const chain = readChain();
        if (!chain.ok) return chain;
        const current = chain.latest;
        if ((current?.manifestDigest ?? null) !== expectedPriorDigest) return Object.freeze({ ok: false, code: "MANIFEST_CAS_CONFLICT" });
        if (current && current.canonicalGenerationId === candidate?.canonicalGenerationId) return Object.freeze({ ok: false, code: "MANIFEST_DUPLICATE_CANDIDATE" });
        let manifest;
        try { manifest = buildG2BCleanCanonicalManifest({ ...candidate, manifestVersion: (current?.manifestVersion ?? 0) + 1,
          previousManifestDigest: current?.manifestDigest ?? null, activatedAt: now }); }
        catch { return Object.freeze({ ok: false, code: "MANIFEST_CANDIDATE_INVALID" }); }
        const path = manifestPath(manifest.manifestVersion);
        try { createOnlyJson(path, manifest); } catch (error) { return Object.freeze({ ok: false, code: error.message === "clean-manifest-artifact-collision" ? error.message : "MANIFEST_PERSISTENCE_FAILED" }); }
        const verified = readChain();
        if (!verified.ok || verified.latest?.manifestDigest !== manifest.manifestDigest) return Object.freeze({ ok: false, code: "MANIFEST_POSTWRITE_VERIFICATION_FAILED" });
        return Object.freeze({ ok: true, manifest: verified.latest, path });
      } finally {
        try {
          const lock = JSON.parse(readFileSync(lockPath, "utf8"));
          if (lock.lockId === lockValue.lockId && lock.operationId === operationId) unlinkSync(lockPath);
        } catch { /* A lock that cannot be proven to be ours remains fail-closed. */ }
      }
    },
  });
}
