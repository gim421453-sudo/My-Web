import { createG2BExplicitSetIamPolicyAuthTransport } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { readG2BDirectCachedCredentialReadiness } from "./g2bDirectCachedCredentialReadiness.mjs";
import {
  G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE,
  prepareG2BGenerationBoundReadOnlyRecoveryV3R2,
  verifyG2BGenerationBoundReadOnlyRecoveryV3R2,
  writeG2BGenerationBoundReadOnlyRecoveryV3R2,
} from "./g2bGenerationBoundReadOnlyRecoveryV3R2.mjs";
import { createG2BRecoveryExecutionJournal } from "./g2bRecoveryExecutionJournal.mjs";

// This evaluates only the local cached-credential and anchor gates.
const transport = createG2BExplicitSetIamPolicyAuthTransport({ enabled: true });
const readiness = await readG2BDirectCachedCredentialReadiness({ transport });
const authority = prepareG2BGenerationBoundReadOnlyRecoveryV3R2({ readiness });

if (authority.ok !== true || !verifyG2BGenerationBoundReadOnlyRecoveryV3R2(authority, { readiness }).ok) {
  console.log(JSON.stringify({ ok: false, preparationCode: authority.code || "RECOVERY_V3R2_VERIFICATION_FAILED", readiness: readiness.result, expiryRelativeState: readiness.credentialExpiryRelativeState, remoteOperations: 0 }));
  throw new Error("generation-bound-recovery-v3r2-local-preparation-blocked");
}

const journal = createG2BRecoveryExecutionJournal();
const initialized = journal.initialize(G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE);
if (!initialized.ok || initialized.record?.phase !== "PREPARED") {
  console.log(JSON.stringify({ ok: false, preparationCode: "RECOVERY_V3R2_JOURNAL_PREPARE_FAILED", remoteOperations: 0 }));
  throw new Error("generation-bound-recovery-v3r2-journal-preparation-blocked");
}

console.log(JSON.stringify({ ok: true, readiness: readiness.result, expiryRelativeState: readiness.credentialExpiryRelativeState, journalState: initialized.record.phase, remoteOperations: 0, ...writeG2BGenerationBoundReadOnlyRecoveryV3R2(authority) }));
