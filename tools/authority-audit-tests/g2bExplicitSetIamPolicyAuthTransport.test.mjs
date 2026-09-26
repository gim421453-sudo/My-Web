import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  classifyG2BTransportResult,
  createG2BExplicitSetIamPolicyAuthTransport,
  G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT,
  parseG2BExplicitTransportResult,
  runG2BExplicitSetPythonProcess,
} from "../authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "../authority-audit/g2bRecoveryAnchor.mjs";

const account = "operator@example.invalid";
const member = "user:operator@example.invalid";
const environment = { ...process.env };
const canonicalIamResource = `projects/my-management-app-8a933/serviceAccounts/${G2B_TARGET_RESOURCE}`;
const fingerprint = (value) => createHash("sha256").update(value, "utf8").digest("hex");
const requestMetadata = () => ({
  approvedResourceFingerprint: fingerprint(canonicalIamResource),
  requestResourceFingerprint: fingerprint(canonicalIamResource),
  resourceValidatedBeforeDispatch: true,
  requestPathFingerprint: fingerprint(`v1/${canonicalIamResource}:getIamPolicy`),
  requestPathValidatedBeforeDispatch: true,
  requestedPolicyVersion: 3,
  requestBodyOptionsVersionValidated: true,
});
const providerResponseShape = (path = "SDK_POLICY_MESSAGE", objectType = "MESSAGE") => ({
  providerResponseObjectType: objectType, providerResponseIsMapping: false, providerResponseIsMessageLike: objectType === "MESSAGE",
  providerResponseObjectModule: objectType === "MESSAGE" ? "googlecloudsdk.generated_clients.apis.iam.v1.iam_v1_messages" : "builtins",
  providerResponseObjectClass: objectType === "MESSAGE" ? "Policy" : "dict",
  providerResponseWrapperType: path === "SDK_POLICY_MESSAGE" ? "SDK_POLICY_MESSAGE" : path === "KNOWN_PROVIDER_WRAPPER_POLICY" ? "KNOWN_PROVIDER_WRAPPER" : "DIRECT_POLICY",
  providerResponseTopLevelKeyCount: 0, providerResponseSafeTopLevelKeys: [], unknownKeyCount: 0,
  hasRootVersion: false, hasRootEtag: false, hasRootBindings: false, hasRootPolicy: false,
  hasRootResponse: false, hasRootResult: false, hasRootData: false, rootVersionType: "MISSING",
  rootVersionPrimitiveValue: null, nestedPolicyPresent: false, nestedPolicyVersionPresent: false,
  nestedPolicyVersionType: "MISSING", policyExtractionPath: path, policyExtractionResult: "EXTRACTED",
  extractedPolicyObjectType: "MAPPING",
});
const policy = { etag: "synthetic", version: 3, bindings: [{ role: G2B_TARGET_ROLE, members: ["user:other@example.invalid"] }] };
const currentRunEnvelope = Object.freeze({ executionMode: "REMOTE_READ_ONLY", executeRemoteNow: true, operationInstance: "4a75c705-21c9-4b46-8d95-94f10a6f11d0", approvalPacketSha256: "a".repeat(64), sourceLockDigest: "b".repeat(64), credentialRefreshMax: 1, iamReadMax: 1, setIamPolicyMax: 1, testIamPermissionsMax: 1 });
const readOnlyEnvelope = Object.freeze({ ...currentRunEnvelope, setIamPolicyMax: 0, testIamPermissionsMax: 0 });
const makeTransport = (options = {}) => createG2BExplicitSetIamPolicyAuthTransport({ executionEnvelope: currentRunEnvelope, ...options });
let calls = 0;
const seenInputs = [];
const runner = ({ args, input }) => {
  calls += 1;
  seenInputs.push({ args, input: JSON.parse(input) });
  const operation = args.at(-1);
const value = operation === "DIRECT_CONTEXT_CREDENTIAL_REFRESH_READY"
    ? { schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, readyToSend: true, requestStarted: false, configuredIdentityContextResolved: true, credentialStoreRecordResolved: true, refreshTokenLocallyAvailable: true, refreshRequestCanBeConstructedWithoutNetwork: true, tokenEndpointContractLocallyResolved: true, credentialRecordMatchesConfiguredContext: true, credentialRecordMatchesDirectMutationAuthContext: true, credentialRecordMatchesDirectDiagnosticAuthContext: true, physicalCalls: 0, automaticRetries: 0, networkRequests: 0, tokenEndpointCalls: 0, metadataRequests: 0 }
    : operation === "DIRECT_CONTEXT_CREDENTIAL_REFRESH"
      ? { schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, requestStarted: true, httpStatus: 200, refreshState: "REFRESH_SUCCESS_CONFIRMED", credentialStoreUpdated: true, physicalCalls: 1, automaticRetries: 0 }
    : operation === "LOCAL_CACHED_CREDENTIAL_READINESS"
    ? { schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, requestStarted: false, configuredIdentityContextResolved: true, credentialStoreRecordResolved: true, credentialObjectLoad: "PASS", cachedAccessTokenPresent: true, credentialExpiryMetadataPresent: true, credentialExpiryParseValid: true, currentLocalTimeAvailable: true, credentialExpiryRelativeState: "FRESH", readinessState: "CACHED_CREDENTIAL_READY_CONFIRMED", freshnessMarginSeconds: 120, credentialRecordMatchesConfiguredContext: true, credentialRecordMatchesDirectMutationAuthContext: true, credentialRecordMatchesDirectDiagnosticAuthContext: true, refreshMethodInvocations: 0, networkRequests: 0, tokenEndpointCalls: 0, metadataRequests: 0 }
    : operation === "READ_PRESTATE_POLICY"
    ? { schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, requestStarted: true, httpStatus: 200, prestateReadCompleted: true, setAttempted: false, memberState: "ABSENT", policy }
    : operation === "READ_GENERATION_BOUND_RECOVERY_POLICY"
    ? { schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, requestStarted: true, httpStatus: 200, prestateReadCompleted: true, recoveryReadCompleted: true, setAttempted: false, requestMetadata: requestMetadata(), providerMetadata: { responseReceived: true, httpStatus: 200 }, serializationMetadata: { policyObjectType: "MESSAGE", canonicalizationStage: "COMPLETE", serializationStage: "JSON_ENVELOPE_READY", policyExtractionPath: "SDK_POLICY_MESSAGE", providerResponseShape: providerResponseShape() }, requestedPolicyVersion: 3, returnedPolicyVersion: 3, returnedPolicyVersionState: "EXPLICIT", returnedPolicyVersionValue: 3, versionSourceLayer: "PYTHON_MESSAGE_TO_DICT", versionDiagnostic: { versionFieldPresent: true, versionRawType: "INTEGER", versionRawPrimitiveValue: 3, versionAllowedSet: [0, 1, 3], versionNormalizationResult: "VALID", versionNormalizationFailureReason: "NONE", versionSource: "MESSAGE_ATTRIBUTE" }, policy: { etag: "synthetic-etag", version: 3, bindings: [] } }
    : operation === "SET_FROM_PRESTATE_POLICY"
      ? { schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, requestStarted: true, httpStatus: 200, prestateReadCompleted: true, setAttempted: true, responseValid: true, mutationState: "SET_CONFIRMED_SUCCESS" }
      : operation === "DIRECT_CONTEXT_PERMISSION_READY"
        ? { schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, readyToSend: true, requestStarted: false, permissionCountRequested: 1 }
        : operation === "TEST_DIRECT_CONTEXT_EXACT_PERMISSION"
          ? { schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, requestStarted: true, httpStatus: 200, permissionCountRequested: 1, permissionCountReturned: 1, permissionState: "PRESENT" }
    : { schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, requestStarted: true, httpStatus: 200, prestateReadCompleted: true, setAttempted: false, memberState: "PRESENT" };
  if (operation === "READ_GENERATION_BOUND_RECOVERY_POLICY" && value.ok === true) {
    value.transportLifecycle = { lastCompletedPhase: "PHASE_08_HELPER_SERIALIZATION", failedPhase: null,
      providerRequestPrepared: true, providerRequestStarted: true, providerResponseReceived: true,
      httpStatusKnown: true, httpStatus: 200 };
    value.helperExecution = { schemaVersion: "myweb.g2b.helper-execution.v1", success: true,
      lastCompletedPhase: "PHASE_08_HELPER_SERIALIZATION", failedPhase: null, failureCode: null,
      requestBuilt: true, providerRequestPrepared: true, providerRequestStarted: true,
      providerResponseReceived: true, policyExtracted: true, requestMetadataAvailable: true,
      safeDiagnostics: { serializationShape: "SHAPE_A_NESTED", requestBuildState: "BUILT" } };
  }
  return { exitCode: 0, timedOut: false, spawnError: null, stdout: JSON.stringify(value), stderr: "" };
};

