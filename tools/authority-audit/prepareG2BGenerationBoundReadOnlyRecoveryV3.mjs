import { createG2BExplicitSetIamPolicyAuthTransport } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { readG2BDirectCachedCredentialReadiness } from "./g2bDirectCachedCredentialReadiness.mjs";
import {
  prepareG2BGenerationBoundReadOnlyRecoveryV3,
  verifyG2BGenerationBoundReadOnlyRecoveryV3,
  writeG2BGenerationBoundReadOnlyRecoveryV3,
} from "./g2bGenerationBoundReadOnlyRecoveryV3.mjs";

const transport = createG2BExplicitSetIamPolicyAuthTransport({ enabled: true });
const readiness = await readG2BDirectCachedCredentialReadiness({ transport });
const authority = prepareG2BGenerationBoundReadOnlyRecoveryV3({ readiness });
if (authority.ok !== true || !verifyG2BGenerationBoundReadOnlyRecoveryV3(authority, { readiness }).ok) {
  console.log(JSON.stringify({
    ok: false,
    readiness: readiness.result,
    expiryRelativeState: readiness.credentialExpiryRelativeState,
    preparationCode: authority.code || "RECOVERY_V3_VERIFICATION_FAILED",
    remoteOperations: 0,
  }));
  throw new Error("generation-bound-recovery-v3-local-preparation-blocked");
}
const written = writeG2BGenerationBoundReadOnlyRecoveryV3(authority);
console.log(JSON.stringify({
  ok: true,
  readiness: readiness.result,
  expiryRelativeState: readiness.credentialExpiryRelativeState,
  remoteOperations: 0,
  ...written,
}));
