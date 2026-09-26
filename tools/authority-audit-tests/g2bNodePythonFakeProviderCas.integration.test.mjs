import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { captureG2BCasEvidence } from "../authority-audit/g2bCasEvidenceCapture.mjs";
import { createG2BExplicitSetIamPolicyAuthTransport, runG2BExplicitSetPythonProcess } from "../authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "../authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "../authority-audit/g2bRecoveryAnchor.mjs";

assert.equal(process.platform, "win32", "this integration follows the production Windows process contract");

const scratch = mkdtempSync(join(tmpdir(), "myweb-g2b-node-python-cas-"));
const sdkRoot = join(scratch, "google-cloud-sdk");
const gcloud = join(sdkRoot, "bin", "gcloud.cmd");
const fakePythonPath = join(sdkRoot, "platform", "bundledpython", "python.exe");
const storeMarker = join(sdkRoot, "lib", "googlecloudsdk", "core", "credentials", "store.py");
const fixtureScript = resolve("tools/authority-audit-tests/g2bHelperMainLocalProvider.integration.py");
const helperScript = resolve("tools/authority-audit/g2b_explicit_set_iam_policy_transport.py");
const python = process.env.PYTHON_EXECUTABLE || process.env.PYTHON || "python";

try {
  mkdirSync(join(sdkRoot, "bin"), { recursive: true });
  mkdirSync(join(sdkRoot, "platform", "bundledpython"), { recursive: true });
  mkdirSync(join(sdkRoot, "lib", "googlecloudsdk", "core", "credentials"), { recursive: true });
  writeFileSync(gcloud, "@echo off\r\nexit /b 0\r\n");
  writeFileSync(fakePythonPath, "test-runtime-marker");
  writeFileSync(storeMarker, "# fake SDK layout marker; provider modules are injected in the child test harness\n");
  assert.equal(existsSync(gcloud) && existsSync(fakePythonPath) && existsSync(storeMarker), true);

  const environment = { ...process.env, GCLOUD_PATH: gcloud, CLOUDSDK_CONFIG: join(scratch, "config") };
  for (const key of ["CLOUDSDK_AUTH_ACCESS_TOKEN", "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE", "CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT"]) delete environment[key];
  const operationInstance = "2ed701db-0e8b-4828-9b54-99cfc2c5ee75";
  const account = "fixture@example.invalid";
  const member = "serviceAccount:fixture@example.invalid";
  const envelope = Object.freeze({
    executionMode: "REMOTE_READ_ONLY", executeRemoteNow: true, operationInstance,
    approvalPacketSha256: "a".repeat(64), sourceLockDigest: "b".repeat(64),
    credentialRefreshMax: 0, iamReadMax: 1, setIamPolicyMax: 0, testIamPermissionsMax: 0,
  });
  let observedArgv;
  let observedInput;
  let observedEnvelope;
  let observedProbe;
  let rawChild;
  const lifecycle = [];
  const processRunner = (request) => runG2BExplicitSetPythonProcess({
    ...request,
    processHost: (_productionRuntime, args, options) => {
      lifecycle.push("NODE_BUILDER_VALIDATED_AND_SPAWN_REQUESTED");
      observedArgv = [...args];
      observedInput = options.input;
      rawChild = spawnSync(python, [fixtureScript, "--child", ...args], options);
      const probeLine = rawChild.stderr.toString("utf8").split(/\r?\n/).find((line) => line.startsWith("G2B_TEST_PROVIDER_PROBE="));
      if (probeLine) observedProbe = JSON.parse(probeLine.slice("G2B_TEST_PROVIDER_PROBE=".length));
      if (observedProbe) lifecycle.push("FAKE_PROVIDER_REQUEST_AND_RESPONSE_CONFIRMED");
      lifecycle.push("PYTHON_CHILD_EXIT_OBSERVED");
      if (Buffer.isBuffer(rawChild.stdout)) observedEnvelope = JSON.parse(rawChild.stdout.toString("utf8"));
      return rawChild;
    },
  });
  const transport = createG2BExplicitSetIamPolicyAuthTransport({
    enabled: true, executionEnvelope: envelope, environment, processRunner,
  });
  const read = await transport.readGenerationBoundRecoveryPolicy({ account, member, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE });

  assert.equal(read.ok, true, read.code);
  lifecycle.push("NODE_TRANSPORT_PARSE_AND_SCHEMA_VALIDATION_PASSED");
  assert.equal(read.physicalCalls, 1);
  assert.deepEqual(observedArgv, [helperScript, sdkRoot, "READ_GENERATION_BOUND_RECOVERY_POLICY"]);
  assert.deepEqual(Object.keys(JSON.parse(observedInput)).sort(), ["account", "member", "resource"]);
  assert.equal(JSON.parse(observedInput).resource, `projects/my-management-app-8a933/serviceAccounts/${G2B_TARGET_RESOURCE}`);
  assert.equal(observedEnvelope.ok, true);
  assert.equal(observedEnvelope.requestMetadata.requestedPolicyVersion, 3);
  assert.equal(observedEnvelope.requestMetadata.requestBodyOptionsVersionValidated, true);
  assert.equal(observedEnvelope.requestMetadata.resourceValidatedBeforeDispatch, true);
  assert.equal(observedEnvelope.returnedPolicyVersion, 3);
  assert.equal(observedEnvelope.versionSourceLayer, "PYTHON_MESSAGE_TO_DICT");
  assert.equal(observedEnvelope.serializationMetadata.policyExtractionPath, "DIRECT_POLICY_MAPPING");
  assert.equal(observedEnvelope.policy.etag, "fixture-etag");
  assert.deepEqual(observedEnvelope.transportLifecycle, {
    lastCompletedPhase: "PHASE_08_HELPER_SERIALIZATION", failedPhase: null,
    providerRequestPrepared: true, providerRequestStarted: true, providerResponseReceived: true,
    httpStatusKnown: true, httpStatus: 200,
  });
  assert.deepEqual(observedProbe, {
    providerCalls: 1, requestResourceMatches: true, requestedPolicyVersion: 3,
    credentialRefreshCalls: 0, networkCalls: 0,
  });

  const sourceLockDigest = createHash("sha256").update("local-fake-provider-contract").digest("hex");
  const captured = captureG2BCasEvidence({
    policy: read.policy,
    provenance: {
      kind: "APPROVED_GENERATION_BOUND_LIVE_READ", operationInstance,
      parentOperationInstance: "f9ddbb53-3106-40cd-a930-2fba2d9d2152",
      approvalPacketSha256: envelope.approvalPacketSha256, approvalConsumed: true,
      requestStarted: true, httpStatus: 200, fixture: false,
      requestedPolicyVersion: read.requestedPolicyVersion,
      returnedPolicyVersion: read.returnedPolicyVersion,
      versionSourceLayer: read.versionSourceLayer,
    },
    targetPrincipal: member,
    sourceSnapshotDigest: "852764abb7e811db23060204be0d36f721594cd70d9a74c4235df4199bb89b91",
    sourceLockDigest,
    readTimestamp: new Date().toISOString(),
  });
  assert.equal(captured.ok, true, captured.code);
  assert.equal(captured.evidence.casBasisCaptured, true);
  assert.equal(captured.evidence.targetBindingState, "ABSENT");
  assert.equal(captured.evidence.requestedPolicyVersion, 3);
  assert.equal(captured.evidence.returnedPolicyVersion, 3);
  assert.equal(captured.evidence.generationId, G2B_INTERRUPTED_M3_GENERATION);
  lifecycle.push("CAS_CAPTURE_COMPLETED");
  assert.deepEqual(lifecycle, [
    "NODE_BUILDER_VALIDATED_AND_SPAWN_REQUESTED", "FAKE_PROVIDER_REQUEST_AND_RESPONSE_CONFIRMED",
    "PYTHON_CHILD_EXIT_OBSERVED", "NODE_TRANSPORT_PARSE_AND_SCHEMA_VALIDATION_PASSED",
    "CAS_CAPTURE_COMPLETED",
  ]);
  // The fake-provider provenance is a non-persisted contract fixture, never live evidence.
  console.log("Node production builder -> child spawn -> Python entrypoint -> fake provider -> CAS capture passed; network=0; remote=0");
} finally {
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch (error) {
    const category = error?.code === "EPERM" || error?.code === "EACCES" ? "ACCESS_DENIED" : "CLEANUP_FAILED";
    console.warn(`TEMP_CLEANUP_WARNING category=${category} pathSha256=${createHash("sha256").update(scratch).digest("hex")}`);
  }
}