const disabled = createG2BExplicitSetIamPolicyAuthTransport({ enabled: false, environment, processRunner: runner });
assert.equal((await disabled.readFreshPrestate({ account, member })).code, "EXPLICIT_DIRECT_TRANSPORT_DISABLED");
assert.equal(calls, 0);

const unmarked = createG2BExplicitSetIamPolicyAuthTransport({ enabled: true, environment, processRunner: runner });
assert.equal((await unmarked.readFreshPrestate({ account, member, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE })).code, "CURRENT_REMOTE_EXECUTION_INTENT_REQUIRED");
assert.equal(calls, 0, "approval presence or enabled=true cannot invoke provider without current-run intent");

const transport = makeTransport({ enabled: true, environment, processRunner: runner });
assert.equal((await transport.readGenerationBoundRecoveryPolicy({ member, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE })).code, "EXACT_G2B_TARGET_BINDING_REQUIRED");
assert.equal(calls, 0, "missing account rejects before child process");
assert.equal((await transport.readGenerationBoundRecoveryPolicy({ account, member, targetResource: "other@example.invalid", targetRole: G2B_TARGET_ROLE })).code, "EXACT_G2B_TARGET_BINDING_REQUIRED");
assert.equal(calls, 0, "target resource mismatch rejects before child process");
const prestate = await transport.readFreshPrestate({ account, member, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE });
assert.equal(prestate.ok, true);
assert.equal(prestate.state, "ABSENT");
assert.deepEqual(prestate.safeTransportMetadata, {
  requestStarted: true,
  httpStatusClass: "2XX",
  httpStatusCodeSafe: 200,
  providerResult: "SUCCESS",
});
assert.equal(JSON.stringify(prestate.safeTransportMetadata).includes("synthetic"), false);
const mutation = await transport.setFromFreshPrestate({ account, member, policy: prestate.policy, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE });
assert.equal(mutation.ok, true);
assert.equal(mutation.state, "SET_CONFIRMED_SUCCESS");
assert.equal(mutation.physicalCalls, 1);
assert.equal(calls, 2);
assert.deepEqual(Object.keys(seenInputs[0].input).sort(), ["account", "member", "resource"]);
assert.equal(seenInputs[0].args.length, 3, "production helper gets exactly helper path, SDK root, and operation");
assert.equal(seenInputs[0].args.at(-1), "READ_PRESTATE_POLICY");
assert.equal(seenInputs[0].input.resource, canonicalIamResource);
assert.equal(typeof seenInputs[0].input.account, "string");
assert.equal(typeof seenInputs[0].input.member, "string");
assert.equal(Object.hasOwn(seenInputs[0].input, "policy"), false);
assert.equal(Object.hasOwn(seenInputs[1].input, "policy"), true);
assert.equal(seenInputs[1].input.policyVersionState, "EXPLICIT");
assert.equal(seenInputs[0].args.includes("gcloud.cmd"), false);
assert.equal((await transport.readFreshPrestate({ account, member })).code, "DIRECT_MUTATION_CALL_BUDGET_EXHAUSTED");
assert.equal(calls, 2);

const readOnlyTransport = makeTransport({ enabled: true, environment, processRunner: runner, executionEnvelope: readOnlyEnvelope });
const readOnlyPrestate = await readOnlyTransport.readFreshPrestate({ account, member, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE });
assert.equal(readOnlyPrestate.ok, true);
const callsBeforeBlockedMutation = calls;
assert.equal((await readOnlyTransport.setFromFreshPrestate({ account, member, policy: readOnlyPrestate.policy, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE })).code, "CURRENT_REMOTE_EXECUTION_BUDGET_BLOCKED");
assert.equal(calls, callsBeforeBlockedMutation, "read-only envelope blocks provider mutation call");

const recovery = await transport.readGenerationBoundRecoveryPolicy({ account, member });
assert.equal(recovery.ok, true);
assert.equal(recovery.childProcessStarted, true);
assert.equal(recovery.state, "RECOVERY_POLICY_RECEIVED");
assert.deepEqual(recovery.policy, { etag: "synthetic-etag", version: 3, bindings: [] });
assert.equal(recovery.safeTransportMetadata.httpStatus, 200);
assert.equal((await transport.readGenerationBoundRecoveryPolicy({ account, member })).code, "GENERATION_BOUND_RECOVERY_READ_BUDGET_EXHAUSTED");

const poststate = await transport.readPostSuccessExactMember({ account, member });
assert.equal(poststate.ok, true);
assert.equal(poststate.state, "PRESENT");
assert.equal(poststate.physicalCalls, 1);
assert.equal(calls, 5);
assert.equal((await transport.readPostSuccessExactMember({ account, member })).code, "POSTSTATE_NOT_REACHABLE");

const timeoutTransport = makeTransport({
  enabled: true,
  environment,
  processRunner: () => ({ exitCode: null, timedOut: true, spawnError: null, stdout: "", stderr: "" }),
});
assert.equal((await timeoutTransport.readFreshPrestate({ account, member })).code, "TRANSPORT_TIMEOUT");
const interruptedTransport = makeTransport({
  enabled: true,
  environment,
  processRunner: () => ({ exitCode: null, timedOut: false, spawnError: { code: "EINTR" }, stdout: "", stderr: "" }),
});
assert.equal((await interruptedTransport.readFreshPrestate({ account, member })).code, "TRANSPORT_EXEC_FAILED");

for (const [name, failureMetadata] of [
  ["http4", { failureStage: "DURING_HTTP_SEND", httpStatusClass: "4XX", httpStatusCodeSafe: 403, safeProviderErrorIdentifier: "HTTP_403", transportExceptionClassSafe: "REMOTE_REQUEST_EXCEPTION" }],
  ["http5", { failureStage: "DURING_HTTP_SEND", httpStatusClass: "5XX", httpStatusCodeSafe: 503, safeProviderErrorIdentifier: "HTTP_503", transportExceptionClassSafe: "REMOTE_REQUEST_EXCEPTION" }],
  ["post-response-local", { failureStage: "AFTER_HTTP_RESPONSE", httpStatusClass: "2XX", httpStatusCodeSafe: 200, safeProviderErrorIdentifier: "HTTP_200", transportExceptionClassSafe: "RESPONSE_PARSE_FAILURE" }],
]) {
  const failing = makeTransport({
    enabled: true,
    environment,
    processRunner: () => ({ exitCode: 2, timedOut: false, spawnError: null, stderr: "", stdout: JSON.stringify({
      schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: false, code: name,
      requestStarted: true, prestateReadCompleted: true, setAttempted: false, failureMetadata,
    }) }),
  });
  const value = await failing.readGenerationBoundRecoveryPolicy({ account, member });
  assert.equal(value.ok, false);
  assert.equal(value.failureMetadata.httpStatusClass, failureMetadata.httpStatusClass);
}

