import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createG2BV3R2RefreshReadBridgeExecutor,
  prepareG2BV3R2RefreshReadBridge,
  verifyG2BV3R2RefreshReadBridge,
} from "../authority-audit/g2bRecoveryV3R2RefreshReadBridge.mjs";

const inspection = Object.freeze({ ok: true });
const gate = Object.freeze({ ok: true, context: Object.freeze({ context: Object.freeze({}) }), readiness: Object.freeze({}) });

function journal() {
  let record;
  const allowed = { PREPARED: ["BRIDGE_APPROVAL_CONSUMED"], BRIDGE_APPROVAL_CONSUMED: ["REFRESH_REQUEST_STARTED_RESPONSE_UNKNOWN"], REFRESH_REQUEST_STARTED_RESPONSE_UNKNOWN: ["REFRESH_SUCCESS_CONFIRMED", "REFRESH_TERMINAL_FAILURE"], REFRESH_SUCCESS_CONFIRMED: ["MINIMAL_GATE_PASSED"], MINIMAL_GATE_PASSED: ["READ_DELEGATED"] };
  return Object.freeze({ initialize: (operationInstance) => { if (!record) record = { operationInstance, phase: "PREPARED" }; return Object.freeze({ ok: true, record }); }, transition: (_operationInstance, phase) => { if (!allowed[record?.phase]?.includes(phase)) return Object.freeze({ ok: false }); record = { ...record, phase }; return Object.freeze({ ok: true, record }); } });
}

function fixture() {
  const calls = [];
  const transport = Object.freeze({
    executeDirectContextCredentialRefresh: async () => { calls.push("refresh"); return Object.freeze({ ok: true, state: "REFRESH_SUCCESS_CONFIRMED", physicalCalls: 1 }); },
    readGenerationBoundRecoveryPolicy: async () => { calls.push("read-transport"); return Object.freeze({}); },
  });
  const readExecutor = () => Object.freeze({ execute: async () => { calls.push("read"); return Object.freeze({ code: "RECOVERY_CONFIRMED_ABSENT", recoveryResult: "RECOVERY_CONFIRMED_ABSENT", counters: Object.freeze({ recoveryServiceAccountIamPolicyReads: 1, totalPhysicalRemoteRecoveryCalls: 1 }) }); } });
  return { calls, transport, journal: journal(), executor: createG2BV3R2RefreshReadBridgeExecutor({ inspectContext: async () => inspection, minimalGate: async () => gate, createReadExecutor: readExecutor }) };
}

const authority = prepareG2BV3R2RefreshReadBridge({ contextInspection: inspection });
assert.equal(authority.ok, true);
assert.equal(verifyG2BV3R2RefreshReadBridge(authority, { contextInspection: inspection }).ok, true);
assert.equal(authority.approvalPacket.credentialRefreshCallsMax, 1);
assert.equal(authority.approvalPacket.recoveryIamReadsMax, 1);
assert.equal(authority.approvalPacket.totalPhysicalRemoteCallsMax, 2);
assert.equal(authority.approvalPacket.setIamPolicyCallsMax, 0);
assert.equal(authority.approvalPacket.iamMutationsMax, 0);
assert.equal(prepareG2BV3R2RefreshReadBridge({ contextInspection: inspection, repositoryRoot: mkdtempSync(join(tmpdir(), "myweb-v3r2-parent-missing-")) }).ok, false);

{
  const f = fixture();
  const result = await f.executor.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeBridgeApproval: async () => true, transport: f.transport, bridgeJournal: f.journal });
  assert.equal(result.ok, true);
  assert.deepEqual(f.calls, ["refresh", "read"]);
  assert.equal(result.counters.credentialRefreshCalls, 1);
  assert.equal(result.counters.recoveryIamReads, 1);
  assert.equal(result.counters.totalPhysicalRemoteCalls, 2);
}
{
  const f = fixture();
  const result = await f.executor.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeBridgeApproval: async () => false, transport: f.transport, bridgeJournal: f.journal });
  assert.equal(result.code, "V3R2_BRIDGE_APPROVAL_NOT_CONSUMED");
  assert.deepEqual(f.calls, []);
}
{
  const f = fixture();
  const blocked = createG2BV3R2RefreshReadBridgeExecutor({ inspectContext: async () => inspection, minimalGate: async () => Object.freeze({ ok: false }), createReadExecutor: () => { throw new Error("read-must-not-be-created"); } });
  const result = await blocked.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeBridgeApproval: async () => true, transport: f.transport, bridgeJournal: f.journal });
  assert.equal(result.code, "V3R2_BRIDGE_MINIMAL_GATE_BLOCKED");
  assert.deepEqual(f.calls, ["refresh"]);
}
{
  const calls = [];
  const transport = Object.freeze({ executeDirectContextCredentialRefresh: async () => { calls.push("refresh"); return Object.freeze({ ok: false, state: "CONFIRMED_FAILURE", physicalCalls: 1 }); }, readGenerationBoundRecoveryPolicy: async () => { calls.push("read"); return Object.freeze({}); } });
  const executor = createG2BV3R2RefreshReadBridgeExecutor({ inspectContext: async () => inspection, minimalGate: async () => { throw new Error("gate-must-not-run"); } });
  const result = await executor.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeBridgeApproval: async () => true, transport, bridgeJournal: journal() });
  assert.equal(result.code, "V3R2_BRIDGE_REFRESH_INDETERMINATE");
  assert.deepEqual(calls, ["refresh"]);
}
{
  const f = fixture();
  await f.executor.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeBridgeApproval: async () => true, transport: f.transport, bridgeJournal: f.journal });
  const second = await f.executor.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeBridgeApproval: async () => true, transport: f.transport, bridgeJournal: f.journal });
  assert.equal(second.code, "V3R2_BRIDGE_BOUNDARY_REQUIRED");
  assert.deepEqual(f.calls, ["refresh", "read"]);
}
{
  let approvalCalls = 0;
  const f = fixture();
  const blocked = createG2BV3R2RefreshReadBridgeExecutor({ inspectContext: async () => Object.freeze({ ok: false }), minimalGate: async () => gate, createReadExecutor: () => { throw new Error("read-must-not-be-created"); } });
  const result = await blocked.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeBridgeApproval: async () => { approvalCalls += 1; return true; }, transport: f.transport, bridgeJournal: f.journal });
  assert.equal(result.code, "V3R2_BRIDGE_BOUNDARY_REQUIRED");
  assert.equal(approvalCalls, 0);
  assert.deepEqual(f.calls, []);
}

console.log("G2B V3R2 refresh-read bridge preparation passed; fake fixtures only; remote operations=0");
