import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveG2BLocalPinnedIdentity } from "../authority-audit/g2bLocalPinnedIdentityResolver.mjs";

const root = mkdtempSync(join(tmpdir(), "g2b-local-identity-"));
try {
  mkdirSync(join(root, "configurations"));
  writeFileSync(join(root, "active_config"), "default\n");
  writeFileSync(join(root, "configurations", "config_default"), "[core]\naccount = operator@example.invalid\n");
  const result = resolveG2BLocalPinnedIdentity({ environment: { CLOUDSDK_CONFIG: root } });
  assert.equal(result.ok, true);
  assert.equal(result.context.identityFingerprint.length, 64);
  assert.equal(Object.keys(result.context).includes("exactPrincipal"), false);
  assert.equal(result.context.exactIamMember, "user:operator@example.invalid");
  assert.equal(resolveG2BLocalPinnedIdentity({ environment: { CLOUDSDK_CONFIG: root, CLOUDSDK_AUTH_ACCESS_TOKEN: "blocked" } }).code, "LOCAL_IDENTITY_AUTH_OVERRIDE_PRESENT");
  assert.equal(resolveG2BLocalPinnedIdentity({ environment: { CLOUDSDK_CONFIG: join(root, "missing") } }).code, "LOCAL_IDENTITY_CONFIGURED_ACCOUNT_UNAVAILABLE");
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log("G2B local pinned identity resolver matrix passed; local config fixture only; remote operations=0");
