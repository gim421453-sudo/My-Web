import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { executeG2BCurrentLiveM3, G2B_CURRENT_LIVE_EXECUTOR_CONTRACT } from "../authority-audit/g2bM3CurrentLiveExecutor.mjs";
import { createG2BRecoveryAnchorStore, prepareG2BFutureM3Anchor } from "../authority-audit/g2bRecoveryAnchor.mjs";

const identityContext = Object.freeze(Object.defineProperties({}, {
  exactPrincipal: { value: "operator@example.invalid", enumerable: false },
  exactIamMember: { value: "user:operator@example.invalid", enumerable: false },
}));
const reusableSecret = Object.freeze({ state: "READY", secret: randomBytes(32), keyId: randomUUID() });
const secretProvider = { loadOrInitialize: () => reusableSecret, read: () => reusableSecret };

function fakeExecutor({ prestate = "ABSENT", set = "SET_CONFIRMED_SUCCESS", poststate = "PRESENT", readiness = "CACHED_CREDENTIAL_READY_CONFIRMED" } = {}) {
  const calls = [];
  let prestatePolicy = null;
  let setPolicy = null;
  return { calls, directTransport: {
    readFreshPrestate: async () => {
      calls.push("PRESTATE");
      prestatePolicy = { etag: "safe", bindings: [] };
      return prestate === "ABSENT" ? { ok: true, state: "ABSENT", policy: prestatePolicy } : { ok: true, state: "PRESENT", policy: prestatePolicy };
    },
    setFromFreshPrestate: async ({ policy }) => {
      calls.push("SET");
      setPolicy = policy;
      return set === "SET_CONFIRMED_SUCCESS" ? { ok: true, state: set } : { ok: false, state: set };
    },
    readPostSuccessExactMember: async () => { calls.push("POSTSTATE"); return { ok: true, state: poststate }; },
    readLocalCachedCredentialReadiness: async () => ({
      ok: true, state: readiness, physicalCalls: 0, configuredIdentityContextResolved: true,
      credentialStoreRecordResolved: true, credentialObjectLoad: "PASS", cachedAccessTokenPresent: true,
      credentialExpiryMetadataPresent: true, credentialExpiryParseValid: true,
      credentialExpiryRelativeState: readiness === "CACHED_CREDENTIAL_READY_CONFIRMED" ? "FRESH" : "EXPIRED",
      freshnessMarginSeconds: 120,
    }),
  }, get prestatePolicy() { return prestatePolicy; }, get setPolicy() { return setPolicy; } };
}

const directory = mkdtempSync(join(tmpdir(), "g2b-current-live-"));
const presentDirectory = mkdtempSync(join(tmpdir(), "g2b-current-live-present-"));
const failedDirectory = mkdtempSync(join(tmpdir(), "g2b-current-live-failed-"));
const staleDirectory = mkdtempSync(join(tmpdir(), "g2b-current-live-stale-"));
const reusedAnchorDirectory = mkdtempSync(join(tmpdir(), "g2b-current-live-reuse-"));
try {
  const store = createG2BRecoveryAnchorStore({ directory });
  const executor = fakeExecutor();
  const blocked = await executeG2BCurrentLiveM3({ enabled: true, executor, identityContext, secretProvider, store, operationGenerationId: randomUUID() });
  assert.equal(blocked.code, "CURRENT_DIRECT_TRANSPORT_AUTHORIZATION_REATTESTATION_REQUIRED");
  assert.deepEqual(executor.calls, []);
  const success = await executeG2BCurrentLiveM3({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, executor, identityContext, secretProvider, store, operationGenerationId: randomUUID() });
  assert.equal(success.ok, true);
  assert.deepEqual(executor.calls, ["PRESTATE", "SET", "POSTSTATE"]);
  assert.equal(executor.setPolicy, executor.prestatePolicy);
  assert.equal(success.counters.totalPhysicalProviderCalls, 3);

  const present = fakeExecutor({ prestate: "PRESENT" });
  const presentResult = await executeG2BCurrentLiveM3({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, executor: present, identityContext, secretProvider, store: createG2BRecoveryAnchorStore({ directory: presentDirectory }), operationGenerationId: randomUUID() });
  assert.equal(presentResult.ok, false);
  assert.deepEqual(present.calls, ["PRESTATE"]);

  const failed = fakeExecutor({ set: "ETAG_CONFLICT" });
  const failedResult = await executeG2BCurrentLiveM3({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, executor: failed, identityContext, secretProvider, store: createG2BRecoveryAnchorStore({ directory: failedDirectory }), operationGenerationId: randomUUID() });
  assert.equal(failedResult.ok, false);
  assert.deepEqual(failed.calls, ["PRESTATE", "SET"]);
  assert.equal(failedResult.counters.retries, 0);
  assert.equal(failedResult.counters.secondMutationCalls, 0);
  const stale = fakeExecutor({ readiness: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED" });
  const staleResult = await executeG2BCurrentLiveM3({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, executor: stale, identityContext, secretProvider, store: createG2BRecoveryAnchorStore({ directory: staleDirectory }), operationGenerationId: randomUUID() });
  assert.equal(staleResult.code, "PRELIVE_CACHED_CREDENTIAL_NOT_READY");
  assert.deepEqual(stale.calls, []);
  const reusedStore = createG2BRecoveryAnchorStore({ directory: reusedAnchorDirectory });
  const generation = randomUUID();
  assert.equal(prepareG2BFutureM3Anchor({ identityContext, secretProvider, store: reusedStore, operationGenerationId: generation }).mutationReachable, true);
  const reused = fakeExecutor();
  const reusedResult = await executeG2BCurrentLiveM3({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, executor: reused, identityContext, secretProvider, store: reusedStore, operationGenerationId: generation });
  assert.equal(reusedResult.ok, true);
  assert.deepEqual(reused.calls, ["PRESTATE", "SET", "POSTSTATE"]);
} finally { for (const path of [directory, presentDirectory, failedDirectory, staleDirectory, reusedAnchorDirectory]) rmSync(path, { recursive: true, force: true }); }

assert.equal(G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.oldGcloudMutationReachability, 0);
assert.equal(G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.directSetInternalGetIamPolicy, false);
assert.equal(G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.totalPhysicalProviderCallsMax, 3);
assert.equal(G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.existingVerifiedAnchorReuseSupported, true);
console.log("G2B current live executor direct-path matrix passed; fake transport only; remote operations=0");
