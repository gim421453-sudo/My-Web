import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HISTORICAL_M3_OPERATION_GENERATION,
  buildG2BM3ProspectiveSafetyAdjudication,
  verifyG2BM3ProspectiveSafetyAdjudication,
} from "../authority-audit/g2bM3ProspectiveSafetyAdjudication.mjs";
import { G2B_M3_NEW_OPERATION_GENERATION } from "../authority-audit/g2bM3NewOperationApprovalPacket.mjs";

const adjudication = buildG2BM3ProspectiveSafetyAdjudication();
assert.equal(verifyG2BM3ProspectiveSafetyAdjudication(adjudication).ok, true);
const persisted = JSON.parse(readFileSync(
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-prospective-safety-adjudication-v1.json",
  "utf8",
));
assert.equal(verifyG2BM3ProspectiveSafetyAdjudication(persisted).ok, true);
assert.equal(adjudication.historicalRootCauseInvestigationClosed, true);
assert.equal(adjudication.prospectiveNewM3SafetyAdjudication, "BLOCKED");
assert.equal(adjudication.newM3OperationReachable, false);
assert.equal(adjudication.newM3OperationGeneration, "NOT_CREATED");
assert.notEqual(G2B_M3_NEW_OPERATION_GENERATION, HISTORICAL_M3_OPERATION_GENERATION);
assert.equal(adjudication.oldPacketReplayReachable, false);
assert.equal(adjudication.oldGenerationRetryReachable, false);
assert.equal(adjudication.newOperationAutomaticRetryReachable, false);
assert.equal(adjudication.newOperationSecondMutationReachable, false);
assert.equal(adjudication.newOperationRollbackMutationReachable, false);
assert.equal(adjudication.freshPrestateRequired, true);
assert.equal(adjudication.historicalPrestateReusable, false);
assert.equal(adjudication.historicalRecoveryAsNewPrestate, false);
assert.equal(adjudication.remoteOperations, 0);
for (const activePath of [
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
]) {
  assert.doesNotMatch(readFileSync(activePath, "utf8"), /g2bM3NewOperationApprovalPacket/);
}

for (const change of [
  { prospectiveNewM3SafetyAdjudication: "PASS" },
  { newM3OperationReachable: true },
  { newM3OperationGeneration: "11111111-1111-4111-8111-111111111111" },
  { freshPrestateRequired: false },
  { oldPacketReplayReachable: true },
  { m3MutationAttemptsMax: 2 },
]) {
  assert.equal(verifyG2BM3ProspectiveSafetyAdjudication({ ...adjudication, ...change }).ok, false);
}

console.log("G2B M3 prospective safety adjudication passed; blocked, local only; remote operations=0");
