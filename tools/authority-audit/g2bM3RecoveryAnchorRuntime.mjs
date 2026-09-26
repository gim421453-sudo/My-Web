import { prepareG2BFutureM3Anchor, verifyG2BRecoveryAnchor } from "./g2bRecoveryAnchor.mjs";

export const ACTIVE_FUTURE_M3_RUNTIME_ID = "G2B_RECOVERY_ANCHOR_HARDENED_RUNTIME_V1";

function blocked(code, state, extra = {}) {
  return Object.freeze({ ok: false, code, anchorState: state, mutationReachable: false, mutationAttempts: 0, ...extra });
}

function reuseVerifiedAnchor({ identityContext, secretProvider, store, operationGenerationId }) {
  const member = identityContext?.exactIamMember;
  if (typeof member !== "string" || !secretProvider || typeof secretProvider.read !== "function" || !store || typeof store.load !== "function") {
    return Object.freeze({ mutationReachable: false, state: "ANCHOR_NOT_CREATED", code: "EXISTING_ANCHOR_DEPENDENCY_INVALID" });
  }
  const loaded = store.load(operationGenerationId);
  if (loaded?.state !== "READY" || loaded.record?.anchorState !== "ANCHOR_VERIFIED") {
    return Object.freeze({ mutationReachable: false, state: "ANCHOR_NOT_CREATED", code: "EXISTING_ANCHOR_NOT_VERIFIED" });
  }
  const secretResult = secretProvider.read();
  const verification = secretResult?.state === "READY"
    ? verifyG2BRecoveryAnchor({ record: loaded.record, member, secret: secretResult.secret, secretKeyId: secretResult.keyId })
    : Object.freeze({ ok: false });
  if (verification.ok !== true) return Object.freeze({ mutationReachable: false, state: "ANCHOR_VERIFIED", code: "EXISTING_ANCHOR_REREAD_VERIFICATION_FAILURE" });
  return Object.freeze({ mutationReachable: true, state: "ANCHOR_VERIFIED", operationGenerationId, secretKeyId: secretResult.keyId, reused: true });
}

/**
 * The sole future M3 coordinator. Cloud operations are injected by a separately
 * approved caller; this coordinator never spawns a process or retries one.
 */
export async function executeG2BFutureM3({
  identityContext,
  secretProvider,
  store,
  readPrestate,
  mutateOnce,
  readPoststate,
  beforeFirstRemote,
  operationGenerationId,
  reuseVerifiedAnchor: reuseExistingAnchor = false,
  crashAt = null,
} = {}) {
  if (typeof operationGenerationId !== "string" || operationGenerationId.trim() === "") {
    return blocked("OPERATION_GENERATION_REQUIRED", "ANCHOR_NOT_CREATED");
  }
  const prepared = reuseExistingAnchor === true
    ? reuseVerifiedAnchor({ identityContext, secretProvider, store, operationGenerationId })
    : prepareG2BFutureM3Anchor({ identityContext, secretProvider, store, operationGenerationId });
  if (!prepared.mutationReachable) return blocked(prepared.code, prepared.state);
  if (crashAt === "AFTER_ANCHOR_VERIFIED_BEFORE_PRESTATE") return blocked("CRASH_WINDOW", "ANCHOR_VERIFIED");
  if (typeof readPrestate !== "function" || typeof mutateOnce !== "function" || typeof readPoststate !== "function") return blocked("REMOTE_BOUNDARY_REQUIRED", "ANCHOR_VERIFIED");
  // Approval is consumed only after local prerequisites succeed and immediately
  // before the first injected remote operation can begin.
  if (typeof beforeFirstRemote !== "function") return blocked("APPROVAL_CONSUMER_REQUIRED", "ANCHOR_VERIFIED");
  let approved = false;
  try { approved = await beforeFirstRemote(); } catch { approved = false; }
  if (approved !== true) return blocked("APPROVAL_NOT_CONSUMED", "ANCHOR_VERIFIED");
  const prestate = await readPrestate();
  if (prestate !== "MEMBER_ABSENT_CONFIRMED") return blocked("PRESTATE_NOT_EXACT_ABSENT", "ANCHOR_VERIFIED", { prestate });
  if (crashAt === "AFTER_PRESTATE_BEFORE_MUTATION") return blocked("CRASH_WINDOW", "ANCHOR_VERIFIED", { prestate });
  if (!store.transition(prepared.operationGenerationId, "ANCHOR_VERIFIED", "MUTATION_STARTED").ok) return blocked("MUTATION_START_PERSISTENCE_FAILURE", "ANCHOR_VERIFIED", { prestate });
  if (crashAt === "IMMEDIATELY_BEFORE_REMOTE_MUTATION") return blocked("CRASH_WINDOW", "MUTATION_STARTED", { prestate });
  let mutation;
  try { mutation = await mutateOnce(); } catch { mutation = { confirmedSuccess: false }; }
  if (crashAt === "AFTER_REMOTE_MUTATION_BEFORE_LOCAL_RESULT_CAPTURE" || crashAt === "AFTER_MUTATION_RESULT_BEFORE_STATE_PERSISTENCE") {
    return blocked("CRASH_WINDOW", "MUTATION_STARTED", { prestate, mutationAttempts: 1 });
  }
  if (mutation?.confirmedSuccess !== true) {
    store.transition(prepared.operationGenerationId, "MUTATION_STARTED", "MUTATION_INDETERMINATE");
    return blocked("M3_MUTATION_INDETERMINATE", "MUTATION_INDETERMINATE", { prestate, mutationAttempts: 1 });
  }
  if (!store.transition(prepared.operationGenerationId, "MUTATION_STARTED", "MUTATION_CONFIRMED").ok) {
    return blocked("MUTATION_RESULT_PERSISTENCE_FAILURE", "MUTATION_STARTED", { prestate, mutationAttempts: 1 });
  }
  const poststate = await readPoststate();
  if (poststate !== "PRESENT_CONFIRMED") return blocked("POSTSTATE_NOT_PRESENT", "MUTATION_CONFIRMED", { prestate, poststate, mutationAttempts: 1 });
  return Object.freeze({ ok: true, state: "PRESENT_CONFIRMED", anchorState: "MUTATION_CONFIRMED", mutationReachable: false, mutationAttempts: 1, prestate, poststate });
}

export const G2B_M3_RUNTIME_CONTRACT = Object.freeze({
  runtimeId: ACTIVE_FUTURE_M3_RUNTIME_ID,
  targetGeneration: "REPLACEMENT_WRITER_GENERATION_2B",
  recoveryAnchorRequired: true,
  existingVerifiedAnchorReuseSupported: true,
  mutationWithoutVerifiedAnchorReachability: 0,
  freshPrestateRequired: true,
  exactAbsentRequiredForMutation: true,
  mutationAttemptsMax: 1,
  retriesMax: 0,
  rollbacksMax: 0,
  secondMutationReachable: false,
  poststateRequired: true,
  externallyAllocatedOperationGenerationRequired: true,
  approvalConsumptionBeforeFirstRemoteRequired: true,
  processSpawn: false,
  networkAccess: false,
  firestoreReachable: false,
  tokenReachable: false,
  m4Reachable: false,
});
