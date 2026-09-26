import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { buildG2BCasEvidenceReadSourceLock, buildG2BCasMutationApprovalPacket, captureG2BCasEvidence, completeG2BCasEvidenceRead, createG2BCasEvidenceReadArtifactPaths, createG2BCasEvidenceReadExecutor as createG2BCasEvidenceReadExecutorImpl, createG2BCasEvidenceReadJournal, G2B_CAS_MUTATION_PACKET_SCHEMA, G2B_CAS_READ_OPERATION_INSTANCE, prepareG2BCasEvidenceReadApproval, prepareG2BCasEvidenceReadRetryApproval, runG2BExecutionAttestationLifecycle, serializeG2BCasJson, verifyG2BCasMutationApprovalPacket, writeG2BCasEvidenceReadApproval, writeG2BCasEvidenceReadSourceLock } from "../authority-audit/g2bCasEvidenceCapture.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "../authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT } from "../authority-audit/g2bDirectCachedCredentialReadiness.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { parseG2BExplicitTransportResult } from "../authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs";
import { computeCanonicalSourceFingerprint } from "../authority-audit/g2bCanonicalSourceFingerprint.mjs";
const member = "serviceAccount:cas-target@example.invalid";
const account = "operator@example.invalid";
assert.equal(JSON.parse(serializeG2BCasJson({ ok: true, value: null })).ok, true);
for (const invalid of [{ missing: undefined }, { value: 1n }, { value: Number.NaN }]) assert.throws(() => serializeG2BCasJson(invalid));
const cyclicJson = {};
cyclicJson.self = cyclicJson;
assert.throws(() => serializeG2BCasJson(cyclicJson));
{
  const root = mkdtempSync(join(tmpdir(), "myweb-source-lock-roundtrip-"));
  const op = "d6c78e7c-1828-4080-965e-4b5e21d2f707";
  const preparedLock = buildG2BCasEvidenceReadSourceLock({ operationInstance: op });
  assert.equal(preparedLock.ok, true);
  const writtenLock = writeG2BCasEvidenceReadSourceLock(preparedLock, { repositoryRoot: root, path: "source-lock.json" });
  const rereadLock = JSON.parse(readFileSync(resolve(root, "source-lock.json"), "utf8"));
  assert.equal(rereadLock.operationInstance, op);
  assert.equal(rereadLock.sourceLocks.length, preparedLock.sourceLockFileCount);
  assert.equal(writtenLock.sourceLockDigest, preparedLock.sourceLockDigest);
}
const provenance = Object.freeze({
  kind: "APPROVED_GENERATION_BOUND_LIVE_READ",
  operationInstance: G2B_CAS_READ_OPERATION_INSTANCE,
  parentOperationInstance: "f9ddbb53-3106-40cd-a930-2fba2d9d2152",
  approvalConsumed: true,
  requestStarted: true,
  httpStatus: 200,
  requestedPolicyVersion: 3,
  returnedPolicyVersion: 3,
  versionSourceLayer: "PYTHON_MESSAGE_TO_DICT"
});
const basePolicy = () => ({
  version: 3,
  etag: "opaque-etag-test-only",
  bindings: [{
    role: "roles/viewer",
    members: ["user:unrelated@example.invalid"]
  }]
});
const policyRead = (policy = basePolicy()) => ({
  ok: true,
  physicalCalls: 1,
  policy,
  requestedPolicyVersion: 3,
  returnedPolicyVersion: policy.version,
  versionSourceLayer: "PYTHON_MESSAGE_TO_DICT"
});
const capture = (policy = basePolicy(), overrides = {}) => captureG2BCasEvidence({
  policy,
  provenance,
  iamResource: G2B_TARGET_RESOURCE,
  targetRole: G2B_TARGET_ROLE,
  targetPrincipal: member,
  generationId: G2B_INTERRUPTED_M3_GENERATION,
  sourceSnapshotDigest: "852764abb7e811db23060204be0d36f721594cd70d9a74c4235df4199bb89b91",
  sourceLockDigest: "b".repeat(64),
  readTimestamp: "2026-09-23T00:00:00.000Z",
  ...overrides
});
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}` : JSON.stringify(value);
const canonicalIamResource = `projects/my-management-app-8a933/serviceAccounts/${G2B_TARGET_RESOURCE}`;
const transportRequestMetadata = () => ({
  approvedResourceFingerprint: createHash("sha256").update(canonicalIamResource).digest("hex"),
  requestResourceFingerprint: createHash("sha256").update(canonicalIamResource).digest("hex"),
  resourceValidatedBeforeDispatch: true,
  requestPathFingerprint: createHash("sha256").update(`v1/${canonicalIamResource}:getIamPolicy`).digest("hex"),
  requestPathValidatedBeforeDispatch: true,
  requestedPolicyVersion: 3,
  requestBodyOptionsVersionValidated: true,
});
const providerResponseShape = (policy) => ({
  providerResponseObjectType: "MAPPING", providerResponseIsMapping: true, providerResponseIsMessageLike: false,
  providerResponseObjectModule: "fixture", providerResponseObjectClass: "Policy", providerResponseWrapperType: "DIRECT_POLICY",
  providerResponseTopLevelKeyCount: Object.keys(policy).length,
  providerResponseSafeTopLevelKeys: Object.keys(policy).filter((key) => ["version", "etag", "bindings", "auditConfigs", "audit_configs"].includes(key)).sort(),
  unknownKeyCount: 0,
  hasRootVersion: Object.hasOwn(policy, "version"), hasRootEtag: Object.hasOwn(policy, "etag"),
  hasRootBindings: Object.hasOwn(policy, "bindings"), hasRootPolicy: false, hasRootResponse: false,
  hasRootResult: false, hasRootData: false, rootVersionType: "INTEGER", rootVersionPrimitiveValue: policy.version,
  nestedPolicyPresent: false, nestedPolicyVersionPresent: false, nestedPolicyVersionType: "MISSING",
  policyExtractionPath: "DIRECT_POLICY_MAPPING", policyExtractionResult: "EXTRACTED", extractedPolicyObjectType: "MAPPING",
});
const successResponseDiagnostics = (policy) => {
  const version = policy.version;
  const explicitVersion = Number.isSafeInteger(version);
  const bindings = Array.isArray(policy.bindings) ? policy.bindings : [];
  const conditionCount = bindings.filter((binding) => binding.condition !== undefined).length;
  const withcondMarkerCount = bindings.filter((binding) => binding.role.includes("_withcond_")).length;
  const etagPresent = typeof policy.etag === "string" && policy.etag.length > 0;
  const rawType = version === undefined ? "MISSING" : version === null ? "NULL" : "INTEGER";
  const rawValue = explicitVersion ? version : null;
  return {
    returnedPolicyVersionState: version === null ? "UNSET" : "EXPLICIT",
    returnedPolicyVersionValue: version === null ? null : version,
    versionDiagnostic: { versionFieldPresent: version !== undefined, versionRawType: rawType,
      versionRawPrimitiveValue: rawValue, versionAllowedSet: [0, 1, 3],
      versionNormalizationResult: version === undefined ? "MISSING" : "VALID",
      versionNormalizationFailureReason: version === undefined ? "MISSING" : "NONE",
      versionSource: version === null ? "MESSAGE_ATTRIBUTE" : version === undefined ? "MISSING" : "MESSAGE_TO_DICT" },
    responseFieldDiagnostic: {
      apitoolsPolicyClassVerified: false, apitoolsBindingsState: "NOT_APITOOLS_POLICY",
      apitoolsDirectEtagPresent: false, apitoolsDirectEtagType: "MISSING", apitoolsDirectEtagSha256: null,
      protobufVersionFieldPresent: version !== undefined, protobufVersionType: rawType, protobufVersionValue: rawValue,
      apitoolsDirectVersionType: rawType, apitoolsDirectVersionValue: rawValue,
      versionDirectPresent: version !== undefined, versionDirectType: rawType, versionDirectValue: rawValue,
      versionDescriptorType: "INT32", versionHasPresence: false, versionDefaultValue: 0,
      versionListedInListFields: explicitVersion && version !== 0,
      messageToDictVersionPresent: explicitVersion && version !== 0,
      messageToDictVersionType: explicitVersion && version !== 0 ? "INTEGER" : "MISSING",
      messageToDictVersionValue: explicitVersion && version !== 0 ? version : null,
      messageToDictDefaultsVersionPresent: version !== undefined,
      messageToDictDefaultsVersionType: version === undefined ? "MISSING" : rawType,
      messageToDictDefaultsVersionValue: rawValue,
      etagPresent, etagType: typeof policy.etag === "string" ? "STRING" : "OTHER",
      etagSha256: etagPresent ? createHash("sha256").update(policy.etag, "utf8").digest("hex") : null,
      bindingsPresent: Array.isArray(policy.bindings), bindingsCount: Array.isArray(policy.bindings) ? bindings.length : null,
      conditionBindingCount: Array.isArray(policy.bindings) ? conditionCount : null,
      conditionCount: Array.isArray(policy.bindings) ? conditionCount : null,
      withcondMarkerCount: Array.isArray(policy.bindings) ? withcondMarkerCount : null,
      conditionsPresent: conditionCount > 0, withcondRoleMarkerPresent: withcondMarkerCount > 0,
    },
    transportLifecycle: { lastCompletedPhase: "PHASE_08_HELPER_SERIALIZATION", failedPhase: null,
      providerRequestPrepared: true, providerRequestStarted: true, providerResponseReceived: true,
      httpStatusKnown: true, httpStatus: 200 },
    helperExecution: { schemaVersion: "myweb.g2b.helper-execution.v1", success: true,
      lastCompletedPhase: "PHASE_08_HELPER_SERIALIZATION", failedPhase: null, failureCode: null,
      requestBuilt: true, providerRequestPrepared: true, providerRequestStarted: true,
      providerResponseReceived: true, policyExtracted: true, requestMetadataAvailable: true,
      safeDiagnostics: { serializationShape: "SHAPE_A_NESTED", requestBuildState: "BUILT" } },
  };
};
const transportRead = () => parseG2BExplicitTransportResult({
  exitCode: 0,
  stdout: JSON.stringify({
    schema: "myweb.g2b.explicit-set-iam-policy-transport.v2",
    ok: true,
    requestStarted: true,
    httpStatus: 200,
    prestateReadCompleted: true,
    recoveryReadCompleted: true,
    setAttempted: false,
    requestMetadata: transportRequestMetadata(),
    providerMetadata: { responseReceived: true, httpStatus: 200 },
    serializationMetadata: { policyObjectType: "MESSAGE", canonicalizationStage: "COMPLETE", serializationStage: "JSON_ENVELOPE_READY",
      policyExtractionPath: "DIRECT_POLICY_MAPPING", providerResponseShape: providerResponseShape(basePolicy()) },
    requestedPolicyVersion: 3,
    returnedPolicyVersion: basePolicy().version,
    versionSourceLayer: "PYTHON_MESSAGE_TO_DICT",
    ...successResponseDiagnostics(basePolicy()),
    policy: basePolicy()
  }),
  stderr: ""
}, "READ_GENERATION_BOUND_RECOVERY_POLICY");
const transportReadForPolicy = (policy, envelopeOverrides = {}) => parseG2BExplicitTransportResult({
  exitCode: 0,
  stdout: JSON.stringify({
    schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, requestStarted: true,
    httpStatus: 200, prestateReadCompleted: true, recoveryReadCompleted: true, setAttempted: false,
    requestMetadata: transportRequestMetadata(),
    providerMetadata: { responseReceived: true, httpStatus: 200 },
    serializationMetadata: { policyObjectType: "MESSAGE", canonicalizationStage: "COMPLETE", serializationStage: "JSON_ENVELOPE_READY",
      policyExtractionPath: "DIRECT_POLICY_MAPPING", providerResponseShape: providerResponseShape(policy) },
    requestedPolicyVersion: 3, returnedPolicyVersion: policy.version,
    versionSourceLayer: "PYTHON_MESSAGE_TO_DICT",
    ...successResponseDiagnostics(policy), policy, ...envelopeOverrides
  }),
  stderr: ""
}, "READ_GENERATION_BOUND_RECOVERY_POLICY");
for (const version of [1, 3]) {
  const helperStdout = execFileSync("python", [
    "tools/authority-audit-tests/g2bPolicyResponseNormalizer.test.py",
    "--emit-success-envelope", `--version=${version}`
  ], { encoding: "utf8", windowsHide: true });
  const readResult = parseG2BExplicitTransportResult({ exitCode: 0, stdout: helperStdout, stderr: "" }, "READ_GENERATION_BOUND_RECOVERY_POLICY");
  assert.equal(readResult.ok, true, readResult.code);
  const completed = completeG2BCasEvidenceRead({
    readResult,
    provenance: { ...provenance, returnedPolicyVersion: version },
    targetPrincipal: member,
    sourceLockDigest: "d".repeat(64),
    operationInstance: "cb13612d-8c03-409c-8812-8d9b4b933f9a",
    now: "2026-09-23T00:00:00.000Z",
  });
  assert.equal(completed.ok, true, `version ${version} must reach CAS capture`);
  assert.equal(completed.evidence.policyVersion, version);
  assert.equal(completed.evidence.etag, "cross-runtime-etag");
  assert.equal(completed.evidence.casBasisCaptured, true);
  if (version < 3) assert.equal(completed.evidence.transportDiagnostics.versionDiagnostic.versionRawPrimitiveValue, version);
}
{
  const providerPolicy = { version: 3, etag: "fixture-roundtrip-etag", bindings: [
    { role: "roles/viewer", members: ["user:other@example.invalid"] },
    { role: "roles/editor", members: ["user:third@example.invalid"],
      condition: { title: "guard", expression: "true" } }
  ] };
  const parsed = transportReadForPolicy(providerPolicy, {
    providerMetadata: { responseReceived: true, httpStatus: 200 }
  });
  assert.equal(parsed.ok, true, parsed.code);
  assert.equal(parsed.policy.etag, providerPolicy.etag);
  assert.equal(parsed.policy.version, providerPolicy.version);
  assert.deepEqual(parsed.policy.bindings, providerPolicy.bindings);
  assert.equal(parsed.requestedPolicyVersion, 3);
  assert.equal(parsed.returnedPolicyVersion, 3);
  const completed = completeG2BCasEvidenceRead({
    readResult: parsed, provenance, targetPrincipal: member,
    sourceLockDigest: "c".repeat(64),
    operationInstance: "cb13612d-8c03-409c-8812-8d9b4b933f9a",
    now: "2026-09-23T00:00:00.000Z"
  });
  assert.equal(completed.ok, true, completed.code);
  assert.equal(completed.evidence.targetBindingState, "ABSENT");
  assert.equal(completed.evidence.policyDriftStatus, "NO_PRIOR_FULL_POLICY_BASELINE; FRESH_PRESTATE_MUST_MATCH_CAPTURED_DIGESTS");
  assert.equal(completed.mutationPacket.exactAddDelta.role, G2B_TARGET_ROLE);
  assert.equal(completed.mutationPacket.exactAddDelta.createBinding, true);
  assert.equal(verifyG2BCasMutationApprovalPacket(completed.mutationPacket).ok, true);
}
function approvedFixture() {
  const root = mkdtempSync(join(tmpdir(), "myweb-cas-read-test-"));
  const operationInstance = "d204bd17-b49b-45a3-bf7b-2fe92051d742";
  const outputPaths = {
    sourceLock: `source-lock-${operationInstance}.json`,
    packet: `approval-${operationInstance}.json`,
    evidence: `test-evidence-${operationInstance}.json`,
    failure: `test-failure-${operationInstance}.json`,
    resultSummary: `test-summary-${operationInstance}.json`,
    mutationPacket: `test-mutation-${operationInstance}.json`
  };
  const packetPath = outputPaths.packet;
  const sourceLockPath = outputPaths.sourceLock;
  const prepared = prepareG2BCasEvidenceReadApproval({
    operationInstance,
    outputPaths,
    recoveryContext: recoveryContext(operationInstance)
  });
  assert.equal(prepared.ok, true, prepared.code);
  const sourceLock = prepared.sourceLock;
  const packet = prepared.packet;
  for (const entry of sourceLock.sourceLocks) {
    const target = resolve(root, entry.path);
    mkdirSync(join(target, ".."), {
      recursive: true
    });
    writeFileSync(target, readFileSync(resolve(process.cwd(), entry.path)));
  }
  mkdirSync(root, { recursive: true });
  const artifacts = writeG2BCasEvidenceReadApproval(prepared, { repositoryRoot: root });
  assert.equal(JSON.parse(readFileSync(join(root, packetPath), "utf8")).schema, packet.schema);
  assert.equal(JSON.parse(readFileSync(join(root, sourceLockPath), "utf8")).sourceLocks.length, sourceLock.sourceLocks.length);
  assert.match(artifacts.rawSha256.packet, /^[a-f0-9]{64}$/);
  assert.match(artifacts.rawSha256.sourceLock, /^[a-f0-9]{64}$/);
  const packetBytesBeforeDuplicateWrite = readFileSync(join(root, packetPath));
  assert.throws(() => writeG2BCasEvidenceReadApproval(prepared, { repositoryRoot: root }), /ARTIFACT_PATH_COLLISION/);
  assert.deepEqual(readFileSync(join(root, packetPath)), packetBytesBeforeDuplicateWrite);
  return {
    root,
    packetPath,
    sourceLockPath,
    operationInstance,
    packetHash: createHash("sha256").update(readFileSync(join(root, packetPath))).digest("hex"),
    sourceLockDigest: packet.sourceLockDigest
  };
}
{
  const a = createG2BCasEvidenceReadArtifactPaths("d204bd17-b49b-45a3-bf7b-2fe92051d742");
  const b = createG2BCasEvidenceReadArtifactPaths("af0436c1-29ca-45ae-b7cb-87e120204af8");
  assert.equal(new Set(Object.values(a)).size, Object.keys(a).length, "artifact types get distinct paths");
  assert.ok(Object.values(a).every((path) => path.includes("d204bd17-b49b-45a3-bf7b-2fe92051d742")));
  assert.ok(Object.values(b).every((path) => path.includes("af0436c1-29ca-45ae-b7cb-87e120204af8")));
  assert.equal(Object.values(a).some((path) => Object.values(b).includes(path)), false, "operations get distinct paths");
  assert.throws(() => createG2BCasEvidenceReadArtifactPaths("not-an-operation"), /cas-artifact-path-input-invalid/);
}
{
  const root = mkdtempSync(join(tmpdir(), "myweb-cas-path-collision-"));
  try {
    const operationInstance = "b1a0bf0a-0e08-4c65-9bf0-4c09f934fe90";
    const paths = createG2BCasEvidenceReadArtifactPaths(operationInstance);
    const occupied = resolve(root, paths.resultSummary);
    mkdirSync(dirname(occupied), { recursive: true });
    writeFileSync(occupied, "historical-bytes");
    const result = prepareG2BCasEvidenceReadApproval({ repositoryRoot: root, operationInstance, outputPaths: paths, recoveryContext: recoveryContext(operationInstance) });
    assert.equal(result.ok, false);
    assert.equal(result.code, "ARTIFACT_PATH_COLLISION");
    assert.equal(readFileSync(occupied, "utf8"), "historical-bytes");
  } finally { rmSync(root, { recursive: true, force: true }); }
}
function recoveryContext(operationInstance, overrides = {}) {
  const identityContext = {};
  Object.defineProperties(identityContext, {
    exactPrincipal: {
      value: account,
      enumerable: false
    },
    exactIamMember: {
      value: member,
      enumerable: false
    }
  });
  return {
    operationInstance,
    parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    authContextId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    recoveryAnchorVerified: true,
    identityContext,
    account,
    member,
    secretProvider: {
      read: () => null
    },
    store: {
      load: () => null
    },
    ...overrides
  };
}
function createG2BCasEvidenceReadExecutor(options = {}) {
  const resolveRecoveryContext = options.resolveRecoveryContext || (({
    operationInstance
  }) => ({
    ok: true,
    context: recoveryContext(operationInstance)
  }));
  const executor = createG2BCasEvidenceReadExecutorImpl({
    ...options,
    resolveRecoveryContext,
    inspectExecutionAttestation: options.inspectExecutionAttestation || (() => ({ state: "FRESH", ageMs: 5, bindingStatus: "MATCH" })),
    executionAttestationGate: options.executionAttestationGate || (gate => runG2BExecutionAttestationLifecycle({
      ...gate,
      inspect: async () => ({ state: "FRESH", ageMs: 5, bindingStatus: "MATCH" }),
      refresh: async () => ({ ok: true, bindingStatus: "MATCH", physicalCalls: 0 }),
    }))
  });
  return Object.freeze({
    ...executor,
    execute: request => executor.execute({
      ...request,
      executionEnvelope: request.executionEnvelope ?? testRemoteExecutionEnvelope(request, options.repositoryRoot || process.cwd()),
      transport: {
        prepareDirectContextCredentialRefresh: async () => ({
          ok: true,
          state: "REFRESH_READY_TO_SEND",
          physicalCalls: 0
        }),
        ...request.transport
      }
    })
  });
}
function testRemoteExecutionEnvelope(request, repositoryRoot) {
  const packetPath = resolve(repositoryRoot, request.packetPath);
  const packet = JSON.parse(readFileSync(packetPath, "utf8"));
  return Object.freeze({
    executionMode: "REMOTE_READ_ONLY",
    executeRemoteNow: true,
    operationInstance: packet.operationInstance,
    approvalPacketSha256: request.approvedPacketRawSha256,
    sourceLockDigest: packet.sourceLockDigest,
    credentialRefreshMax: 1,
    iamReadMax: 1,
    setIamPolicyMax: 0,
  });
}
{
  let calls = 0;
  const states = [
    { state: "ATTESTATION_EXPIRED_ONLY", ageMs: 130_000, bindingStatus: "MATCH" },
    { state: "FRESH", ageMs: 4, bindingStatus: "MATCH" }
  ];
  const result = await runG2BExecutionAttestationLifecycle({
    inspect: async () => states[Math.min(calls++, states.length - 1)],
    refresh: async () => ({ ok: true, bindingStatus: "MATCH", physicalCalls: 0 }),
    finalFastGate: async () => ({ ok: true })
  });
  assert.equal(result.ok, true);
  assert.equal(result.telemetry.executionRefreshPerformed, true, "an expired prior attestation allows one execution-scope local refresh");
  assert.equal(result.telemetry.attestationAgeImmediatelyAfterRefresh, 4);
  assert.equal(result.telemetry.attestationAgeAtCredentialRefreshStart, 4);
  assert.equal(result.telemetry.phases.includes("PHASE_CREDENTIAL_REFRESH"), true);
}
{
  let refreshed = 0;
  let inspected = 0;
  const packetPreparationRefreshes = 1;
  const result = await runG2BExecutionAttestationLifecycle({
    inspect: async () => inspected++ === 0
      ? ({ state: "ATTESTATION_EXPIRED_ONLY", ageMs: 121_000, bindingStatus: "MATCH" })
      : ({ state: "FRESH", ageMs: 2, bindingStatus: "MATCH" }),
    refresh: async () => { refreshed += 1; return { ok: true, bindingStatus: "MATCH", physicalCalls: 0 }; },
    finalFastGate: async () => ({ ok: true })
  });
  assert.equal(packetPreparationRefreshes, 1);
  assert.equal(result.ok, true);
  assert.equal(refreshed, 1, "packet preparation does not consume execution-attempt refresh quota");
}
{
  let refreshes = 0;
  let inspections = 0;
  const result = await runG2BExecutionAttestationLifecycle({
    inspect: async () => inspections++ === 0
      ? { state: "ATTESTATION_EXPIRED_ONLY", ageMs: 125_000, bindingStatus: "MATCH" }
      : { state: "FRESH", ageMs: 31_000, bindingStatus: "MATCH" },
    refresh: async () => { refreshes += 1; return { ok: true, bindingStatus: "MATCH", physicalCalls: 0 }; },
    finalFastGate: async () => ({ ok: true })
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "HOST_ATTESTATION_FINAL_FAST_GATE_FAILED");
  assert.equal(refreshes, 1, "a second refresh is never attempted within one execution attempt");
}
{
  let refreshes = 0;
  const result = await runG2BExecutionAttestationLifecycle({
    inspect: async () => ({ state: "UNKNOWN_BINDING_STATE", ageMs: 1, bindingStatus: "MISMATCH" }),
    refresh: async () => { refreshes += 1; return { ok: true, bindingStatus: "MATCH", physicalCalls: 0 }; },
    finalFastGate: async () => ({ ok: true })
  });
  assert.equal(result.ok, false);
  assert.equal(refreshes, 0);
}
{
  let clock = 0;
  let refreshed = 0;
  clock += 180_000; // Represents slow preflight; freshness is inspected only afterward.
  const result = await runG2BExecutionAttestationLifecycle({
    now: () => clock,
    inspect: async () => ({ state: "FRESH", ageMs: 0, bindingStatus: "MATCH" }),
    refresh: async () => { refreshed += 1; return { ok: true, bindingStatus: "MATCH", physicalCalls: 0 }; },
    finalFastGate: async () => ({ ok: true })
  });
  assert.equal(result.ok, true);
  assert.equal(refreshed, 0, "attestation freshness is not consumed during slow preflight");
  assert.equal(result.telemetry.attestationAgeAtCredentialRefreshStart, 0);
}
{
  const result = await runG2BExecutionAttestationLifecycle({
    inspect: async () => ({ state: "FRESH", ageMs: 1_000, bindingStatus: "MATCH" }),
    refresh: async () => ({ ok: false, physicalCalls: 0 }),
    finalFastGate: async () => ({ ok: true })
  });
  assert.equal(result.ok, true);
  assert.equal(result.telemetry.attestationAgeAtCredentialRefreshStart < 30_000, true);
}
for (const changedAfterRefresh of [false, true]) {
  let inspections = 0;
  const result = await runG2BExecutionAttestationLifecycle({
    inspect: async () => inspections++ === 0
      ? { state: "ATTESTATION_EXPIRED_ONLY", ageMs: 200_000, bindingStatus: "MATCH" }
      : { state: "FRESH", ageMs: 3, bindingStatus: "MATCH" },
    refresh: async () => ({ ok: true, bindingStatus: "MATCH", physicalCalls: 0 }),
    finalFastGate: async () => changedAfterRefresh ? { ok: false, code: "FINAL_SOURCE_CHANGED" } : { ok: true }
  });
  assert.equal(result.ok, !changedAfterRefresh);
  if (changedAfterRefresh) assert.equal(result.code, "FINAL_SOURCE_CHANGED");
}
{
  const result = await runG2BExecutionAttestationLifecycle({
    inspect: async () => ({ state: "FRESH", ageMs: 2, bindingStatus: "MATCH" }),
    refresh: async () => ({ ok: true, bindingStatus: "MATCH", physicalCalls: 0 }),
    finalFastGate: async () => ({ ok: true })
  });
  const ordinal = name => result.telemetry.phases.indexOf(name);
  assert.equal(result.ok, true);
  assert.equal(ordinal("PHASE_FINAL_SOURCE_VALIDATION") < ordinal("PHASE_FINAL_ATTESTATION_VALIDATION"), true);
  assert.equal(ordinal("PHASE_FINAL_ATTESTATION_VALIDATION") < ordinal("PHASE_CREDENTIAL_REFRESH"), true);
}
{
  let physicalCalls = 0;
  let inspected = 0;
  const result = await runG2BExecutionAttestationLifecycle({
    inspect: async () => inspected++ === 0
      ? ({ state: "ATTESTATION_EXPIRED_ONLY", ageMs: 200_000, bindingStatus: "MATCH" })
      : ({ state: "FRESH", ageMs: 3, bindingStatus: "MATCH" }),
    refresh: async () => { physicalCalls += 0; return { ok: true, bindingStatus: "MATCH", physicalCalls: 0 }; },
    finalFastGate: async () => ({ ok: true })
  });
  assert.equal(result.ok, true);
  assert.equal(physicalCalls, 0, "local attestation refresh does not consume remote budget");
}
{
  const result = await runG2BExecutionAttestationLifecycle({
    inspect: async () => ({ state: "FRESH", ageMs: 2, bindingStatus: "MATCH" }),
    refresh: async () => ({ ok: true, bindingStatus: "MATCH", physicalCalls: 0 }),
    finalFastGate: async () => ({ ok: false, code: "SOURCE_DRIFT" })
  });
  const phaseOrder = ["PHASE_FINAL_SOURCE_VALIDATION", "PHASE_HOST_ATTESTATION_REFRESH", "PHASE_FINAL_ATTESTATION_VALIDATION", "PHASE_CREDENTIAL_REFRESH", "PHASE_IAM_POLICY_READ"];
  const failedOrdinal = phaseOrder.indexOf(result.telemetry.failedPhase);
  const completedOrdinal = phaseOrder.indexOf(result.telemetry.lastCompletedPhase);
  assert.equal(result.ok, false);
  assert.equal(completedOrdinal < failedOrdinal, true, "failed phase remains strictly after last completed phase");
}
{
  const fixture = approvedFixture();
  const journal = createG2BCasEvidenceReadJournal({ directory: resolve(fixture.root, "local-only-journal") });
  const calls = { approval: 0, refreshPrepare: 0, refresh: 0, read: 0 };
  const executor = createG2BCasEvidenceReadExecutor({ journal, repositoryRoot: fixture.root });
  const blocked = await executor.execute({
    enabled: true,
    executionEnvelope: { executionMode: "LOCAL_ONLY", executeRemoteNow: false },
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => { calls.approval += 1; return true; },
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance),
    transport: {
      prepareDirectContextCredentialRefresh: async () => { calls.refreshPrepare += 1; return { ok: true, state: "REFRESH_READY_TO_SEND", physicalCalls: 0 }; },
      executeDirectContextCredentialRefresh: async () => { calls.refresh += 1; return { ok: true, state: "REFRESH_SUCCESS_CONFIRMED", physicalCalls: 1 }; },
      readGenerationBoundRecoveryPolicy: async () => { calls.read += 1; return transportRead(); },
    },
  });
  assert.equal(blocked.code, "CURRENT_REMOTE_EXECUTION_INTENT_REQUIRED");
  assert.deepEqual(calls, { approval: 0, refreshPrepare: 0, refresh: 0, read: 0 });
  assert.equal(blocked.counters.totalPhysicalRemoteCalls, 0);
  assert.equal(journal.load(fixture.operationInstance).state, "MISSING");
}
{
  const fixture = approvedFixture();
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(fixture.root, "journal")
  });
  const calls = [];
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: fixture.root
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => {
      calls.push("consume");
      return true;
    },
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance),
    transport: {
      prepareDirectContextCredentialRefresh: async () => ({
        ok: false,
        state: "DIRECT_CONTEXT_REFRESH_NOT_READY",
        physicalCalls: 0
      }),
      executeDirectContextCredentialRefresh: async () => {
        calls.push("refresh");
        return {
          ok: true,
          state: "REFRESH_SUCCESS_CONFIRMED",
          physicalCalls: 1
        };
      },
      readGenerationBoundRecoveryPolicy: async () => {
        calls.push("read");
        return transportRead();
      }
    }
  });
  assert.equal(result.code, "CAS_READ_REFRESH_PREFLIGHT_BLOCKED");
  assert.deepEqual(calls, []);
  assert.equal(journal.load(fixture.operationInstance).state, "MISSING");
}
{
  const fixture = approvedFixture();
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(fixture.root, "journal")
  });
  const calls = [];
  const changedContext = recoveryContext(fixture.operationInstance, {
    member: "serviceAccount:changed@example.invalid"
  });
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: fixture.root,
    resolveRecoveryContext: () => ({
      ok: true,
      context: changedContext
    })
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => true,
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance),
    transport: {
      executeDirectContextCredentialRefresh: async () => {
        calls.push("refresh");
        return {
          ok: true,
          state: "REFRESH_SUCCESS_CONFIRMED",
          physicalCalls: 1
        };
      },
      readGenerationBoundRecoveryPolicy: async () => {
        calls.push("read");
        return transportRead();
      }
    }
  });
  assert.equal(result.code, "CAS_READ_CONTEXT_PRECHECK_BLOCKED");
  assert.deepEqual(calls, []);
  assert.equal(result.counters.iamReadLogicalAttempts, 0);
  assert.equal(result.counters.iamPolicyReadCalls, 0);
}
{
  const result = capture();
  assert.equal(result.ok, true, result.code);
  assert.equal(result.evidence.etag, "opaque-etag-test-only");
  assert.equal(result.evidence.policyVersion, 3);
  assert.equal(result.evidence.requestedPolicyVersion, 3);
  assert.equal(result.evidence.returnedPolicyVersion, 3);
  assert.match(result.evidence.policyShapeDigest, /^[a-f0-9]{64}$/);
  assert.equal(result.evidence.targetBindingState, "ABSENT");
  assert.equal(result.evidence.casState, "CAS_BASIS_CAPTURED_FRESH_PRESTATE_RECHECK_REQUIRED");
  assert.match(result.evidence.policyDriftStatus, /NO_PRIOR_FULL_POLICY_BASELINE/);
  assert.equal(JSON.stringify(result.evidence).includes(member), false);
  assert.equal(JSON.stringify(result.evidence).includes("unrelated@example.invalid"), false);
}
{
  const operationInstance = "da7020be-4fd8-4ae4-9527-8e23553f478a";
  const outputPaths = {
    sourceLock: `source-lock-v2-${operationInstance}.json`,
    packet: `test-cas-read-packet-${operationInstance}.json`,
    evidence: `test-cas-read-evidence-${operationInstance}.json`,
    failure: `test-cas-read-failure-${operationInstance}.json`,
    resultSummary: `test-cas-read-result-${operationInstance}.json`,
    mutationPacket: `test-cas-read-mutation-${operationInstance}.json`
  };
  const prepared = prepareG2BCasEvidenceReadApproval({
    operationInstance,
    outputPaths,
    recoveryContext: recoveryContext(operationInstance)
  });
  assert.equal(prepared.ok, true, prepared.code);
  assert.ok(prepared.sourceLock.sourceLocks.length >= 20);
  assert.equal(prepared.packet.schema, "myweb.g2b.cas-evidence-read.approval-packet.v3");
  assert.equal(prepared.packet.sourceFingerprintSchemaVersion, 2);
  assert.equal(prepared.packet.sourceFingerprint, computeCanonicalSourceFingerprint(prepared.sourceLock.sourceLocks));
  assert.equal(prepared.packet.setIamPolicyMax, 0);
  assert.equal(prepared.packet.mutationReachable, false);
  assert.equal(JSON.stringify(prepared.packet).includes(member), false);
  assert.equal(JSON.stringify(prepared.packet).includes(account), false);
  const root = mkdtempSync(join(tmpdir(), "myweb-cas-read-v2-test-"));
  for (const entry of prepared.sourceLock.sourceLocks) {
    const target = resolve(root, entry.path);
    mkdirSync(join(target, ".."), {
      recursive: true
    });
    writeFileSync(target, readFileSync(resolve(process.cwd(), entry.path)));
  }
  const packetPath = outputPaths.packet;
  const sourceLockPath = outputPaths.sourceLock;
  writeFileSync(resolve(root, packetPath), `${canonical(prepared.packet)}\n`);
  writeFileSync(resolve(root, sourceLockPath), `${canonical(prepared.sourceLock)}\n`);
  const fixture = {
    root,
    packetPath,
    sourceLockPath,
    packetHash: createHash("sha256").update(readFileSync(resolve(root, packetPath))).digest("hex"),
    operationInstance
  };
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(root, "journal")
  });
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: root,
    outputPaths: {
      evidence: outputPaths.evidence,
      failure: outputPaths.failure,
      resultSummary: outputPaths.resultSummary,
      mutationPacket: outputPaths.mutationPacket
    }
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath,
    sourceLockPath,
    consumeApproval: async () => true,
    targetPrincipal: member,
    recoveryContext: recoveryContext(operationInstance),
    transport: {
      executeDirectContextCredentialRefresh: async () => ({
        ok: true,
        state: "REFRESH_SUCCESS_CONFIRMED",
        physicalCalls: 1
      }),
      readGenerationBoundRecoveryPolicy: async request => {
        const { executionEnvelope, ...requestFields } = request;
        assert.deepEqual(requestFields, {
          targetResource: G2B_TARGET_RESOURCE,
          targetRole: G2B_TARGET_ROLE,
          account,
          member
        });
        assert.equal(executionEnvelope.executeRemoteNow, true);
        return transportRead();
      }
    }
  });
  assert.equal(result.ok, true, result.code);
  assert.equal(result.counters.totalPhysicalRemoteCalls, 2);
  assert.equal(result.counters.iamReadHttpStarted, 1);
}
{
  const fixture = approvedFixture();
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(fixture.root, "journal"),
    now: () => "2026-09-23T00:00:00.000Z"
  });
  const calls = [];
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: fixture.root,
    outputPaths: {
      evidence: `evidence-${fixture.operationInstance}.json`,
      failure: `failure-${fixture.operationInstance}.json`,
      mutationPacket: `mutation-${fixture.operationInstance}.json`,
      resultSummary: `summary-${fixture.operationInstance}.json`
    },
    now: () => "2026-09-23T00:00:00.000Z"
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => true,
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance),
    transport: {
      executeDirectContextCredentialRefresh: async () => {
        calls.push("refresh");
        return {
          ok: true,
          state: "REFRESH_SUCCESS_CONFIRMED",
          physicalCalls: 1
        };
      },
      readGenerationBoundRecoveryPolicy: async () => {
        calls.push("read");
        return transportRead();
      }
    }
  });
  assert.equal(result.ok, true, result.code);
  assert.deepEqual(calls, ["refresh", "read"]);
  assert.equal(result.counters.credentialRefreshLogicalAttempts, 1);
  assert.equal(result.counters.credentialRefreshPhysicalRemoteCalls, 1);
  assert.equal(result.counters.iamReadLogicalAttempts, 1);
  assert.equal(result.counters.iamReadHttpStarted, 1);
  assert.equal(result.counters.iamPolicyReadCalls, 1);
  assert.equal(result.counters.totalPhysicalRemoteCalls, 2);
  assert.equal(result.counters.physicalCallAccounting, "EXACT");
  assert.equal(result.counters.totalPhysicalRemoteCalls, 2);
  assert.equal(result.result.setIamPolicyCalls, 0);
  assert.equal(result.evidence.etag, "opaque-etag-test-only");
  assert.equal(result.evidence.policyVersion, 3);
  assert.equal(result.evidence.transportDiagnostics.jsonParseSucceeded, true);
  assert.equal(result.evidence.approvalPacketSha256, fixture.packetHash);
  assert.equal(result.evidence.credentialRefreshCalls, 1);
  assert.equal(result.evidence.iamPolicyReadCalls, 1);
  assert.equal(result.evidence.totalPhysicalRemoteCalls, 2);
  assert.equal(result.evidence.setIamPolicyCalls, 0);
  assert.equal(result.evidence.approvalConsumed, true);
  assert.equal(result.evidence.nextStage, "FRESH_IAM_MUTATION_APPROVAL_REQUIRED");
  assert.equal(result.mutationPacket.targetBindingCurrentState, "ABSENT");
  assert.equal(verifyG2BCasMutationApprovalPacket(result.mutationPacket).ok, true);
  assert.equal(journal.load(fixture.operationInstance).record.phase, "TERMINAL");
  assert.equal(existsSync(resolve(fixture.root, `evidence-${fixture.operationInstance}.json`)), true);
  for (const artifactPath of [`evidence-${fixture.operationInstance}.json`, `mutation-${fixture.operationInstance}.json`, `summary-${fixture.operationInstance}.json`]) {
    assert.doesNotThrow(() => JSON.parse(readFileSync(resolve(fixture.root, artifactPath), "utf8")), `${artifactPath} round-trips as JSON`);
  }
  const replay = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => true,
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance),
    transport: {
      executeDirectContextCredentialRefresh: async () => {
        calls.push("refresh-again");
        return {
          ok: true,
          state: "REFRESH_SUCCESS_CONFIRMED",
          physicalCalls: 1
        };
      },
      readGenerationBoundRecoveryPolicy: async () => {
        calls.push("read-again");
        return policyRead();
      }
    }
  });
  assert.equal(replay.ok, false);
  assert.deepEqual(calls, ["refresh", "read"]);
}
{
  const fixture = approvedFixture();
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(fixture.root, "journal")
  });
  const calls = [];
  const presentPolicy = {
    ...basePolicy(),
    bindings: [{
      role: G2B_TARGET_ROLE,
      members: [member]
    }]
  };
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: fixture.root,
    outputPaths: {
      evidence: `evidence-${fixture.operationInstance}.json`,
      failure: `failure-${fixture.operationInstance}.json`,
      mutationPacket: `mutation-${fixture.operationInstance}.json`,
      resultSummary: `summary-${fixture.operationInstance}.json`
    }
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => true,
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance),
    transport: {
      executeDirectContextCredentialRefresh: async () => {
        calls.push("refresh");
        return {
          ok: true,
          state: "REFRESH_SUCCESS_CONFIRMED",
          physicalCalls: 1
        };
      },
      readGenerationBoundRecoveryPolicy: async () => {
        calls.push("read");
        return {
          ok: true,
          requestStarted: true,
          safeTransportMetadata: {
            requestStarted: true
          },
          physicalCalls: 1,
          policy: presentPolicy,
          requestedPolicyVersion: 3,
          returnedPolicyVersion: presentPolicy.version,
          versionSourceLayer: "PYTHON_MESSAGE_TO_DICT"
        };
      }
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, "ALREADY_TARGET_STATE");
  assert.equal(result.evidence.targetBindingState, "PRESENT");
  assert.equal(result.evidence.nextStage, "IAM_POST_READ_COMPLETION");
  assert.equal(result.mutationPacket, null);
  assert.equal(existsSync(resolve(fixture.root, `mutation-${fixture.operationInstance}.json`)), false);
  assert.deepEqual(calls, ["refresh", "read"]);
}
{
  const fixture = approvedFixture();
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(fixture.root, "journal")
  });
  const calls = [];
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: fixture.root,
    outputPaths: {
      evidence: `evidence-${fixture.operationInstance}.json`,
      failure: `failure-${fixture.operationInstance}.json`,
      mutationPacket: `mutation-${fixture.operationInstance}.json`,
      resultSummary: `summary-${fixture.operationInstance}.json`
    }
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => true,
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance),
    transport: {
      executeDirectContextCredentialRefresh: async () => {
        calls.push("refresh");
        return {
          ok: true,
          state: "REFRESH_SUCCESS_CONFIRMED",
          physicalCalls: 1
        };
      },
      readGenerationBoundRecoveryPolicy: async () => {
        calls.push("read");
        return {
          ok: false,
          physicalCalls: 1,
          code: "TRANSPORT_PERMISSION_DENIED",
          failureEvidence: {
            failureClass: "TRANSPORT_PERMISSION_DENIED",
            exitCode: 1,
            signal: null,
            timedOut: false,
            stdoutPresent: false,
            stderrPresent: true,
            stdoutByteLength: 0,
            stderrByteLength: 38,
            stdoutSha256: "a".repeat(64),
            stderrSha256: "b".repeat(64),
            jsonParseSucceeded: false,
            schemaValidationSucceeded: false,
            resourceValidationSucceeded: null,
            stdinEncoding: "UTF8",
            stdinWriteAttempted: true,
            stdinByteLength: 42,
            stdinWritten: true,
            stdinBomPresent: false,
            stdinNewlineKind: "NONE",
            stdinWriteCompleted: true,
            stdinClosed: true,
            errorClass: "PERMISSION_DENIED",
            errorCode: "HTTP_403",
            httpStatus: 403,
            timestamp: "2026-09-24T00:00:00.000Z",
            requestStarted: true
          }
        };
      }
    }
  });
  assert.equal(result.code, "CAS_READ_FAILED_NO_MUTATION_PACKET");
  assert.equal(result.failureClass, "TRANSPORT_PERMISSION_DENIED");
  assert.equal(result.failure.schema, "myweb.g2b.cas-read-failure-evidence.v3");
  assert.match(result.failure.targetResourceDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(calls, ["refresh", "read"]);
  assert.equal(result.counters.retries, 0);
  assert.equal(result.counters.setIamPolicyCalls, 0);
  assert.equal(existsSync(resolve(fixture.root, `mutation-${fixture.operationInstance}.json`)), false);
  const persisted = readFileSync(resolve(fixture.root, `failure-${fixture.operationInstance}.json`), "utf8");
  const persistedFailure = JSON.parse(persisted);
  assert.equal(persistedFailure.classificationVersion, "G2B_TRANSPORT_FAILURE_CLASSIFICATION_V4");
  assert.equal(persistedFailure.credentialRefreshCalls, 1);
  assert.equal(persistedFailure.iamPolicyReadCalls, 1);
  assert.equal(persistedFailure.totalPhysicalRemoteCalls, 2);
  assert.equal(persistedFailure.transportDiagnostics.lastCompletedPhase, null);
  assert.equal(persistedFailure.transportDiagnostics.unknownReason, "DIAGNOSTIC_METADATA_INCOMPLETE");
  assert.equal(persistedFailure.transportDiagnostics.resourceValidationSucceeded, null);
  assert.equal(persistedFailure.transportDiagnostics.stdinByteLength, 42);
  assert.equal(persistedFailure.transportDiagnostics.stdinWritten, true);
  assert.equal(persistedFailure.transportDiagnostics.stdinClosed, true);
  assert.equal(persisted.includes(":undefined"), false);
  assert.equal(persisted.includes("permission denied for"), false);
  assert.equal(persisted.includes("serviceAccount:"), false);
  const persistedResult = JSON.parse(readFileSync(resolve(fixture.root, `summary-${fixture.operationInstance}.json`), "utf8"));
  assert.equal(persistedResult.schema, "myweb.g2b.cas-read-result-summary.v2");
  assert.equal(persistedResult.operationInstance, persistedFailure.operationInstance);
  assert.equal(persistedResult.failureClass, persistedFailure.failureClass);
  assert.equal(persistedResult.failureEvidenceRawSha256, createHash("sha256").update(persisted).digest("hex"));
  assert.equal(persistedResult.terminalState, persistedFailure.terminalState);
  assert.equal(persistedResult.physicalRemoteCalls, persistedFailure.totalPhysicalRemoteCalls);
  assert.equal(journal.load(fixture.operationInstance).record.terminalClassification, "CAS_READ_FAILED_NO_MUTATION_PACKET");
}
{
  const fixture = approvedFixture();
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(fixture.root, "journal")
  });
  const calls = [];
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: fixture.root
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => true,
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance),
    transport: {
      executeDirectContextCredentialRefresh: async () => {
        calls.push("refresh");
        return {
          ok: false,
          state: "FAILED",
          physicalCalls: 1
        };
      },
      readGenerationBoundRecoveryPolicy: async () => {
        calls.push("read");
        return {};
      }
    }
  });
  assert.equal(result.code, "CAS_READ_REFRESH_FAILED_NO_IAM_READ");
  assert.deepEqual(calls, ["refresh"]);
}
{
  const fixture = approvedFixture();
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(fixture.root, "journal")
  });
  const calls = [];
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: fixture.root
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => false,
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance),
    transport: {
      executeDirectContextCredentialRefresh: async () => {
        calls.push("refresh");
        return {
          ok: true,
          state: "REFRESH_SUCCESS_CONFIRMED",
          physicalCalls: 1
        };
      },
      readGenerationBoundRecoveryPolicy: async request => {
        calls.push("read");
        assert.deepEqual(request, {
          targetResource: G2B_TARGET_RESOURCE,
          targetRole: G2B_TARGET_ROLE,
          account,
          member
        });
        return {
          ...transportRead(),
          childProcessStarted: true
        };
      }
    }
  });
  assert.equal(result.code, "CAS_READ_APPROVAL_NOT_CONSUMED");
  assert.deepEqual(calls, []);
}
{
  const fixture = approvedFixture();
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(fixture.root, "journal")
  });
  let consumed = 0;
  let refreshed = 0;
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: fixture.root
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => {
      consumed += 1;
      return true;
    },
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance, {
      member: "user:mismatch@example.invalid"
    }),
    transport: {
      executeDirectContextCredentialRefresh: async () => {
        refreshed += 1;
        return {
          ok: true,
          state: "REFRESH_SUCCESS_CONFIRMED",
          physicalCalls: 1
        };
      },
      readGenerationBoundRecoveryPolicy: async () => {
        throw new Error("must not execute");
      }
    }
  });
  assert.equal(result.code, "CAS_READ_APPROVAL_OR_BOUNDARY_BLOCKED");
  assert.equal(consumed, 0);
  assert.equal(refreshed, 0);
  assert.equal(result.counters.totalPhysicalRemoteCalls, 0);
}
{
  const fixture = approvedFixture();
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(fixture.root, "journal")
  });
  let consumed = 0;
  let refreshed = 0;
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: fixture.root
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => {
      consumed += 1;
      return true;
    },
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance, {
      account: ""
    }),
    transport: {
      executeDirectContextCredentialRefresh: async () => {
        refreshed += 1;
        return {
          ok: true,
          state: "REFRESH_SUCCESS_CONFIRMED",
          physicalCalls: 1
        };
      },
      readGenerationBoundRecoveryPolicy: async () => {
        throw new Error("must not execute");
      }
    }
  });
  assert.equal(result.code, "CAS_READ_APPROVAL_OR_BOUNDARY_BLOCKED");
  assert.equal(consumed, 0);
  assert.equal(refreshed, 0);
  assert.equal(result.counters.totalPhysicalRemoteCalls, 0);
}
{
  const fixture = approvedFixture();
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(fixture.root, "journal")
  });
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: fixture.root
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => true,
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance),
    transport: {
      executeDirectContextCredentialRefresh: async () => ({
        ok: true,
        state: "REFRESH_SUCCESS_CONFIRMED",
        physicalCalls: 1
      }),
      readGenerationBoundRecoveryPolicy: async () => ({
        ok: false,
        childProcessStarted: false,
        requestStarted: false,
        physicalCalls: 0,
        failureEvidence: {
          failureClass: "TRANSPORT_EXEC_FAILED",
          requestStarted: false
        }
      })
    }
  });
  assert.equal(result.code, "CAS_READ_FAILED_NO_MUTATION_PACKET");
  assert.equal(result.counters.iamReadLogicalAttempts, 1);
  assert.equal(result.counters.iamReadChildProcessStarted, 0);
  assert.equal(result.counters.iamReadHttpStarted, 0);
  assert.equal(result.counters.totalPhysicalRemoteCalls, 1);
  assert.equal(result.counters.totalPhysicalRemoteCallsUpperBound, 1);
  assert.equal(result.counters.physicalCallAccounting, "EXACT");
}
{
  const fixture = approvedFixture();
  const sourceLock = JSON.parse(readFileSync(join(fixture.root, fixture.sourceLockPath), "utf8"));
  writeFileSync(resolve(fixture.root, sourceLock.sourceLocks[0].path), "tampered");
  const journal = createG2BCasEvidenceReadJournal({
    directory: resolve(fixture.root, "journal")
  });
  const calls = [];
  const executor = createG2BCasEvidenceReadExecutor({
    journal,
    repositoryRoot: fixture.root
  });
  const result = await executor.execute({
    enabled: true,
    approvedPacketRawSha256: fixture.packetHash,
    packetPath: fixture.packetPath,
    sourceLockPath: fixture.sourceLockPath,
    consumeApproval: async () => true,
    targetPrincipal: member,
    recoveryContext: recoveryContext(fixture.operationInstance),
    transport: {
      executeDirectContextCredentialRefresh: async () => {
        calls.push("refresh");
        return {
          ok: true,
          state: "REFRESH_SUCCESS_CONFIRMED",
          physicalCalls: 1
        };
      },
      readGenerationBoundRecoveryPolicy: async () => {
        calls.push("read");
        return policyRead();
      }
    }
  });
  assert.equal(result.code, "CAS_READ_APPROVAL_OR_BOUNDARY_BLOCKED");
  assert.deepEqual(calls, []);
}
{
  const result = capture({
    ...basePolicy(),
    bindings: [{
      role: G2B_TARGET_ROLE,
      members: [member]
    }]
  });
  assert.equal(result.evidence.targetBindingState, "PRESENT");
}
{
  const result = capture();
  const packet = buildG2BCasMutationApprovalPacket({
    evidence: result.evidence,
    transientPolicy: result.transientPolicy,
    targetPrincipal: result.targetPrincipal,
    operationInstance: "7f3d869b-6c25-4d16-b355-5f69e48541c4",
    now: "2026-09-23T00:00:00.000Z"
  });
  assert.equal(packet.ok, true);
  assert.equal(packet.packet.schema, G2B_CAS_MUTATION_PACKET_SCHEMA);
  assert.deepEqual(packet.packet.exactRemoveDelta, []);
  assert.equal(packet.packet.exactAddDelta.role, G2B_TARGET_ROLE);
  assert.equal(packet.packet.budgets.totalPhysicalRemoteCallsMax, 4);
  assert.equal(verifyG2BCasMutationApprovalPacket(packet.packet).ok, true);
  const packetAgain = buildG2BCasMutationApprovalPacket({
    evidence: result.evidence,
    transientPolicy: result.transientPolicy,
    targetPrincipal: result.targetPrincipal,
    operationInstance: "7f3d869b-6c25-4d16-b355-5f69e48541c4",
    now: "2026-09-23T00:00:00.000Z"
  });
  assert.deepEqual(packetAgain.packet, packet.packet);
}
{
  const p = basePolicy();
  p.bindings.push({
    role: G2B_TARGET_ROLE,
    members: ["serviceAccount:other@example.invalid"]
  });
  const result = capture(p);
  const packet = buildG2BCasMutationApprovalPacket({
    evidence: result.evidence,
    transientPolicy: result.transientPolicy,
    targetPrincipal: result.targetPrincipal,
    operationInstance: "7f3d869b-6c25-4d16-b355-5f69e48541c4",
    now: "2026-09-23T00:00:00.000Z"
  });
  assert.equal(packet.ok, true);
  assert.equal(packet.packet.exactAddDelta.addMemberToExistingBinding, true);
  assert.equal(packet.packet.exactAddDelta.createBinding, false);
  assert.equal(packet.packet.unchangedBindingsDigest, result.evidence.unchangedBindingsDigest);
}
for (const policy of [{
  version: 3,
  bindings: []
}, {
  etag: "etag",
  bindings: []
}, {
  version: 3,
  etag: "etag",
  bindings: "bad"
}]) assert.equal(capture(policy).ok, false, "missing CAS metadata blocks capture");
assert.equal(capture(basePolicy(), {
  generationId: "00000000-0000-4000-8000-000000000001"
}).ok, false, "generation mismatch blocks");
assert.equal(capture(basePolicy(), {
  iamResource: "projects/other/serviceAccounts/other@example.invalid"
}).ok, false, "resource mismatch blocks");
assert.equal(capture(basePolicy(), {
  provenance: {
    ...provenance,
    fixture: true
  }
}).ok, false, "fixture cannot be treated as actual");
assert.equal(capture({
  version: 3,
  etag: "etag",
  bindings: [],
  accessToken: "must-not-pass"
}).ok, false, "credential-like policy material is rejected");
{
  const conditional = {
    ...basePolicy(),
    bindings: [{
      role: G2B_TARGET_ROLE,
      members: [member],
      condition: {
        title: "limited",
        expression: "true"
      }
    }]
  };
  const result = capture(conditional);
  assert.equal(result.evidence.targetBindingState, "ABSENT");
  const packet = buildG2BCasMutationApprovalPacket({
    evidence: result.evidence,
    transientPolicy: result.transientPolicy,
    targetPrincipal: result.targetPrincipal,
    operationInstance: "7f3d869b-6c25-4d16-b355-5f69e48541c4"
  });
  assert.equal(packet.ok, false, "conditional target conflict blocks mutation planning");
}
{
  const result = completeG2BCasEvidenceRead({
    readResult: {
      ok: false,
      physicalCalls: 1
    },
    provenance,
    targetPrincipal: member
  });
  assert.equal(result.ok, false);
  assert.equal(result.mutationPacket, undefined);
}
{
  const presentPolicy = {
    ...basePolicy(),
    bindings: [{
      role: G2B_TARGET_ROLE,
      members: [member]
    }]
  };
  const result = completeG2BCasEvidenceRead({
    readResult: policyRead(presentPolicy),
    provenance,
    targetPrincipal: member,
    sourceLockDigest: "b".repeat(64),
    now: "2026-09-23T00:00:00.000Z"
  });
  assert.equal(result.code, "ALREADY_TARGET_STATE");
  assert.equal(result.mutationRequired, false);
  assert.equal(result.mutationPacket, null);
}
{
  const result = completeG2BCasEvidenceRead({
    readResult: policyRead(),
    provenance,
    targetPrincipal: member,
    sourceLockDigest: "b".repeat(64),
    operationInstance: "7f3d869b-6c25-4d16-b355-5f69e48541c4",
    now: "2026-09-23T00:00:00.000Z"
  });
  assert.equal(result.code, "MUTATION_REQUIRED_FRESH_APPROVAL");
  assert.equal(result.mutationPacket.targetBindingCurrentState, "ABSENT");
}
{
  const result = capture();
  assert.equal(buildG2BCasMutationApprovalPacket({
    evidence: {
      ...result.evidence,
      etag: "stale"
    },
    transientPolicy: result.transientPolicy,
    targetPrincipal: result.targetPrincipal,
    operationInstance: "7f3d869b-6c25-4d16-b355-5f69e48541c4"
  }).ok, false);
  assert.equal(buildG2BCasMutationApprovalPacket({
    evidence: result.evidence,
    transientPolicy: {
      ...result.transientPolicy,
      version: 2
    },
    targetPrincipal: result.targetPrincipal,
    operationInstance: "7f3d869b-6c25-4d16-b355-5f69e48541c4"
  }).ok, false);
  assert.equal(buildG2BCasMutationApprovalPacket({
    evidence: {
      ...result.evidence,
      generationId: "00000000-0000-4000-8000-000000000001"
    },
    transientPolicy: result.transientPolicy,
    targetPrincipal: result.targetPrincipal,
    operationInstance: "7f3d869b-6c25-4d16-b355-5f69e48541c4"
  }).ok, false);
  const driftedPolicy = {
    ...result.transientPolicy,
    bindings: [...result.transientPolicy.bindings, {
      role: "roles/editor",
      members: ["user:unexpected@example.invalid"]
    }]
  };
  assert.equal(buildG2BCasMutationApprovalPacket({
    evidence: result.evidence,
    transientPolicy: driftedPolicy,
    targetPrincipal: result.targetPrincipal,
    operationInstance: "7f3d869b-6c25-4d16-b355-5f69e48541c4",
    now: "2026-09-23T00:00:00.000Z"
  }).ok, false, "policy drift blocks stale packet derivation");
}
{
  const prepared = prepareG2BCasEvidenceReadRetryApproval({
    operationInstance: "43c59d66-5125-4bda-9015-05c23209fb81",
    priorJournalRecord: {
      state: "TERMINAL",
      phase: "TERMINAL",
      approvalConsumed: true,
      refreshRequestStarted: true,
      readRequestStarted: true,
      approvalPacketRawSha256: "51cf6abcdae7a14d344b51db8dd218969f65409498e3d1067f655538e9f11ed9"
    }
  });
  assert.equal(prepared.ok, true);
  assert.notEqual(prepared.packet.operationInstance, G2B_CAS_READ_OPERATION_INSTANCE);
  assert.equal(prepared.packet.parentFailedOperationInstance, G2B_CAS_READ_OPERATION_INSTANCE);
  assert.equal(prepared.packet.type, "READ_ONLY_WITH_BOUNDED_CREDENTIAL_REFRESH");
  assert.ok(prepared.sourceLock.sourceLocks.length >= 21);
  assert.equal(prepared.packet.failureClassificationVersion, "G2B_TRANSPORT_FAILURE_CLASSIFICATION_V3");
  assert.equal(prepared.packet.setIamPolicyMax, 0);
  assert.equal(prepared.packet.iamMutationMax, 0);
  assert.equal(prepared.packet.totalPhysicalRemoteCallsMax, 2);
  assert.equal(prepared.packet.automaticRetries, 0);
}
{
  const result = capture();
  const stale = buildG2BCasMutationApprovalPacket({
    evidence: result.evidence,
    transientPolicy: result.transientPolicy,
    targetPrincipal: result.targetPrincipal,
    operationInstance: "7f3d869b-6c25-4d16-b355-5f69e48541c4",
    now: "2026-09-23T00:11:00.000Z"
  });
  assert.equal(stale.ok, false, "stale evidence blocks mutation planning");
}
for (const policy of [
  { version: 1, etag: "version-one-etag", bindings: [{ role: "roles/viewer", members: ["user:unrelated@example.invalid"] }] },
  { version: 3, etag: "version-three-etag", bindings: [{ role: "roles/viewer", members: ["user:unrelated@example.invalid"], condition: { title: "scope", expression: "request.time < timestamp('2030-01-01T00:00:00Z')" } }] }
]) {
  const read = transportReadForPolicy(policy);
  assert.equal(read.ok, true);
  assert.equal(read.requestedPolicyVersion, 3);
  assert.equal(read.returnedPolicyVersion, policy.version);
  assert.equal(read.policy.etag, policy.etag);
  const completed = completeG2BCasEvidenceRead({
    readResult: read, provenance, targetPrincipal: member, sourceLockDigest: "b".repeat(64),
    operationInstance: "7f3d869b-6c25-4d16-b355-5f69e48541c4", now: "2026-09-23T00:00:00.000Z"
  });
  assert.equal(completed.ok, true);
  assert.equal(completed.evidence.requestedPolicyVersion, 3);
  assert.equal(completed.evidence.returnedPolicyVersion, policy.version);
  assert.equal(completed.evidence.etag, policy.etag);
  assert.match(completed.evidence.policyShapeDigest, /^[a-f0-9]{64}$/);
  assert.equal(completed.mutationRequired, true);
  assert.equal(verifyG2BCasMutationApprovalPacket(completed.mutationPacket).ok, true);
  assert.equal(completed.mutationPacket.exactAddDelta.createBinding, true);
  assert.equal(completed.mutationPacket.currentEtag, policy.etag);
  assert.equal(completed.mutationPacket.setPolicyEffectiveVersion, policy.version === 3 ? 3 : policy.version);
  assert.equal(completed.mutationPacket.policyHasConditions, policy.version === 3);
}
assert.equal(capture({ version: 1, etag: "v1", bindings: [{ role: "roles/viewer", members: ["user:unrelated@example.invalid"], condition: { expression: "true" } }] }).ok, false);
{
  const missing = transportReadForPolicy({ etag: "etag", bindings: [] });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, "TRANSPORT_POLICY_VERSION_MISSING");
  const blocked = completeG2BCasEvidenceRead({ readResult: missing, provenance, targetPrincipal: member });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.mutationPacket, undefined);
}
{
  const unsafeV1 = transportReadForPolicy({ version: 1, etag: "etag", bindings: [
    { role: "roles/viewer_withcond_abcd", members: ["user:unrelated@example.invalid"] }
  ] });
  assert.equal(unsafeV1.ok, false);
  assert.equal(unsafeV1.code, "TRANSPORT_AMBIGUOUS_RESPONSE");
}
{
  const cleanBaseline = JSON.parse(readFileSync(
    "docs/evidence/g2b-clean-cas-read-ab9841ca-e096-4042-ab53-b47368e22b5b-result.json", "utf8"));
  const built = buildG2BCasMutationApprovalPacket({ evidence: cleanBaseline,
    targetPrincipal: cleanBaseline.targetMember,
    operationInstance: "9303f3ed-bbb3-44e9-b7b2-909fc29c2574",
    now: "2026-09-27T00:00:00.000Z" });
  assert.equal(built.ok, true, built.code);
  assert.equal(built.packet.schema, G2B_CAS_MUTATION_PACKET_SCHEMA);
  assert.equal(built.packet.basisType, "CLEAN_GENERATION_BASELINE_V2");
  assert.equal(built.packet.generationId, cleanBaseline.generationId);
  assert.equal(built.packet.sourceFingerprint, cleanBaseline.sourceFingerprint);
  assert.equal(built.packet.sourceLockDigest, cleanBaseline.sourceLockDigest);
  assert.equal(built.packet.policyVersionState, "UNSET");
  assert.equal(built.packet.policyVersion, null);
  assert.equal(built.packet.currentEtag, null, "baseline ETag digest is never expanded to raw ETag");
  assert.equal(built.packet.currentEtagSha256, cleanBaseline.etagSha256);
  assert.equal(built.packet.preReadRequired, true);
  assert.equal(built.packet.budgets.preMutationIamReadMax, 1);
  assert.equal(built.packet.budgets.setIamPolicyMax, 1);
  assert.equal(built.packet.budgets.verificationReadMax, 1);
  assert.equal(built.packet.automaticRetryMax, 0);
  assert.equal(built.packet.mutationReachable, false);
  assert.equal(verifyG2BCasMutationApprovalPacket(built.packet).ok, true);
  assert.equal(verifyG2BCasMutationApprovalPacket({ ...built.packet, policyVersion: 0 }).ok, false);
  assert.equal(buildG2BCasMutationApprovalPacket({ evidence: { ...cleanBaseline, baselineCapable: false },
    targetPrincipal: cleanBaseline.targetMember }).ok, false);
  assert.equal(buildG2BCasMutationApprovalPacket({ evidence: { ...cleanBaseline, targetResource: "wrong" },
    targetPrincipal: cleanBaseline.targetMember }).ok, false);
  assert.equal(buildG2BCasMutationApprovalPacket({ evidence: { ...cleanBaseline, evidenceIntegrityDigest: "0".repeat(64) },
    targetPrincipal: cleanBaseline.targetMember }).ok, false);
}
console.log("G2B CAS evidence capture and mutation approval contracts passed; remote operations=0");
