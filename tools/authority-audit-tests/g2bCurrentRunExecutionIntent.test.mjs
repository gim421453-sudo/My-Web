import assert from "node:assert/strict";
import { authorizeG2BTransportOperation, hasExplicitRemoteExecutionIntent, validateG2BCurrentRunExecutionEnvelope } from "../authority-audit/g2bCurrentRunExecutionIntent.mjs";

const operationInstance = "d204bd17-b49b-45a3-bf7b-2fe92051d742";
const packetRawSha256 = "a".repeat(64);
const sourceLockDigest = "b".repeat(64);
const packet = Object.freeze({ operationInstance, credentialRefreshMax: 1, iamPolicyReadMax: 1, totalPhysicalRemoteCallsMax: 2, setIamPolicyMax: 0 });
const envelope = (overrides = {}) => ({
  executionMode: "REMOTE_READ_ONLY",
  executeRemoteNow: true,
  operationInstance,
  approvalPacketSha256: packetRawSha256,
  sourceLockDigest,
  credentialRefreshMax: 1,
  iamReadMax: 1,
  setIamPolicyMax: 0,
  ...overrides,
});
const validate = (value, currentPacket = packet) => validateG2BCurrentRunExecutionEnvelope({
  executionEnvelope: value,
  operationInstance,
  packetRawSha256,
  sourceLockDigest,
  packet: currentPacket,
});

assert.equal(hasExplicitRemoteExecutionIntent(undefined), false);
assert.equal(hasExplicitRemoteExecutionIntent({ executionMode: "LOCAL_ONLY", executeRemoteNow: false }), false);
assert.equal(hasExplicitRemoteExecutionIntent({ executionMode: "LOCAL_ONLY", executeRemoteNow: true }), false);
assert.equal(hasExplicitRemoteExecutionIntent({ executionMode: "REMOTE_READ_ONLY", executeRemoteNow: false }), false);

// Old approvals and summaries are deliberately not inputs to the authorization decision.
assert.equal(validate(undefined).ok, false, "old valid approval plus latest LOCAL_ONLY blocks");
assert.equal(validate({ executionMode: "LOCAL_ONLY", executeRemoteNow: false, oldApprovalValid: true }).ok, false, "latest LOCAL_ONLY beats old approval");
assert.equal(validate({ oldApprovalSummary: { status: "APPROVED" } }).ok, false, "approval summary is not a current execution directive");
assert.equal(validate(undefined, packet).ok, false, "ready packet without current marker blocks");
assert.equal(validate(undefined).code, "CURRENT_REMOTE_EXECUTION_INTENT_REQUIRED", "compressed/unknown intent fails closed");
assert.equal(validate(envelope()).ok, true, "exact current remote intent is accepted within packet and repository caps");
assert.equal(validate(envelope({ operationInstance: "ffffffff-ffff-4fff-8fff-ffffffffffff" })).code, "CURRENT_REMOTE_EXECUTION_BINDING_MISMATCH");
assert.equal(validate(envelope({ approvalPacketSha256: "c".repeat(64) })).code, "CURRENT_REMOTE_EXECUTION_BINDING_MISMATCH");
assert.equal(validate(envelope({ sourceLockDigest: "d".repeat(64) })).code, "CURRENT_REMOTE_EXECUTION_BINDING_MISMATCH");

const zeroBudget = validate(envelope({ credentialRefreshMax: 0, iamReadMax: 0 }));
assert.equal(zeroBudget.code, "CURRENT_REMOTE_EXECUTION_BUDGET_BLOCKED");
assert.deepEqual(zeroBudget.effective, { credentialRefreshMax: 0, iamReadMax: 0, setIamPolicyMax: 0 });
const mutationRequest = validate(envelope({ setIamPolicyMax: 1 }));
assert.equal(mutationRequest.code, "CURRENT_REMOTE_EXECUTION_BUDGET_BLOCKED");
assert.equal(mutationRequest.effective.setIamPolicyMax, 0);
assert.equal(validate(envelope({ executionMode: "LOCAL_ONLY", executeRemoteNow: false })).ok, false, "LOCAL_ONLY latch beats an old approval");
assert.equal(validate(envelope({ executionMode: "LOCAL_ONLY", executeRemoteNow: false, minimizeApprovals: true })).ok, false);
assert.equal(validate(envelope({ executionMode: "LOCAL_ONLY", executeRemoteNow: false, continueAutomatically: true })).ok, false);
assert.equal(authorizeG2BTransportOperation(envelope(), "READ_GENERATION_BOUND_RECOVERY_POLICY").ok, true);
assert.equal(authorizeG2BTransportOperation({ ...envelope(), setIamPolicyMax: 0 }, "SET_FROM_PRESTATE_POLICY").ok, false);
assert.equal(authorizeG2BTransportOperation({ ...envelope(), testIamPermissionsMax: 0 }, "TEST_DIRECT_CONTEXT_EXACT_PERMISSION").ok, false);

console.log("G2B current-run execution intent precedence matrix passed; remote operations=0");
