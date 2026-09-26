import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildG2BRecoveryAnchor,
  createG2BRecoveryAnchorStore,
} from "../authority-audit/g2bRecoveryAnchor.mjs";
import {
  G2B_NEW_GENERATION_OPERATION_GENERATION,
  buildG2BNewGenerationAnchorRecoveryPreparation,
  inspectG2BNewGenerationRecoveryAnchor,
  verifyG2BNewGenerationAnchorRecoveryPreparation,
  writeG2BNewGenerationAnchorRecoveryArtifacts,
} from "../authority-audit/g2bM3NewGenerationAnchorRecoveryPreparation.mjs";

const root = mkdtempSync(join(tmpdir(), "myweb-g2b-new-generation-recovery-"));
const store = createG2BRecoveryAnchorStore({ directory: join(root, "anchors") });
const secret = randomBytes(32);
const keyId = randomUUID();
const provider = {
  semantic: "WINDOWS_DPAPI_CURRENT_USER_LOCAL_APPDATA_V1",
  read: () => ({ state: "READY", secret, keyId }),
};
const record = buildG2BRecoveryAnchor({
  member: "serviceAccount:synthetic@example.invalid",
  secret,
  secretKeyId: keyId,
  operationGenerationId: G2B_NEW_GENERATION_OPERATION_GENERATION,
});
assert.equal(store.create(record).ok, true);
assert.equal(store.transition(record.operationGenerationId, "ANCHOR_PERSISTED", "ANCHOR_VERIFIED").ok, true);
assert.equal(store.transition(record.operationGenerationId, "ANCHOR_VERIFIED", "MUTATION_STARTED").ok, true);
assert.equal(store.transition(record.operationGenerationId, "MUTATION_STARTED", "MUTATION_INDETERMINATE").ok, true);

const inspection = inspectG2BNewGenerationRecoveryAnchor({ store, secretProvider: provider });
assert.deepEqual(inspection, {
  present: true,
  generationMatch: true,
  state: "MUTATION_INDETERMINATE",
  hmacValid: true,
  secretProvider: "WINDOWS_DPAPI_CURRENT_USER_LOCAL_APPDATA_V1",
});

const artifacts = buildG2BNewGenerationAnchorRecoveryPreparation({
  repositoryRoot: process.cwd(),
  anchorInspection: inspection,
});
assert.equal(artifacts.runtimeCapability.graph.transitiveDependencyCount, 8);
assert.equal(artifacts.runtimeCapability.budgets.iamPolicyReadsMax, 1);
assert.equal(artifacts.runtimeCapability.budgets.opAMax, 0);
assert.equal(artifacts.runtimeCapability.budgets.iamMutationsMax, 0);
assert.equal(artifacts.packet.mutationRetryReachable, false);
assert.equal(artifacts.packet.canonicalPolicyParseRequired, true);
assert.equal(verifyG2BNewGenerationAnchorRecoveryPreparation(artifacts, { repositoryRoot: process.cwd(), anchorInspection: inspection }).ok, true);
assert.equal(verifyG2BNewGenerationAnchorRecoveryPreparation({ ...artifacts, packet: { ...artifacts.packet, targetRole: "roles/viewer" } }, { repositoryRoot: process.cwd(), anchorInspection: inspection }).ok, false);

const written = writeG2BNewGenerationAnchorRecoveryArtifacts(artifacts, { directory: join(root, "evidence") });
assert.equal(existsSync(written.paths.packet), true);
assert.equal(readFileSync(written.paths.packet, "utf8").includes("synthetic@example.invalid"), false);
assert.throws(() => writeG2BNewGenerationAnchorRecoveryArtifacts(artifacts, { directory: join(root, "evidence") }), /already-exists/);
assert.equal(inspectG2BNewGenerationRecoveryAnchor({
  operationGeneration: randomUUID(), store, secretProvider: provider,
}).hmacValid, false);

rmSync(root, { recursive: true, force: true });
console.log("G2B new-generation anchor recovery preparation passed; local anchor HMAC and source-lock only; remote operations=0");