const diagnosticTransport = makeTransport({ enabled: true, environment, processRunner: runner });
const readiness = await diagnosticTransport.readLocalCachedCredentialReadiness();
assert.equal(readiness.state, "CACHED_CREDENTIAL_READY_CONFIRMED");
assert.equal(readiness.physicalCalls, 0);
assert.equal((await diagnosticTransport.prepareDirectContextCredentialRefresh()).state, "REFRESH_READY_TO_SEND");
assert.equal((await diagnosticTransport.executeDirectContextCredentialRefresh(currentRunEnvelope)).state, "REFRESH_SUCCESS_CONFIRMED");
assert.equal((await diagnosticTransport.executeDirectContextCredentialRefresh(currentRunEnvelope)).code, "DIRECT_CONTEXT_REFRESH_CALL_BUDGET_EXHAUSTED");
assert.equal((await diagnosticTransport.prepareDirectContextPermissionDiagnostic({ account, member })).state, "READY_TO_SEND");
assert.equal((await diagnosticTransport.executeDirectContextPermissionDiagnostic({ account, member, executionEnvelope: currentRunEnvelope })).state, "PERMISSION_PRESENT_CONFIRMED");
assert.equal((await diagnosticTransport.executeDirectContextPermissionDiagnostic({ account, member, executionEnvelope: currentRunEnvelope })).code, "DIRECT_CONTEXT_DIAGNOSTIC_CALL_BUDGET_EXHAUSTED");
for (const operation of ["DIRECT_CONTEXT_PERMISSION_READY", "TEST_DIRECT_CONTEXT_EXACT_PERMISSION"]) {
  const diagnosticInput = seenInputs.find((entry) => entry.args.at(-1) === operation)?.input;
  assert.deepEqual(Object.keys(diagnosticInput || {}).sort(), ["resource"]);
  assert.equal(Object.hasOwn(diagnosticInput || {}, "account"), false);
  assert.equal(Object.hasOwn(diagnosticInput || {}, "member"), false);
}

let privacyCalls = 0;
const unsafeOutput = makeTransport({
  enabled: true,
  environment,
  processRunner: ({ args }) => {
    privacyCalls += 1;
    const value = args.at(-1) === "READ_PRESTATE_POLICY"
      ? { schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, requestStarted: true, httpStatus: 200, prestateReadCompleted: true, setAttempted: false, memberState: "ABSENT", policy }
      : { schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, requestStarted: true, httpStatus: 200, prestateReadCompleted: true, setAttempted: true, responseValid: true, mutationState: "SET_CONFIRMED_SUCCESS", policy: {} };
    return { exitCode: 0, timedOut: false, spawnError: null, stderr: "", stdout: JSON.stringify(value) };
  },
});
const unsafePrestate = await unsafeOutput.readFreshPrestate({ account, member });
assert.equal(unsafePrestate.ok, true);
assert.equal((await unsafeOutput.setFromFreshPrestate({ account, member, policy: unsafePrestate.policy })).code, "DIRECT_TRANSPORT_PRIVACY_GUARD");
assert.equal(privacyCalls, 2);

assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.rawPolicyCrossesProcessBoundary, true);
assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.rawPolicyPersisted, false);
assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.implicitRefreshReachable, false);
assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.physicalProviderCallsMax, 3);
assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.liveExecutorBound, true);
assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.directContextPermissionDiagnosticCallsMax, 1);
assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.generationBoundRecoveryReadCallsMax, 1);
assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.recoveryResponseUsesMutationPolicyValidator, false);

const readOperation = "READ_GENERATION_BOUND_RECOVERY_POLICY";
const pythonExecutable = process.env.PYTHON_EXECUTABLE || process.env.PYTHON || "python";
const productionMainFixture = execFileSync(pythonExecutable, [
  "tools/authority-audit-tests/g2bHelperMainLocalProvider.integration.py"
], { encoding: "utf8", windowsHide: true });
assert.match(productionMainFixture, /local fake-provider path passed/);
for (const version of [1, 3]) {
  const helperStdout = execFileSync(pythonExecutable, [
    "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py", "--local-stub-read-e2e"
  ], { encoding: "utf8", windowsHide: true,
    input: JSON.stringify({ responseKind: "DIRECT_POLICY_MAPPING", policy: { etag: `e2e-etag-${version}`, version,
      bindings: [{ role: "roles/viewer", members: ["user:fixture@example.invalid"], ...(version === 3 ? { condition: { expression: "true" } } : {}) }] } }) });
  const crossRuntimeResult = parseG2BExplicitTransportResult({
    exitCode: 0, stdout: helperStdout, stderr: "", childProcessStarted: true
  }, readOperation);
  assert.equal(crossRuntimeResult.ok, true, crossRuntimeResult.code);
  assert.equal(crossRuntimeResult.policy.etag, `e2e-etag-${version}`);
  assert.equal(crossRuntimeResult.policy.version, version);
  assert.equal(crossRuntimeResult.policy.bindings[0].condition !== undefined, version === 3);
  assert.equal(crossRuntimeResult.requestMetadata.resourceValidatedBeforeDispatch, true);
  assert.equal(crossRuntimeResult.requestMetadata.requestedPolicyVersion, 3);
  assert.equal(crossRuntimeResult.requestMetadata.requestBodyOptionsVersionValidated, true);
  assert.deepEqual(crossRuntimeResult.providerMetadata, { responseReceived: true, httpStatus: 200 });
  assert.equal(crossRuntimeResult.serializationMetadata.canonicalizationStage, "COMPLETE");
  assert.equal(crossRuntimeResult.serializationMetadata.policyExtractionPath, "DIRECT_POLICY_MAPPING");
  assert.equal(crossRuntimeResult.safeTransportMetadata.versionDiagnostic.versionRawPrimitiveValue, version);
}
const installedSdkUnsetStdout = execFileSync(pythonExecutable, [
  "tools/authority-audit-tests/g2bPolicyResponseNormalizer.test.py", "--emit-installed-sdk-unset-envelope"
], { encoding: "utf8", windowsHide: true });
const installedSdkUnset = parseG2BExplicitTransportResult({
  exitCode: 0, stdout: installedSdkUnsetStdout, stderr: "", childProcessStarted: true
}, readOperation);
assert.equal(installedSdkUnset.ok, true, installedSdkUnset.code);
assert.equal(installedSdkUnset.requestedPolicyVersion, 3);
assert.equal(installedSdkUnset.returnedPolicyVersionState, "UNSET");
assert.equal(installedSdkUnset.returnedPolicyVersionValue, null);
assert.equal(installedSdkUnset.policy.version, null);
assert.equal(installedSdkUnset.policy.etag, "aW5zdGFsbGVkLXNkay11bnNldC1ldGFn");
assert.equal(installedSdkUnset.policy.bindings.length, 0);
assert.equal(installedSdkUnset.safeTransportMetadata.responseFieldDiagnostic.apitoolsDirectVersionType, "NULL");
assert.equal(installedSdkUnset.safeTransportMetadata.responseFieldDiagnostic.messageToDictVersionPresent, false);
assert.equal(installedSdkUnset.safeTransportMetadata.responseFieldDiagnostic.conditionCount, 0);
assert.equal(installedSdkUnset.safeTransportMetadata.responseFieldDiagnostic.apitoolsPolicyClassVerified, true);
assert.equal(installedSdkUnset.safeTransportMetadata.responseFieldDiagnostic.apitoolsBindingsState, "UNSET");
assert.equal(installedSdkUnset.safeTransportMetadata.responseFieldDiagnostic.apitoolsDirectEtagType, "BYTES");
const sdkRootCandidates = [process.env.CLOUDSDK_ROOT_DIR,
  "C:/Users/USER/AppData/Local/Google/Cloud SDK/google-cloud-sdk",
  "C:/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk"].filter(Boolean).map((path) => resolve(path));
const sdkRoot = sdkRootCandidates.find((path) => {
  try { return statSync(resolve(path, "lib", "googlecloudsdk")).isDirectory(); } catch { return false; }
});
assert.ok(sdkRoot, "installed Cloud SDK root is required for the authoritative request-message test");
const encodedEtag = Buffer.from("unset-policy-etag", "utf8").toString("base64");
const sdkSetRequest = JSON.parse(execFileSync(pythonExecutable, [
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py", "--local-build-set-request", sdkRoot,
], { encoding: "utf8", windowsHide: true, input: JSON.stringify({ policy: { version: null,
  etag: encodedEtag, bindings: [{ role: G2B_TARGET_ROLE, members: ["user:fixture@example.invalid"] }] },
  policyVersionState: "UNSET", expectedEtagBytes: encodedEtag, expectedRole: G2B_TARGET_ROLE,
  expectedMember: "user:fixture@example.invalid" }) }));
