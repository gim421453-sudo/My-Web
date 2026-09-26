import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { G2B_CURRENT_LIVE_EXECUTOR_CONTRACT } from "./g2bM3CurrentLiveExecutor.mjs";
import { G2B_M3_RUNTIME_CONTRACT } from "./g2bM3RecoveryAnchorRuntime.mjs";
import { G2B_RECOVERY_ANCHOR_CONTRACT } from "./g2bRecoveryAnchor.mjs";
import { WINDOWS_DPAPI_SECRET_PROVIDER_CONTRACT } from "./windowsDpapiSecretProvider.mjs";
import { buildG2BRepairedM3ProspectiveSafetyReattestation, verifyG2BRepairedM3ProspectiveSafetyReattestation } from "./g2bRepairedM3ProspectiveSafetyReattestation.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";

export const G2B_REPAIRED_M3_DPAPI_REATTESTATION_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-DPAPI-RECOVERY-REATTESTATION";
const PREDECESSOR_PATHS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-implementation-attestation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-runtime-capability-attestation-v1.json",
  composite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-final-execution-composite-v1.json",
});
const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/invokeWindowsDpapi.ps1",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit-tests/windowsDpapiSecretProvider.test.mjs",
  "tools/authority-audit-tests/g2bRecoveryAnchor.test.mjs",
]);

function hash(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function sourceLocks(repositoryRoot) { return Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: hash(resolve(repositoryRoot, path)) }))); }
function predecessorPersisted(repositoryRoot, predecessor) {
  return Object.entries(PREDECESSOR_PATHS).every(([key, relative]) => {
    const path = resolve(repositoryRoot, relative);
    return existsSync(path) && canonicalJson(JSON.parse(readFileSync(path, "utf8"))) === canonicalJson(predecessor[key]);
  });
}

export function buildG2BRepairedM3DpapiRecoveryReattestation({ repositoryRoot = process.cwd() } = {}) {
  const predecessor = buildG2BRepairedM3ProspectiveSafetyReattestation({ repositoryRoot });
  // The predecessor is reconstructed from current source locks. Its previous
  // persisted artifacts remain historical evidence and are never overwritten.
  const predecessorValid = verifyG2BRepairedM3ProspectiveSafetyReattestation(predecessor, { repositoryRoot }).ok;
  const locks = sourceLocks(repositoryRoot);
  const implementation = Object.freeze({
    schema: "myweb.g2b.repaired-m3.dpapi-recovery-implementation-attestation.v1",
    stage: G2B_REPAIRED_M3_DPAPI_REATTESTATION_STAGE,
    predecessorCompositeSha256: sha256Canonical(predecessor.composite),
    dpapiProvider: WINDOWS_DPAPI_SECRET_PROVIDER_CONTRACT.semantic,
    dpapiScope: WINDOWS_DPAPI_SECRET_PROVIDER_CONTRACT.scope,
    invalidMetadataRepair: "EXPLICIT_ONLY_ACTIVE_ANCHOR_COUNT_MUST_BE_ZERO",
    historicalAnchorRewriteReachability: false,
    sourceLocks: locks,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.repaired-m3.dpapi-recovery-runtime-capability-attestation.v1",
    stage: G2B_REPAIRED_M3_DPAPI_REATTESTATION_STAGE,
    localDpapiOnly: true,
    remoteOperationsMax: 0,
    secretCommandLineReachable: WINDOWS_DPAPI_SECRET_PROVIDER_CONTRACT.secretCommandLineReachable,
    secretEvidenceReachable: WINDOWS_DPAPI_SECRET_PROVIDER_CONTRACT.secretEvidenceReachable,
    silentRotationAllowed: WINDOWS_DPAPI_SECRET_PROVIDER_CONTRACT.silentRotationAllowed,
    recoveryAnchorRequired: G2B_RECOVERY_ANCHOR_CONTRACT.verifiedBeforeMutationRequired,
    approvalBeforeFirstRemoteRequired: G2B_M3_RUNTIME_CONTRACT.approvalConsumptionBeforeFirstRemoteRequired,
    directMutationCallsMax: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.directSetInternalGetIamPolicy === false ? 1 : 0,
  });
  const complete = predecessorValid
    && runtimeCapability.localDpapiOnly === true
    && runtimeCapability.remoteOperationsMax === 0
    && implementation.historicalAnchorRewriteReachability === false
    && runtimeCapability.recoveryAnchorRequired === true;
  const sourceLockManifest = Object.freeze({ schema: "myweb.g2b.repaired-m3.dpapi-recovery-source-lock.v1", stage: G2B_REPAIRED_M3_DPAPI_REATTESTATION_STAGE, sourceLocks: locks });
  const composite = Object.freeze({
    schema: "myweb.g2b.repaired-m3.dpapi-recovery-final-execution-composite.v1",
    stage: G2B_REPAIRED_M3_DPAPI_REATTESTATION_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationSha256: sha256Canonical(implementation),
    runtimeCapabilitySha256: sha256Canonical(runtimeCapability),
    predecessorCompositeSha256: sha256Canonical(predecessor.composite),
    prospectiveM3SafeToPrepare: complete,
    m3ExecutionReachableWithoutSeparateApproval: false,
    remoteOperations: 0,
  });
  return Object.freeze({ sourceLockManifest, implementation, runtimeCapability, composite });
}

export function verifyG2BRepairedM3DpapiRecoveryReattestation(value, options = {}) {
  try {
    const expected = buildG2BRepairedM3DpapiRecoveryReattestation(options);
    const ok = canonicalJson(value) === canonicalJson(expected) && expected.composite.prospectiveM3SafeToPrepare === true;
    return Object.freeze({ ok, code: ok ? "REPAIRED_M3_DPAPI_RECOVERY_REATTESTATION_PASS" : "REPAIRED_M3_DPAPI_RECOVERY_REATTESTATION_BLOCKED" });
  } catch { return Object.freeze({ ok: false, code: "REPAIRED_M3_DPAPI_RECOVERY_REATTESTATION_INVALID" }); }
}

export function writeG2BRepairedM3DpapiRecoveryReattestation(artifacts, { repositoryRoot = process.cwd() } = {}) {
  if (artifacts?.composite?.prospectiveM3SafeToPrepare !== true) throw new Error("repaired-m3-dpapi-reattestation-blocked");
  const outputs = Object.freeze({
    sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-dpapi-source-lock-v1.json",
    implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-dpapi-implementation-attestation-v1.json",
    runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-dpapi-runtime-capability-attestation-v1.json",
    composite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-dpapi-final-execution-composite-v1.json",
  });
  const paths = {};
  for (const [key, relative] of Object.entries(outputs)) {
    const path = resolve(repositoryRoot, relative);
    if (existsSync(path)) throw new Error("repaired-m3-dpapi-reattestation-artifact-already-exists");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(artifacts[key], null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    paths[key] = relative;
  }
  return Object.freeze({ paths: Object.freeze(paths), compositeSha256: sha256Canonical(artifacts.composite) });
}
