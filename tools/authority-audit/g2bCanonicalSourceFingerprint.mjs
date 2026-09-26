import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const G2B_SOURCE_FINGERPRINT_SCHEMA_VERSION = 2;
export const G2B_CAS_SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bCasEvidenceCapture.mjs",
  "tools/authority-audit-tests/g2bCasEvidenceCapture.test.mjs",
  "tools/authority-audit/g2bHostAnchorAttestation.mjs",
  "tools/authority-audit-tests/g2bHostAnchorAttestation.test.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicyAuthTransport.test.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicyTransport.test.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicySdkContract.test.mjs",
  "tools/authority-audit-tests/g2bPolicyResponseNormalizer.test.py",
  "tools/authority-audit-tests/g2bInstalledApitoolsPolicyResponse.test.py",
  "tools/authority-audit-tests/g2bTransportHelperEnvelope.test.py",
  "tools/authority-audit-tests/g2bV3DiagnosticContinuityAttestation.test.mjs",
  "tools/authority-audit-tests/windowsDpapiSecretProvider.test.mjs",
  "tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecoveryV3R2.test.mjs",
  "tools/authority-audit-tests/g2bHostAnchorAttestationHost.integration.mjs",
  "tools/authority-audit/g2bRecoveryV3R2RefreshReadBridge.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R2.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs",
  "tools/authority-audit/g2bRecoveryExecutionJournal.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bLocalPinnedIdentityResolver.mjs",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/invokeWindowsDpapi.ps1",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/g2bCurrentRunExecutionIntent.mjs",
  "tools/authority-audit-tests/g2bCurrentRunExecutionIntent.test.mjs",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-source-lock-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-implementation-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-runtime-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-prospective-safety-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-composite-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-source-lock-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-implementation-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-runtime-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-prospective-safety-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-composite-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-approval-packet-v5.json",
  "docs/evidence/g2b-generation-lineage-manual-review-v1.json",
  "docs/evidence/g2b-generation-lineage-manual-review-v1.md",
  "docs/evidence/g2b-clean-generation-bootstrap-design-v1.json",
  "docs/evidence/g2b-clean-generation-bootstrap-design-v1.md",
  "tools/authority-audit/g2bCanonicalGenerationManifest.mjs",
  "tools/authority-audit/g2bCleanGenerationAttestation.mjs",
  "tools/authority-audit/g2bCleanGenerationBootstrap.mjs",
  "tools/authority-audit-tests/g2bCleanGenerationBootstrap.test.mjs",
  "tools/authority-audit/g2bCanonicalSourceFingerprint.mjs",
  "tools/authority-audit/g2bCleanGenerationCasEvidenceCapture.mjs",
  "tools/authority-audit-tests/g2bCleanGenerationCasEvidenceCapture.test.mjs",
  "tools/authority-audit-tests/g2bCleanGenerationCasEvidenceCapture.integration.test.mjs",
  "tools/authority-audit-tests/g2bCleanGenerationBootstrapDryRun.integration.mjs",
  "tools/authority-audit-tests/g2bHelperMainLocalProvider.integration.py",
]);

const SHA256 = /^[a-f0-9]{64}$/;
function normalizedPath(path) {
  if (typeof path !== "string") throw new TypeError("source-path-invalid");
  const normalized = path.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || /^[a-z]:/i.test(normalized)
    || normalized.split("/").some((part) => !part || part === "." || part === "..")) throw new TypeError("source-path-invalid");
  return normalized;
}

export function canonicalSourceEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new TypeError("source-entries-invalid");
  const normalized = entries.map(({ path, sha256 }) => {
    if (!SHA256.test(sha256 || "")) throw new TypeError("source-hash-invalid");
    return { path: normalizedPath(path), sha256 };
  }).sort((a, b) => Buffer.compare(Buffer.from(a.path, "utf8"), Buffer.from(b.path, "utf8")));
  if (normalized.some((entry, index) => index > 0 && entry.path === normalized[index - 1].path)) throw new TypeError("duplicate-source-path");
  return normalized;
}

export function computeCanonicalSourceFingerprint(entries) {
  const input = { schemaVersion: G2B_SOURCE_FINGERPRINT_SCHEMA_VERSION, sourceLocks: canonicalSourceEntries(entries) };
  return createHash("sha256").update(JSON.stringify(input), "utf8").digest("hex");
}

export function currentG2BCasSourceEntries({ repositoryRoot = process.cwd() } = {}) {
  return G2B_CAS_SOURCE_PATHS.map((path) => ({ path, sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex") }));
}