assert.equal(sdkSetRequest.ok, true);
assert.equal(sdkSetRequest.requestClass, "IamProjectsServiceAccountsSetIamPolicyRequest");
assert.equal(sdkSetRequest.policyClass, "Policy");
assert.equal(sdkSetRequest.resource, canonicalIamResource);
assert.equal(sdkSetRequest.requestPolicyVersionPresent, false);
assert.equal(sdkSetRequest.policyVersionPresent, false);
assert.equal(sdkSetRequest.policyVersionFieldListed, false);
assert.equal(sdkSetRequest.etagIsBytes, true);
assert.equal(sdkSetRequest.etagMatches, true);
assert.equal(sdkSetRequest.targetRolePresent, true);
assert.equal(sdkSetRequest.requestVersionOmitted, true);
const missingVersionSetRequest = spawnSync(pythonExecutable, [
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py", "--local-build-set-request", sdkRoot,
], { encoding: "utf8", windowsHide: true, shell: false, input: JSON.stringify({
  policy: { etag: encodedEtag, bindings: [] }, policyVersionState: "UNSET",
  expectedEtagBytes: encodedEtag, expectedRole: G2B_TARGET_ROLE, expectedMember: "user:fixture@example.invalid",
}) });
assert.equal(missingVersionSetRequest.status, 2);
const missingVersionEnvelope = JSON.parse(missingVersionSetRequest.stdout);
assert.equal(missingVersionEnvelope.code, "LOCAL_SET_REQUEST_CONTRACT_FAILED");
assert.equal(missingVersionEnvelope.errorType, "ValueError");
for (const [responseKind, extractionPath] of [["SDK_POLICY_MESSAGE", "SDK_POLICY_MESSAGE"], ["KNOWN_PROVIDER_WRAPPER_POLICY", "KNOWN_PROVIDER_WRAPPER_POLICY"]]) {
  const helperStdout = execFileSync(pythonExecutable, ["tools/authority-audit/g2b_explicit_set_iam_policy_transport.py", "--local-stub-read-e2e"], {
    encoding: "utf8", windowsHide: true,
    input: JSON.stringify({ responseKind, policy: { etag: "shape-etag", version: 3, bindings: [] } }),
  });
  const result = parseG2BExplicitTransportResult({ exitCode: 0, stdout: helperStdout, stderr: "", childProcessStarted: true }, readOperation);
  assert.equal(result.ok, true, result.code);
  assert.equal(result.serializationMetadata.policyExtractionPath, extractionPath);
}
const unknownWrapperProcess = spawnSync(pythonExecutable, ["tools/authority-audit/g2b_explicit_set_iam_policy_transport.py", "--local-stub-read-e2e"], {
  encoding: "utf8", windowsHide: true, shell: false,
  input: JSON.stringify({ responseKind: "UNKNOWN_WRAPPER", policy: { etag: "secret-not-persisted", version: 3, bindings: [] } }),
});
assert.equal(unknownWrapperProcess.status, 2);
const unknownWrapperResult = parseG2BExplicitTransportResult({ exitCode: unknownWrapperProcess.status, stdout: unknownWrapperProcess.stdout, stderr: unknownWrapperProcess.stderr, childProcessStarted: true }, readOperation);
assert.equal(unknownWrapperResult.ok, false);
assert.equal(unknownWrapperResult.failureMetadata.policyExtractionPath, "UNKNOWN_WRAPPER_OR_NON_POLICY_MAPPING");
assert.equal(unknownWrapperResult.failureMetadata.versionDiagnostic.versionNormalizationFailureReason, "NOT_VERSION_FAILURE");
assert.equal(JSON.stringify(unknownWrapperResult).includes("secret-not-persisted"), false);
const envelope = (policy = { etag: "fixture-etag", version: 3, bindings: [] }, overrides = {}) => ({
  schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: true, requestStarted: true,
  httpStatus: 200, prestateReadCompleted: true, recoveryReadCompleted: true,
  setAttempted: false, requestMetadata: requestMetadata(),
  providerMetadata: { responseReceived: true, httpStatus: 200 },
  serializationMetadata: { policyObjectType: "MESSAGE", canonicalizationStage: "COMPLETE", serializationStage: "JSON_ENVELOPE_READY", policyExtractionPath: "SDK_POLICY_MESSAGE", providerResponseShape: providerResponseShape() },
  requestedPolicyVersion: 3, returnedPolicyVersion: policy.version, returnedPolicyVersionState: "EXPLICIT",
  returnedPolicyVersionValue: policy.version, versionSourceLayer: "PYTHON_MESSAGE_TO_DICT",
  versionDiagnostic: { versionFieldPresent: true, versionRawType: "INTEGER", versionRawPrimitiveValue: policy.version,
    versionAllowedSet: [0, 1, 3], versionNormalizationResult: "VALID", versionNormalizationFailureReason: "NONE", versionSource: "MESSAGE_ATTRIBUTE" },
  responseFieldDiagnostic: { apitoolsPolicyClassVerified: false, apitoolsBindingsState: "NOT_APITOOLS_POLICY",
    apitoolsDirectEtagPresent: false, apitoolsDirectEtagType: "MISSING", apitoolsDirectEtagSha256: null,
    protobufVersionFieldPresent: true, protobufVersionType: "INTEGER", protobufVersionValue: policy.version,
    apitoolsDirectVersionType: "INTEGER", apitoolsDirectVersionValue: policy.version,
    versionDirectPresent: true, versionDirectType: "INTEGER", versionDirectValue: policy.version,
    versionDescriptorType: 5, versionHasPresence: false, versionDefaultValue: 0, versionListedInListFields: policy.version !== 0,
    messageToDictVersionPresent: policy.version !== 0, messageToDictVersionType: policy.version === 0 ? "MISSING" : "INTEGER",
    messageToDictVersionValue: policy.version === 0 ? null : policy.version,
    messageToDictDefaultsVersionPresent: true, messageToDictDefaultsVersionType: "INTEGER",
    messageToDictDefaultsVersionValue: policy.version,
    etagPresent: typeof policy.etag === "string" && policy.etag.length > 0, etagType: typeof policy.etag === "string" ? "STRING" : "OTHER",
    etagSha256: typeof policy.etag === "string" && policy.etag ? fingerprint(policy.etag) : null, bindingsPresent: Array.isArray(policy.bindings),
    bindingsCount: Array.isArray(policy.bindings) ? policy.bindings.length : null,
    conditionBindingCount: Array.isArray(policy.bindings) ? policy.bindings.filter((binding) => binding.condition).length : null,
    conditionCount: Array.isArray(policy.bindings) ? policy.bindings.filter((binding) => binding.condition).length : null,
    withcondMarkerCount: Array.isArray(policy.bindings) ? policy.bindings.filter((binding) => binding.role.includes("_withcond_")).length : null,
    conditionsPresent: Array.isArray(policy.bindings) && policy.bindings.some((binding) => binding.condition),
    withcondRoleMarkerPresent: Array.isArray(policy.bindings) && policy.bindings.some((binding) => binding.role.includes("_withcond_")) },
  policy, ...overrides,
});
const unsetEnvelope = (bindings = []) => {
  const value = envelope({ etag: "unset-etag", version: null, bindings });
  value.returnedPolicyVersion = null;
  value.returnedPolicyVersionState = "UNSET";
  value.returnedPolicyVersionValue = null;
  value.versionDiagnostic = { versionFieldPresent: true, versionRawType: "NULL", versionRawPrimitiveValue: null,
    versionAllowedSet: [0, 1, 3], versionNormalizationResult: "VALID", versionNormalizationFailureReason: "NONE",
    versionSource: "MESSAGE_ATTRIBUTE" };
  value.responseFieldDiagnostic = { ...value.responseFieldDiagnostic,
    apitoolsPolicyClassVerified: true, apitoolsBindingsState: "UNSET",
    apitoolsDirectEtagPresent: true, apitoolsDirectEtagType: "BYTES", apitoolsDirectEtagSha256: fingerprint(Buffer.from("unset-etag")),
    protobufVersionType: "NULL", protobufVersionValue: null, versionDirectType: "NULL", versionDirectValue: null,
    apitoolsDirectVersionType: "NULL", apitoolsDirectVersionValue: null, versionDescriptorType: "INT32",
    messageToDictVersionPresent: false, messageToDictVersionType: "MISSING", messageToDictVersionValue: null,
    messageToDictDefaultsVersionPresent: false, messageToDictDefaultsVersionType: "MISSING",
    messageToDictDefaultsVersionValue: null };
  return value;
};
const fixture = (stdout, stderr = "", exitCode = 0, flags = {}) => classifyG2BTransportResult({ stdout, stderr, exitCode, ...flags }, { expectedOperation: readOperation, now: () => "2026-09-24T00:00:00.000Z" }).metadata;
const json = (value) => JSON.stringify(value);
const expectedClasses = [
  ["A success", json(envelope()), "", 0, "NONE"],
  ["A1 requested 3 returned 1", json(envelope({ etag: "v1-etag", version: 1, bindings: [] })), "", 0, "NONE"],
  ["A2 requested 3 returned 3 conditional", json(envelope({ etag: "v3-etag", version: 3, bindings: [{ role: "roles/viewer", members: ["user:other@example.invalid"], condition: { expression: "true" } }] })), "", 0, "NONE"],
  ["A3 actual SDK UNSET shape", json(unsetEnvelope()), "", 0, "NONE"],
  ["A4 UNSET with condition is inconsistent", json(unsetEnvelope([{ role: "roles/viewer", members: ["user:other@example.invalid"], condition: { expression: "true" } }])), "", 0, "TRANSPORT_SCHEMA_INVALID"],
  ["B present target", json(envelope({ etag: "x", version: 3, bindings: [{ role: G2B_TARGET_ROLE, members: [member] }] })), "", 0, "NONE"],
  ["C unrelated bindings", json(envelope({ etag: "x", version: 3, bindings: [{ role: "roles/viewer", members: ["user:unrelated@example.invalid"] }] })), "", 0, "NONE"],
  ["D empty", "", "", 0, "TRANSPORT_EMPTY_STDOUT"],
  ["E invalid JSON", "not-json", "", 0, "TRANSPORT_INVALID_JSON"],
  ["F warning mixed with JSON", `warning: local diagnostic\n${json(envelope())}`, "", 0, "TRANSPORT_AMBIGUOUS_RESPONSE"],
  ["G stderr only", "", "permission denied for fixture", 0, "TRANSPORT_PERMISSION_DENIED"],
  ["H nonzero stderr", "", "opaque subprocess failure", 23, "TRANSPORT_PROVIDER_NONZERO_EXIT"],
  ["I timeout", "", "", null, "TRANSPORT_TIMEOUT", { timedOut: true }],
  ["J permission", json({ ...envelope(), ok: false, httpStatus: 403, failureMetadata: { httpStatusCodeSafe: 403 }, code: "DENIED" }), "", 0, "TRANSPORT_PERMISSION_DENIED"],
  ["K unauthenticated", json({ ...envelope(), ok: false, httpStatus: 401, failureMetadata: { httpStatusCodeSafe: 401 }, code: "AUTH" }), "", 0, "TRANSPORT_AUTH_FAILURE"],
  ["L rate limit", json({ ...envelope(), ok: false, httpStatus: 429, failureMetadata: { httpStatusCodeSafe: 429 }, code: "RATE" }), "", 0, "TRANSPORT_RATE_LIMIT"],
  ["M server error", json({ ...envelope(), ok: false, httpStatus: 503, failureMetadata: { httpStatusCodeSafe: 503 }, code: "SERVER" }), "", 0, "TRANSPORT_SERVER_ERROR"],
  ["N schema missing", json({ ok: true }), "", 0, "TRANSPORT_SCHEMA_INVALID"],
  ["O etag missing", json(envelope({ version: 3, bindings: [] })), "", 0, "TRANSPORT_ETAG_MISSING"],
  ["P policy version missing", json(envelope({ etag: "x", bindings: [] })), "", 0, "TRANSPORT_POLICY_VERSION_MISSING"],
  ["Q request resource mismatch", json(envelope(undefined, { requestMetadata: { ...requestMetadata(), requestResourceFingerprint: fingerprint("projects/other/serviceAccounts/other") } })), "", 0, "TRANSPORT_REQUEST_RESOURCE_MISMATCH"],
  ["R large response", json(envelope({ etag: "x", version: 3, bindings: [{ role: "roles/viewer", members: ["user:" + "a".repeat(5000) + "@example.invalid"] }] })), "", 0, "NONE"],
  ["S CRLF", json(envelope()).replaceAll(",", ",\r\n"), "", 0, "NONE"],
  ["T UTF-8 BOM", `\uFEFF${json(envelope())}`, "", 0, "NONE"],
  ["U partial JSON", json(envelope()).slice(0, -2), "", 0, "TRANSPORT_TRUNCATED_OUTPUT", { truncated: true }],
  ["V success exit invalid schema", json({ schema: "wrong", ok: true }), "", 0, "TRANSPORT_SCHEMA_INVALID"],
  ["W nonzero with structured provider error", json({ ...envelope(), ok: false, httpStatus: 403, failureMetadata: { httpStatusCodeSafe: 403 }, code: "DENIED" }), "", 23, "TRANSPORT_PERMISSION_DENIED"],
  ["X empty bindings", json(envelope({ etag: "x", version: 3, bindings: [] })), "", 0, "NONE"],
  ["Y missing bindings", json(envelope({ etag: "x", version: 3 })), "", 0, "TRANSPORT_SCHEMA_INVALID"],
  ["Z absent plus unrelated", json(envelope({ etag: "x", version: 3, bindings: [{ role: "roles/viewer", members: ["user:other@example.invalid"] }] })), "", 0, "NONE"],
  ["AA conditional target", json(envelope({ etag: "x", version: 3, bindings: [{ role: G2B_TARGET_ROLE, members: [member], condition: { expression: "true" } }] })), "", 0, "NONE"],
  ["AB repeated role bindings preserve multiplicity", json(envelope({ etag: "x", version: 3, bindings: [{ role: G2B_TARGET_ROLE, members: [member] }, { role: G2B_TARGET_ROLE, members: ["user:other@example.invalid"] }] })), "", 0, "NONE"],
  ["AC wrong version type", json(envelope({ etag: "x", version: "3", bindings: [] })), "", 0, "TRANSPORT_SCHEMA_INVALID"],
  ["AC1 returned version zero", json(envelope({ etag: "x", version: 0, bindings: [] })), "", 0, "NONE"],
  ["AC2 unsupported version two", json(envelope({ etag: "x", version: 2, bindings: [] })), "", 0, "TRANSPORT_SCHEMA_INVALID"],
  ["AC3 returned version disagrees", json(envelope({ etag: "x", version: 1, bindings: [] }, { returnedPolicyVersion: 3 })), "", 0, "TRANSPORT_SCHEMA_INVALID"],
  ["AC4 version one condition loss marker", json(envelope({ etag: "x", version: 1, bindings: [{ role: "roles/viewer_withcond_abc", members: ["user:other@example.invalid"] }] })), "", 0, "TRANSPORT_AMBIGUOUS_RESPONSE"],
  ["AC5 version zero explicit condition", json(envelope({ etag: "x", version: 0, bindings: [{ role: "roles/viewer", members: ["user:other@example.invalid"], condition: { expression: "true" } }] })), "", 0, "TRANSPORT_AMBIGUOUS_RESPONSE"],
  ["AC6 version zero withcond marker", json(envelope({ etag: "x", version: 0, bindings: [{ role: "roles/viewer_withcond_abc", members: ["user:other@example.invalid"] }] })), "", 0, "TRANSPORT_AMBIGUOUS_RESPONSE"],
  ["AD malformed etag", json(envelope({ etag: "bad etag", version: 3, bindings: [] })), "", 0, "TRANSPORT_SCHEMA_INVALID"],
  ["AE unknown fields", json(envelope({ etag: "x", version: 3, bindings: [] }, { unexpected: true })), "", 0, "TRANSPORT_AMBIGUOUS_RESPONSE"],
  ["encoding replacement", json(envelope()).replace("fixture-etag", "\uFFFDfixture-etag"), "", 0, "TRANSPORT_ENCODING_ERROR"],
  ["signal", "", "", null, "TRANSPORT_SIGNALLED", { signal: "SIGTERM" }],
  ["truncated OS output", json(envelope()), "", null, "TRANSPORT_TRUNCATED_OUTPUT", { truncated: true }],
];
for (const [name, stdout, stderr, exitCode, expected, flags = {}] of expectedClasses) {
  const value = fixture(stdout, stderr, exitCode, flags);
  assert.equal(value.failureClass, expected, name);
  assert.equal(typeof value.stdoutSha256, "string", `${name}: stdout digest`);
  assert.equal(typeof value.stderrSha256, "string", `${name}: stderr digest`);
  assert.equal(typeof value.stdoutDigest, "string", `${name}: stdout digest v2`);
  assert.equal(typeof value.stderrDigest, "string", `${name}: stderr digest v2`);
  assert.equal(value.timestamp, "2026-09-24T00:00:00.000Z", `${name}: timestamp`);
  assert.match(value.lastCompletedPhase, /^PHASE_/ , `${name}: last completed phase`);
  if (expected === "NONE") assert.equal(value.failedPhase, null, `${name}: no failure phase on success`);
  else assert.match(value.failedPhase, /^PHASE_/ , `${name}: failed phase`);
  assert.equal(typeof value.unknownReason, "string", `${name}: classification reason`);
  assert.equal(JSON.stringify(value).includes("opaque subprocess failure"), false, `${name}: no raw stderr`);
  const parsed = parseG2BExplicitTransportResult({ stdout, stderr, exitCode, ...flags }, readOperation);
  if (expected === "NONE") {
    assert.equal(parsed.ok, true, `${name}: valid success accepted`);
    assert.equal(parsed.policy.etag.length > 0, true, `${name}: ETag retained`);
    assert.equal(parsed.returnedPolicyVersionState === "UNSET" ? parsed.policy.version === null
      : Number.isSafeInteger(parsed.policy.version), true, `${name}: policy version state retained`);
    assert.equal(parsed.requestedPolicyVersion, 3, `${name}: request version separate`);
    assert.equal(parsed.returnedPolicyVersion, parsed.returnedPolicyVersionValue, `${name}: actual returned version retained`);
    assert.equal(parsed.physicalCalls, 1, `${name}: exactly one read`);
  } else {
    assert.equal(parsed.ok, false, `${name}: failure fails closed`);
    assert.equal(parsed.failureEvidence?.failureClass || parsed.code, expected, `${name}: parser failure class`);
  }
}
const repeatedRoleRead = parseG2BExplicitTransportResult({ stdout: json(envelope({ etag: "x", version: 3, bindings: [
  { role: G2B_TARGET_ROLE, members: [member] },
  { role: G2B_TARGET_ROLE, members: ["user:other@example.invalid"] },
] })), stderr: "", exitCode: 0 }, readOperation);
assert.equal(repeatedRoleRead.ok, true);
assert.equal(repeatedRoleRead.policy.bindings.length, 2, "repeated role bindings retain multiplicity");
const structuredProviderFailure = {
  schema: "myweb.g2b.explicit-set-iam-policy-transport.v2",
  ok: false,
  code: "PROVIDER_PERMISSION_DENIED",
  requestStarted: true,
  remoteRequestStarted: true,
  prestateReadCompleted: false,
  setAttempted: false,
  failure: { code: "HELPER_PROVIDER_PERMISSION_DENIED", helperCode: "PROVIDER_PERMISSION_DENIED",
    phase: "PHASE_08_HELPER_SERIALIZATION", providerRequestStarted: true,
    providerResponseReceived: true, httpStatus: 403, exceptionType: "REMOTE_REQUEST_EXCEPTION" },
  transportLifecycle: { lastCompletedPhase: "PHASE_07_PROVIDER_RESPONSE_RECEIVED",
    failedPhase: "PHASE_08_HELPER_SERIALIZATION", providerRequestPrepared: true,
    providerRequestStarted: true, providerResponseReceived: true, httpStatusKnown: true, httpStatus: 403 },
  failureMetadata: { failureStage: "AFTER_HTTP_RESPONSE", httpStatusClass: "4XX",
    httpStatusCodeSafe: 403, safeProviderErrorIdentifier: "HTTP_403",
    transportExceptionClassSafe: "REMOTE_REQUEST_EXCEPTION" },
};
const structuredFailureMetadata = fixture(json(structuredProviderFailure), "opaque stderr ignored", 2);
assert.equal(structuredFailureMetadata.failureClass, "TRANSPORT_PERMISSION_DENIED");
assert.equal(structuredFailureMetadata.helperFailureEnvelopeValid, true);
assert.equal(structuredFailureMetadata.providerRequestStarted, true);
assert.equal(structuredFailureMetadata.providerResponseReceived, true);
assert.equal(structuredFailureMetadata.httpStatusKnown, true);
assert.equal(structuredFailureMetadata.lastCompletedPhase, "PHASE_07_PROVIDER_RESPONSE_RECEIVED");
assert.equal(structuredFailureMetadata.failedPhase, "PHASE_08_HELPER_SERIALIZATION");
const structuredFailureResult = parseG2BExplicitTransportResult({ stdout: json(structuredProviderFailure), stderr: "opaque stderr ignored", exitCode: 2, childProcessStarted: true }, readOperation);
assert.equal(structuredFailureResult.ok, false);
assert.equal(structuredFailureResult.code, "TRANSPORT_PERMISSION_DENIED");
assert.equal(structuredFailureResult.physicalCalls, 1);
assert.equal(JSON.stringify(structuredFailureResult.failureEvidence).includes("opaque stderr ignored"), false);
const inputDiagnostic = {
  argvCount: 2, argvShapeValid: true, stdinEncoding: "UTF8", stdinByteLength: 128,
  stdinBomPresent: false, stdinNewlineKind: "NONE", stdinJsonParseSucceeded: true,
  stdinSchemaValidationSucceeded: false, helperInputObjectType: "OBJECT", helperInputKeyCount: 1,
  helperInputSafeKeys: ["resource"], requiredFieldsPresent: false,
  missingRequiredFields: ["account", "member"], fieldTypeSummary: { resource: "STRING" },
  environmentContractValid: true, requestBuildState: "NOT_STARTED",
};
const inputFailure = {
  schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: false,
  code: "REQUIRED_FIELD_MISSING", requestStarted: false, remoteRequestStarted: false,
  prestateReadCompleted: false, setAttempted: false,
  failure: { code: "HELPER_REQUIRED_FIELD_MISSING", helperCode: "REQUIRED_FIELD_MISSING",
    phase: "PHASE_01_INPUT_VALIDATION", providerRequestStarted: false,
    providerResponseReceived: false, httpStatus: null },
  transportLifecycle: { lastCompletedPhase: null, failedPhase: "PHASE_01_INPUT_VALIDATION",
    providerRequestPrepared: false, providerRequestStarted: false,
    providerResponseReceived: false, httpStatusKnown: false, httpStatus: null },
  failureMetadata: { failureStage: "BEFORE_HTTP_SEND", httpStatusClass: "UNKNOWN",
    httpStatusCodeSafe: "NOT_OBSERVED", safeProviderErrorIdentifier: "NOT_AVAILABLE",
    transportExceptionClassSafe: "LOCAL_CLIENT_SETUP_FAILURE", inputContract: inputDiagnostic },
};
const inputFailureResult = parseG2BExplicitTransportResult({ stdout: json(inputFailure), stderr: "", exitCode: 2, childProcessStarted: true }, readOperation);
assert.equal(inputFailureResult.code, "TRANSPORT_HELPER_REQUIRED_FIELD_MISSING");
assert.deepEqual(inputFailureResult.failureMetadata.inputContract.missingRequiredFields, ["account", "member"]);
assert.equal(JSON.stringify(inputFailureResult.failureMetadata).includes("fixture@example.invalid"), false);
const requestShapeFailure = {
  ...inputFailure,
  code: "REQUEST_POLICY_VERSION_CONFLICT",
  failure: { ...inputFailure.failure, code: "HELPER_REQUEST_NORMALIZATION_FAILED",
    helperCode: "REQUEST_POLICY_VERSION_CONFLICT", phase: "PHASE_04_HELPER_INPUT_ACCEPTED" },
  transportLifecycle: { ...inputFailure.transportLifecycle,
    lastCompletedPhase: "PHASE_03_CHILD_STARTED", failedPhase: "PHASE_04_HELPER_INPUT_ACCEPTED" },
  helperExecution: { schemaVersion: "myweb.g2b.helper-execution.v1", success: false,
    lastCompletedPhase: "PHASE_03_CHILD_STARTED", failedPhase: "PHASE_04_HELPER_INPUT_ACCEPTED",
    failureCode: "REQUEST_POLICY_VERSION_CONFLICT", requestBuilt: false, providerRequestPrepared: false,
    providerRequestStarted: false, providerResponseReceived: false, policyExtracted: false,
    requestMetadataAvailable: false, safeDiagnostics: { serializationShape: "BOTH_PRESENT" } },
  failureMetadata: { ...inputFailure.failureMetadata,
    inputContract: { ...inputDiagnostic, stdinSchemaValidationSucceeded: true,
      requiredFieldsPresent: true, missingRequiredFields: [], requestBuildState: "REQUEST_BODY_VALIDATION" } },
};
const requestShapeResult = parseG2BExplicitTransportResult({ stdout: json(requestShapeFailure), stderr: "", exitCode: 2,
  childProcessStarted: true }, readOperation);
