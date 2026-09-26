import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";

export const G2B_V3R2_SOURCE_LOCK_SCHEMA = "myweb.g2b.generation-bound-recovery-v3r2.source-lock.v1";
export const G2B_V3R2_SOURCE_LOCK_BINDING_VERSION = "v3r2-static-binding-v1";
export const G2B_V3R2_SOURCE_LOCK_HASH_ALGORITHM = "sha256";
export const G2B_V3R2_SOURCE_LOCK_PATHS = Object.freeze([
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R2.mjs", "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs", "tools/authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs", "tools/authority-audit/g2bRecoveryExecutionJournal.mjs", "tools/authority-audit/g2bRecoveryPostExecutionEvidence.mjs", "tools/authority-audit/g2bRecoveryAnchor.mjs", "tools/authority-audit/g2bLocalPinnedIdentityResolver.mjs", "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs", "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs", "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py", "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs", "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs", "tools/authority-audit/windowsDpapiSecretProvider.mjs", "tools/authority-audit/prepareG2BGenerationBoundReadOnlyRecoveryV3R2.mjs", "tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecoveryV3R2.test.mjs",
]);
const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const normalizePath = (value) => typeof value === "string" ? value.replaceAll("\\", "/") : "";
const inside = (root, candidate) => {
  const value = relative(root, candidate);
  return value === "" || (value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value));
};
const block = (code, counts = {}) => Object.freeze({
  ok: false,
  code,
  recomputed: true,
  schemaMatch: false,
  bindingMatch: false,
  pathCanonicalization: "FAIL",
  hashAlgorithmMatch: false,
  canonicalRoot: null,
  sourceSnapshotDigest: null,
  ...counts,
});

export function validateG2BV3R2SourceLock({ manifest, repositoryRoot = process.cwd(), expectedPaths = G2B_V3R2_SOURCE_LOCK_PATHS } = {}) {
  try {
    const root = realpathSync(resolve(repositoryRoot));
    if (!manifest || manifest.schema !== G2B_V3R2_SOURCE_LOCK_SCHEMA || !Array.isArray(manifest.sourceLocks) || manifest.sourceLocks.length === 0) return block("SOURCE_LOCK_SCHEMA_INVALID");
    if (manifest.hashAlgorithm !== undefined && manifest.hashAlgorithm !== G2B_V3R2_SOURCE_LOCK_HASH_ALGORITHM) return block("SOURCE_LOCK_HASH_ALGORITHM_UNSUPPORTED");
    const expected = [...expectedPaths].map(normalizePath);
    const expectedSet = new Set(expected);
    if (expected.length === 0 || expectedSet.size !== expected.length || expected.some((path) => !path || path.includes("..") || path.startsWith("/") || isAbsolute(path))) return block("SOURCE_LOCK_EXPECTED_PATHS_INVALID");
    const entries = manifest.sourceLocks.map((entry) => ({ path: normalizePath(entry?.path), sha256: entry?.sha256 }));
    const seen = new Set(); let malformed = 0; let traversal = 0; let duplicate = 0; let missing = 0; let mismatched = 0; let ambiguous = 0;
    const actual = [];
    for (const entry of entries) {
      if (!/^[a-f0-9]{64}$/.test(entry.sha256 || "")) malformed += 1;
      if (!entry.path || entry.path !== normalizePath(entry.path) || entry.path.includes("//") || entry.path.split("/").some((segment) => segment === "." || segment === "..") || entry.path.startsWith("/") || isAbsolute(entry.path) || /^[a-z]:\//i.test(entry.path)) {
        traversal += 1;
      }
      if (seen.has(entry.path.toLowerCase())) duplicate += 1; seen.add(entry.path.toLowerCase());
      const target = resolve(root, entry.path); const relativePath = relative(root, target);
      if (!inside(root, target) || relativePath.includes(`${sep}..${sep}`) || !expectedSet.has(entry.path)) { traversal += 1; continue; }
      try {
        if (lstatSync(target).isSymbolicLink() || !inside(root, realpathSync(target))) { ambiguous += 1; continue; }
        const value = digest(target); actual.push({ path: entry.path, sha256: value }); if (value !== entry.sha256) mismatched += 1;
      } catch { missing += 1; }
    }
    const unexpected = entries.filter((entry) => !expected.includes(entry.path)).length;
    const absentExpected = expected.filter((path) => !entries.some((entry) => entry.path === path)).length;
    const counts = Object.freeze({ expectedCount: expected.length, recomputedCount: actual.length, matchedCount: actual.filter((entry) => entries.find((candidate) => candidate.path === entry.path)?.sha256 === entry.sha256).length, mismatchedCount: mismatched, missingCount: missing + absentExpected, unexpectedCount: unexpected, malformedCount: malformed, duplicateCount: duplicate, traversalCount: traversal, ambiguousCount: ambiguous });
    const ok = manifest.sourceLocks.length === expected.length && malformed === 0 && traversal === 0 && duplicate === 0 && ambiguous === 0 && missing === 0 && absentExpected === 0 && unexpected === 0 && mismatched === 0 && actual.length === expected.length;
    return Object.freeze({ ok, code: ok ? "V3R2_SOURCE_LOCK_MATCH" : "V3R2_SOURCE_LOCK_BLOCKED", recomputed: true, schemaMatch: manifest.schema === G2B_V3R2_SOURCE_LOCK_SCHEMA, bindingMatch: entries.length === expected.length && unexpected === 0 && absentExpected === 0, pathCanonicalization: traversal === 0 ? "PASS" : "FAIL", hashAlgorithmMatch: malformed === 0, canonicalRoot: root, sourceSnapshotDigest: sha256Canonical({ bindingVersion: G2B_V3R2_SOURCE_LOCK_BINDING_VERSION, hashAlgorithm: G2B_V3R2_SOURCE_LOCK_HASH_ALGORITHM, actual }), counts });
  } catch { return block("V3R2_SOURCE_LOCK_VALIDATOR_EXCEPTION"); }
}
