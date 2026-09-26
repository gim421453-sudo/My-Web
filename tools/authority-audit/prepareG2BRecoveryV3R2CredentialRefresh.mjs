import { createG2BExplicitSetIamPolicyAuthTransport } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { inspectG2BRecoveryV3R2CredentialRefreshContext, prepareG2BRecoveryV3R2CredentialRefresh, verifyG2BRecoveryV3R2CredentialRefresh, writeG2BRecoveryV3R2CredentialRefresh } from "./g2bRecoveryV3R2CredentialRefreshPreparation.mjs";

const transport = createG2BExplicitSetIamPolicyAuthTransport({ enabled: true });
const contextInspection = await inspectG2BRecoveryV3R2CredentialRefreshContext({ transport });
const authority = prepareG2BRecoveryV3R2CredentialRefresh({ contextInspection });
if (authority.ok !== true || !verifyG2BRecoveryV3R2CredentialRefresh(authority, { contextInspection }).ok) {
  console.log(JSON.stringify({ ok: false, preparationCode: authority.code || "RECOVERY_V3R2_REFRESH_VERIFICATION_FAILED", readiness: contextInspection.readiness?.result || "NOT_AVAILABLE", remoteOperations: 0 }));
  throw new Error("recovery-v3r2-refresh-local-preparation-blocked");
}
console.log(JSON.stringify({ ok: true, readiness: contextInspection.readiness.result, expiryRelativeState: contextInspection.readiness.credentialExpiryRelativeState, remoteOperations: 0, ...writeG2BRecoveryV3R2CredentialRefresh(authority) }));
