import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { createG2BCleanGenerationCasEvidenceExecutor } from "../authority-audit/g2bCleanGenerationCasEvidenceCapture.mjs";
import { createG2BExplicitSetIamPolicyAuthTransport, parseG2BExplicitTransportResult, runG2BExplicitSetPythonProcess } from "../authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs";
import { buildG2BCleanCasReadPacketV4, createG2BCleanGenerationStore, createG2BCleanBootstrapRuntime,
  evaluateG2BCleanBootstrapTrustedHostPrecondition, resolveG2BCleanCanonicalGeneration } from "../authority-audit/g2bCleanGenerationBootstrap.mjs";
import { createG2BCleanCanonicalManifestStore, canonicalG2BJson, sha256G2BCanonical } from "../authority-audit/g2bCanonicalGenerationManifest.mjs";
import { buildG2BCleanGenerationAttestationV2,
  verifyG2BCleanGenerationAttestationV2, verifyG2BCleanGenerationAttestationSignature } from "../authority-audit/g2bCleanGenerationAttestation.mjs";
import { G2B_CAS_SOURCE_PATHS, currentG2BCasSourceEntries, computeCanonicalSourceFingerprint } from "../authority-audit/g2bCanonicalSourceFingerprint.mjs";
import { resolveG2BLocalPinnedIdentity } from "../authority-audit/g2bLocalPinnedIdentityResolver.mjs";
import { createWindowsDpapiSecretProvider } from "../authority-audit/windowsDpapiSecretProvider.mjs";

assert.equal(process.platform, "win32");
const repositoryRoot = process.cwd();
const environment = process.env;
const authorityRoot = environment.LOCALAPPDATA
  ? resolve(environment.LOCALAPPDATA, "MY-WEB", "authority-audit") : null;
assert.ok(authorityRoot && existsSync(join(authorityRoot, "clean-generations-v1")), "local clean-generation authority store is present");
const scratch = mkdtempSync(join(tmpdir(), "myweb-g2b-bootstrap-dryrun-"));
const scratchResolved = resolve(scratch);
assert.ok(scratchResolved.startsWith(resolve(tmpdir()) + sep));
assert.ok(!scratchResolved.startsWith(authorityRoot + sep) && !authorityRoot.startsWith(scratchResolved + sep), "dry-run and authority roots are disjoint");
const mirrorRoot = join(scratch, "repository");
const storeDirectory = join(scratch, "authority", "clean-generations-v1");
const attestationDirectory = join(storeDirectory, "attestations");
const manifestDirectory = join(storeDirectory, "canonical-manifests");
const evidenceDirectory = join(mirrorRoot, "docs", "evidence");
const sourceLockPath = join(evidenceDirectory, `g2b-dryrun-${randomUUID()}-source-lock.json`);
const packetPath = join(evidenceDirectory, `g2b-dryrun-${randomUUID()}-packet.json`);
const executionEvidencePath = join(evidenceDirectory, `g2b-dryrun-${randomUUID()}-execution-evidence.json`);

function snapshotTree(root) {
  if (!existsSync(root)) return Object.freeze({ count: 0, digest: createHash("sha256").update("[]").digest("hex") });
  const entries = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stat = lstatSync(path);
      assert.equal(stat.isSymbolicLink(), false, "authority snapshot refuses symbolic links");
      if (stat.isDirectory()) visit(path);
      else {
        assert.equal(stat.isFile(), true, "authority snapshot accepts regular files only");
        entries.push({ path: relative(root, path).replace(/\\/g, "/"), sha256: createHash("sha256").update(readFileSync(path)).digest("hex") });
      }
    }
  };
  visit(root);
  const canonical = JSON.stringify(entries.sort((a, b) => a.path.localeCompare(b.path)));
  return Object.freeze({ count: entries.length, digest: createHash("sha256").update(canonical).digest("hex") });
}

function assertInside(root, path) {
  const value = resolve(path);
  assert.ok(value.startsWith(resolve(root) + sep), "all dry-run persistence is confined to the scratch root");
  assert.ok(!value.startsWith(authorityRoot + sep), "production authority paths are not passed to the dry-run runtime");
}

