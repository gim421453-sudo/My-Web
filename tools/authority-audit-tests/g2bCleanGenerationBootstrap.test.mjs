import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildG2BRecoveryAnchor, verifyG2BRecoveryAnchor, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { G2B_CAS_SOURCE_PATHS } from "../authority-audit/g2bCanonicalSourceFingerprint.mjs";
import { createG2BCleanCanonicalManifestStore, sha256G2BCanonical, verifyG2BCleanCanonicalManifest } from "../authority-audit/g2bCanonicalGenerationManifest.mjs";
import { buildG2BCleanGenerationAttestation, buildG2BCleanGenerationAttestationV2,
  validateG2BCleanGenerationSigningKey, verifyG2BCleanGenerationAttestationV2 } from "../authority-audit/g2bCleanGenerationAttestation.mjs";
import { g2bHostAnchorSourceFingerprint, g2bHostContextFingerprint } from "../authority-audit/g2bHostAnchorAttestation.mjs";
import {
  buildG2BCleanBootstrapIntent,
  buildG2BCleanBootstrapIntentV2,
  buildG2BCleanHistoricalPolicy,
  buildG2BCleanCasReadPacket,
  buildG2BCleanCasReadPacketV4,
  buildG2BCleanSourceLock,
  classifyG2BCleanBootstrapRecovery,
  createG2BCleanGenerationStore,
  evaluateG2BCleanBootstrapTrustedHostPrecondition,
  resolveG2BCanonicalAuthorityStorePaths,
  resolveG2BCleanCanonicalGeneration,
  verifyG2BCleanBootstrapIntent,
  verifyG2BCleanCasReadPacket,
} from "../authority-audit/g2bCleanGenerationBootstrap.mjs";

const root = mkdtempSync(join(tmpdir(), "myweb-clean-bootstrap-"));
const generationId = randomUUID();
const bootstrapIntentId = randomUUID();
const operationId = randomUUID();
const sourceFingerprint = "1".repeat(64);
const identityFingerprint = "2".repeat(64);
const hostFingerprint = "3".repeat(64);
const anchorMaterialFingerprint = "4".repeat(64);
const input = { sourceFingerprint, identityFingerprint, hostContextFingerprint: hostFingerprint, anchorMaterialReferenceFingerprint: anchorMaterialFingerprint };
const now = "2026-09-25T12:00:00.000Z";
const canonicalStorePaths = resolveG2BCanonicalAuthorityStorePaths({ environment: { LOCALAPPDATA: "C:\\Users\\Fixture\\AppData\\Local" } });
assert.equal(canonicalStorePaths.ok, true);
assert.equal(canonicalStorePaths.root, "C:\\Users\\Fixture\\AppData\\Local\\MY-WEB\\authority-audit\\clean-generations-v1");
assert.equal(canonicalStorePaths.manifestDirectory, join(canonicalStorePaths.root, "canonical-manifests"));
assert.equal(canonicalStorePaths.attestationDirectory, join(canonicalStorePaths.root, "attestations"));
assert.equal(canonicalStorePaths.source, "CURRENT_USER_LOCALAPPDATA");
const explicitTestStore = resolveG2BCanonicalAuthorityStorePaths({ environment: {}, explicitRoot: root });
assert.equal(explicitTestStore.ok, true);
assert.equal(explicitTestStore.root, root);
assert.equal(explicitTestStore.source, "EXPLICIT_STORE_OVERRIDE");
assert.equal(resolveG2BCanonicalAuthorityStorePaths({ environment: {} }).ok, false);
const intent = buildG2BCleanBootstrapIntent({ bootstrapIntentId, operationId, generationId, input, createdAt: now });
const secret = Buffer.alloc(32, 11);
const secretKeyId = randomUUID();
const bootstrapImplementation = readFileSync(new URL("../authority-audit/g2bCleanGenerationBootstrap.mjs", import.meta.url), "utf8");
const member = "serviceAccount:writer@example.invalid";
assert.equal(validateG2BCleanGenerationSigningKey(secret).code, "CLEAN_ATTESTATION_SIGNING_KEY_MISMATCH");

