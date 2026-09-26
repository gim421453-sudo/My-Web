import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createG2BCredentialRefreshTransport } from "../authority-audit/g2bCredentialRefreshTransport.mjs";

let modes = [];
const transport = createG2BCredentialRefreshTransport({
  processRunner: async ({ args }) => {
    modes.push(args.at(-1));
    return {
      exitCode: 0, timedOut: false, spawnError: null, stderr: "",
      stdout: JSON.stringify({ schema: "myweb.g2b.credential-refresh-transport.v1", ok: true, refreshResult: "SUCCESS", tokenFreshAfterRefresh: true, tokenExpiryPresentAfterRefresh: true, credentialStoreUpdated: false, fakeMode: true }),
    };
  },
});
assert.equal((await transport.probeFakeRefresh()).ok, true);
assert.equal((await transport.refreshOnce()).ok, false);
assert.equal(modes[0], "--fake-refresh-success");

const approved = createG2BCredentialRefreshTransport({
  processRunner: async ({ args }) => ({
    exitCode: 0, timedOut: false, spawnError: null, stderr: "",
    stdout: JSON.stringify({ schema: "myweb.g2b.credential-refresh-transport.v1", ok: true, refreshResult: "SUCCESS", tokenFreshAfterRefresh: true, tokenExpiryPresentAfterRefresh: true, credentialStoreUpdated: args.at(-1) === "--refresh-once", fakeMode: false }),
  }),
});
assert.equal((await approved.refreshOnce({ enabled: true })).ok, true);
assert.equal((await approved.refreshOnce({ enabled: true })).ok, false);

const safeFailure = (code, overrides = {}) => JSON.stringify({
  schema: "myweb.g2b.credential-refresh-transport.v1",
  ok: false,
  code,
  failureMetadata: {
    failureStage: "AFTER_HTTP_RESPONSE",
    localSetupSubstage: "CREDENTIAL_REFRESH",
    httpStatusClass: "NOT_OBSERVED",
    httpStatusCodeSafe: "NOT_OBSERVED",
    transportExceptionClassSafe: "REFRESH_AUTH_FAILURE",
    safeProviderErrorIdentifier: "NOT_AVAILABLE",
    timeout: false,
    ...overrides,
  },
});
for (const [name, result, expected] of [
  ["auth failure", { exitCode: 2, timedOut: false, spawnError: null, stderr: "", stdout: safeFailure("AUTH_FAILURE") }, "AUTH_FAILURE"],
  ["request timeout", { exitCode: null, timedOut: true, spawnError: null, stderr: "", stdout: "" }, "REQUEST_FAILURE"],
  ["request failure", { exitCode: null, timedOut: false, spawnError: "spawn blocked", stderr: "", stdout: "" }, "LOCAL_SETUP_FAILURE"],
  ["privacy guard", { exitCode: 0, timedOut: false, spawnError: null, stderr: "unsafe", stdout: "{}" }, "PRIVACY_GUARD_FAILURE"],
]) {
  const fixture = createG2BCredentialRefreshTransport({ processRunner: async () => result });
  assert.equal((await fixture.probeFakeRefresh()).code, expected, name);
}

const helper = readFileSync("tools/authority-audit/g2b_credential_refresh_transport.py", "utf8");
assert.match(helper, /__wrapped__/);
assert.match(helper, /store\.Store\(credential/);
assert.match(helper, /--fake-refresh-success/);
assert.match(helper, /credentialStoreUpdated": not fake_mode/);
assert.doesNotMatch(helper, /print-access-token|generateAccessToken|serviceAccounts\.keys/i);
console.log("G2B credential refresh local fixtures passed; remote operations=0");
