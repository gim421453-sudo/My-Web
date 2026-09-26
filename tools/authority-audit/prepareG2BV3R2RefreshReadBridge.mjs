import { createG2BExplicitSetIamPolicyAuthTransport } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { inspectG2BV3R2RefreshReadBridgeContext, prepareG2BV3R2RefreshReadBridge, verifyG2BV3R2RefreshReadBridge, writeG2BV3R2RefreshReadBridge } from "./g2bRecoveryV3R2RefreshReadBridge.mjs";

const transport = createG2BExplicitSetIamPolicyAuthTransport({ enabled: true });
const contextInspection = await inspectG2BV3R2RefreshReadBridgeContext({ transport });
const authority = prepareG2BV3R2RefreshReadBridge({ contextInspection });
if (authority.ok !== true || verifyG2BV3R2RefreshReadBridge(authority, { contextInspection }).ok !== true) {
  console.log(JSON.stringify({ ok: false, code: authority.code || "V3R2_BRIDGE_VERIFICATION_FAILED", remoteOperations: 0 }));
  throw new Error("v3r2-refresh-read-bridge-preparation-blocked");
}
console.log(JSON.stringify({ ok: true, remoteOperations: 0, ...writeG2BV3R2RefreshReadBridge(authority) }));