const trustedHostInputs = {
  platform: "win32",
  provider: { semantic: "WINDOWS_DPAPI_CURRENT_USER_LOCAL_APPDATA_V1" },
  identity: { exactPrincipal: "writer@example.invalid", exactIamMember: member },
  artifactDirectory: "C:\\fixture\\bootstrap",
  attestationDirectory: "C:\\fixture\\bootstrap\\attestations",
  sourceLockOutput: "C:\\fixture\\evidence\\source-lock.json",
  packetOutput: "C:\\fixture\\evidence\\read-packet.json",
  executionEvidenceOutput: "C:\\fixture\\evidence\\execution-evidence.json",
  environment: { USERNAME: "fixture", USERDOMAIN: "fixture", USERPROFILE: "C:\\fixture", COMPUTERNAME: "fixture-host" },
};
const trustedHostPass = evaluateG2BCleanBootstrapTrustedHostPrecondition(trustedHostInputs);
assert.equal(trustedHostPass.ok, true, "all required production-gate leaves passing implies aggregate pass");
assert.equal(trustedHostPass.failures.length, 0);
for (const [leaf, change, expectedCode] of [
  ["platform", { platform: "linux" }, "TRUSTED_HOST_CONTEXT_INVALID"],
  ["dpapiProviderSemantic", { provider: { semantic: "wrong" } }, "TRUSTED_HOST_DPAPI_INVALID"],
  ["identityPrincipalPresent", { identity: { exactPrincipal: "", exactIamMember: member } }, "TRUSTED_HOST_IDENTITY_INVALID"],
  ["identityMemberPresent", { identity: { exactPrincipal: "writer@example.invalid", exactIamMember: "" } }, "TRUSTED_HOST_IDENTITY_INVALID"],
  ["artifactDirectoryPresent", { artifactDirectory: "" }, "TRUSTED_HOST_SCHEMA_INVALID"],
  ["attestationDirectoryPresent", { attestationDirectory: "" }, "TRUSTED_HOST_SCHEMA_INVALID"],
  ["sourceLockOutputPresent", { sourceLockOutput: "" }, "TRUSTED_HOST_SCHEMA_INVALID"],
  ["packetOutputPresent", { packetOutput: "" }, "TRUSTED_HOST_SCHEMA_INVALID"],
  ["executionEvidenceOutputPresent", { executionEvidenceOutput: "" }, "TRUSTED_HOST_SCHEMA_INVALID"],
  ["outputsDistinct", { packetOutput: trustedHostInputs.sourceLockOutput }, "TRUSTED_HOST_SCHEMA_INVALID"],
  ["outputsDistinct", { executionEvidenceOutput: trustedHostInputs.packetOutput }, "TRUSTED_HOST_SCHEMA_INVALID"],
  ["environment.USERNAME", { environment: { ...trustedHostInputs.environment, USERNAME: "" } }, "TRUSTED_HOST_CONTEXT_INVALID"],
  ["environment.USERDOMAIN", { environment: { ...trustedHostInputs.environment, USERDOMAIN: "" } }, "TRUSTED_HOST_CONTEXT_INVALID"],
  ["environment.USERPROFILE", { environment: { ...trustedHostInputs.environment, USERPROFILE: "" } }, "TRUSTED_HOST_CONTEXT_INVALID"],
  ["environment.COMPUTERNAME", { environment: { ...trustedHostInputs.environment, COMPUTERNAME: "" } }, "TRUSTED_HOST_CONTEXT_INVALID"],
]) {
  const evaluation = evaluateG2BCleanBootstrapTrustedHostPrecondition({ ...trustedHostInputs, ...change });
  assert.equal(evaluation.ok, false, leaf + " failure blocks aggregate");
  assert.deepEqual(evaluation.failures.map((failure) => failure.name), [leaf]);
  assert.equal(evaluation.failureCode, expectedCode);
  assert.equal(evaluation.failures[0].normalizedBoolean, false);
}
const coercionGate = evaluateG2BCleanBootstrapTrustedHostPrecondition({
  ...trustedHostInputs,
  environment: { ...trustedHostInputs.environment, USERNAME: "false" },
});
assert.equal(coercionGate.ok, true, "nonempty environment strings retain the production gate's explicit string contract");
const missingGate = evaluateG2BCleanBootstrapTrustedHostPrecondition({
  ...trustedHostInputs,
  environment: { ...trustedHostInputs.environment, USERNAME: undefined },
});
assert.equal(missingGate.ok, false, "missing required environment input fails closed");
assert.equal(missingGate.failures[0].name, "environment.USERNAME");

