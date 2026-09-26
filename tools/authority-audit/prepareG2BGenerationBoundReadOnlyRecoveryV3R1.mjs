import { createG2BExplicitSetIamPolicyAuthTransport } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { readG2BDirectCachedCredentialReadiness } from "./g2bDirectCachedCredentialReadiness.mjs";
import {
  prepareG2BGenerationBoundReadOnlyRecoveryV3R1,
  verifyG2BGenerationBoundReadOnlyRecoveryV3R1,
  writeG2BGenerationBoundReadOnlyRecoveryV3R1,
} from "./g2bGenerationBoundReadOnlyRecoveryV3R1.mjs";

const transport = createG2BExplicitSetIamPolicyAuthTransport({ enabled: true });
const readiness = await readG2BDirectCachedCredentialReadiness({ transport });
const authority = prepareG2BGenerationBoundReadOnlyRecoveryV3R1({ readiness });
if (authority.ok !== true || !verifyG2BGenerationBoundReadOnlyRecoveryV3R1(authority, { readiness }).ok) {
  console.log(JSON.stringify({ ok: false, readiness: readiness.result, expiryRelativeState: readiness.credentialExpiryRelativeState, preparationCode: authority.code || "RECOVERY_V3R1_VERIFICATION_FAILED", remoteOperations: 0 }));
  throw new Error("generation-bound-recovery-v3r1-local-preparation-blocked");
}
console.log(JSON.stringify({ ok: true, readiness: readiness.result, expiryRelativeState: readiness.credentialExpiryRelativeState, remoteOperations: 0, ...writeG2BGenerationBoundReadOnlyRecoveryV3R1(authority) }));
