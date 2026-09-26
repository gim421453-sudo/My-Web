import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildG2BM3ProspectiveSafetyReview,
  verifyG2BM3ProspectiveSafetyReview,
} from "../authority-audit/g2bM3ProspectiveSafetyReview.mjs";

const review = buildG2BM3ProspectiveSafetyReview();
assert.equal(verifyG2BM3ProspectiveSafetyReview(review).ok, true);
assert.equal(review.historicalUnknownPreventsNewOperation, false);
assert.equal(review.currentBlockingSafetyProperty, "M3_POST_ACCOUNTING_REATTESTATION_REQUIRED");
assert.equal(review.prospectiveNewM3SafetyAdjudicationReview, "BLOCKED");
assert.equal(review.newM3OperationReachable, false);
assert.equal(review.safetyProperties.S21_REMOTE_CAPABILITY_ACCOUNTING, "PASS");

for (const change of [
  { historicalUnknownPreventsNewOperation: true },
  { currentBlockingSafetyProperty: "NONE" },
  { newM3OperationReachable: true },
  { prospectiveNewM3SafetyAdjudicationReview: "PASS" },
  { safetyProperties: { ...review.safetyProperties, S7_RETRY0: "BLOCKED" } },
]) assert.equal(verifyG2BM3ProspectiveSafetyReview({ ...review, ...change }).ok, false);

for (const path of [
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
]) assert.doesNotMatch(readFileSync(path, "utf8"), /g2bM3NewOperationApprovalPacket/);

console.log("G2B prospective safety review requires a fresh post-accounting reattestation; remote operations=0");
