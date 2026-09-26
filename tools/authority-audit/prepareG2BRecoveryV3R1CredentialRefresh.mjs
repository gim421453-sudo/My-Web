import { createG2BExplicitSetIamPolicyAuthTransport } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { inspectG2BRecoveryV3R1CredentialRefreshContext, prepareG2BRecoveryV3R1CredentialRefresh, verifyG2BRecoveryV3R1CredentialRefresh, writeG2BRecoveryV3R1CredentialRefresh } from "./g2bRecoveryV3R1CredentialRefreshPreparation.mjs";

const transport = createG2BExplicitSetIamPolicyAuthTransport({ enabled: true });
const contextInspection = await inspectG2BRecoveryV3R1CredentialRefreshContext({ transport });
const authority = prepareG2BRecoveryV3R1CredentialRefresh({ contextInspection });
if (authority.ok !== true || !verifyG2BRecoveryV3R1CredentialRefresh(authority, { contextInspection }).ok) {
  console.log(JSON.stringify({ ok: false, readiness: contextInspection.readiness?.result || "NOT_AVAILABLE", preparationCode: authority.code || "RECOVERY_V3R1_REFRESH_VERIFICATION_FAILED", remoteOperations: 0 }));
  throw new Error("recovery-v3r1-refresh-local-preparation-blocked");
}
console.log(JSON.stringify({ ok: true, readiness: contextInspection.readiness.result, expiryRelativeState: contextInspection.readiness.credentialExpiryRelativeState, remoteOperations: 0, ...writeG2BRecoveryV3R1CredentialRefresh(authority) }));
