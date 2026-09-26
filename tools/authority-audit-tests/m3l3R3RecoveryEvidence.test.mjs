import assert from "node:assert/strict";
import { buildM3L3R3RecoveryEvidence, computeM3L3R3RecoveryEvidenceSha256, verifyM3L3R3RecoveryEvidence } from "../authority-audit/m3l3R3RecoveryEvidence.mjs";
const evidence = buildM3L3R3RecoveryEvidence();
assert.equal(verifyM3L3R3RecoveryEvidence(evidence).ok, true);
assert.match(computeM3L3R3RecoveryEvidenceSha256(evidence), /^[a-f0-9]{64}$/);
for (const mutate of [(x) => { x.remoteRead.used = 2; }, (x) => { x.forbiddenOperationCounts.iamMutations = 1; }, (x) => { x.parser.bindingsNormalization = "EXPLICIT_EMPTY"; }, (x) => { x.approval.reusable = true; }]) { const changed = structuredClone(evidence); mutate(changed); assert.equal(verifyM3L3R3RecoveryEvidence(changed).ok, false); }
console.log("M3L3 R3 recovery evidence passed; remote writes=0");
