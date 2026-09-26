import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { buildG2BHostAnchorAttestation, classifyG2BHostAnchorAttestationFreshness, verifyG2BHostAnchorAttestation, writeG2BHostAnchorAttestation, g2bHostAnchorAttestationPath } from "../authority-audit/g2bHostAnchorAttestation.mjs";
import { G2B_CAS_SOURCE_PATHS } from "../authority-audit/g2bCanonicalSourceFingerprint.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "../authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs";
import { resolveG2BRecoveryV3R2Context } from "../authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R2.mjs";

const root = process.cwd();
const directory = mkdtempSync(join(tmpdir(), "myweb-host-anchor-integration-"));
try {
  const host = resolveG2BRecoveryV3R2Context({ repositoryRoot: root });
  assert.equal(host.ok, true, "trusted Windows host must validate current DPAPI anchor");
  const identity = host.context.identityContext;
  const loaded = host.context.store.load(G2B_INTERRUPTED_M3_GENERATION);
  const secret = host.context.secretProvider.read();
  assert.equal(loaded.state, "READY");
  assert.equal(secret.state, "READY");
  const signingSecret = secret.secret;
  const common = {
    secret: signingSecret,
    secretKeyId: secret.keyId,
    generationId: loaded.record.operationGenerationId,
    account: identity.exactPrincipal,
    member: identity.exactIamMember,
    anchorRecord: loaded.record,
    repositoryRoot: root,
  };
  const built = buildG2BHostAnchorAttestation(common);
  const staleBuilt = buildG2BHostAnchorAttestation({ ...common, validationId: randomUUID(), validatedAt: new Date(Date.now() - 180_000).toISOString() });
  const changedRoot = join(directory, "changed-source");
  for (const relativePath of G2B_CAS_SOURCE_PATHS) {
    const destination = resolve(changedRoot, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(resolve(root, relativePath), destination);
  }
  appendFileSync(resolve(changedRoot, G2B_CAS_SOURCE_PATHS[0]), "\n");
  const oldSourceBuilt = buildG2BHostAnchorAttestation({ ...common, repositoryRoot: changedRoot, validationId: randomUUID() });
  signingSecret.fill(0);
  assert.equal(built.ok, true, built.code);
  assert.equal(staleBuilt.ok, true, staleBuilt.code);
  assert.equal(oldSourceBuilt.ok, true, oldSourceBuilt.code);
  const attestation = built.attestation;
  const verifyInput = { secretKeyId: secret.keyId, generationId: loaded.record.operationGenerationId, account: identity.exactPrincipal, member: identity.exactIamMember, anchorRecord: loaded.record, repositoryRoot: root };
  assert.equal(verifyG2BHostAnchorAttestation(attestation, verifyInput).result, "VALID");
  assert.equal(verifyG2BHostAnchorAttestation(staleBuilt.attestation, verifyInput).ok, false, "stale signed attestation fails closed");
  const staleDirectory = join(directory, "stale-only");
  const stalePath = g2bHostAnchorAttestationPath({ directory: staleDirectory, generationId: loaded.record.operationGenerationId, validationId: staleBuilt.attestation.validationId });
  writeG2BHostAnchorAttestation(staleBuilt.attestation, stalePath);
  const expiredOnly = classifyG2BHostAnchorAttestationFreshness({ directory: staleDirectory, ...verifyInput });
  assert.equal(expiredOnly.state, "ATTESTATION_EXPIRED_ONLY");
  assert.equal(expiredOnly.boundCandidateCount, 1);
  const oldSourceDirectory = join(directory, "old-source-only");
  writeG2BHostAnchorAttestation(oldSourceBuilt.attestation, g2bHostAnchorAttestationPath({ directory: oldSourceDirectory,
    generationId: loaded.record.operationGenerationId, validationId: oldSourceBuilt.attestation.validationId }));
  const sourceMismatch = classifyG2BHostAnchorAttestationFreshness({ directory: oldSourceDirectory, ...verifyInput });
  assert.equal(sourceMismatch.state, "SOURCE_FINGERPRINT_MISMATCH");
  assert.equal(sourceMismatch.bindingStates.signature, "VALID");
  const invalidDirectory = join(directory, "invalid-signature");
  mkdirSync(invalidDirectory, { recursive: true });
  writeFileSync(g2bHostAnchorAttestationPath({ directory: invalidDirectory, generationId: loaded.record.operationGenerationId,
    validationId: attestation.validationId }), JSON.stringify({ ...attestation, result: "INVALID" }));
  assert.equal(classifyG2BHostAnchorAttestationFreshness({ directory: invalidDirectory, ...verifyInput }).state, "SIGNATURE_INVALID");
  const mismatch = classifyG2BHostAnchorAttestationFreshness({ directory: staleDirectory, ...verifyInput, member: "serviceAccount:other@example.invalid" });
  assert.equal(mismatch.state, "IDENTITY_MISMATCH", "binding mismatch is never reclassified as expiry-only");
  assert.equal(verifyG2BHostAnchorAttestation(attestation, { ...verifyInput, generationId: randomUUID() }).ok, false);
  assert.equal(verifyG2BHostAnchorAttestation(attestation, { ...verifyInput, member: "serviceAccount:other@example.invalid" }).ok, false);
  assert.equal(verifyG2BHostAnchorAttestation(attestation, { ...verifyInput, anchorRecord: { ...loaded.record, anchorDigest: "0".repeat(64) } }).ok, false);
  assert.equal(verifyG2BHostAnchorAttestation(attestation, { ...verifyInput, environment: { ...process.env, USERNAME: "different-user" } }).ok, false);
  const path = g2bHostAnchorAttestationPath({ directory, generationId: loaded.record.operationGenerationId, validationId: attestation.validationId });
  writeG2BHostAnchorAttestation(attestation, path);
  const freshPath = g2bHostAnchorAttestationPath({ directory: staleDirectory, generationId: loaded.record.operationGenerationId, validationId: attestation.validationId });
  writeG2BHostAnchorAttestation(attestation, freshPath);
  writeG2BHostAnchorAttestation(oldSourceBuilt.attestation, g2bHostAnchorAttestationPath({ directory: staleDirectory,
    generationId: loaded.record.operationGenerationId, validationId: oldSourceBuilt.attestation.validationId }));
  const selected = classifyG2BHostAnchorAttestationFreshness({ directory: staleDirectory, ...verifyInput });
  assert.equal(selected.state, "FRESH");
  assert.equal(selected.boundCandidateCount, 2);

  const blocked = resolveG2BRecoveryV3R2Context({
    operationInstance: "0cbb52f9-9dc6-45aa-9a47-a4a41d23f069",
    identityContext: identity,
    secretProvider: { read: () => ({ state: "ENVIRONMENT_BLOCKED" }) },
    store: host.context.store,
    repositoryRoot: root,
    attestationDirectory: directory,
  });
  assert.equal(blocked.ok, true, blocked.code);
  assert.equal(blocked.context.anchorValidationSource, "FRESH_HOST_ATTESTATION");

  const missing = resolveG2BRecoveryV3R2Context({
    identityContext: identity,
    secretProvider: { read: () => ({ state: "ENVIRONMENT_BLOCKED" }) },
    store: host.context.store,
    repositoryRoot: root,
    attestationDirectory: join(directory, "missing"),
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.attestationCode, "HOST_ATTESTATION_MISSING");

  const resolverStaleDirectory = join(directory, "resolver-stale-only");
  writeG2BHostAnchorAttestation(staleBuilt.attestation, g2bHostAnchorAttestationPath({ directory: resolverStaleDirectory,
    generationId: loaded.record.operationGenerationId, validationId: staleBuilt.attestation.validationId }));
  const staleBoundContext = resolveG2BRecoveryV3R2Context({
    operationInstance: "1e7a6b2d-34ec-4ebf-81a0-9ecafcc0f069",
    identityContext: identity,
    secretProvider: { read: () => ({ state: "ENVIRONMENT_BLOCKED" }) },
    store: host.context.store,
    repositoryRoot: root,
    attestationDirectory: resolverStaleDirectory,
    allowExpiredAttestationForExecution: true,
  });
  assert.equal(staleBoundContext.ok, true, staleBoundContext.code);
  assert.equal(staleBoundContext.context.expiredAttestationOnly, true);

  const identityMismatch = resolveG2BRecoveryV3R2Context({
    identityContext: Object.freeze(Object.defineProperties({}, {
      exactPrincipal: { value: "different@example.invalid", enumerable: false },
      exactIamMember: { value: "serviceAccount:different@example.invalid", enumerable: false },
    })),
    secretProvider: { read: () => ({ state: "ENVIRONMENT_BLOCKED" }) },
    store: host.context.store,
    repositoryRoot: root,
    attestationDirectory: directory,
  });
  assert.equal(identityMismatch.ok, false);
  assert.equal(identityMismatch.code, "RECOVERY_V3R2_ANCHOR_ENVIRONMENT_BLOCKED");

  const invalidCurrentHost = resolveG2BRecoveryV3R2Context({
    identityContext: identity,
    secretProvider: { read: () => ({ state: "READY", secret: Buffer.alloc(32, 99), keyId: secret.keyId }) },
    store: host.context.store,
    repositoryRoot: root,
    attestationDirectory: directory,
  });
  assert.equal(invalidCurrentHost.ok, false, "actual current-host invalid state overrides valid historical attestation");
  assert.equal(invalidCurrentHost.code, "RECOVERY_V3R2_ANCHOR_NOT_VERIFIED");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log("G2B trusted-host attestation and sandbox EPERM fallback passed; remote calls=0");