assert.equal(requestShapeResult.code, "TRANSPORT_RESOURCE_VALIDATION_FAILED");
assert.equal(requestShapeResult.physicalCalls, 0);
assert.equal(requestShapeResult.failureEvidence.helperFailureCode, "REQUEST_POLICY_VERSION_CONFLICT");
assert.equal(requestShapeResult.helperFailureCode, "REQUEST_POLICY_VERSION_CONFLICT");
assert.equal(requestShapeResult.helperExecution.failureCode, "REQUEST_POLICY_VERSION_CONFLICT");
assert.equal(requestShapeResult.helperExecution.providerRequestStarted, false);
const invalidStructuredFailure = fixture(json({ ...structuredProviderFailure, transportLifecycle: undefined }), "", 2);
assert.equal(invalidStructuredFailure.failureClass, "TRANSPORT_SCHEMA_INVALID");
assert.equal(invalidStructuredFailure.helperFailureEnvelopeValid, true);
assert.equal(invalidStructuredFailure.lifecycleShapeValid, false);
const phaseRegression = fixture(json({ ...structuredProviderFailure, transportLifecycle: {
  ...structuredProviderFailure.transportLifecycle, lastCompletedPhase: "PHASE_10_SCHEMA_VALIDATION"
} }), "", 2);
assert.equal(phaseRegression.failureClass, "TRANSPORT_SCHEMA_INVALID");
assert.equal(phaseRegression.lifecycleShapeValid, false);
const typedSerializationFailure = {
  ...structuredProviderFailure,
  code: "PROVIDER_POLICY_ETAG_INVALID",
  failure: { ...structuredProviderFailure.failure, code: "HELPER_POLICY_ETAG_NORMALIZATION_FAILED",
    helperCode: "PROVIDER_POLICY_ETAG_INVALID", phase: "PHASE_08_HELPER_SERIALIZATION", httpStatus: 200 },
  transportLifecycle: { ...structuredProviderFailure.transportLifecycle, httpStatus: 200 },
  failureMetadata: { ...structuredProviderFailure.failureMetadata,
    failureStage: "AFTER_HTTP_RESPONSE", httpStatusClass: "2XX", httpStatusCodeSafe: 200,
    safeProviderErrorIdentifier: "HTTP_200", transportExceptionClassSafe: "RESPONSE_PARSE_FAILURE",
    policyObjectType: "MESSAGE", canonicalizationStage: "ETAG_UTF8", serializationStage: "NOT_STARTED" }
};
const typedSerializationMetadata = fixture(json(typedSerializationFailure), "", 2);
assert.equal(typedSerializationMetadata.failureClass, "TRANSPORT_SERIALIZATION_FAILED");
assert.equal(typedSerializationMetadata.helperFailureCode, "PROVIDER_POLICY_ETAG_INVALID");
assert.equal(typedSerializationMetadata.failedPhase, "PHASE_08_HELPER_SERIALIZATION");
const versionNormalizationFailure = {
  ...structuredProviderFailure,
  code: "PROVIDER_POLICY_VERSION_INVALID",
  failure: { ...structuredProviderFailure.failure, code: "HELPER_POLICY_VERSION_NORMALIZATION_FAILED",
    helperCode: "PROVIDER_POLICY_VERSION_INVALID", phase: "PHASE_08_HELPER_SERIALIZATION", httpStatus: 200 },
  transportLifecycle: { ...structuredProviderFailure.transportLifecycle, httpStatus: 200 },
  failureMetadata: { ...structuredProviderFailure.failureMetadata, failureStage: "AFTER_HTTP_RESPONSE",
    httpStatusClass: "2XX", httpStatusCodeSafe: 200, transportExceptionClassSafe: "RESPONSE_PARSE_FAILURE",
    safeProviderErrorIdentifier: "HTTP_200", transportExceptionClassSafe: "RESPONSE_PARSE_FAILURE",
    versionDiagnostic: { versionFieldPresent: true, versionRawType: "STRING", versionRawPrimitiveValue: "1",
      versionAllowedSet: [0, 1, 3], versionNormalizationResult: "INVALID",
      versionNormalizationFailureReason: "STRING_COERCION_NOT_ALLOWED", versionSource: "MAPPING_KEY" },
    responseFieldDiagnostic: { apitoolsPolicyClassVerified: false, apitoolsBindingsState: "NOT_APITOOLS_POLICY",
      apitoolsDirectEtagPresent: false, apitoolsDirectEtagType: "MISSING", apitoolsDirectEtagSha256: null,
      protobufVersionFieldPresent: true, protobufVersionType: "INTEGER", protobufVersionValue: 1,
      apitoolsDirectVersionType: "INTEGER", apitoolsDirectVersionValue: 1,
      versionDirectPresent: true, versionDirectType: "INTEGER", versionDirectValue: 1,
      versionDescriptorType: 5, versionHasPresence: false, versionDefaultValue: 0, versionListedInListFields: true,
      messageToDictVersionPresent: true, messageToDictVersionType: "STRING", messageToDictVersionValue: "1",
      messageToDictDefaultsVersionPresent: true, messageToDictDefaultsVersionType: "STRING", messageToDictDefaultsVersionValue: "1",
      etagPresent: true, etagType: "BYTES", etagSha256: "a".repeat(64), bindingsPresent: true,
      bindingsCount: 0, conditionBindingCount: 0, conditionCount: 0, withcondMarkerCount: 0,
      conditionsPresent: false, withcondRoleMarkerPresent: false } },
};
const versionFailureParsed = parseG2BExplicitTransportResult({ stdout: json(versionNormalizationFailure), stderr: "", exitCode: 2, childProcessStarted: true }, readOperation);
assert.equal(versionFailureParsed.code, "TRANSPORT_SERIALIZATION_FAILED");
assert.equal(versionFailureParsed.helperFailureCode, "PROVIDER_POLICY_VERSION_INVALID");
assert.equal(versionFailureParsed.failureMetadata.versionDiagnostic.versionRawPrimitiveValue, "1");
assert.equal(versionFailureParsed.failureEvidence.failureVersionDiagnostic.versionRawType, "STRING");
assert.equal(versionFailureParsed.failureEvidence.responseFieldDiagnostic.protobufVersionValue, 1);
assert.equal(versionFailureParsed.failureEvidence.responseFieldDiagnostic.etagSha256, "a".repeat(64));
const spawnDenied = fixture("", "", null, { spawnAttempted: true, childProcessStarted: false, spawnError: { code: "EACCES" } });
assert.equal(spawnDenied.failureClass, "TRANSPORT_EXEC_FAILED");
assert.equal(spawnDenied.childStarted, false);
assert.equal(spawnDenied.lastCompletedPhase, "PHASE_02_CHILD_SPAWN_ATTEMPT");
assert.equal(spawnDenied.failedPhase, "PHASE_02_CHILD_SPAWN_ATTEMPT");
assert.equal(spawnDenied.unknownReason, "SPAWN_EACCES");
assert.equal(spawnDenied.spawnErrorCode, "EACCES");
for (const code of ["EPERM", "ENOENT", "EACCES"]) {
  let observedSpawnOptions;
  const result = runG2BExplicitSetPythonProcess({ executable: "C:\\Program Files\\Python\\python.exe",
    args: ["C:\\Repo Root\\helper.py", "C:\\SDK Root", "READ_GENERATION_BOUND_RECOVERY_POLICY"], input: "{}",
    environment: { PATH: "C:\\safe\\path", CLOUDSDK_CONFIG: "C:\\private\\config" },
    processHost: (_executable, _args, options) => { observedSpawnOptions = options; return ({ status: null, pid: undefined, signal: null, stdout: Buffer.alloc(0),
      stderr: Buffer.from("secret-bearing-stderr"), error: Object.assign(new Error("private spawn detail"), {
        code, errno: -4048, syscall: "spawnSync private-path" }) }); } });
  assert.equal(observedSpawnOptions.cwd, dirname(resolve("C:\\Repo Root\\helper.py")));
  assert.equal(observedSpawnOptions.shell, false);
  assert.equal(observedSpawnOptions.windowsHide, true);
  assert.equal(observedSpawnOptions.timeout, 10_000);
  assert.equal(result.childProcessStarted, false, `${code}: failed spawn is not a started child`);
  assert.equal(result.childPidPresent, false);
  assert.equal(result.spawnError.code, code);
  assert.equal(typeof result.executablePathSha256, "string");
  assert.equal(typeof result.helperPathSha256, "string");
  assert.equal(JSON.stringify(result).includes("Program Files"), false);
  assert.equal(JSON.stringify(result).includes("secret-bearing"), false);
  assert.deepEqual(result.safeEnvPresence, { SystemRoot: false, WINDIR: false, LOCALAPPDATA: false,
    PATH: true, PYTHONPATH: false, CLOUDSDK_CONFIG: true });
  const parsedSpawn = parseG2BExplicitTransportResult(result, readOperation);
  assert.equal(parsedSpawn.ok, false);
  assert.equal(parsedSpawn.failureEvidence.spawnErrorCode, code);
  assert.equal(parsedSpawn.failureEvidence.childStarted, false);
  assert.equal(parsedSpawn.failureEvidence.failedPhase, "PHASE_02_CHILD_SPAWN_ATTEMPT");
}
const completedWithoutPid = runG2BExplicitSetPythonProcess({ executable: "C:\\Program Files\\Python\\python.exe",
  args: ["C:\\Repo Root\\helper.py"], input: "{}", environment: {},
  processHost: () => ({ status: 0, signal: null, stdout: Buffer.from("{}"), stderr: Buffer.alloc(0) }) });
