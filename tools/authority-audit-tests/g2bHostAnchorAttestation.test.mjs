import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildG2BHostAnchorAttestation,
  G2B_HOST_ANCHOR_ATTESTATION_SCHEMA,
  g2bHostAnchorAttestationPath,
  verifyG2BHostAnchorAttestation,
  writeG2BHostAnchorAttestation,
  g2bHostAnchorSourceFingerprint,
} from "../authority-audit/g2bHostAnchorAttestation.mjs";
import { canonicalSourceEntries, computeCanonicalSourceFingerprint, currentG2BCasSourceEntries, G2B_CAS_SOURCE_PATHS } from "../authority-audit/g2bCanonicalSourceFingerprint.mjs";
import { buildG2BCasEvidenceReadSourceLock } from "../authority-audit/g2bCasEvidenceCapture.mjs";

const root = mkdtempSync(join(tmpdir(), "myweb-host-anchor-attestation-"));
const operationGenerationId = "8b30e1da-8d4d-4ded-ad94-cf62aabcc981";
const secretKeyId = "ab30e1da-8d4d-4ded-ad94-cf62aabcc981";
const validationId = "ca30e1da-8d4d-4ded-ad94-cf62aabcc981";
const secret = Buffer.alloc(32, 31);
const environment = { USERNAME: "fixture-user", USERDOMAIN: "fixture-domain", USERPROFILE: "C:\\Users\\fixture", COMPUTERNAME: "fixture-host" };
const anchorRecord = {
  operationGenerationId,
  secretKeyId,
  anchorState: "ANCHOR_VERIFIED",
  anchorDigest: "a".repeat(64),
  integrityDigest: "b".repeat(64),
};
try {
  const sourceEntries = currentG2BCasSourceEntries({ repositoryRoot: process.cwd() });
  const expected = computeCanonicalSourceFingerprint(sourceEntries);
  assert.equal(sourceEntries.length, G2B_CAS_SOURCE_PATHS.length);
  const withoutFingerprintDefinition = sourceEntries.filter((entry) => entry.path !== "tools/authority-audit/g2bCanonicalSourceFingerprint.mjs");
  assert.equal(withoutFingerprintDefinition.length, G2B_CAS_SOURCE_PATHS.length - 1);
  assert.match(computeCanonicalSourceFingerprint(withoutFingerprintDefinition), /^[a-f0-9]{64}$/);
  for (let index = 0; index < 100; index++) {
    assert.equal(computeCanonicalSourceFingerprint(index % 2 ? [...sourceEntries].reverse() : sourceEntries), expected);
  }
  assert.equal(computeCanonicalSourceFingerprint(sourceEntries.map(({ path, sha256 }) => ({ sha256, path: path.replaceAll("/", "\\"), mtime: 1 }))), expected);
  assert.equal(computeCanonicalSourceFingerprint(JSON.parse(JSON.stringify(sourceEntries))), expected);
  assert.equal(g2bHostAnchorSourceFingerprint({ repositoryRoot: process.cwd() }), expected);
  const lock = buildG2BCasEvidenceReadSourceLock({ repositoryRoot: process.cwd(), operationInstance: operationGenerationId });
  assert.equal(lock.ok, true);
  assert.equal(lock.sourceFingerprint, expected);
  assert.equal(computeCanonicalSourceFingerprint(lock.sourceLock.sourceLocks), expected);
  assert.notEqual(computeCanonicalSourceFingerprint(sourceEntries.slice(1)), expected);
  assert.notEqual(computeCanonicalSourceFingerprint([...sourceEntries, { path: "new-dependency.mjs", sha256: "0".repeat(64) }]), expected);
  assert.notEqual(computeCanonicalSourceFingerprint(sourceEntries.map((entry, index) => index ? entry : { ...entry, sha256: "0".repeat(64) })), expected);
  assert.notEqual(computeCanonicalSourceFingerprint(sourceEntries.map((entry, index) => index ? entry : { ...entry, path: `renamed/${entry.path}` })), expected);
  assert.throws(() => canonicalSourceEntries([...sourceEntries, sourceEntries[0]]), /duplicate-source-path/);
  assert.throws(() => canonicalSourceEntries([{ path: "C:\\absolute", sha256: "0".repeat(64) }]), /source-path-invalid/);
  assert.throws(() => canonicalSourceEntries([{ path: "file", sha256: "A".repeat(64) }]), /source-hash-invalid/);
  const built = buildG2BHostAnchorAttestation({
    secret, secretKeyId, generationId: operationGenerationId,
    account: "operator@example.invalid", member: "serviceAccount:writer@example.invalid",
    anchorRecord, environment, repositoryRoot: process.cwd(), validationId,
    validatedAt: "2026-09-24T00:00:00.000Z",
  });
  assert.equal(built.ok, false, "fixture keys cannot impersonate the pinned host DPAPI signer");
  assert.equal(built.code, "HOST_ATTESTATION_SIGNING_KEY_MISMATCH");
  for (const terminalState of ["RECOVERY_CONFIRMED_ABSENT", "RECOVERY_CONFIRMED_PRESENT", "RECOVERY_AMBIGUOUS", "RECOVERY_FAILED", "ENVIRONMENT_BLOCKED"]) {
    const terminal = buildG2BHostAnchorAttestation({
      secret, secretKeyId, generationId: operationGenerationId,
      account: "operator@example.invalid", member: "serviceAccount:writer@example.invalid",
      anchorRecord: { ...anchorRecord, anchorState: terminalState },
      environment, repositoryRoot: process.cwd(), validationId,
      validatedAt: "2026-09-24T00:00:00.000Z",
    });
    assert.equal(terminal.ok, false, `${terminalState} is not an eligible attestation parent`);
    assert.equal(terminal.code, "HOST_ANCHOR_ATTESTATION_INPUT_INVALID", terminalState);
  }
  const attestation = {
    schemaVersion: G2B_HOST_ANCHOR_ATTESTATION_SCHEMA,
    validationId,
    validatedAt: "2026-09-24T00:00:00.000Z",
    validationProvider: "WINDOWS_DPAPI_CURRENT_USER",
    validationEnvironment: "TRUSTED_WINDOWS_HOST",
    userContextFingerprint: "0".repeat(64),
    machineContextFingerprint: "0".repeat(64),
    generationId: operationGenerationId,
    pinnedIdentityFingerprint: "0".repeat(64),
    anchorFingerprint: "0".repeat(64),
    secretKeyIdFingerprint: "0".repeat(64),
    sourceFingerprint: "0".repeat(64),
    unprotectSucceeded: true,
    generationBindingSucceeded: true,
    identityBindingSucceeded: true,
    anchorValidationSucceeded: true,
    result: "VALID",
    publicKeyFingerprint: "0".repeat(64),
    attestationSignature: "AA==",
    attestationDigest: "0".repeat(64),
  };
  const base = { secretKeyId, generationId: operationGenerationId, account: "operator@example.invalid", member: "serviceAccount:writer@example.invalid", anchorRecord, environment, repositoryRoot: process.cwd(), now: Date.parse("2026-09-24T00:01:00.000Z") };
  assert.notEqual(verifyG2BHostAnchorAttestation(attestation, base).result, "VALID", "unsigned fixture fails closed");
  assert.notEqual(verifyG2BHostAnchorAttestation(attestation, { ...base, now: Date.parse("2026-09-24T00:03:00.001Z") }).result, "VALID", "stale attestation fails closed");
  assert.notEqual(verifyG2BHostAnchorAttestation(attestation, { ...base, generationId: "9b30e1da-8d4d-4ded-ad94-cf62aabcc981" }).result, "VALID", "wrong generation fails closed");
  assert.notEqual(verifyG2BHostAnchorAttestation(attestation, { ...base, member: "serviceAccount:other@example.invalid" }).result, "VALID", "wrong identity fails closed");
  assert.notEqual(verifyG2BHostAnchorAttestation({ ...attestation, result: "ENVIRONMENT_BLOCKED" }, base).result, "VALID");
  const path = g2bHostAnchorAttestationPath({ directory: root, generationId: operationGenerationId, validationId });
  assert.throws(() => writeG2BHostAnchorAttestation(attestation, path), /host-attestation-not-valid/);
  assert.throws(() => g2bHostAnchorAttestationPath({ directory: root, generationId: "bad", validationId }), /host-attestation-path-input-invalid/);
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log("G2B host anchor attestation rejects untrusted fixture keys and invalid, stale, mismatched or unsigned artifacts; remote calls=0");