function fileDigests(directory) {
  if (!existsSync(directory)) return new Map();
  return new Map(readdirSync(directory).map((name) => [name,
    createHash("sha256").update(readFileSync(join(directory, name))).digest("hex")]));
}

const authorityBefore = snapshotTree(authorityRoot);
const relevantEvidenceBefore = snapshotTree(join(repositoryRoot, "docs", "evidence"));
let observedProbe;
let observedEnvelope;
let observedChildDiagnostic;
let observedTransportDiagnostic;

try {
  for (const sourcePath of G2B_CAS_SOURCE_PATHS) {
    const destination = join(mirrorRoot, sourcePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(resolve(repositoryRoot, sourcePath), destination);
  }
  cpSync(join(authorityRoot, "clean-generations-v1"), storeDirectory, { recursive: true, errorOnExist: true, force: false });

  const sourceEntries = currentG2BCasSourceEntries({ repositoryRoot: mirrorRoot });
  const sourceFingerprint = computeCanonicalSourceFingerprint(sourceEntries);
  assert.equal(sourceEntries.length, G2B_CAS_SOURCE_PATHS.length);
  assert.equal(sourceFingerprint, computeCanonicalSourceFingerprint(currentG2BCasSourceEntries({ repositoryRoot })));

  const store = createG2BCleanGenerationStore({ directory: storeDirectory });
  const manifests = createG2BCleanCanonicalManifestStore({ directory: manifestDirectory });
  const priorChain = manifests.readChain();
  assert.equal(priorChain.ok, true);
  assert.ok(priorChain.latest, "copied canonical manifest chain has a predecessor");
  const failedHistory = store.candidates().find((candidate) => candidate.generationId === "8c7cf023-ff93-4070-af83-293a2d67a1f0");
  assert.ok(failedHistory, "the failed historical candidate remains in the isolated store");
  assert.equal(store.terminalState(failedHistory.generationId).state, "TERMINAL");
  const predecessorCandidate = store.candidates().find((candidate) => candidate.generationId === priorChain.latest.canonicalGenerationId);
  assert.ok(predecessorCandidate, "latest manifest predecessor generation exists");
  const predecessorState = store.terminalState(predecessorCandidate.generationId);
  if (predecessorState.state === "ACTIVE") {
    store.recordOrchestrationEvent(predecessorCandidate.generationId, "canonical-ineligible", {
      generationId: predecessorCandidate.generationId,
      bootstrapIntentId: predecessorCandidate.bootstrapIntentId,
      operationId: predecessorCandidate.bootstrapOperationId,
      failureCode: "SOURCE_BINDING_STALE",
      at: new Date().toISOString(),
    });
  }
  assert.equal(store.activeCandidates().length, 0, "temporary stale candidate releases the active slot without altering real history");
  const priorManifestHashes = fileDigests(manifestDirectory);
  const priorAttestationHashes = fileDigests(attestationDirectory);

  const identityResult = resolveG2BLocalPinnedIdentity({ environment });
  assert.equal(identityResult.ok, true, identityResult.code);
  const provider = createWindowsDpapiSecretProvider({ environment });
const sourceLockOutput = sourceLockPath;
const packetOutput = packetPath;
  const executionEvidenceOutput = executionEvidencePath;
  for (const path of [storeDirectory, attestationDirectory, manifestDirectory, sourceLockOutput, packetOutput, executionEvidenceOutput]) assertInside(scratch, path);
  assert.throws(() => assertInside(scratch, authorityRoot), /dry-run persistence is confined/,
    "the production authority root is rejected as a configured persistence target");
  const gate = evaluateG2BCleanBootstrapTrustedHostPrecondition({ platform: process.platform, provider,
    identity: identityResult.context, artifactDirectory: storeDirectory, attestationDirectory,
    sourceLockOutput, packetOutput, executionEvidenceOutput, environment });
  assert.equal(gate.leaves.length, 14);
  assert.deepEqual(gate.failures, []);
  assert.equal(gate.ok, true);

  const runtime = createG2BCleanBootstrapRuntime({ repositoryRoot: mirrorRoot, artifactDirectory: storeDirectory,
    attestationDirectory, manifestDirectory, expectedPriorManifestDigest: priorChain.latest.manifestDigest,
    sourceLockOutput, packetOutput, executionEvidenceOutput, environment, secretProvider: provider, identityResolver: identityResult });
  assert.equal(runtime.ok, true);
  assert.equal(runtime.intent.schemaVersion, "myweb.g2b.clean-generation-bootstrap-intent.v2");
  assert.equal(runtime.intent.historicalPolicyDigest, sha256G2BCanonical(runtime.intent.historicalPolicy));
  assert.equal(runtime.intent.input.memberFingerprint,
    sha256G2BCanonical({ member: identityResult.context.exactIamMember }));
  assert.equal(runtime.remoteCalls, 0);
  assert.equal(runtime.mutationReachable, false);
  assert.deepEqual(runtime.inheritedTrust, []);
  assert.equal(runtime.resolution.readEligible, true);
  assert.equal(runtime.resolution.mutationEligible, false);
  assert.equal(runtime.manifest.previousManifestDigest, priorChain.latest.manifestDigest);
  assert.equal(runtime.manifest.manifestVersion, priorChain.latest.manifestVersion + 1);
  assert.equal(runtime.attestation.generationId, runtime.generation.generationId);
  assert.equal(runtime.attestation.schemaVersion, "myweb.g2b.clean-generation-host-attestation.v2");
  assert.equal(runtime.attestation.operationId, runtime.packet.operationId);
  assert.equal(runtime.attestation.sourceLockDigest, runtime.sourceLock.manifestDigest);
  assert.equal(runtime.attestation.anchorEvidenceDigest, runtime.anchorVerifiedEvidence.evidenceDigest);
  assert.equal(runtime.attestation.sourceFingerprint, sourceFingerprint);
  assert.equal(runtime.packet.schemaVersion, "myweb.g2b.clean-generation.cas-read-packet.v4");
  assert.equal(runtime.packet.requestedPolicyVersion, 3);
  assert.equal(runtime.packet.mutationReachable, false);
  assert.equal(runtime.sourceLock.sourceFingerprint, sourceFingerprint);
  assert.equal(runtime.packet.sourceLockRawSha256, createHash("sha256").update(readFileSync(sourceLockPath)).digest("hex"));
  assert.equal(runtime.packetExecutionEvidence.evidence.packetRawSha256,
    createHash("sha256").update(readFileSync(packetPath)).digest("hex"));
  assert.equal(runtime.packetExecutionEvidence.evidence.packetInternalDigest, runtime.packet.packetDigest);
  assert.equal(runtime.packetExecutionEvidence.evidence.packetSchema, runtime.packet.schemaVersion);
  assert.equal(runtime.packetExecutionEvidence.path, executionEvidencePath);
  assert.equal(verifyG2BCleanGenerationAttestationSignature(runtime.attestation).ok, true);
  const v2Secret = provider.read();
  assert.equal(v2Secret.state, "READY");
  const v2OperationId = randomUUID();
  const v2Bindings = { secret: v2Secret.secret, secretKeyId: v2Secret.keyId,
    generationId: runtime.generation.generationId, anchorEvidenceDigest: runtime.anchorVerifiedEvidence.evidenceDigest,
    identityFingerprint: runtime.generation.identityFingerprint,
    anchorFingerprint: runtime.anchorVerifiedEvidence.anchorFingerprint,
    memberFingerprint: sha256G2BCanonical({ member: identityResult.context.exactIamMember }),
    sourceFingerprint, sourceLockDigest: runtime.sourceLock.manifestDigest, operationId: v2OperationId,
    hostContextFingerprint: runtime.generation.hostContextFingerprint, environment, repositoryRoot: mirrorRoot };
  const v2Built = buildG2BCleanGenerationAttestationV2(v2Bindings);
  v2Secret.secret.fill(0);
  assert.equal(v2Built.ok, true, v2Built.code);
  const v2Check = verifyG2BCleanGenerationAttestationV2(v2Built.attestation,
    { ...v2Bindings, secret: undefined, now: Date.now() });
  assert.equal(v2Check.ok, true, v2Check.code);
  for (const change of [{ operationId: randomUUID() }, { sourceLockDigest: "f".repeat(64) },
    { sourceFingerprint: "e".repeat(64) }, { generationId: randomUUID() },
    { identityFingerprint: "d".repeat(64) }, { hostContextFingerprint: "c".repeat(64) },
    { anchorEvidenceDigest: "b".repeat(64) }]) {
    assert.equal(verifyG2BCleanGenerationAttestationV2(v2Built.attestation,
      { ...v2Bindings, ...change, secret: undefined, now: Date.now() }).ok, false);
  }
  assert.equal(verifyG2BCleanGenerationAttestationV2(v2Built.attestation,
    { ...v2Bindings, secret: undefined, now: Date.parse(v2Built.attestation.expiresAt) }).ok, false,
  "expired v2 signatures are ineligible");
  assert.equal(verifyG2BCleanGenerationAttestationV2({ ...v2Built.attestation, attestationSignature: "AA==" },
    { ...v2Bindings, secret: undefined, now: Date.now() }).ok, false,
  "a changed v2 signature is rejected");
  const v2Resolved = resolveG2BCleanCanonicalGeneration({ generationStore: store, manifestStore: manifests,
    attestation: v2Built.attestation, attestationBindings: { secretKeyId: v2Bindings.secretKeyId,
      environment, repositoryRoot: mirrorRoot, operationId: v2OperationId,
      sourceLockDigest: runtime.sourceLock.manifestDigest,
      hostContextFingerprint: runtime.generation.hostContextFingerprint }, now: Date.now() });
  assert.equal(v2Resolved.ok, true, v2Resolved.code);
  assert.equal(v2Resolved.readEligible, true);
  assert.equal(v2Resolved.canonicalGeneration, runtime.generation.generationId);
  for (const [name, digest] of priorManifestHashes) assert.equal(fileDigests(manifestDirectory).get(name), digest,
    "manifest predecessor bytes remain immutable");
  for (const [name, digest] of priorAttestationHashes) assert.equal(fileDigests(attestationDirectory).get(name), digest,
    "historical attestation bytes remain immutable and are not reused");

  const sdkRoot = join(scratch, "fake-cloud-sdk");
  const gcloud = join(sdkRoot, "bin", "gcloud.cmd");
  const fakePythonPath = join(sdkRoot, "platform", "bundledpython", "python.exe");
  const storeMarker = join(sdkRoot, "lib", "googlecloudsdk", "core", "credentials", "store.py");
  const fixtureScript = join(mirrorRoot, "tools", "authority-audit-tests", "g2bHelperMainLocalProvider.integration.py");
  mkdirSync(dirname(gcloud), { recursive: true });
  mkdirSync(dirname(fakePythonPath), { recursive: true });
  mkdirSync(dirname(storeMarker), { recursive: true });
  writeFileSync(gcloud, "@echo off\r\nexit /b 0\r\n", { flag: "wx" });
  writeFileSync(fakePythonPath, "fixture-runtime-marker", { flag: "wx" });
  writeFileSync(storeMarker, "# local fake provider fixture\n", { flag: "wx" });
  const fakeEnvironment = { ...environment, GCLOUD_PATH: gcloud, CLOUDSDK_CONFIG: join(scratch, "fake-cloud-config"),
    G2B_TEST_FAKE_ACCOUNT: identityResult.context.exactPrincipal, G2B_TEST_REQUEST_SHAPE: "FLAT" };
  for (const key of ["CLOUDSDK_AUTH_ACCESS_TOKEN", "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE", "CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT"]) delete fakeEnvironment[key];
  const expiryOperationId = randomUUID();
  const staleSecret = provider.read();
  assert.equal(staleSecret.state, "READY");
  const memberFingerprint = sha256G2BCanonical({ member: identityResult.context.exactIamMember });
  const staleAttestationResult = buildG2BCleanGenerationAttestationV2({ secret: staleSecret.secret,
    secretKeyId: staleSecret.keyId, generationId: runtime.generation.generationId,
    anchorEvidenceDigest: runtime.anchorVerifiedEvidence.evidenceDigest,
    identityFingerprint: runtime.generation.identityFingerprint,
    anchorFingerprint: runtime.anchorVerifiedEvidence.anchorFingerprint, memberFingerprint,
    sourceFingerprint, sourceLockDigest: runtime.sourceLock.manifestDigest, operationId: expiryOperationId,
    hostContextFingerprint: runtime.generation.hostContextFingerprint,
    environment, repositoryRoot: mirrorRoot, issuedAt: new Date(Date.now() - 120_001).toISOString() });
  staleSecret.secret.fill(0);
  assert.equal(staleAttestationResult.ok, true, staleAttestationResult.code);
  assert.equal(verifyG2BCleanGenerationAttestationSignature(staleAttestationResult.attestation).ok, true);
  const staleAttestationPath = join(attestationDirectory,
    `${staleAttestationResult.attestation.generationId}-${staleAttestationResult.attestation.operationId}-${staleAttestationResult.attestation.validationId}-v2.json`);
  writeFileSync(staleAttestationPath, `${canonicalG2BJson(staleAttestationResult.attestation)}\n`, { flag: "wx" });
  const expiryPacketPath = join(evidenceDirectory, `g2b-expiry-${expiryOperationId}-packet-v4.json`);
  const expiryPacket = buildG2BCleanCasReadPacketV4({ operationId: expiryOperationId,
    generationId: runtime.generation.generationId, bootstrapIntentId: runtime.intent.bootstrapIntentId,
    manifestVersion: runtime.manifest.manifestVersion, sourceFingerprint,
    sourceLockPath: relative(mirrorRoot, sourceLockOutput).replace(/\\/g, "/"),
    sourceCount: runtime.sourceLock.expectedCount, sourceLockDigest: runtime.sourceLock.manifestDigest,
    sourceLockRawSha256: createHash("sha256").update(readFileSync(sourceLockPath)).digest("hex"),
    attestationDigest: staleAttestationResult.attestation.attestationDigest,
    anchorEvidenceDigest: runtime.anchorVerifiedEvidence.evidenceDigest,
    anchorFingerprint: runtime.anchorVerifiedEvidence.anchorFingerprint, manifestDigest: runtime.manifest.manifestDigest,
    identityFingerprint: runtime.generation.identityFingerprint, hostContextFingerprint: runtime.generation.hostContextFingerprint,
    targetMember: identityResult.context.exactIamMember });
  writeFileSync(expiryPacketPath, `${JSON.stringify(expiryPacket)}\n`, { flag: "wx" });
  const packetRaw = readFileSync(expiryPacketPath);
  const packetRawHash = createHash("sha256").update(packetRaw).digest("hex");
  const envelope = Object.freeze({ executionMode: "REMOTE_READ_ONLY", executeRemoteNow: true,
    operationInstance: expiryPacket.operationId, approvalPacketSha256: packetRawHash,
    sourceLockDigest: expiryPacket.sourceLockDigest, credentialRefreshMax: 1, iamReadMax: 1, setIamPolicyMax: 0 });
  const processRunner = (request) => runG2BExplicitSetPythonProcess({ ...request,
    processHost: (_runtime, args, options) => {
      const child = spawnSync(process.env.PYTHON_EXECUTABLE || process.env.PYTHON || "python", [fixtureScript, "--child", ...args], options);
      const probeLine = child.stderr?.toString("utf8").split(/\r?\n/).find((line) => line.startsWith("G2B_TEST_PROVIDER_PROBE="));
      if (probeLine) observedProbe = JSON.parse(probeLine.slice("G2B_TEST_PROVIDER_PROBE=".length));
      if (Buffer.isBuffer(child.stdout)) {
        try {
          const parsed = JSON.parse(child.stdout.toString("utf8"));
          observedEnvelope = parsed;
          const normalized = parseG2BExplicitTransportResult({ spawnAttempted: true, spawnReturned: true,
            childProcessStarted: Number.isSafeInteger(child.pid) && child.pid > 0, exitCode: child.status,
            signal: child.signal, stdout: child.stdout, stderr: child.stderr }, "READ_GENERATION_BOUND_RECOVERY_POLICY");
          observedTransportDiagnostic = { ok: normalized.ok, code: normalized.code || null,
            failureClass: normalized.failureEvidence?.failureClass || null,
            errorClass: normalized.failureEvidence?.errorClass || null,
            schemaValid: normalized.failureEvidence?.schemaValid ?? null,
            resourceValid: normalized.failureEvidence?.resourceValid ?? null,
            unknownReason: normalized.failureEvidence?.unknownReason || null };
          observedChildDiagnostic = { ok: parsed.ok, failureCode: parsed.failure?.code || null,
            failedPhase: parsed.failure?.phase || null, providerRequestStarted: parsed.failure?.providerRequestStarted ?? null,
            providerResponseReceived: parsed.failure?.providerResponseReceived ?? null };
        } catch { observedChildDiagnostic = { stdoutJson: false }; }
      }
      observedChildDiagnostic = { ...observedChildDiagnostic, exitCode: child.status, signal: child.signal,
        spawnErrorCode: child.error?.code || null, stdoutBytes: child.stdout?.length || 0, stderrBytes: child.stderr?.length || 0 };
      return child;
    } });
  const createFakeTransport = (executionEnvelope) => {
    const underlying = createG2BExplicitSetIamPolicyAuthTransport({ enabled: true, executionEnvelope,
      environment: fakeEnvironment, processRunner });
    return Object.freeze({ ...underlying,
      prepareDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 0 }),
      executeDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 1 }),
    });
  };
  const transport = createFakeTransport(envelope);
  const executor = createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: mirrorRoot,
    storeDirectory, manifestDirectory, attestationDirectory, environment: fakeEnvironment,
    secretProvider: provider, testOnlyIdentityResolver: identityResult, outputDirectory: join(scratch, "executor-evidence") });
  const freshPacketRaw = readFileSync(packetPath);
  const freshPacketRawHash = createHash("sha256").update(freshPacketRaw).digest("hex");
  const freshEnvelope = Object.freeze({ executionMode: "REMOTE_READ_ONLY", executeRemoteNow: true,
    operationInstance: runtime.packet.operationId, approvalPacketSha256: freshPacketRawHash,
    sourceLockDigest: runtime.packet.sourceLockDigest, credentialRefreshMax: 1, iamReadMax: 1, setIamPolicyMax: 0 });
  const freshTransport = createFakeTransport(freshEnvelope);
  const freshExecution = await executor.execute({ packetPath: relative(mirrorRoot, packetPath).replace(/\\/g, "/"),
    expectedRawPacketSha256: freshPacketRawHash, executionEnvelope: freshEnvelope, transport: freshTransport });
  assert.equal(freshExecution.ok, true, JSON.stringify({ code: freshExecution.code, failedPhase: freshExecution.failedPhase,
    phases: freshExecution.phases, counters: freshExecution.counters, child: observedChildDiagnostic, probe: observedProbe }));
  assert.equal(freshExecution.evidence.attestationRefresh.refreshPerformed, false);
  assert.deepEqual(readFileSync(packetPath), freshPacketRaw, "the fresh production v4 packet bytes are passed unchanged");
  const execution = await executor.execute({ packetPath: relative(mirrorRoot, expiryPacketPath).replace(/\\/g, "/"),
    expectedRawPacketSha256: packetRawHash, executionEnvelope: envelope, transport });
  assert.equal(execution.ok, true, JSON.stringify({ code: execution.code, failedPhase: execution.failedPhase,
    phases: execution.phases, counters: execution.counters, child: observedChildDiagnostic, probe: observedProbe,
    envelope: observedEnvelope ? { ok: observedEnvelope.ok, code: observedEnvelope.code,
      topLevelKeys: Object.keys(observedEnvelope).sort(),
      failure: observedEnvelope.failure ? { code: observedEnvelope.failure.code, phase: observedEnvelope.failure.phase,
        requestStarted: observedEnvelope.failure.requestStarted, providerRequestStarted: observedEnvelope.failure.providerRequestStarted,
        providerResponseReceived: observedEnvelope.failure.providerResponseReceived,
        responseObjectType: observedEnvelope.failure.providerResponseObjectType,
        extractionPath: observedEnvelope.failure.policyExtractionPath } : null,
      providerMetadata: observedEnvelope.providerMetadata ? { ...observedEnvelope.providerMetadata } : null,
      serializationMetadata: observedEnvelope.serializationMetadata ? { ...observedEnvelope.serializationMetadata } : null,
      requestMetadata: observedEnvelope.requestMetadata ? { ...observedEnvelope.requestMetadata } : null,
      requestedPolicyVersion: observedEnvelope.requestedPolicyVersion,
      returnedPolicyVersion: observedEnvelope.returnedPolicyVersion,
      versionSourceLayer: observedEnvelope.versionSourceLayer,
      versionDiagnostic: observedEnvelope.versionDiagnostic ? { ...observedEnvelope.versionDiagnostic } : null,
      policyKeys: observedEnvelope.policy ? Object.keys(observedEnvelope.policy).sort() : null } : null,
    transport: observedTransportDiagnostic }));
  assert.equal(execution.evidence.requestedPolicyVersion, 3);
  assert.equal(execution.evidence.returnedPolicyVersion, 3);
  assert.equal(execution.evidence.etagPresent, true);
  assert.equal(execution.evidence.etagSha256, createHash("sha256").update("fixture-etag").digest("hex"));
  assert.equal(execution.evidence.targetBindingStateKnown, true);
  assert.equal(execution.evidence.attestationRefresh.refreshPerformed, true);
  assert.equal(execution.evidence.attestationRefresh.originalAttestationDigest, staleAttestationResult.attestation.attestationDigest);
  assert.notEqual(execution.evidence.attestationRefresh.refreshedAttestationDigest, staleAttestationResult.attestation.attestationDigest);
  assert.deepEqual(readFileSync(expiryPacketPath), packetRaw, "exact packet bytes remain unchanged after local refresh");
  assert.equal(createHash("sha256").update(readFileSync(expiryPacketPath)).digest("hex"), packetRawHash);
  assert.equal(JSON.parse(readFileSync(expiryPacketPath, "utf8")).packetDigest, expiryPacket.packetDigest);
  assert.equal(execution.result.iamMutations, 0);
  assert.equal(observedEnvelope.requestMetadata.requestedPolicyVersion, 3);
  assert.equal(observedEnvelope.requestMetadata.requestBodyOptionsVersionValidated, true);
  assert.equal(observedProbe.providerCalls, 1);
  assert.equal(observedProbe.requestResourceMatches, true);
  assert.equal(observedProbe.requestedPolicyVersion, 3);
  assert.equal(observedProbe.networkCalls, 0);

  const authorityAfter = snapshotTree(authorityRoot);
  const relevantEvidenceAfter = snapshotTree(join(repositoryRoot, "docs", "evidence"));
  assert.deepEqual(authorityAfter, authorityBefore, "real LocalAppData authority state is byte-for-byte unchanged");
  assert.deepEqual(relevantEvidenceAfter, relevantEvidenceBefore, "real repository evidence output tree is unchanged");
  console.log(JSON.stringify({
    dryRun: "PASS",
    trustedHostLeaves: gate.leaves.length,
    trustedHostFailures: gate.failures.length,
    sourceCount: sourceEntries.length,
    sourceFingerprint,
    manifestVersion: runtime.manifest.manifestVersion,
    readEligible: runtime.resolution.readEligible,
    mutationEligible: runtime.resolution.mutationEligible,
    packetSchema: runtime.packet.schemaVersion,
    packetRawSha256: packetRawHash,
    packetDigest: runtime.packet.packetDigest,
    executorCas: execution.evidence.casState,
    requestedPolicyVersion: observedProbe.requestedPolicyVersion,
    providerNetworkCalls: observedProbe.networkCalls,
    realAuthorityFileCount: authorityBefore.count,
    realAuthorityDigest: authorityBefore.digest,
    realAuthorityStateUnchanged: true,
    realGenerationCreated: false,
    remoteCalls: 0,
  }));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
