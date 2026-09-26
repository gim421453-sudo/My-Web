import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildG2BCleanCasReadPacket, buildG2BCleanCasReadPacketV3, buildG2BCleanSourceLock,
  verifyG2BCleanCasReadPacketV3 } from "../authority-audit/g2bCleanGenerationBootstrap.mjs";
import { compareG2BCleanCasPolicyBaselines, createG2BCleanGenerationCasEvidenceExecutor,
  G2B_CLEAN_CAS_PHASES, verifyG2BCleanCasBaselineEvidence } from "../authority-audit/g2bCleanGenerationCasEvidenceCapture.mjs";
import { G2B_CAS_SOURCE_PATHS } from "../authority-audit/g2bCanonicalSourceFingerprint.mjs";
import { sha256G2BCanonical } from "../authority-audit/g2bCanonicalGenerationManifest.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "../authority-audit/g2bRecoveryAnchor.mjs";

const root = process.cwd();
const scratch = mkdtempSync(join(tmpdir(), "myweb-clean-cas-unit-"));
const operationId = randomUUID();
const generationId = randomUUID();
const bootstrapIntentId = randomUUID();
const account = "fixture@example.invalid";
const member = `user:${account}`;
const identityFingerprint = sha256G2BCanonical({ account, member });
const source = buildG2BCleanSourceLock({ repositoryRoot: root });
const lockRelative = `docs/evidence/.clean-cas-${operationId}-source-lock.json`;
const packetRelative = `docs/evidence/.clean-cas-${operationId}-packet.json`;
const lockPath = join(root, lockRelative);
const packetPath = join(root, packetRelative);
const lockManifest = { ...source.manifest, sourceLocks: source.manifest.sourceLocks };
const packet = buildG2BCleanCasReadPacket({ operationId, generationId, bootstrapIntentId, manifestVersion: 3,
  sourceFingerprint: source.sourceFingerprint, sourceLockPath: lockRelative, sourceCount: source.expectedCount,
  sourceLockManifestDigest: source.manifestDigest, attestationDigest: "a".repeat(64), anchorEvidenceDigest: "b".repeat(64),
  manifestDigest: "c".repeat(64), identityFingerprint, targetMember: member });
const raw = Buffer.from(`${JSON.stringify(packet)}\n`);
const rawHash = createHash("sha256").update(raw).digest("hex");
const envelope = { executionMode: "REMOTE_READ_ONLY", executeRemoteNow: true, operationInstance: operationId,
  approvalPacketSha256: rawHash, sourceLockDigest: packet.sourceLockDigest, credentialRefreshMax: 1, iamReadMax: 1, setIamPolicyMax: 0 };
const trust = { identity: { exactPrincipal: account, exactIamMember: member }, identityFingerprint,
  generation: { generationId, sourceFingerprint: packet.sourceFingerprint }, manifest: { manifestVersion: 3, manifestDigest: packet.manifestDigest,
    canonicalGenerationId: generationId, sourceFingerprint: packet.sourceFingerprint },
  anchorEvidence: { evidenceDigest: packet.anchorVerifiedEvidenceDigest, generationId, sourceFingerprint: packet.sourceFingerprint },
  attestation: { attestationDigest: packet.attestationDigest, generationId, anchorEvidenceDigest: packet.anchorVerifiedEvidenceDigest,
    sourceFingerprint: packet.sourceFingerprint, identityFingerprint, hostContextFingerprint: "d".repeat(64) },
  resolved: { ok: true, readEligible: true, canonicalGeneration: generationId, manifestDigest: packet.manifestDigest,
    anchorEvidenceDigest: packet.anchorVerifiedEvidenceDigest } };
let refreshCalls = 0;
let readCalls = 0;
const temporaryPackets = [];
const successfulHelperExecution = Object.freeze({ schemaVersion: "myweb.g2b.helper-execution.v1", success: true,
  lastCompletedPhase: "PHASE_08_HELPER_SERIALIZATION", failedPhase: null, failureCode: null,
  requestBuilt: true, providerRequestPrepared: true, providerRequestStarted: true,
  providerResponseReceived: true, policyExtracted: true, requestMetadataAvailable: true, safeDiagnostics: {} });
const baselineReadMetadata = (policy) => {
  const conditionBindingCount = policy.bindings.filter((binding) => binding.condition !== undefined).length;
  return {
    serializationMetadata: { providerResponseShape: { providerResponseObjectModule: "builtins",
      providerResponseObjectClass: "dict", providerResponseWrapperType: "DIRECT_POLICY" } },
    responseFieldDiagnostic: { bindingsPresent: true, bindingsCount: policy.bindings.length,
      conditionBindingCount, conditionsPresent: conditionBindingCount > 0,
      etagPresent: true, etagType: "STRING", etagSha256: createHash("sha256").update(policy.etag).digest("hex") },
  };
};