assert.equal(completedWithoutPid.childPidPresent, false);
assert.equal(completedWithoutPid.childProcessStarted, true,
  "a completed synchronous child is known to have started even when the runtime omitted its PID");
const childNoOutput = fixture("", "", 7, { spawnAttempted: true, childProcessStarted: true, childPidPresent: true,
  spawnReturned: true, transportStage: "NODE_SPAWN_SYNC_RETURNED" });
assert.equal(childNoOutput.childStarted, true);
assert.equal(childNoOutput.transportFailureClass, "HELPER_NO_OUTPUT");
assert.equal(childNoOutput.lastCompletedPhase, "PHASE_03_CHILD_STARTED");
assert.equal(childNoOutput.failedPhase, "PHASE_04_HELPER_INPUT_ACCEPTED");
const oversizedStderr = fixture("{}", Buffer.alloc(1024 * 1024 + 1, 0x61), 0);
assert.equal(oversizedStderr.failureClass, "TRANSPORT_TRUNCATED_OUTPUT");
assert.equal(oversizedStderr.stderrTruncated, true);
for (const version of [1, 3]) {
  const noResource = envelope({ etag: `v${version}-etag`, version, bindings: [] });
  assert.equal(Object.hasOwn(noResource.policy, "resource"), false);
  assert.equal(parseG2BExplicitTransportResult({ stdout: json(noResource), stderr: "", exitCode: 0 }, readOperation).ok, true, `Policy v${version} without resource accepted`);
  const arbitraryResponseResource = { ...noResource, policy: { ...noResource.policy, resource: "not-an-authority-source" } };
  const arbitraryParsed = parseG2BExplicitTransportResult({ stdout: json(arbitraryResponseResource), stderr: "", exitCode: 0 }, readOperation);
  assert.equal(arbitraryParsed.ok, true, `Policy v${version} arbitrary response.resource ignored`);
  assert.equal(Object.hasOwn(arbitraryParsed.policy, "resource"), false);
}
const absentRequestIdentity = classifyG2BTransportResult({
  stdout: json({ schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: false, requestStarted: true,
    httpStatus: 200, prestateReadCompleted: true, recoveryReadCompleted: false, setAttempted: false,
    code: "PROVIDER_POLICY_SCHEMA_INVALID", failureMetadata: { failureStage: "AFTER_HTTP_RESPONSE", httpStatusClass: "2XX", httpStatusCodeSafe: 200, safeProviderErrorIdentifier: "HTTP_200", transportExceptionClassSafe: "RESPONSE_PARSE_FAILURE" } }),
  stderr: "", exitCode: 2,
}, { expectedOperation: readOperation }).metadata;
assert.equal(absentRequestIdentity.failureClass, "TRANSPORT_PROVIDER_POLICY_SCHEMA_INVALID");
assert.equal(absentRequestIdentity.resourceValidationSucceeded, null, "failure envelope without request metadata is not mislabeled as a resource mismatch");
const missingVersion = parseG2BExplicitTransportResult({ stdout: json({
  schema: "myweb.g2b.explicit-set-iam-policy-transport.v2", ok: false, requestStarted: true,
  httpStatus: 200, prestateReadCompleted: true, recoveryReadCompleted: false, setAttempted: false,
  requestMetadata: requestMetadata(), code: "PROVIDER_POLICY_VERSION_MISSING",
  failureMetadata: { failureStage: "AFTER_HTTP_RESPONSE", httpStatusClass: "2XX", httpStatusCodeSafe: 200, safeProviderErrorIdentifier: "HTTP_200", transportExceptionClassSafe: "RESPONSE_PARSE_FAILURE" },
}), stderr: "", exitCode: 2 }, readOperation);
assert.equal(missingVersion.code, "TRANSPORT_POLICY_VERSION_MISSING");
const validWarning = parseG2BExplicitTransportResult({ exitCode: 0, stdout: json(envelope()), stderr: "SDK diagnostic warning" }, readOperation);
assert.equal(validWarning.ok, true, "stderr diagnostics must not discard machine-readable success");
assert.equal(validWarning.policy.etag, "fixture-etag");
assert.equal(validWarning.policy.version, 3);
assert.equal(validWarning.requestedPolicyVersion, 3);
assert.equal(validWarning.returnedPolicyVersion, 3);
assert.equal(validWarning.safeTransportMetadata.stderrPresent, true);
assert.equal(JSON.stringify(validWarning.safeTransportMetadata).includes("SDK diagnostic warning"), false);
const responseBeyondOldCap = json(envelope({ etag: "x", version: 3, bindings: [{ role: "roles/viewer", members: ["user:" + "b".repeat(5000) + "@example.invalid"] }] }));
assert.ok(Buffer.byteLength(responseBeyondOldCap) > 4096);
assert.equal(parseG2BExplicitTransportResult({ exitCode: 0, stdout: responseBeyondOldCap, stderr: "" }, readOperation).ok, true);
const invalidUtf8 = classifyG2BTransportResult({ exitCode: 0, stdout: Buffer.from([0xc3, 0x28]), stderr: Buffer.alloc(0) }, { expectedOperation: readOperation }).metadata;
assert.equal(invalidUtf8.failureClass, "TRANSPORT_ENCODING_ERROR");
assert.equal(invalidUtf8.stdoutByteLength, 2);
assert.equal(invalidUtf8.stdoutDigest, createHash("sha256").update(Buffer.from([0xc3, 0x28])).digest("hex"));
console.log("G2B explicit SetIamPolicy auth transport passed; fake process only; remote operations=0");
