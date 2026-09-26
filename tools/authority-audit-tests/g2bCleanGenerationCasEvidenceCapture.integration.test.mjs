import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildG2BCleanCasReadPacketV3, buildG2BCleanSourceLock } from "../authority-audit/g2bCleanGenerationBootstrap.mjs";
import { createG2BCleanGenerationCasEvidenceExecutor } from "../authority-audit/g2bCleanGenerationCasEvidenceCapture.mjs";
import { createG2BExplicitSetIamPolicyAuthTransport, runG2BExplicitSetPythonProcess } from "../authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs";
import { G2B_CAS_SOURCE_PATHS } from "../authority-audit/g2bCanonicalSourceFingerprint.mjs";
import { sha256G2BCanonical } from "../authority-audit/g2bCanonicalGenerationManifest.mjs";

assert.equal(process.platform, "win32");
const root = process.cwd();
const scratch = mkdtempSync(join(tmpdir(), "myweb-clean-cas-node-python-"));
const sdkRoot = join(scratch, "google-cloud-sdk");
const gcloud = join(sdkRoot, "bin", "gcloud.cmd");
const fakePythonPath = join(sdkRoot, "platform", "bundledpython", "python.exe");
const storeMarker = join(sdkRoot, "lib", "googlecloudsdk", "core", "credentials", "store.py");
const fixtureScript = resolve("tools/authority-audit-tests/g2bHelperMainLocalProvider.integration.py");
const installedSdkNormalizer = resolve("tools/authority-audit-tests/g2bPolicyResponseNormalizer.test.py");
const helperScript = resolve("tools/authority-audit/g2b_explicit_set_iam_policy_transport.py");
const python = process.env.PYTHON_EXECUTABLE || process.env.PYTHON || "python";
const operationId = randomUUID();
const generationId = randomUUID();
const bootstrapIntentId = randomUUID();
const account = "fixture@example.invalid";
const member = `user:${account}`;
const identityFingerprint = sha256G2BCanonical({ account, member });
const anchorFingerprint = "e".repeat(64);
const hostContextFingerprint = "d".repeat(64);
const signerFingerprint = "f".repeat(64);
const initialAttestationDigest = "a".repeat(64);
const source = buildG2BCleanSourceLock({ repositoryRoot: root });
const lockRelative = `docs/evidence/.clean-cas-${operationId}-source-lock.json`;
const packetRelative = `docs/evidence/.clean-cas-${operationId}-packet.json`;
const lockPath = join(root, lockRelative);
const packetPath = join(root, packetRelative);
const packet = buildG2BCleanCasReadPacketV3({ operationId, generationId, bootstrapIntentId, manifestVersion: 3,
  sourceFingerprint: source.sourceFingerprint, sourceLockPath: lockRelative, sourceCount: G2B_CAS_SOURCE_PATHS.length,
  sourceLockManifestDigest: source.manifestDigest, initialAttestationDigest, anchorEvidenceDigest: "b".repeat(64),
  anchorFingerprint, manifestDigest: "c".repeat(64), identityFingerprint, hostContextFingerprint, signerFingerprint, targetMember: member });
const raw = Buffer.from(`${JSON.stringify(packet)}\n`);
const rawHash = createHash("sha256").update(raw).digest("hex");
const envelope = Object.freeze({ executionMode: "REMOTE_READ_ONLY", executeRemoteNow: true, operationInstance: operationId,
  approvalPacketSha256: rawHash, sourceLockDigest: packet.sourceLockDigest, credentialRefreshMax: 1, iamReadMax: 1, setIamPolicyMax: 0 });
