import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  G2B_V3R2_SOURCE_LOCK_SCHEMA,
  validateG2BV3R2SourceLock,
} from "../authority-audit/g2bV3R2SourceLockValidator.mjs";

const root = mkdtempSync(join(tmpdir(), "myweb-v3r2-source-lock-"));
const paths = Object.freeze(["fixture/a.mjs", "fixture/b.mjs"]);
for (const path of paths) {
  const target = join(root, path);
  const directory = target.slice(0, target.lastIndexOf("\\"));
  if (directory) mkdirSync(directory, { recursive: true });
  writeFileSync(target, `export const value = ${JSON.stringify(path)};\n`, "utf8");
}
const sha = (path) => createHash("sha256").update(readFileSync(join(root, path))).digest("hex");
const manifest = () => ({ schema: G2B_V3R2_SOURCE_LOCK_SCHEMA, sourceLocks: paths.map((path) => ({ path, sha256: sha(path) })) });
const validate = (value) => validateG2BV3R2SourceLock({ manifest: value, repositoryRoot: root, expectedPaths: paths });

// A, B, C, D, E, I, J, K, L, N, R, T, U, and W cover the fail-closed source-binding cases.
const originalManifest = manifest();
const initial = validate(originalManifest);
assert.equal(initial.ok, true);
assert.equal(initial.counts.expectedCount, 2);
assert.equal(initial.counts.recomputedCount, 2);
assert.equal(initial.pathCanonicalization, "PASS");

const changedHash = manifest(); changedHash.sourceLocks[0].sha256 = "0".repeat(64);
assert.equal(validate(changedHash).ok, false);
const missing = manifest(); missing.sourceLocks.pop();
assert.equal(validate(missing).ok, false);
unlinkSync(join(root, paths[1]));
assert.equal(validate(originalManifest).ok, false);
writeFileSync(join(root, paths[1]), `export const value = ${JSON.stringify(paths[1])};\n`, "utf8");
const extra = manifest(); extra.sourceLocks.push({ path: "fixture/extra.mjs", sha256: "0".repeat(64) });
assert.equal(validate(extra).ok, false);
const malformed = manifest(); malformed.sourceLocks[0].sha256 = "not-a-hash";
assert.equal(validate(malformed).ok, false);
assert.equal(validate({ ...manifest(), schema: "wrong" }).code, "SOURCE_LOCK_SCHEMA_INVALID");
assert.equal(validate({ ...manifest(), hashAlgorithm: "sha1" }).code, "SOURCE_LOCK_HASH_ALGORITHM_UNSUPPORTED");
const duplicate = manifest(); duplicate.sourceLocks[1] = { ...duplicate.sourceLocks[1], path: "fixture/A.mjs" };
assert.equal(validate(duplicate).ok, false);
const traversal = manifest(); traversal.sourceLocks[0] = { ...traversal.sourceLocks[0], path: "../outside.mjs" };
assert.equal(validate(traversal).ok, false);
const absolute = manifest(); absolute.sourceLocks[0] = { ...absolute.sourceLocks[0], path: "C:/outside.mjs" };
assert.equal(validate(absolute).ok, false);
assert.equal(validate({ schema: G2B_V3R2_SOURCE_LOCK_SCHEMA, sourceLocks: [] }).code, "SOURCE_LOCK_SCHEMA_INVALID");
assert.equal(validate(null).code, "SOURCE_LOCK_SCHEMA_INVALID");
try {
  symlinkSync(join(root, paths[0]), join(root, "fixture/link.mjs"), "file");
  const linkManifest = { schema: G2B_V3R2_SOURCE_LOCK_SCHEMA, sourceLocks: [{ path: "fixture/link.mjs", sha256: sha(paths[0]) }] };
  assert.equal(validateG2BV3R2SourceLock({ manifest: linkManifest, repositoryRoot: root, expectedPaths: ["fixture/link.mjs"] }).ok, false);
} catch (error) {
  assert.ok(["EPERM", "EACCES"].includes(error?.code));
}
assert.equal(validateG2BV3R2SourceLock({ manifest: manifest(), repositoryRoot: join(root, "other-root"), expectedPaths: paths }).ok, false);

const repeat = validate(manifest());
assert.equal(repeat.ok, true);
assert.equal(repeat.sourceSnapshotDigest, initial.sourceSnapshotDigest);
writeFileSync(join(root, paths[0]), "export const value = 'changed';\n", "utf8");
assert.equal(validate(manifest()).ok, true);
assert.equal(validate(originalManifest).ok, false);

console.log("G2B V3R2 source-lock validator passed; local fixture only; remote operations=0");
