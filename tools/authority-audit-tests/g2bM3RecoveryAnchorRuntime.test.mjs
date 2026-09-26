import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createG2BRecoveryAnchorStore } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { executeG2BFutureM3, G2B_M3_RUNTIME_CONTRACT } from "../authority-audit/g2bM3RecoveryAnchorRuntime.mjs";

const deterministicSecretProvider = Object.freeze({
  loadOrInitialize: () => Object.freeze({
    state: "READY",
    secret: Buffer.alloc(32, 0x5a),
    keyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  }),
  read: () => Object.freeze({
    state: "READY",
    secret: Buffer.alloc(32, 0x5a),
    keyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  }),
});

async function scenario(crashAt = null, confirmedSuccess = true) {
  const root = mkdtempSync(join(tmpdir(), "myweb-anchor-runtime-"));
  try {
    let mutations = 0;
    const operationGenerationId = "11111111-1111-4111-8111-111111111111";
    const store = createG2BRecoveryAnchorStore({ directory: join(root, "anchors") });
    const result = await executeG2BFutureM3({
      identityContext: { exactIamMember: "user:runtime-subject@example.invalid" },
      secretProvider: deterministicSecretProvider,
      store,
      readPrestate: async () => "MEMBER_ABSENT_CONFIRMED",
      mutateOnce: async () => { mutations += 1; return { confirmedSuccess }; },
      readPoststate: async () => "PRESENT_CONFIRMED",
      beforeFirstRemote: async () => true,
      operationGenerationId,
      crashAt,
    });
    return { result, mutations, persistedState: store.load(operationGenerationId).record?.anchorState || null };
  } finally { rmSync(root, { recursive: true, force: true }); }
}

let remoteBoundaryCalls = 0;
const remoteBoundaries = {
  readPrestate: async () => { remoteBoundaryCalls += 1; return "MEMBER_ABSENT_CONFIRMED"; },
  mutateOnce: async () => { remoteBoundaryCalls += 1; return { confirmedSuccess: true }; },
  readPoststate: async () => { remoteBoundaryCalls += 1; return "PRESENT_CONFIRMED"; },
  beforeFirstRemote: async () => true,
};
const persistenceFailureStore = {
  hasAnyAnchor: () => false,
  create: () => ({ ok: false, code: "ANCHOR_PERSISTENCE_FAILURE" }),
  load: () => ({ state: "MISSING" }),
  transition: () => ({ ok: false }),
};
const rereadFailureStore = { ...persistenceFailureStore, create: () => ({ ok: true }) };

for (const [label, input] of [
  ["BEFORE_ANCHOR_PERSISTENCE", { identityContext: null, store: persistenceFailureStore }],
  ["DURING_ANCHOR_PERSISTENCE", { identityContext: { exactIamMember: "user:runtime-subject@example.invalid" }, store: persistenceFailureStore }],
  ["AFTER_PERSISTENCE_BEFORE_VERIFICATION", { identityContext: { exactIamMember: "user:runtime-subject@example.invalid" }, store: rereadFailureStore }],
]) {
  const result = await executeG2BFutureM3({
    ...input,
    secretProvider: deterministicSecretProvider,
    operationGenerationId: "22222222-2222-4222-8222-222222222222",
    ...remoteBoundaries,
  });
  assert.equal(result.mutationAttempts, 0, label);
  assert.equal(result.mutationReachable, false, label);
}
assert.equal(remoteBoundaryCalls, 0, "anchor preparation failures must not reach remote boundaries");

for (const crashAt of ["AFTER_ANCHOR_VERIFIED_BEFORE_PRESTATE", "AFTER_PRESTATE_BEFORE_MUTATION", "IMMEDIATELY_BEFORE_REMOTE_MUTATION"]) {
  const observed = await scenario(crashAt);
  assert.equal(observed.mutations, 0, crashAt);
}
for (const crashAt of ["AFTER_REMOTE_MUTATION_BEFORE_LOCAL_RESULT_CAPTURE", "AFTER_MUTATION_RESULT_BEFORE_STATE_PERSISTENCE"]) {
  const observed = await scenario(crashAt);
  assert.equal(observed.mutations, 1, crashAt);
  assert.equal(observed.result.anchorState, "MUTATION_STARTED", crashAt);
}
const completed = await scenario();
assert.equal(completed.result.ok, true);
assert.equal(completed.mutations, 1);
const indeterminate = await scenario(null, false);
assert.equal(indeterminate.result.code, "M3_MUTATION_INDETERMINATE");
assert.equal(indeterminate.result.mutationAttempts, 1);
assert.equal(indeterminate.persistedState, "MUTATION_INDETERMINATE");
assert.equal(G2B_M3_RUNTIME_CONTRACT.mutationWithoutVerifiedAnchorReachability, 0);
const approvalDirectory = mkdtempSync(join(tmpdir(), "myweb-anchor-runtime-approval-"));
try {
  const approvalBlocked = await executeG2BFutureM3({
    identityContext: { exactIamMember: "user:runtime-subject@example.invalid" },
    secretProvider: deterministicSecretProvider,
    store: createG2BRecoveryAnchorStore({ directory: approvalDirectory }),
    readPrestate: async () => "MEMBER_ABSENT_CONFIRMED",
    mutateOnce: async () => ({ confirmedSuccess: true }),
    readPoststate: async () => "PRESENT_CONFIRMED",
    operationGenerationId: "33333333-3333-4333-8333-333333333333",
  });
  assert.equal(approvalBlocked.code, "APPROVAL_CONSUMER_REQUIRED");
} finally { rmSync(approvalDirectory, { recursive: true, force: true }); }
const reuseDirectory = mkdtempSync(join(tmpdir(), "myweb-anchor-runtime-reuse-"));
try {
  const store = createG2BRecoveryAnchorStore({ directory: reuseDirectory });
  const generation = "44444444-4444-4444-8444-444444444444";
  const initial = await executeG2BFutureM3({
    identityContext: { exactIamMember: "user:runtime-subject@example.invalid" }, secretProvider: deterministicSecretProvider, store,
    readPrestate: async () => "TARGET_MEMBER_PRESENT", mutateOnce: async () => ({ confirmedSuccess: true }), readPoststate: async () => "PRESENT_CONFIRMED",
    beforeFirstRemote: async () => true, operationGenerationId: generation,
  });
  assert.equal(initial.code, "PRESTATE_NOT_EXACT_ABSENT");
  let remoteCalls = 0;
  const reused = await executeG2BFutureM3({
    identityContext: { exactIamMember: "user:runtime-subject@example.invalid" }, secretProvider: deterministicSecretProvider, store,
    readPrestate: async () => { remoteCalls += 1; return "MEMBER_ABSENT_CONFIRMED"; },
    mutateOnce: async () => { remoteCalls += 1; return { confirmedSuccess: true }; },
    readPoststate: async () => { remoteCalls += 1; return "PRESENT_CONFIRMED"; }, beforeFirstRemote: async () => true,
    operationGenerationId: generation, reuseVerifiedAnchor: true,
  });
  assert.equal(reused.ok, true);
  assert.equal(remoteCalls, 3);
} finally { rmSync(reuseDirectory, { recursive: true, force: true }); }
assert.equal(G2B_M3_RUNTIME_CONTRACT.existingVerifiedAnchorReuseSupported, true);
console.log("G2B M3 recovery-anchor crash-window matrix passed; synthetic only; remote operations=0");