try {
  assert.equal(verifyG2BCleanBootstrapIntent(intent), true);
  const policyStore = createG2BCleanGenerationStore({ directory: join(root, "policy-store") });
  const policy = buildG2BCleanHistoricalPolicy({ generationStore: policyStore });
  const v2Input = { ...input, memberFingerprint: sha256G2BCanonical({ member }) };
  const v2Intent = buildG2BCleanBootstrapIntentV2({ bootstrapIntentId: randomUUID(), operationId: randomUUID(),
    generationId: randomUUID(), input: v2Input, historicalPolicy: policy, createdAt: now });
  assert.equal(v2Intent.schemaVersion, "myweb.g2b.clean-generation-bootstrap-intent.v2");
  assert.equal(v2Intent.historicalPolicyDigest, sha256G2BCanonical(policy));
  assert.equal(verifyG2BCleanBootstrapIntent(v2Intent), true);
  assert.equal(verifyG2BCleanBootstrapIntent({ ...v2Intent, historicalPolicyDigest: "0".repeat(64) }), false);
  assert.equal(verifyG2BCleanBootstrapIntent({ ...v2Intent, historicalPolicyDigest: undefined }), false);
  assert.equal(verifyG2BCleanBootstrapIntent({ ...v2Intent, historicalPolicy: { ...policy,
    ineligibleGenerationIds: [randomUUID(), randomUUID()] } }), false);
  assert.equal(verifyG2BCleanBootstrapIntent({ ...v2Intent, input: { ...v2Input, memberFingerprint: "0".repeat(64) } }), false);
  assert.equal(verifyG2BCleanBootstrapIntent({ ...v2Intent, packetSchemaVersion: "myweb.g2b.clean-generation.cas-read-packet.v3" }), false);
  assert.throws(() => buildG2BCleanBootstrapIntentV2({ bootstrapIntentId: randomUUID(), operationId: randomUUID(),
    generationId: randomUUID(), input, historicalPolicy: policy, createdAt: now }), /v2-input-invalid/);
  const reversedPolicy = { ...policy, historicalGenerationIds: [...policy.historicalGenerationIds].reverse() };
  assert.throws(() => buildG2BCleanBootstrapIntentV2({ bootstrapIntentId: randomUUID(), operationId: randomUUID(),
    generationId: randomUUID(), input: v2Input, historicalPolicy: reversedPolicy, createdAt: now }), /v2-input-invalid/);
  const { inputDigest: _currentIntentDigest, ...intentPayload } = intent;
  const historicalIntentPayload = { ...intentPayload,
    historicalGenerationIds: ["214348c8-3be0-44f8-a010-adbe1ac68090", "8b30e1da-8d4d-4ded-ad94-cf62aabcc981"] };
  assert.equal(verifyG2BCleanBootstrapIntent({ ...historicalIntentPayload,
    inputDigest: sha256G2BCanonical(historicalIntentPayload) }), true,
  "immutable intents validate their own historical list instead of today's expanded list");
  const duplicateHistoryPayload = { ...historicalIntentPayload,
    historicalGenerationIds: ["214348c8-3be0-44f8-a010-adbe1ac68090", "214348c8-3be0-44f8-a010-adbe1ac68090"] };
  assert.equal(verifyG2BCleanBootstrapIntent({ ...duplicateHistoryPayload,
    inputDigest: sha256G2BCanonical(duplicateHistoryPayload) }), false, "historical intent list must be unique");
  assert.equal(intent.historicalLineageStatus, "UNRESOLVED");
  assert.equal(intent.parentGenerationId, undefined);
  assert.throws(() => buildG2BCleanBootstrapIntent({ bootstrapIntentId: randomUUID(), operationId: randomUUID(),
    generationId: "214348c8-3be0-44f8-a010-adbe1ac68090", input, createdAt: now }), /clean-bootstrap-intent-input-invalid/);
  assert.throws(() => buildG2BCleanBootstrapIntent({ bootstrapIntentId: randomUUID(), operationId: randomUUID(),
    generationId: randomUUID(), input: { ...input, rawMember: member }, createdAt: now }), /clean-bootstrap-intent-input-invalid/);

  const store = createG2BCleanGenerationStore({ directory: join(root, "ledger") });
  const intentArtifact = store.createIntent(intent);
  assert.ok(intentArtifact.rawSha256);
  assert.equal(store.createIntent(intent).reused, true);
  const changedIntent = buildG2BCleanBootstrapIntent({ bootstrapIntentId, operationId, generationId,
    input: { ...input, sourceFingerprint: "9".repeat(64) }, createdAt: now });
  assert.throws(() => store.createIntent(changedIntent), /CLEAN_BOOTSTRAP_EXISTING_ARTIFACT_MISMATCH/);
  const record = buildG2BRecoveryAnchor({ member, secret, secretKeyId, operationGenerationId: generationId, now });
  const created = store.createGeneration({ intent, anchorRecord: record, ...input, createdAt: now });
  assert.equal(created.record.initialAnchorState, "ANCHOR_PERSISTED");
  assert.equal(created.record.parentGenerationId, null);
  assert.equal(created.persistedEvidence.newState, "ANCHOR_PERSISTED");
  const resumed = store.createGeneration({ intent, anchorRecord: record, ...input, createdAt: now });
  assert.equal(resumed.recordArtifact.reused, true, "candidate creation is idempotent only for the exact immutable record");
  assert.equal(resumed.anchorArtifact.reused, true);
  const verification = verifyG2BRecoveryAnchor({ record, member, secret, secretKeyId });
  assert.equal(verification.ok, true);
  const failedAttempt = store.recordVerificationAttempt({ generationId, intent, identityFingerprint,
    hostContextFingerprint: hostFingerprint, sourceFingerprint,
    verification: { ok: false, state: "MEMBER_ABSENT_CONFIRMED" }, attemptedAt: now });
  assert.equal(failedAttempt.evidence.validationResult, "FAIL");
  const passingAttempt = store.recordVerificationAttempt({ generationId, intent, identityFingerprint,
    hostContextFingerprint: hostFingerprint, sourceFingerprint, verification, attemptedAt: now });
  assert.equal(passingAttempt.evidence.validationResult, "PASS");
  assert.equal(store.candidates().length, 1, "append-only verification attempts are accepted as safe candidate evidence");
  assert.throws(() => store.recordVerifiedEvent({ generationId, intent, anchorRecord: record, identityFingerprint: "f".repeat(64),
    hostContextFingerprint: hostFingerprint, sourceFingerprint, verification, verifiedAt: now }), /CLEAN_ANCHOR_VERIFICATION_BLOCKED/);
  assert.throws(() => store.recordVerifiedEvent({ generationId, intent, anchorRecord: record, identityFingerprint,
    hostContextFingerprint: hostFingerprint, sourceFingerprint, verification: { ok: false, state: "MEMBER_ABSENT_CONFIRMED" }, verifiedAt: now }),
  /CLEAN_ANCHOR_VERIFICATION_BLOCKED/);
  const verified = store.recordVerifiedEvent({ generationId, intent, anchorRecord: record, ...input, verification, verifiedAt: now });
  assert.equal(verified.evidence.previousState, "ANCHOR_PERSISTED");
  assert.equal(verified.evidence.newState, "ANCHOR_VERIFIED");
  assert.equal(verified.anchorRecord.anchorState, "ANCHOR_VERIFIED");
  assert.equal(store.recordVerifiedEvent({ generationId, intent, anchorRecord: record, ...input, verification,
    verifiedAt: "2026-09-25T12:01:00.000Z" }).evidence.evidenceDigest, verified.evidence.evidenceDigest,
  "re-verification accepts the immutable verified event only after freshly validating the same anchor");

  const manifestStore = createG2BCleanCanonicalManifestStore({ directory: join(root, "manifests") });
  const activated = manifestStore.activate({ canonicalGenerationId: generationId, anchorEvidenceDigest: verified.evidence.evidenceDigest,
    identityFingerprint, hostContextFingerprint: hostFingerprint, sourceFingerprint, bootstrapIntentId }, { expectedPriorDigest: null, operationId, now });
  assert.equal(activated.ok, true);
  assert.equal(manifestStore.readChain().latest.canonicalGenerationId, generationId);
  const firstManifestPath = join(root, "manifests", "manifest-00000001.json");
  const firstManifestBytes = readFileSync(firstManifestPath);
  const nextManifestGenerationId = randomUUID();
  const appended = manifestStore.activate({ canonicalGenerationId: nextManifestGenerationId,
    anchorEvidenceDigest: "9".repeat(64), identityFingerprint, hostContextFingerprint: hostFingerprint,
    sourceFingerprint: "8".repeat(64), bootstrapIntentId: randomUUID() }, {
    expectedPriorDigest: activated.manifest.manifestDigest, operationId: randomUUID(), now,
  });
  assert.equal(appended.ok, true, "a clean candidate can append a new manifest revision with an exact predecessor CAS");
  assert.equal(appended.manifest.manifestVersion, 2);
  assert.equal(appended.manifest.previousManifestDigest, activated.manifest.manifestDigest);
  assert.equal(readFileSync(firstManifestPath).equals(firstManifestBytes), true, "revision append must not rewrite v1");
  assert.equal(manifestStore.readChain().manifests.length, 2);
  assert.equal(manifestStore.activate({ canonicalGenerationId: randomUUID(), anchorEvidenceDigest: "a".repeat(64),
    identityFingerprint, hostContextFingerprint: hostFingerprint, sourceFingerprint, bootstrapIntentId }, {
    expectedPriorDigest: activated.manifest.manifestDigest, operationId: randomUUID(), now,
  }).code, "MANIFEST_CAS_CONFLICT", "a stale predecessor cannot append or replace the latest revision");
  assert.equal(verifyG2BCleanCanonicalManifest({ ...activated.manifest, sourceFingerprint: "f".repeat(64) }), false);
  assert.equal(manifestStore.activate({ canonicalGenerationId: randomUUID(), anchorEvidenceDigest: verified.evidence.evidenceDigest,
    identityFingerprint, hostContextFingerprint: hostFingerprint, sourceFingerprint, bootstrapIntentId }, { expectedPriorDigest: null, operationId: randomUUID(), now }).code, "MANIFEST_CAS_CONFLICT");

  const crashBase = { intent, generation: created.record, anchorRecord: record, anchorPersistedEvidence: created.persistedEvidence,
    anchorVerifiedEvidence: verified.evidence, manifest: activated.manifest, attestation: { generationId,
      anchorEvidenceDigest: verified.evidence.evidenceDigest, sourceFingerprint }, packet: null };
  assert.equal(classifyG2BCleanBootstrapRecovery({}), "NO_BOOTSTRAP_STATE");
  assert.equal(classifyG2BCleanBootstrapRecovery({ intent }), "RESUME_GENERATION_CREATE");
  assert.equal(classifyG2BCleanBootstrapRecovery({ intent, generation: created.record }), "RESUME_ANCHOR_PERSIST");
  assert.equal(classifyG2BCleanBootstrapRecovery({ intent, generation: created.record, anchorRecord: record,
    anchorPersistedEvidence: created.persistedEvidence }), "REVERIFY_ANCHOR");
  assert.equal(classifyG2BCleanBootstrapRecovery({ ...crashBase, anchorVerifiedEvidence: undefined }), "REVERIFY_ANCHOR");
  assert.equal(classifyG2BCleanBootstrapRecovery({ ...crashBase, manifest: undefined }), "RESUME_MANIFEST_CAS");
  assert.equal(classifyG2BCleanBootstrapRecovery({ ...crashBase, manifest: { ...activated.manifest, sourceFingerprint: "f".repeat(64) } }), "BLOCK_MANIFEST_MISMATCH");
  assert.equal(classifyG2BCleanBootstrapRecovery({ ...crashBase, attestation: undefined }), "REVALIDATE_THEN_CREATE_ATTESTATION");
  assert.equal(classifyG2BCleanBootstrapRecovery({ ...crashBase, attestationValid: true }), "REVALIDATE_THEN_PREPARE_PACKET");
  assert.equal(classifyG2BCleanBootstrapRecovery({ ...crashBase, packet: {}, attestationValid: true, packetValid: true }), "BOOTSTRAP_COMPLETE");
  assert.equal(classifyG2BCleanBootstrapRecovery({ ...crashBase, artifactsValid: false }), "BLOCK_CORRUPT_OR_MISMATCHED_ARTIFACT");

  const lockedDirectory = join(root, "locked-manifests");
  mkdirSync(lockedDirectory, { recursive: true });
  const lockFd = openSync(join(lockedDirectory, "activation.lock"), "wx", 0o600);
  writeSync(lockFd, "{}\n");
  closeSync(lockFd);
  const lockedManifestStore = createG2BCleanCanonicalManifestStore({ directory: lockedDirectory });
  assert.equal(lockedManifestStore.activate({ canonicalGenerationId: randomUUID(), anchorEvidenceDigest: "a".repeat(64),
    identityFingerprint, hostContextFingerprint: hostFingerprint, sourceFingerprint, bootstrapIntentId }, { expectedPriorDigest: null, operationId: randomUUID(), now }).code,
  "MANIFEST_LOCK_HELD");

  const fixtureEnvironment = { USERNAME: "fixture", USERDOMAIN: "fixture", USERPROFILE: "C:\\fixture", COMPUTERNAME: "fixture" };
  const missingHostBindingAttempt = buildG2BCleanGenerationAttestation({ secret, secretKeyId, generationId,
    anchorEvidenceDigest: verified.evidence.evidenceDigest, identityFingerprint,
    anchorFingerprint: verified.evidence.anchorFingerprint, sourceFingerprint: g2bHostAnchorSourceFingerprint(),
    environment: fixtureEnvironment, repositoryRoot: process.cwd(), validatedAt: now });
  assert.equal(missingHostBindingAttempt.code, "CLEAN_ATTESTATION_INPUT_INVALID");
  const buildAttempt = buildG2BCleanGenerationAttestation({ secret, secretKeyId, generationId,
    anchorEvidenceDigest: verified.evidence.evidenceDigest, identityFingerprint,
    anchorFingerprint: verified.evidence.anchorFingerprint, sourceFingerprint: g2bHostAnchorSourceFingerprint(),
    environment: fixtureEnvironment, hostContextFingerprint: g2bHostContextFingerprint(fixtureEnvironment),
    repositoryRoot: process.cwd(), validatedAt: now });
  assert.equal(buildAttempt.ok, false);
  assert.equal(buildAttempt.code, "CLEAN_ATTESTATION_SIGNING_KEY_MISMATCH");
  const boundInput = { secret, secretKeyId, generationId, anchorEvidenceDigest: verified.evidence.evidenceDigest,
    identityFingerprint, anchorFingerprint: verified.evidence.anchorFingerprint,
    sourceFingerprint: g2bHostAnchorSourceFingerprint(), sourceLockDigest: "5".repeat(64), operationId,
    hostContextFingerprint: g2bHostContextFingerprint(fixtureEnvironment), environment: fixtureEnvironment,
    repositoryRoot: process.cwd(), issuedAt: now };
  assert.equal(buildG2BCleanGenerationAttestationV2({ ...boundInput, operationId: undefined }).code,
    "CLEAN_ATTESTATION_V2_INPUT_INVALID", "v2 requires an operation binding");
  assert.equal(buildG2BCleanGenerationAttestationV2({ ...boundInput, sourceLockDigest: undefined }).code,
    "CLEAN_ATTESTATION_V2_INPUT_INVALID", "v2 requires a source-lock binding");
  const forgedV2 = { schemaVersion: "myweb.g2b.clean-generation-host-attestation.v2", result: "VALID",
    generationId, anchorState: "ANCHOR_VERIFIED", anchorEvidenceDigest: verified.evidence.evidenceDigest,
    identityFingerprint, anchorFingerprint: verified.evidence.anchorFingerprint, sourceFingerprint: boundInput.sourceFingerprint,
    sourceLockDigest: boundInput.sourceLockDigest, operationId, hostContextFingerprint: boundInput.hostContextFingerprint,
    sourceFingerprintSchemaVersion: 2, validationId: randomUUID(), nonce: randomUUID(), issuedAt: now,
    expiresAt: new Date(Date.parse(now) + 60_000).toISOString(), validationProvider: "WINDOWS_DPAPI_CURRENT_USER",
    validationEnvironment: "TRUSTED_WINDOWS_HOST", dpapiUnprotectSucceeded: true, hmacValid: true,
    generationMatch: true, identityMatch: true, hostMatch: true, sourceMatch: true,
    publicKeyFingerprint: "0".repeat(64), secretKeyIdFingerprint: "1".repeat(64),
    attestationDigest: "2".repeat(64), attestationSignature: "AA==" };
  for (const [field, value] of [["operationId", randomUUID()], ["sourceLockDigest", "6".repeat(64)],
    ["sourceFingerprint", "7".repeat(64)], ["generationId", randomUUID()], ["identityFingerprint", "8".repeat(64)],
    ["hostContextFingerprint", "9".repeat(64)], ["anchorEvidenceDigest", "a".repeat(64)],
    ["expiresAt", new Date(Date.parse(now) - 1).toISOString()]]) {
    const changed = { ...forgedV2, [field]: value };
    assert.equal(verifyG2BCleanGenerationAttestationV2(changed, { ...boundInput, now: Date.parse(now) }).ok, false,
      `v2 verifier rejects changed ${field}`);
  }
  assert.equal(verifyG2BCleanGenerationAttestationV2({ ...forgedV2, schemaVersion: "myweb.g2b.clean-generation-host-attestation.v1" },
    { ...boundInput, now: Date.parse(now) }).ok, false, "v1 cannot satisfy v2 binding verification");
  assert.match(bootstrapImplementation,
    /const attestationBindings = \{ generationId: intent\.generationId, anchorEvidenceDigest:[\s\S]*?identityFingerprint, anchorFingerprint:[\s\S]*?hostContextFingerprint, sourceFingerprint/);

  const packet = buildG2BCleanCasReadPacket({ operationId: randomUUID(), generationId, bootstrapIntentId,
    manifestVersion: activated.manifest.manifestVersion, sourceFingerprint, sourceLockPath: "docs/evidence/fixture-source-lock.json",
    sourceCount: G2B_CAS_SOURCE_PATHS.length, identityFingerprint, targetMember: "serviceAccount:fixture@example.invalid",
    sourceLockManifestDigest: "5".repeat(64), attestationDigest: "6".repeat(64),
    anchorEvidenceDigest: verified.evidence.evidenceDigest, manifestDigest: activated.manifest.manifestDigest, createdAt: now });
  assert.equal(packet.schemaVersion, "myweb.g2b.clean-generation.cas-read-packet.v2");
  assert.equal(packet.requestedPolicyVersion, 3);
  assert.equal(packet.sourceCount, G2B_CAS_SOURCE_PATHS.length);
  assert.equal(packet.mutationReachable, false);
  assert.equal(packet.setIamPolicyMax, 0);
  assert.equal(packet.iamPolicyReadMax, 1);
  assert.equal(packet.totalPhysicalRemoteCallsMax, 2);
  const packetV4 = buildG2BCleanCasReadPacketV4({ operationId, generationId, bootstrapIntentId,
    manifestVersion: activated.manifest.manifestVersion, sourceFingerprint, sourceLockPath: "docs/evidence/fixture-source-lock-v4.json",
    sourceCount: G2B_CAS_SOURCE_PATHS.length, sourceLockDigest: "5".repeat(64), sourceLockRawSha256: "4".repeat(64),
    attestationDigest: "6".repeat(64),
    anchorEvidenceDigest: verified.evidence.evidenceDigest, anchorFingerprint: verified.evidence.anchorFingerprint,
    manifestDigest: activated.manifest.manifestDigest, identityFingerprint, hostContextFingerprint: "3".repeat(64),
    targetMember: "serviceAccount:fixture@example.invalid", createdAt: now });
  assert.equal(verifyG2BCleanCasReadPacket(packetV4), true);
  assert.equal(packetV4.attestationSchemaVersion, 2);
  assert.equal(packetV4.attestationRefreshPolicy, "EXPIRY_ONLY_LOCAL_REFRESH_MAX_1");
  assert.equal(packetV4.sourceLockRawSha256, "4".repeat(64));
  assert.equal(packetV4.mutationReachable, false);
  assert.equal(verifyG2BCleanCasReadPacket({ ...packetV4, operationId: randomUUID() }), false,
    "packet digest detects operation substitution");
  assert.equal(verifyG2BCleanCasReadPacket({ ...packetV4, mutationReachable: true }), false,
    "read-only v4 rejects mutation reachability");
  assert.throws(() => buildG2BCleanCasReadPacket({ operationId: randomUUID(), generationId: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981",
    bootstrapIntentId, sourceFingerprint, sourceLockPath: "docs/evidence/fixture-source-lock.json",
    sourceCount: G2B_CAS_SOURCE_PATHS.length, identityFingerprint, targetMember: "serviceAccount:fixture@example.invalid",
    sourceLockManifestDigest: "5".repeat(64), attestationDigest: "6".repeat(64),
    anchorEvidenceDigest: "7".repeat(64), manifestDigest: "8".repeat(64), createdAt: now }), /clean-cas-read-packet-input-invalid/);
  const lock = buildG2BCleanSourceLock({ repositoryRoot: process.cwd() });
  assert.equal(lock.expectedCount, G2B_CAS_SOURCE_PATHS.length);
  assert.equal(lock.matchedCount, lock.expectedCount);
  assert.equal(lock.missing + lock.mismatched + lock.unexpected, 0);

  const resolvedWithoutSignedAttestation = resolveG2BCleanCanonicalGeneration({ generationStore: store, manifestStore,
    attestation: null, attestationBindings: { secretKeyId, environment: process.env, repositoryRoot: process.cwd() } });
  assert.equal(resolvedWithoutSignedAttestation.ok, false);
  assert.equal(resolvedWithoutSignedAttestation.readEligible, false);
  assert.equal(resolvedWithoutSignedAttestation.mutationEligible, false);

  const conflictRoot = join(root, "failed-history-store");
  const conflictStore = createG2BCleanGenerationStore({ directory: conflictRoot });
  const failedGenerationId = randomUUID();
  const failedIntentId = randomUUID();
  const failedOperationId = randomUUID();
  const failedInput = { ...input, sourceFingerprint: "a".repeat(64) };
  const failedIntent = buildG2BCleanBootstrapIntent({ bootstrapIntentId: failedIntentId,
    operationId: failedOperationId, generationId: failedGenerationId, input: failedInput, createdAt: now });
  conflictStore.createIntent(failedIntent);
  const failedAnchor = buildG2BRecoveryAnchor({ member, secret, secretKeyId,
    operationGenerationId: failedGenerationId, now });
  const failedCandidate = conflictStore.createGeneration({ intent: failedIntent, anchorRecord: failedAnchor,
    ...failedInput, createdAt: now });
  const failedVerification = verifyG2BRecoveryAnchor({ record: failedAnchor, member, secret, secretKeyId });
  const failedVerified = conflictStore.recordVerifiedEvent({ generationId: failedGenerationId, intent: failedIntent,
    anchorRecord: failedAnchor, ...failedInput, verification: failedVerification, verifiedAt: now });
  const failedManifestStore = createG2BCleanCanonicalManifestStore({ directory: join(conflictRoot, "canonical-manifests") });
  const failedManifest = failedManifestStore.activate({ canonicalGenerationId: failedGenerationId,
    anchorEvidenceDigest: failedVerified.evidence.evidenceDigest, identityFingerprint,
    hostContextFingerprint: hostFingerprint, sourceFingerprint: failedInput.sourceFingerprint,
    bootstrapIntentId: failedIntentId }, { expectedPriorDigest: null, operationId: failedOperationId, now });
  assert.equal(failedManifest.ok, true);
  const failedEvent = conflictStore.recordOrchestrationEvent(failedGenerationId, "canonical-ineligible", {
    generationId: failedGenerationId, bootstrapIntentId: failedIntentId, operationId: failedOperationId,
    failureCode: "ATTESTATION_VALIDATION_FAILED", at: now,
  });
  const oldIntentPath = join(conflictRoot, "intents", failedIntentId + ".json");
  const oldGenerationPath = join(conflictRoot, "generations", failedGenerationId, "generation.json");
  const oldManifestPath = join(conflictRoot, "canonical-manifests", "manifest-00000001.json");
  const oldIntentBytes = readFileSync(oldIntentPath);
  const oldGenerationBytes = readFileSync(oldGenerationPath);
  const oldManifestBytes = readFileSync(oldManifestPath);
  assert.ok(failedCandidate.recordArtifact.rawSha256);
  assert.ok(failedEvent.rawSha256);
  assert.equal(conflictStore.candidates().length, 1, "failed history remains enumerable");
  assert.equal(conflictStore.intents().length, 1, "failed intent remains enumerable");
  assert.equal(conflictStore.terminalState(failedGenerationId).state, "TERMINAL");
  assert.equal(conflictStore.terminalState(failedGenerationId).reason, "canonical-ineligible");
  const terminalPolicy = buildG2BCleanHistoricalPolicy({ generationStore: conflictStore });
  assert.equal(terminalPolicy.historicalGenerationIds.includes(failedGenerationId), true);
  assert.deepEqual(terminalPolicy.ineligibleGenerationIds, [failedGenerationId]);
  assert.notEqual(sha256G2BCanonical(terminalPolicy), sha256G2BCanonical(policy));
  assert.equal(conflictStore.activeCandidates().length, 0, "terminal history releases the active candidate slot");
  assert.equal(conflictStore.activeIntents().length, 0, "terminal history does not reserve a resumable intent slot");
  assert.equal(failedManifestStore.readChain().latest.manifestDigest, failedManifest.manifest.manifestDigest,
    "the failed manifest remains valid immutable predecessor history");
  const unresolvedFailedResolver = resolveG2BCleanCanonicalGeneration({ generationStore: conflictStore,
    manifestStore: failedManifestStore, attestation: null, attestationBindings: {} });
  assert.equal(unresolvedFailedResolver.ok, false, "a terminal manifest predecessor is never resolved as canonical");
  assert.equal(unresolvedFailedResolver.code, "CLEAN_CANONICAL_AMBIGUOUS");

  const replacementGenerationId = randomUUID();
  const replacementIntentId = randomUUID();
  const replacementOperationId = randomUUID();
  const replacementIntent = buildG2BCleanBootstrapIntent({ bootstrapIntentId: replacementIntentId,
    operationId: replacementOperationId, generationId: replacementGenerationId, input, createdAt: now });
  conflictStore.createIntent(replacementIntent);
  assert.equal(conflictStore.activeIntents().length, 1, "an intent without a generation remains resumable and occupies the slot");
  const replacementAnchor = buildG2BRecoveryAnchor({ member, secret, secretKeyId,
    operationGenerationId: replacementGenerationId, now });
  conflictStore.createGeneration({ intent: replacementIntent, anchorRecord: replacementAnchor, ...input, createdAt: now });
  assert.equal(conflictStore.activeCandidates().length, 1, "a nonterminal candidate occupies the slot");
  const competingGenerationId = randomUUID();
  const competingIntent = buildG2BCleanBootstrapIntent({ bootstrapIntentId: randomUUID(), operationId: randomUUID(),
    generationId: competingGenerationId, input, createdAt: now });
  assert.throws(() => conflictStore.createGeneration({ intent: competingIntent,
    anchorRecord: buildG2BRecoveryAnchor({ member, secret, secretKeyId, operationGenerationId: competingGenerationId, now }),
    ...input, createdAt: now }), /CLEAN_GENERATION_CREATE_BLOCKED/);
  assert.equal(readFileSync(oldIntentPath).equals(oldIntentBytes), true);
  assert.equal(readFileSync(oldGenerationPath).equals(oldGenerationBytes), true);
  assert.equal(readFileSync(oldManifestPath).equals(oldManifestBytes), true);

  const concurrentStore = createG2BCleanGenerationStore({ directory: join(root, "concurrent-store") });
  const lockResults = await Promise.allSettled([
    Promise.resolve().then(() => concurrentStore.acquireBootstrapLock({ bootstrapIntentId: randomUUID(), operationId: randomUUID(), acquiredAt: now })),
    Promise.resolve().then(() => concurrentStore.acquireBootstrapLock({ bootstrapIntentId: randomUUID(), operationId: randomUUID(), acquiredAt: now })),
  ]);
  assert.equal(lockResults.filter((result) => result.status === "fulfilled").length, 1,
    "exclusive bootstrap lock admits at most one concurrent candidate");
  assert.equal(lockResults.filter((result) => result.status === "rejected" && /CLEAN_BOOTSTRAP_LOCK_HELD/.test(result.reason.message)).length, 1);
  lockResults.find((result) => result.status === "fulfilled").value.release();
  assert.equal(G2B_TARGET_RESOURCE.length > 0 && G2B_TARGET_ROLE.length > 0, true);
} finally {
  secret.fill(0);
  rmSync(root, { recursive: true, force: true });
}

console.log("G2B clean-generation bootstrap fixtures passed; remote calls=0; persistent authority writes=0");