const trust = { identity: { exactPrincipal: account, exactIamMember: member }, identityFingerprint,
  generation: { generationId, sourceFingerprint: packet.sourceFingerprint, identityFingerprint, hostContextFingerprint },
  manifest: { manifestVersion: 3, manifestDigest: packet.manifestDigest, canonicalGenerationId: generationId,
    sourceFingerprint: packet.sourceFingerprint },
  anchorEvidence: { evidenceDigest: packet.anchorVerifiedEvidenceDigest, generationId, sourceFingerprint: packet.sourceFingerprint,
    anchorFingerprint, identityFingerprint, hostContextFingerprint },
  anchor: { secretKeyId: randomUUID() }, store: {}, manifestStore: {}, attestationDirectory: scratch,
  attestation: { schemaVersion: "myweb.g2b.clean-generation-host-attestation.v1", attestationDigest: initialAttestationDigest,
    generationId, anchorEvidenceDigest: packet.anchorVerifiedEvidenceDigest, anchorFingerprint, identityFingerprint,
    memberFingerprint: packet.targetMemberFingerprint, sourceFingerprintSchemaVersion: 2, sourceFingerprint: packet.sourceFingerprint,
    publicKeyFingerprint: signerFingerprint, hostContextFingerprint, validatedAt: new Date(Date.now() - 120_001).toISOString(),
    validationProvider: "WINDOWS_DPAPI_CURRENT_USER", validationEnvironment: "TRUSTED_WINDOWS_HOST",
    result: "VALID", dpapiUnprotectSucceeded: true, hmacValid: true, generationMatch: true, identityMatch: true, hostMatch: true, sourceMatch: true },
  attestationBindingValid: true, attestationFresh: false, attestationAgeMs: 120_001,
  resolved: { ok: false, readEligible: false, canonicalGeneration: generationId, manifestDigest: packet.manifestDigest,
    anchorEvidenceDigest: packet.anchorVerifiedEvidenceDigest } };
let localRefreshCalls = 0;
const testOnlyAttestationRefresher = ({ now }) => {
  localRefreshCalls += 1;
  return { ok: true, attestation: { ...trust.attestation, attestationDigest: "9".repeat(64), validatedAt: new Date(now).toISOString() },
    resolved: { ok: true, readEligible: true, canonicalGeneration: generationId, manifestDigest: packet.manifestDigest,
      anchorEvidenceDigest: packet.anchorVerifiedEvidenceDigest } };
};
let observedEnvelope;
let observedProbe;
let observedSpawnErrorCode = null;
let installedSdkPolicyVersion = null;
let sdkLockPath;
let sdkPacketPath;
const sdkAdditionalArtifacts = [];

