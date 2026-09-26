import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildG2BRecoveryAnchor, createG2BRecoveryAnchorStore } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { executeG2BM3AnchorReadOnlyRecovery } from "../authority-audit/g2bM3AnchorReadOnlyRecoveryExecutor.mjs";

const directory = mkdtempSync(join(tmpdir(), "myweb-g2b-recovery-"));
const secret = randomBytes(32);
const keyId = randomUUID();
const operationGenerationId = randomUUID();
const store = createG2BRecoveryAnchorStore({ directory });
const record = buildG2BRecoveryAnchor({ member: "serviceAccount:test@example.invalid", secret, secretKeyId: keyId, operationGenerationId });
assert.equal(store.create(record).ok, true);
assert.equal(store.transition(operationGenerationId, "ANCHOR_PERSISTED", "ANCHOR_VERIFIED").ok, true);
assert.equal(store.transition(operationGenerationId, "ANCHOR_VERIFIED", "MUTATION_STARTED").ok, true);
assert.equal(store.transition(operationGenerationId, "MUTATION_STARTED", "MUTATION_INDETERMINATE").ok, true);
const secretProvider = { read: () => ({ state: "READY", secret, keyId }) };
let calls = 0;
const result = await executeG2BM3AnchorReadOnlyRecovery({
  enabled: true, record: store.load(operationGenerationId).record, store, secretProvider, executable: "gcloud.cmd",
  runProcess: async () => { calls += 1; return { exitCode: 0, timedOut: false, stdout: JSON.stringify({ etag: "safe", bindings: [{ role: "roles/iam.serviceAccountTokenCreator", members: ["serviceAccount:test@example.invalid"] }] }) }; },
});
assert.equal(calls, 1);
assert.equal(result.recoveryResult, "PRESENT_CONFIRMED");
assert.equal(result.counters.opAUsed, 0);
assert.equal(result.counters.mutations, 0);
assert.equal(store.load(operationGenerationId).record.anchorState, "RECOVERY_CONFIRMED_PRESENT");
assert.equal((await executeG2BM3AnchorReadOnlyRecovery({ enabled: false })).counters.physicalRemotePolicyReadsUsed, 0);
rmSync(directory, { recursive: true, force: true });
console.log("G2B anchor recovery executor passed; remote policy reads only through injected single-call boundary");