try {
  mkdirSync(join(root, "docs", "evidence"), { recursive: true });
  writeFileSync(lockPath, `${JSON.stringify(lockManifest)}\n`, { flag: "wx" });
  writeFileSync(packetPath, raw, { flag: "wx" });
  assert.equal(packet.schemaVersion, "myweb.g2b.clean-generation.cas-read-packet.v2");
  assert.equal(packet.requestedPolicyVersion, 3);
  assert.equal(packet.sourceLockPath, lockRelative);
  assert.equal(packet.sourceLockDigest, source.manifestDigest);
  assert.equal(packet.anchorVerifiedEvidenceDigest, "b".repeat(64));
  assert.equal(packet.targetMember, undefined);
  assert.equal(packet.targetMemberFingerprint, sha256G2BCanonical({ member }));
  assert.equal(packet.sourceCount, G2B_CAS_SOURCE_PATHS.length);
  assert.equal(packet.setIamPolicyMax, 0);
  assert.equal(packet.mutationReachable, false);

  const executor = createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root,
    outputDirectory: join(scratch, "out"), testOnlyTrustResolver: () => trust });
  const transport = {
    prepareDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 0 }),
    executeDirectContextCredentialRefresh: async () => { refreshCalls += 1; return { ok: true, physicalCalls: 1 }; },
    readGenerationBoundRecoveryPolicy: async () => { readCalls += 1; return { ok: true, physicalCalls: 1, childProcessStarted: true,
      helperExecution: successfulHelperExecution,
      requestStarted: true, transportLifecycle: { providerRequestStarted: true, providerResponseReceived: true },
      requestedPolicyVersion: 3, returnedPolicyVersion: 3, returnedPolicyVersionState: "EXPLICIT",
      returnedPolicyVersionValue: 3, versionSourceLayer: "PYTHON_MESSAGE_TO_DICT",
      requestMetadata: { requestedPolicyVersion: 3, requestBodyOptionsVersionValidated: true, resourceValidatedBeforeDispatch: true,
        requestPathValidatedBeforeDispatch: true }, providerMetadata: { responseReceived: true, httpStatus: 200 },
      ...baselineReadMetadata({ etag: "fixture-etag", version: 3, bindings: [] }),
      policy: { etag: "fixture-etag", version: 3, bindings: [] }, transportLifecycle: { providerRequestStarted: true, providerResponseReceived: true } }; },
  };
  const result = await executor.execute({ packetPath: packetRelative, expectedRawPacketSha256: rawHash, executionEnvelope: envelope, transport });
  assert.equal(result.ok, true, result.code);
  assert.equal(result.evidence.targetBindingState, "ABSENT");
  assert.equal(result.evidence.targetBindingStateKnown, true);
  assert.equal(result.evidence.relevantBindingsDigest.length, 64);
  assert.equal(result.evidence.targetResource, G2B_TARGET_RESOURCE);
  assert.equal(result.evidence.targetRole, G2B_TARGET_ROLE);
  assert.equal(result.evidence.targetMember, member);
  assert.equal(result.evidence.operationId, operationId);
  assert.equal(result.evidence.generationId, generationId);
  assert.equal(result.evidence.sourceFingerprint, packet.sourceFingerprint);
  assert.equal(result.evidence.packetRawSha256, rawHash);
  assert.equal(result.evidence.packetInternalDigest, packet.packetDigest);
  assert.equal(result.evidence.providerSuccess, true);
  assert.equal(result.evidence.httpStatus, 200);
  assert.equal(result.evidence.providerResponseObjectClass, "dict");
  assert.equal(result.evidence.returnedPolicyVersionState, "EXPLICIT_3");
  assert.equal(result.evidence.etag, undefined);
  assert.equal(result.evidence.targetMemberFingerprint, packet.targetMemberFingerprint);
  assert.equal(result.evidence.baselineCapable, true, JSON.stringify(result.evidence.missingBaselineFields));
  assert.equal(result.evidence.fullBindingsCanonicalDigest.length, 64);
  assert.equal(result.evidence.conditionCanonicalDigest.length, 64);
  assert.equal(result.evidence.policyCanonicalDigest.length, 64);
  assert.equal(result.evidence.etagDigest.length, 64);
  assert.equal(verifyG2BCleanCasBaselineEvidence(result.evidence), true);
  assert.equal(verifyG2BCleanCasBaselineEvidence({ ...result.evidence, targetResource: "projects/other" }), false);
  const persistedEvidence = JSON.parse(readFileSync(result.outputPaths.evidence, "utf8"));
  for (const field of ["targetResource", "targetRole", "targetMember", "operationId", "generationId", "sourceFingerprint",
    "packetRawSha256", "packetInternalDigest", "policyCanonicalDigest", "fullBindingsCanonicalDigest",
    "conditionCanonicalDigest", "relevantBindingsDigest", "etagSha256", "returnedPolicyVersionState",
    "targetBindingState", "casState", "baselineCapable"]) assert.ok(Object.hasOwn(persistedEvidence, field), field);
  assert.equal(persistedEvidence.baselineIdDigest.length, 64);
  assert.equal(persistedEvidence.evidenceIntegrityDigest, result.evidence.evidenceIntegrityDigest);
  assert.equal(result.result.returnedPolicyVersion, 3);
  assert.deepEqual(result.counters, { credentialRefreshCalls: 1, iamPolicyReadCalls: 1, physicalRemoteCalls: 2, retries: 0, mutations: 0 });
  assert.equal(refreshCalls, 1);
  assert.equal(readCalls, 1);
  assert.equal(result.result.setIamPolicyCalls, 0);
  assert.equal(result.result.iamMutations, 0);

  const missingEtagDiagnosticTransport = { ...transport, executeDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 1 }),
    readGenerationBoundRecoveryPolicy: async () => ({ ok: true, physicalCalls: 1, childProcessStarted: true,
      helperExecution: successfulHelperExecution, requestStarted: true, requestedPolicyVersion: 3,
      returnedPolicyVersion: 3, returnedPolicyVersionState: "EXPLICIT", returnedPolicyVersionValue: 3,
      versionSourceLayer: "PYTHON_MESSAGE_TO_DICT",
      requestMetadata: { requestedPolicyVersion: 3, requestBodyOptionsVersionValidated: true,
        resourceValidatedBeforeDispatch: true, requestPathValidatedBeforeDispatch: true },
      providerMetadata: { responseReceived: true, httpStatus: 200 },
      serializationMetadata: { providerResponseShape: { providerResponseObjectModule: "fixture",
        providerResponseObjectClass: "Policy", providerResponseWrapperType: "SDK_POLICY_MESSAGE" } },
      responseFieldDiagnostic: { bindingsPresent: true, bindingsCount: 0, conditionBindingCount: 0, conditionsPresent: false },
      transportLifecycle: { providerRequestStarted: true, providerResponseReceived: true },
      policy: { etag: "opaque-but-undocumented", version: 3, bindings: [] } }) };
  const nonBaseline = await createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root,
    outputDirectory: join(scratch, "missing-baseline-fields"), testOnlyTrustResolver: () => trust })
    .execute({ packetPath: packetRelative, expectedRawPacketSha256: rawHash, executionEnvelope: envelope,
      transport: missingEtagDiagnosticTransport });
  assert.equal(nonBaseline.ok, true, nonBaseline.code);
  assert.equal(nonBaseline.evidence.baselineCapable, false);
  assert.ok(nonBaseline.evidence.missingBaselineFields.includes("etagPresent"));
  assert.ok(nonBaseline.evidence.missingBaselineFields.includes("etagSha256"));
  assert.equal(nonBaseline.evidence.etag, undefined);

  const unsetTransport = { ...transport, readGenerationBoundRecoveryPolicy: async () => ({ ok: true, physicalCalls: 1,
    childProcessStarted: true, helperExecution: successfulHelperExecution, requestStarted: true,
    requestedPolicyVersion: 3, returnedPolicyVersion: null, returnedPolicyVersionState: "UNSET",
    returnedPolicyVersionValue: null, versionSourceLayer: "PYTHON_MESSAGE_TO_DICT",
    requestMetadata: { requestedPolicyVersion: 3, requestBodyOptionsVersionValidated: true,
      resourceValidatedBeforeDispatch: true, requestPathValidatedBeforeDispatch: true },
    providerMetadata: { responseReceived: true, httpStatus: 200 },
    transportLifecycle: { providerRequestStarted: true, providerResponseReceived: true },
    ...baselineReadMetadata({ etag: "unset-fixture-etag", version: null, bindings: [] }),
    policy: { etag: "unset-fixture-etag", version: null, bindings: [] } }) };
  const unsetResult = await createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root,
    outputDirectory: join(scratch, "unset-out"), testOnlyTrustResolver: () => trust })
    .execute({ packetPath: packetRelative, expectedRawPacketSha256: rawHash, executionEnvelope: envelope, transport: unsetTransport });
  assert.equal(unsetResult.ok, true, unsetResult.code);
  assert.equal(unsetResult.evidence.requestedPolicyVersion, 3);
  assert.equal(unsetResult.evidence.returnedPolicyVersionState, "UNSET");
  assert.equal(unsetResult.evidence.returnedPolicyVersionValue, null);
  assert.equal(unsetResult.evidence.returnedPolicyVersion, null);
  assert.equal(unsetResult.evidence.etagPresent, true);
  assert.equal(unsetResult.evidence.etagType, "STRING");
  assert.equal(unsetResult.evidence.etagSha256.length, 64);
  assert.equal(unsetResult.evidence.targetBindingState, "ABSENT");
  assert.equal(unsetResult.evidence.baselineCapable, true, JSON.stringify(unsetResult.evidence.missingBaselineFields));
  assert.equal(verifyG2BCleanCasBaselineEvidence(unsetResult.evidence), true);
  assert.equal(unsetResult.evidence.conditionBindingCount, 0);
  assert.equal(unsetResult.evidence.unconditionalBindingCount, 0);
  assert.equal(unsetResult.evidence.conditionsPresent, false);
  assert.equal(unsetResult.result.returnedPolicyVersionState, "UNSET");
  assert.equal(unsetResult.result.iamMutations, 0);

  const runBaselineFixture = async (name, policy, versionState = "EXPLICIT") => {
    const fixtureTransport = { ...transport, executeDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 1 }),
      readGenerationBoundRecoveryPolicy: async () => ({ ok: true, physicalCalls: 1, childProcessStarted: true,
        helperExecution: successfulHelperExecution, requestStarted: true, requestedPolicyVersion: 3,
        returnedPolicyVersion: versionState === "UNSET" ? null : policy.version,
        returnedPolicyVersionState: versionState, returnedPolicyVersionValue: versionState === "UNSET" ? null : policy.version,
        versionSourceLayer: "PYTHON_MESSAGE_TO_DICT", ...baselineReadMetadata(policy),
        requestMetadata: { requestedPolicyVersion: 3, requestBodyOptionsVersionValidated: true,
          resourceValidatedBeforeDispatch: true, requestPathValidatedBeforeDispatch: true },
        providerMetadata: { responseReceived: true, httpStatus: 200 },
        transportLifecycle: { providerRequestStarted: true, providerResponseReceived: true }, policy }) };
    const fixture = await createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root,
      outputDirectory: join(scratch, `baseline-${name}`), testOnlyTrustResolver: () => trust })
      .execute({ packetPath: packetRelative, expectedRawPacketSha256: rawHash,
        executionEnvelope: envelope, transport: fixtureTransport });
    assert.equal(fixture.ok, true, `${name}: ${fixture.code}`);
    assert.equal(fixture.evidence.baselineCapable, true, `${name}: ${JSON.stringify(fixture.evidence.missingBaselineFields)}`);
    return fixture.evidence;
  };
  const multi = { etag: "baseline-etag", version: 1, bindings: [
    { role: "roles/viewer", members: ["user:b@example.invalid", "user:a@example.invalid"] },
    { role: "roles/editor", members: ["user:c@example.invalid"] },
  ] };
  const conditional = { etag: "baseline-etag", version: 3, bindings: [
    { role: G2B_TARGET_ROLE, members: ["user:other@example.invalid"] },
    { role: G2B_TARGET_ROLE, members: [member], condition: { expression: "request.time < timestamp('2030-01-01T00:00:00Z')", title: "guard" } },
  ] };
  const emptyEvidence = await runBaselineFixture("unset-empty", { etag: "unset", version: null, bindings: [] }, "UNSET");
  assert.equal(emptyEvidence.conditionCanonicalDigest, sha256G2BCanonical([]));
  const multipleEvidence = await runBaselineFixture("multiple-unconditional", multi);
  const explicitZeroEvidence = await runBaselineFixture("explicit-zero-version", { ...multi, version: 0 });
  assert.equal(explicitZeroEvidence.returnedPolicyVersionState, "EXPLICIT_0");
  assert.equal(explicitZeroEvidence.returnedPolicyVersionValue, 0);
  const orderEvidence = await runBaselineFixture("binding-order", { ...multi, bindings: [...multi.bindings].reverse() });
  assert.equal(orderEvidence.fullBindingsCanonicalDigest, multipleEvidence.fullBindingsCanonicalDigest);
  const memberOrderEvidence = await runBaselineFixture("member-order", { ...multi, bindings: [
    { ...multi.bindings[0], members: [...multi.bindings[0].members].reverse() }, multi.bindings[1],
  ] });
  assert.equal(memberOrderEvidence.fullBindingsCanonicalDigest, multipleEvidence.fullBindingsCanonicalDigest);
  const conditionalEvidence = await runBaselineFixture("conditional", conditional);
  assert.equal(conditionalEvidence.conditionBindingCount, 1);
  assert.equal(conditionalEvidence.unconditionalBindingCount, 1);
  assert.equal(conditionalEvidence.conditionsPresent, true);
  assert.equal(conditionalEvidence.targetBindingState, "CONDITIONALLY_PRESENT");
  const changedMember = await runBaselineFixture("member-change", { ...multi, bindings: [
    { ...multi.bindings[0], members: ["user:changed@example.invalid", "user:a@example.invalid"] }, multi.bindings[1],
  ] });
  assert.notEqual(changedMember.fullBindingsCanonicalDigest, multipleEvidence.fullBindingsCanonicalDigest);
  const duplicateMember = await runBaselineFixture("duplicate-member-preserved", { ...multi, bindings: [
    { ...multi.bindings[0], members: [...multi.bindings[0].members, multi.bindings[0].members[0]] }, multi.bindings[1],
  ] });
  assert.notEqual(duplicateMember.fullBindingsCanonicalDigest, multipleEvidence.fullBindingsCanonicalDigest);
  const unrelatedChange = await runBaselineFixture("unrelated-binding-change", { ...multi,
    bindings: [...multi.bindings, { role: "roles/logging.viewer", members: ["user:new@example.invalid"] }] });
  assert.notEqual(unrelatedChange.fullBindingsCanonicalDigest, multipleEvidence.fullBindingsCanonicalDigest);
  assert.equal(unrelatedChange.relevantBindingsDigest, multipleEvidence.relevantBindingsDigest);
  const targetChange = await runBaselineFixture("target-binding-change", { ...multi,
    bindings: [...multi.bindings, { role: G2B_TARGET_ROLE, members: [member] }] });
  assert.notEqual(targetChange.relevantBindingsDigest, multipleEvidence.relevantBindingsDigest);
  const changedCondition = await runBaselineFixture("condition-change", { ...conditional,
    bindings: [conditional.bindings[0], { ...conditional.bindings[1], condition: { expression: "false", title: "guard" } }] });
  assert.notEqual(changedCondition.conditionCanonicalDigest, conditionalEvidence.conditionCanonicalDigest);
  assert.notEqual(changedCondition.policyCanonicalDigest, conditionalEvidence.policyCanonicalDigest);
  for (const field of ["title", "description", "expression"]) {
    const altered = { ...conditional.bindings[1].condition, [field]: `changed-${field}` };
    const fieldChange = await runBaselineFixture(`condition-${field}-change`, { ...conditional,
      bindings: [conditional.bindings[0], { ...conditional.bindings[1], condition: altered }] });
    assert.notEqual(fieldChange.conditionCanonicalDigest, conditionalEvidence.conditionCanonicalDigest, field);
  }
  const unsetConditionField = await runBaselineFixture("condition-field-unset", { ...conditional,
    bindings: [conditional.bindings[0], { ...conditional.bindings[1], condition: { expression: "true" } }] });
  const emptyConditionField = await runBaselineFixture("condition-field-empty", { ...conditional,
    bindings: [conditional.bindings[0], { ...conditional.bindings[1], condition: { expression: "true", title: "" } }] });
  const nullConditionField = await runBaselineFixture("condition-field-null", { ...conditional,
    bindings: [conditional.bindings[0], { ...conditional.bindings[1], condition: { expression: "true", title: null } }] });
  assert.notEqual(unsetConditionField.conditionCanonicalDigest, emptyConditionField.conditionCanonicalDigest);
  assert.notEqual(unsetConditionField.conditionCanonicalDigest, nullConditionField.conditionCanonicalDigest);
  const etagOnly = await runBaselineFixture("etag-only-change", { ...multi, etag: "different-etag" });
  assert.equal(etagOnly.policyCanonicalDigest, multipleEvidence.policyCanonicalDigest);
  assert.notEqual(etagOnly.etagDigest, multipleEvidence.etagDigest);
  assert.equal(etagOnly.etagSha256, etagOnly.etagDigest);
  const drift = compareG2BCleanCasPolicyBaselines(multipleEvidence, etagOnly);
  assert.equal(drift.ok, true);
  assert.equal(drift.ETAG_CHANGED, true);
  assert.equal(drift.POLICY_SEMANTIC_CHANGED, false);

  const wrongHash = await createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root, testOnlyTrustResolver: () => trust })
    .execute({ packetPath: packetRelative, expectedRawPacketSha256: "f".repeat(64), executionEnvelope: envelope, transport });
  assert.equal(wrongHash.code, "CLEAN_PACKET_FILE_HASH_MISMATCH");
  assert.equal(wrongHash.counters.credentialRefreshCalls, 0);
  assert.deepEqual(G2B_CLEAN_CAS_PHASES.slice(0, 3), ["PACKET_FILE_HASH_VERIFIED", "PACKET_DIGEST_VERIFIED", "PACKET_SCHEMA_ACCEPTED"]);

  const invalidEnvelope = { ...envelope, setIamPolicyMax: 1 };
  const denied = await createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root, testOnlyTrustResolver: () => trust })
    .execute({ packetPath: packetRelative, expectedRawPacketSha256: rawHash, executionEnvelope: invalidEnvelope, transport });
  assert.equal(denied.code, "CLEAN_BUDGET_INVALID");
  assert.equal(refreshCalls, 2);

  const negativeCases = [
    ["internal-digest", (value) => ({ ...value, packetDigest: "f".repeat(64) }), "CLEAN_PACKET_DIGEST_MISMATCH", false],
    ["source-lock-path", (value) => ({ ...value, sourceLockPath: "" }), "CLEAN_PACKET_SCHEMA_INVALID", true],
    ["source-lock-digest", (value) => ({ ...value, sourceLockDigest: "d".repeat(64) }), "CLEAN_SOURCE_LOCK_MISMATCH", true],
    ["source-count", (value) => ({ ...value, sourceCount: value.sourceCount + 1 }), "CLEAN_PACKET_SCHEMA_INVALID", true],
    ["generation", (value) => ({ ...value, canonicalGenerationId: randomUUID() }), "CLEAN_GENERATION_MISMATCH", true],
    ["manifest", (value) => ({ ...value, manifestDigest: "e".repeat(64) }), "CLEAN_MANIFEST_INVALID", true],
    ["anchor", (value) => ({ ...value, anchorVerifiedEvidenceDigest: "f".repeat(64) }), "CLEAN_ANCHOR_EVIDENCE_INVALID", true],
    ["attestation", (value) => ({ ...value, attestationDigest: "1".repeat(64) }), "CLEAN_ATTESTATION_INVALID", true],
    ["requested-version", (value) => ({ ...value, requestedPolicyVersion: 2 }), "CLEAN_PACKET_SCHEMA_INVALID", true],
    ["requested-version-missing", (value) => { const { requestedPolicyVersion: _discarded, ...rest } = value; return rest; }, "CLEAN_PACKET_SCHEMA_INVALID", true],
    ["mutation-budget", (value) => ({ ...value, mutationReachable: true }), "CLEAN_PACKET_SCHEMA_INVALID", true],
    ["historical-generation", (value) => ({ ...value, canonicalGenerationId: "8c7cf023-ff93-4070-af83-293a2d67a1f0" }), "CLEAN_PACKET_SCHEMA_INVALID", true],
    ["legacy-packet", (value) => ({ ...value, schemaVersion: "myweb.g2b.cas-read-packet.v4" }), "CLEAN_PACKET_SCHEMA_INVALID", true],
  ];
  for (const [name, mutate, expectedCode, recalculateDigest] of negativeCases) {
    const changed = mutate({ ...packet });
    if (recalculateDigest) {
      const { packetDigest: _discarded, ...payload } = changed;
      changed.packetDigest = sha256G2BCanonical(payload);
    }
    const changedBytes = Buffer.from(`${JSON.stringify(changed)}\n`);
    const changedPath = `docs/evidence/.clean-cas-${operationId}-${name}.json`;
    const absoluteChangedPath = join(root, changedPath);
    temporaryPackets.push(absoluteChangedPath);
    writeFileSync(absoluteChangedPath, changedBytes, { flag: "wx" });
    const changedHash = createHash("sha256").update(changedBytes).digest("hex");
    const changedEnvelope = { ...envelope, approvalPacketSha256: changedHash, sourceLockDigest: changed.sourceLockDigest };
    const blocked = await createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root,
      testOnlyTrustResolver: () => trust }).execute({ packetPath: changedPath, expectedRawPacketSha256: changedHash,
      executionEnvelope: changedEnvelope, transport });
    assert.equal(blocked.code, expectedCode, name);
  }
  assert.equal(refreshCalls, 2, "negative preflight cases never reach credential refresh");
  assert.equal(readCalls, 1, "negative preflight cases never reach IAM read");
  const staleTrust = { ...trust, resolved: { ...trust.resolved, readEligible: false } };
  const expired = await createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root,
    testOnlyTrustResolver: () => staleTrust }).execute({ packetPath: packetRelative,
    expectedRawPacketSha256: rawHash, executionEnvelope: envelope, transport });
  assert.equal(expired.code, "CLEAN_ATTESTATION_INVALID");
  assert.equal(refreshCalls, 2);
  assert.equal(readCalls, 1);

  const failedTransport = {
    prepareDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 0 }),
    executeDirectContextCredentialRefresh: async () => ({ ok: true, physicalCalls: 1 }),
    readGenerationBoundRecoveryPolicy: async () => ({ ok: false, physicalCalls: 0, childProcessStarted: true, requestStarted: false,
      helperFailureCode: "REQUEST_BUILD_FAILED",
      helperExecution: { ...successfulHelperExecution, success: false, lastCompletedPhase: "PHASE_03_CHILD_STARTED",
        failedPhase: "PHASE_04_HELPER_INPUT_ACCEPTED", failureCode: "REQUEST_BUILD_FAILED",
        requestBuilt: false, providerRequestPrepared: false, providerRequestStarted: false,
        providerResponseReceived: false, policyExtracted: false, requestMetadataAvailable: false,
        safeDiagnostics: { serializationShape: "UNSUPPORTED" } },
      requestMetadata: null,
      transportLifecycle: { providerRequestPrepared: false, providerRequestStarted: false, providerResponseReceived: false },
      providerMetadata: { responseReceived: false, httpStatus: null },
      failureEvidence: { failureClass: "TRANSPORT_EXEC_FAILED", transportStage: "NODE_SPAWN_SYNC_RETURNED",
        spawnAttempted: true, spawnReturned: true, childPidPresent: false, spawnErrorCode: "EPERM",
        spawnErrorName: "Error", spawnErrorErrno: -4048, spawnErrorSyscall: "spawnSync",
        executableBasename: "python.exe", executablePathSha256: "a".repeat(64), helperPathSha256: "b".repeat(64),
        cwdSha256: "c".repeat(64), argvCount: 3, argvSha256: "d".repeat(64), envKeyCount: 5,
        safeEnvPresence: { PATH: true, CLOUDSDK_CONFIG: false }, protocolEnvelopePresent: false,
        protocolEnvelopeType: "NONE", helperStartedMarker: false, providerDispatchMarker: false,
        requestStarted: false, stdoutByteLength: 0, stderrByteLength: 27,
        failureVersionDiagnostic: { versionFieldPresent: false, versionRawType: "MISSING", versionRawPrimitiveValue: null,
          versionAllowedSet: [0, 1, 3], versionNormalizationResult: "MISSING",
          versionNormalizationFailureReason: "MISSING", versionSource: "MISSING" },
        responseFieldDiagnostic: { protobufVersionFieldPresent: false, protobufVersionType: "MISSING", protobufVersionValue: null,
          apitoolsPolicyClassVerified: false, apitoolsBindingsState: "NOT_APITOOLS_POLICY",
          apitoolsDirectEtagPresent: false, apitoolsDirectEtagType: "MISSING", apitoolsDirectEtagSha256: null,
          versionDirectPresent: false, versionDirectType: "MISSING", versionDirectValue: null,
          versionDescriptorType: null, versionHasPresence: null, versionDefaultValue: null, versionListedInListFields: null,
          messageToDictVersionPresent: false, messageToDictVersionType: "MISSING", messageToDictVersionValue: null,
          messageToDictDefaultsVersionPresent: false, messageToDictDefaultsVersionType: "MISSING", messageToDictDefaultsVersionValue: null,
          etagPresent: false, etagType: "OTHER", etagSha256: null, bindingsPresent: false,
          bindingsCount: null, conditionBindingCount: null, conditionsPresent: false, withcondRoleMarkerPresent: false },
        stdoutSha256: "e".repeat(64), stderrSha256: "f".repeat(64) } }),
  };
  const failureDirectory = join(scratch, "failure-out");
  const failed = await createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root,
    outputDirectory: failureDirectory, testOnlyTrustResolver: () => trust }).execute({ packetPath: packetRelative,
    expectedRawPacketSha256: rawHash, executionEnvelope: envelope, transport: failedTransport });
  assert.equal(failed.code, "CLEAN_HELPER_REQUEST_BUILD_FAILED");
  assert.equal(failed.counters.physicalRemoteCalls, 1);
  const failurePath = join(failureDirectory, `g2b-clean-cas-read-${operationId}-failure.json`);
  const failureEvidence = JSON.parse(readFileSync(failurePath, "utf8"));
  assert.equal(failureEvidence.approvalConsumed, true);
  assert.equal(failureEvidence.counters.physicalRemoteCalls, 1);
  assert.equal("policy" in failureEvidence, false);
  assert.equal("token" in failureEvidence, false);
  assert.equal(failureEvidence.transportDiagnostics.spawnErrorCode, "EPERM");
  assert.equal(failureEvidence.helperFailureCode, "REQUEST_BUILD_FAILED");
  assert.equal(failureEvidence.helperExecution.providerRequestStarted, false);
  assert.equal(failureEvidence.helperExecution.safeDiagnostics.serializationShape, "UNSUPPORTED");
  assert.equal(failureEvidence.transportDiagnostics.childPidPresent, false);
  assert.equal(failureEvidence.transportDiagnostics.providerDispatchMarker, false);
  assert.deepEqual(failureEvidence.transportDiagnostics.failureVersionDiagnostic.versionAllowedSet, [0, 1, 3]);
  assert.equal(failureEvidence.transportDiagnostics.responseFieldDiagnostic.etagPresent, false);
  assert.equal(JSON.stringify(failureEvidence).includes("private-path"), false);

  const expiryOperationId = randomUUID();
  const expiryGenerationId = randomUUID();
  const expiryIntentId = randomUUID();
  const anchorFingerprint = "e".repeat(64);
  const hostContextFingerprint = "d".repeat(64);
  const signerFingerprint = "f".repeat(64);
  const initialAttestationDigest = "9".repeat(64);
  const expiryPacketRelative = `docs/evidence/.clean-cas-${expiryOperationId}-packet-v3.json`;
  const expiryPacketPath = join(root, expiryPacketRelative);
  const expiryOutput = join(scratch, "expiry-output");
  const expiryPacket = buildG2BCleanCasReadPacketV3({ operationId: expiryOperationId, generationId: expiryGenerationId,
    bootstrapIntentId: expiryIntentId, manifestVersion: 1, sourceFingerprint: source.sourceFingerprint,
    sourceLockPath: lockRelative, sourceCount: source.expectedCount, sourceLockManifestDigest: source.manifestDigest,
    initialAttestationDigest, anchorEvidenceDigest: "b".repeat(64), anchorFingerprint, manifestDigest: "c".repeat(64),
    identityFingerprint, hostContextFingerprint, signerFingerprint, targetMember: member });
  const expiryRaw = Buffer.from(`${JSON.stringify(expiryPacket)}\n`);
  writeFileSync(expiryPacketPath, expiryRaw, { flag: "wx" });
  temporaryPackets.push(expiryPacketPath);
  const expiryRawHash = createHash("sha256").update(expiryRaw).digest("hex");
  const expiryEnvelope = { ...envelope, operationInstance: expiryOperationId, approvalPacketSha256: expiryRawHash };
  const expiredAttestation = { schemaVersion: "myweb.g2b.clean-generation-host-attestation.v1",
    attestationDigest: initialAttestationDigest, generationId: expiryGenerationId,
    anchorEvidenceDigest: expiryPacket.anchorVerifiedEvidenceDigest, anchorFingerprint,
    identityFingerprint, memberFingerprint: expiryPacket.targetMemberFingerprint, hostContextFingerprint,
    sourceFingerprintSchemaVersion: 2, sourceFingerprint: source.sourceFingerprint,
    publicKeyFingerprint: signerFingerprint, validatedAt: new Date(Date.now() - 120_001).toISOString(),
    validationProvider: "WINDOWS_DPAPI_CURRENT_USER", validationEnvironment: "TRUSTED_WINDOWS_HOST",
    result: "VALID", dpapiUnprotectSucceeded: true, hmacValid: true, generationMatch: true, identityMatch: true, hostMatch: true, sourceMatch: true };
  const expiryTrust = { identity: { exactPrincipal: account, exactIamMember: member }, identityFingerprint,
    generation: { generationId: expiryGenerationId, sourceFingerprint: source.sourceFingerprint,
      identityFingerprint, hostContextFingerprint },
    manifest: { manifestVersion: 1, manifestDigest: expiryPacket.manifestDigest, canonicalGenerationId: expiryGenerationId,
      sourceFingerprint: source.sourceFingerprint },
    anchorEvidence: { evidenceDigest: expiryPacket.anchorVerifiedEvidenceDigest, generationId: expiryGenerationId,
      sourceFingerprint: source.sourceFingerprint, anchorFingerprint, hostContextFingerprint, identityFingerprint },
    anchor: { secretKeyId: randomUUID() }, store: {}, manifestStore: {}, attestationDirectory: scratch,
    attestation: expiredAttestation, attestationBindingValid: true, attestationFresh: false, attestationAgeMs: 120_001,
    resolved: { ok: false, readEligible: false, canonicalGeneration: expiryGenerationId,
      manifestDigest: expiryPacket.manifestDigest, anchorEvidenceDigest: expiryPacket.anchorVerifiedEvidenceDigest } };
  let localRefreshCalls = 0;
  let expiryReadCalls = 0;
  const refreshedAttestation = { ...expiredAttestation, attestationDigest: "8".repeat(64), validatedAt: new Date().toISOString() };
  const expiryRefresher = ({ now }) => { localRefreshCalls += 1; refreshedAttestation.validatedAt = new Date(now).toISOString();
    return { ok: true, attestation: refreshedAttestation, resolved: { ok: true, readEligible: true,
      canonicalGeneration: expiryGenerationId, manifestDigest: expiryPacket.manifestDigest,
      anchorEvidenceDigest: expiryPacket.anchorVerifiedEvidenceDigest } }; };
  const expiryTransport = { ...transport,
    readGenerationBoundRecoveryPolicy: async () => { expiryReadCalls += 1; return { ok: true, physicalCalls: 1,
      helperExecution: successfulHelperExecution,
      childProcessStarted: true, requestStarted: true, requestedPolicyVersion: 3, returnedPolicyVersion: 3,
      returnedPolicyVersionState: "EXPLICIT", returnedPolicyVersionValue: 3,
      versionSourceLayer: "PYTHON_MESSAGE_TO_DICT", requestMetadata: { requestedPolicyVersion: 3,
        requestBodyOptionsVersionValidated: true, resourceValidatedBeforeDispatch: true, requestPathValidatedBeforeDispatch: true },
      providerMetadata: { responseReceived: true, httpStatus: 200 },
      transportLifecycle: { providerRequestStarted: true, providerResponseReceived: true },
      ...baselineReadMetadata({ etag: "expiry-fixture-etag", version: 3, bindings: [] }),
      policy: { etag: "expiry-fixture-etag", version: 3, bindings: [] } }; },
  };
  const expiryExecutor = createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root, outputDirectory: expiryOutput,
    testOnlyTrustResolver: () => expiryTrust, testOnlyAttestationRefresher: expiryRefresher });
  const expiryResult = await expiryExecutor.execute({ packetPath: expiryPacketRelative,
    expectedRawPacketSha256: expiryRawHash, executionEnvelope: expiryEnvelope, transport: expiryTransport });
  assert.equal(expiryResult.ok, true, expiryResult.code);
  assert.equal(verifyG2BCleanCasReadPacketV3(JSON.parse(readFileSync(expiryPacketPath, "utf8"))), true);
  assert.equal(createHash("sha256").update(readFileSync(expiryPacketPath)).digest("hex"), expiryRawHash);
  assert.equal(expiryPacket.packetDigest, JSON.parse(readFileSync(expiryPacketPath, "utf8")).packetDigest);
  assert.equal(localRefreshCalls, 1);
  assert.equal(expiryReadCalls, 1);
  assert.equal(expiryResult.evidence.casState, "RESOLVED");
  assert.deepEqual(expiryResult.evidence.attestationRefresh, { originalAttestationDigest: initialAttestationDigest,
    originalAttestationState: "EXPIRED_ONLY", refreshPerformed: true, refreshedAttestationDigest: "8".repeat(64),
    refreshedAgeMs: expiryResult.evidence.attestationRefresh.refreshedAgeMs, bindingComparisonResult: "EXACT_IMMUTABLE_BINDING_MATCH" });
  const expiryJournal = JSON.parse(readFileSync(join(expiryOutput,
    `g2b-clean-cas-read-${expiryOperationId}-journal.json`), "utf8"));
  assert.deepEqual(expiryJournal.attestationRefresh, expiryResult.evidence.attestationRefresh);
  assert.equal(expiryResult.evidence.requestedPolicyVersion, 3);
  assert.equal(expiryResult.result.iamMutations, 0);
  assert.equal(expiryResult.counters.retries, 0);
  const expiryNegativeCases = [
    ["generation", { generationId: randomUUID() }], ["anchor", { anchorEvidenceDigest: "1".repeat(64) }],
    ["identity", { identityFingerprint: "2".repeat(64) }], ["member", { memberFingerprint: "3".repeat(64) }],
    ["host", { hostContextFingerprint: "4".repeat(64) }], ["source", { sourceFingerprint: "5".repeat(64) }],
    ["signer", { publicKeyFingerprint: "6".repeat(64) }], ["schema", { schemaVersion: "unknown" }],
  ];
  for (const [name, change] of expiryNegativeCases) {
    const altered = { ...expiryTrust, attestation: { ...expiredAttestation, ...change } };
    let calls = 0;
    const blocked = await createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root,
      outputDirectory: join(scratch, `negative-${name}`), testOnlyTrustResolver: () => altered,
      testOnlyAttestationRefresher: () => { calls += 1; return { ok: true, attestation: refreshedAttestation }; } })
      .execute({ packetPath: expiryPacketRelative, expectedRawPacketSha256: expiryRawHash,
        executionEnvelope: expiryEnvelope, transport: expiryTransport });
    assert.equal(blocked.ok, false, name);
    assert.equal(calls, 0, `${name} mismatch cannot be refreshed`);
  }
  let invalidSignatureRefreshCalls = 0;
  const invalidSignature = await createG2BCleanGenerationCasEvidenceExecutor({ repositoryRoot: root,
    outputDirectory: join(scratch, "negative-signature"), testOnlyTrustResolver: () => ({ ...expiryTrust, attestationBindingValid: false }),
    testOnlyAttestationRefresher: () => { invalidSignatureRefreshCalls += 1; return { ok: true, attestation: refreshedAttestation }; } })
    .execute({ packetPath: expiryPacketRelative, expectedRawPacketSha256: expiryRawHash,
      executionEnvelope: expiryEnvelope, transport: expiryTransport });
  assert.equal(invalidSignature.ok, false);
  assert.equal(invalidSignatureRefreshCalls, 0, "invalid signature cannot be refreshed");
  const alteredPolicy = { ...expiryPacket, requestedPolicyVersion: 2,
    attestationBindingPolicy: { ...expiryPacket.attestationBindingPolicy, requestedPolicyVersion: 2 } };
  delete alteredPolicy.packetDigest;
  alteredPolicy.packetDigest = sha256G2BCanonical(alteredPolicy);
  assert.equal(verifyG2BCleanCasReadPacketV3(alteredPolicy), false,
    "modified request version is rejected even after recomputing the internal digest");
  console.log("Clean-generation CAS packet/executor fixtures passed; IAM mutation=0");
} finally {
  for (const path of temporaryPackets) { try { rmSync(path, { force: true }); } catch {} }
  try { rmSync(lockPath, { force: true }); } catch {}
  try { rmSync(packetPath, { force: true }); } catch {}
  try { rmSync(scratch, { recursive: true, force: true }); } catch {}
}