try {
  mkdirSync(join(sdkRoot, "bin"), { recursive: true });
  mkdirSync(join(sdkRoot, "platform", "bundledpython"), { recursive: true });
  mkdirSync(join(sdkRoot, "lib", "googlecloudsdk", "core", "credentials"), { recursive: true });
  writeFileSync(gcloud, "@echo off\r\nexit /b 0\r\n");
  writeFileSync(fakePythonPath, "fixture-runtime-marker");
  writeFileSync(storeMarker, "# fake provider fixture\n");
  writeFileSync(lockPath, `${JSON.stringify(source.manifest)}\n`, { flag: "wx" });
  writeFileSync(packetPath, raw, { flag: "wx" });
  const environment = { ...process.env, GCLOUD_PATH: gcloud, CLOUDSDK_CONFIG: join(scratch, "config") };
  for (const key of ["CLOUDSDK_AUTH_ACCESS_TOKEN", "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE", "CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT"]) delete environment[key];
  const processRunner = (request) => runG2BExplicitSetPythonProcess({ ...request,
    processHost: (_runtime, args, options) => {
      const child = installedSdkPolicyVersion !== null
        ? spawnSync(python, [installedSdkNormalizer, "--emit-installed-sdk-policy-envelope", `--version=${installedSdkPolicyVersion}`], options)
        : spawnSync(python, [fixtureScript, "--child", ...args], options);
      observedSpawnErrorCode = child.error?.code || null;
      const probeLine = child.stderr?.toString("utf8").split(/\r?\n/).find((line) => line.startsWith("G2B_TEST_PROVIDER_PROBE="));
      if (probeLine) observedProbe = JSON.parse(probeLine.slice("G2B_TEST_PROVIDER_PROBE=".length));
      if (Buffer.isBuffer(child.stdout)) observedEnvelope = JSON.parse(child.stdout.toString("utf8"));
      return child;
    } });
  const underlying = createG2BExplicitSetIamPolicyAuthTransport({ enabled: true, executionEnvelope: envelope, environment, processRunner });
  const transport = Object.freeze({ ...underlying,
    prepareDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 0 }),
    executeDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 1 }),
  });
  const executor = createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root, environment,
    outputDirectory: join(scratch, "evidence"), testOnlyTrustResolver: () => trust, testOnlyAttestationRefresher });
  const result = await executor.execute({ packetPath: packetRelative, expectedRawPacketSha256: rawHash, executionEnvelope: envelope, transport });
  assert.equal(observedSpawnErrorCode, null,
    `fake provider child failed to start before returning an envelope: ${observedSpawnErrorCode || "unknown"}`);
  assert.equal(result.ok, true, result.code);
  assert.ok(observedEnvelope, "Python child returned an observable response envelope");
  assert.ok(observedProbe, "fake provider emitted a request probe");
  assert.equal(observedEnvelope.requestMetadata.requestedPolicyVersion, 3);
  assert.equal(observedEnvelope.requestMetadata.requestBodyOptionsVersionValidated, true);
  assert.equal(observedEnvelope.requestMetadata.resourceValidatedBeforeDispatch, true);
  assert.equal(observedProbe.providerCalls, 1);
  assert.equal(observedProbe.requestResourceMatches, true);
  assert.equal(observedProbe.requestedPolicyVersion, 3);
  assert.equal(observedProbe.networkCalls, 0);
  assert.equal(result.evidence.requestedPolicyVersion, 3);
  assert.equal(result.evidence.returnedPolicyVersion, 3);
  assert.equal(result.evidence.etagPresent, true);
  assert.equal(result.evidence.etagSha256, createHash("sha256").update("fixture-etag").digest("hex"));
  assert.equal(result.evidence.targetBindingStateKnown, true);
  assert.equal(result.evidence.relevantBindingsDigest.length, 64);
  assert.equal(result.evidence.attestationRefresh.refreshPerformed, true);
  assert.equal(result.evidence.attestationRefresh.refreshedAttestationDigest, "9".repeat(64));
  assert.equal(localRefreshCalls, 1);
  assert.deepEqual(readFileSync(packetPath), raw, "packet bytes remain identical after expiry-only local refresh");
  assert.equal(createHash("sha256").update(readFileSync(packetPath)).digest("hex"), rawHash);
  assert.equal(JSON.parse(readFileSync(packetPath, "utf8")).packetDigest, packet.packetDigest);
  assert.equal(result.result.iamMutations, 0);
  assert.equal(result.result.physicalRemoteCalls.physicalRemoteCalls, 2);

  const sdkOperationId = randomUUID();
  const sdkLockRelative = `docs/evidence/.clean-cas-${sdkOperationId}-source-lock.json`;
  const sdkPacketRelative = `docs/evidence/.clean-cas-${sdkOperationId}-packet.json`;
  sdkLockPath = join(root, sdkLockRelative);
  sdkPacketPath = join(root, sdkPacketRelative);
  const sdkPacket = buildG2BCleanCasReadPacketV3({ operationId: sdkOperationId, generationId, bootstrapIntentId,
    manifestVersion: 3, sourceFingerprint: source.sourceFingerprint, sourceLockPath: sdkLockRelative,
    sourceCount: G2B_CAS_SOURCE_PATHS.length, sourceLockManifestDigest: source.manifestDigest,
    initialAttestationDigest, anchorEvidenceDigest: "b".repeat(64), anchorFingerprint, manifestDigest: "c".repeat(64),
    identityFingerprint, hostContextFingerprint, signerFingerprint, targetMember: member });
  const sdkRaw = Buffer.from(`${JSON.stringify(sdkPacket)}\n`);
  const sdkRawHash = createHash("sha256").update(sdkRaw).digest("hex");
  const sdkEnvelope = Object.freeze({ ...envelope, operationInstance: sdkOperationId, approvalPacketSha256: sdkRawHash });
  writeFileSync(sdkLockPath, `${JSON.stringify(source.manifest)}\n`, { flag: "wx" });
  writeFileSync(sdkPacketPath, sdkRaw, { flag: "wx" });
  installedSdkPolicyVersion = "unset";
  const sdkUnderlying = createG2BExplicitSetIamPolicyAuthTransport({ enabled: true, executionEnvelope: sdkEnvelope,
    environment, processRunner });
  const sdkTransport = Object.freeze({ ...sdkUnderlying,
    prepareDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 0 }),
    executeDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 1 }),
  });
  const sdkExecutor = createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root, environment,
    outputDirectory: join(scratch, "installed-sdk-evidence"), testOnlyTrustResolver: () => trust,
    testOnlyAttestationRefresher });
  const sdkResult = await sdkExecutor.execute({ packetPath: sdkPacketRelative, expectedRawPacketSha256: sdkRawHash,
    executionEnvelope: sdkEnvelope, transport: sdkTransport });
  assert.equal(sdkResult.ok, true, JSON.stringify(sdkResult));
  assert.equal(observedSpawnErrorCode, null);
  assert.equal(observedEnvelope.serializationMetadata.policyObjectType, "MESSAGE");
  assert.equal(observedEnvelope.returnedPolicyVersionState, "UNSET");
  assert.equal(observedEnvelope.responseFieldDiagnostic.apitoolsPolicyClassVerified, true);
  assert.equal(observedEnvelope.responseFieldDiagnostic.apitoolsBindingsState, "UNSET");
  assert.equal(observedEnvelope.responseFieldDiagnostic.etagPresent, true);
  assert.equal(observedEnvelope.responseFieldDiagnostic.bindingsCount, 0);
  assert.equal(observedEnvelope.policy.bindings.length, 0);
  assert.equal(observedEnvelope.helperExecution.policyExtracted, true);
  assert.equal(observedEnvelope.helperExecution.providerRequestStarted, true);
  assert.equal(observedEnvelope.helperExecution.providerResponseReceived, true);
  assert.equal(observedEnvelope.transportLifecycle.lastCompletedPhase, "PHASE_08_HELPER_SERIALIZATION");
  assert.equal(sdkResult.evidence.returnedPolicyVersionState, "UNSET");
  assert.equal(sdkResult.evidence.targetBindingState, "ABSENT");
  assert.equal(sdkResult.evidence.casState, "RESOLVED");
  assert.equal(sdkResult.result.iamMutations, 0);
  assert.equal(sdkResult.result.setIamPolicyCalls, 0);
  assert.equal(sdkResult.evidence.baselineCapable, true, JSON.stringify(sdkResult.evidence.missingBaselineFields));
  assert.equal(sdkResult.evidence.targetResource, sdkPacket.targetResource);
  assert.equal(sdkResult.evidence.targetRole, sdkPacket.targetRole);
  assert.equal(sdkResult.evidence.operationId, sdkPacket.operationId);
  assert.equal(sdkResult.evidence.generationId, generationId);
  assert.equal(sdkResult.evidence.providerResponseObjectClass, "Policy");
  assert.equal(sdkResult.evidence.providerResponseWrapperType, "SDK_POLICY_MESSAGE");
  assert.equal(sdkResult.evidence.etagPresent, true);
  assert.equal(sdkResult.evidence.etagType, "BYTES");
  assert.equal(sdkResult.evidence.etagSha256,
    createHash("sha256").update(Buffer.from("installed-sdk-unset-etag", "utf8")).digest("hex"));
  assert.equal(sdkResult.evidence.casState, "RESOLVED");

  for (const [version, expectedVersionState] of [["1", "EXPLICIT_1"], ["3", "EXPLICIT_3"]]) {
    const operation = randomUUID();
    const lock = `docs/evidence/.clean-cas-${operation}-source-lock.json`;
    const packetFile = `docs/evidence/.clean-cas-${operation}-packet.json`;
    const absoluteLock = join(root, lock);
    const absolutePacket = join(root, packetFile);
    sdkAdditionalArtifacts.push(absoluteLock, absolutePacket);
    const nextPacket = buildG2BCleanCasReadPacketV3({ operationId: operation, generationId, bootstrapIntentId,
      manifestVersion: 3, sourceFingerprint: source.sourceFingerprint, sourceLockPath: lock,
      sourceCount: G2B_CAS_SOURCE_PATHS.length, sourceLockManifestDigest: source.manifestDigest,
      initialAttestationDigest, anchorEvidenceDigest: "b".repeat(64), anchorFingerprint, manifestDigest: "c".repeat(64),
      identityFingerprint, hostContextFingerprint, signerFingerprint, targetMember: member });
    const nextRaw = Buffer.from(`${JSON.stringify(nextPacket)}\n`);
    const nextHash = createHash("sha256").update(nextRaw).digest("hex");
    const nextEnvelope = Object.freeze({ ...envelope, operationInstance: operation, approvalPacketSha256: nextHash });
    writeFileSync(absoluteLock, `${JSON.stringify(source.manifest)}\n`, { flag: "wx" });
    writeFileSync(absolutePacket, nextRaw, { flag: "wx" });
    installedSdkPolicyVersion = version;
    const nextTransportBase = createG2BExplicitSetIamPolicyAuthTransport({ enabled: true,
      executionEnvelope: nextEnvelope, environment, processRunner });
    const nextTransport = Object.freeze({ ...nextTransportBase,
      prepareDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 0 }),
      executeDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 1 }),
    });
    const nextExecutor = createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root, environment,
      outputDirectory: join(scratch, `installed-sdk-${version}-evidence`), testOnlyTrustResolver: () => trust,
      testOnlyAttestationRefresher });
    const nextResult = await nextExecutor.execute({ packetPath: packetFile, expectedRawPacketSha256: nextHash,
      executionEnvelope: nextEnvelope, transport: nextTransport });
    assert.equal(nextResult.ok, true, `installed SDK v${version}: ${nextResult.code}`);
    assert.equal(nextResult.evidence.returnedPolicyVersionState, expectedVersionState);
    assert.equal(nextResult.evidence.returnedPolicyVersionValue, Number(version));
    assert.equal(nextResult.evidence.baselineCapable, true, JSON.stringify(nextResult.evidence.missingBaselineFields));
    assert.equal(nextResult.evidence.providerResponseObjectClass, "Policy");
    assert.equal(nextResult.evidence.providerResponseWrapperType, "SDK_POLICY_MESSAGE");
    assert.equal(nextResult.evidence.conditionBindingCount, version === "3" ? 1 : 0);
    assert.equal(nextResult.evidence.targetBindingState, "ABSENT");
    assert.equal(nextResult.evidence.casState, "RESOLVED");
    assert.equal(nextResult.result.iamMutations, 0);
  }
  console.log("Installed SDK Policy object -> production normalizer -> Node transport -> CAS executor passed; target=ABSENT; CAS=RESOLVED; network=0; remote=0");
} finally {
  for (const path of sdkAdditionalArtifacts || []) { try { rmSync(path, { force: true }); } catch {} }
  try { if (sdkLockPath) rmSync(sdkLockPath, { force: true }); } catch {}
  try { if (sdkPacketPath) rmSync(sdkPacketPath, { force: true }); } catch {}
  try { rmSync(lockPath, { force: true }); } catch {}
  try { rmSync(packetPath, { force: true }); } catch {}
  try { rmSync(scratch, { recursive: true, force: true }); } catch {}
}
