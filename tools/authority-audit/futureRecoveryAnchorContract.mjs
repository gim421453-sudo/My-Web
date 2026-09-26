import { createHmac, randomUUID } from "node:crypto";

const ANCHOR_DOMAIN = "myweb.m3.recovery-anchor.v1";
const SHA256 = /^[a-f0-9]{64}$/;

function validMember(value) {
  return typeof value === "string" && /^(?:user|serviceAccount):[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validSecret(value) {
  return Buffer.isBuffer(value) && value.length >= 32;
}

function stableInput({ member, targetResource, targetRole, sessionGeneration, operationOrdinal }) {
  if (!validMember(member) || typeof targetResource !== "string" || typeof targetRole !== "string"
    || typeof sessionGeneration !== "string" || !Number.isInteger(operationOrdinal) || operationOrdinal < 1) {
    throw new Error("invalid-recovery-anchor-input");
  }
  return `${ANCHOR_DOMAIN}\n${member}\n${targetResource}\n${targetRole}\n${sessionGeneration}\n${operationOrdinal}`;
}

export function createFutureRecoveryAnchor(input, secret) {
  if (!validSecret(secret)) throw new Error("protected-anchor-secret-required");
  const canonical = stableInput(input);
  const digest = createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
  return Object.freeze({
    schema: "myweb.m3.recovery-anchor.v1",
    anchorDigest: digest,
    sessionGeneration: input.sessionGeneration,
    operationOrdinal: input.operationOrdinal,
    state: "ANCHOR_CREATED",
  });
}

export function verifyFutureRecoveryAnchor({ persistedAnchor, currentMember, targetResource, targetRole }, secret) {
  if (!validSecret(secret) || !persistedAnchor || persistedAnchor.schema !== "myweb.m3.recovery-anchor.v1"
    || !SHA256.test(persistedAnchor.anchorDigest) || typeof persistedAnchor.sessionGeneration !== "string"
    || !Number.isInteger(persistedAnchor.operationOrdinal) || persistedAnchor.state !== "ANCHOR_VERIFIED") {
    return Object.freeze({ ok: false, state: "PRIVACY_GUARD_FAILURE" });
  }
  try {
    const expected = createFutureRecoveryAnchor({
      member: currentMember, targetResource, targetRole,
      sessionGeneration: persistedAnchor.sessionGeneration,
      operationOrdinal: persistedAnchor.operationOrdinal,
    }, secret);
    return Object.freeze({ ok: expected.anchorDigest === persistedAnchor.anchorDigest, state: expected.anchorDigest === persistedAnchor.anchorDigest ? "EXACT_MEMBER_MATCH" : "AMBIGUOUS" });
  } catch {
    return Object.freeze({ ok: false, state: "PRIVACY_GUARD_FAILURE" });
  }
}

export function createFutureRecoverySession(targetResource, targetRole) {
  return Object.freeze({
    sessionGeneration: randomUUID(), targetResource, targetRole, operationOrdinal: 1,
    state: "ANCHOR_NOT_CREATED", mutationReachable: false,
  });
}

export function transitionFutureRecoverySession(session, event) {
  if (!session || typeof event !== "string") return Object.freeze({ ok: false, code: "INVALID_RECOVERY_SESSION" });
  const permitted = {
    ANCHOR_NOT_CREATED: { ANCHOR_CREATED: "ANCHOR_CREATED" },
    ANCHOR_CREATED: { ANCHOR_VERIFIED: "ANCHOR_VERIFIED", ANCHOR_FAILURE: "ANCHOR_NOT_CREATED" },
    ANCHOR_VERIFIED: { MUTATION_STARTED: "MUTATION_STARTED" },
    MUTATION_STARTED: { MUTATION_CONFIRMED: "MUTATION_CONFIRMED", MUTATION_INDETERMINATE: "MUTATION_INDETERMINATE" },
    MUTATION_CONFIRMED: { RECOVERY_COMPLETED: "RECOVERY_COMPLETED" },
    MUTATION_INDETERMINATE: { RECOVERY_COMPLETED: "RECOVERY_COMPLETED" },
  };
  const next = permitted[session.state]?.[event];
  if (!next) return Object.freeze({ ok: false, code: "RECOVERY_SESSION_TRANSITION_BLOCKED" });
  return Object.freeze({ ok: true, session: Object.freeze({ ...session, state: next, mutationReachable: next === "ANCHOR_VERIFIED" }) });
}

export const FUTURE_RECOVERY_ANCHOR_CONTRACT = Object.freeze({
  status: "HISTORICAL_DESIGN_SUPERSEDED_BY_G2B_RECOVERY_ANCHOR_HARDENED_RUNTIME_V1",
  anchorType: "HMAC_SHA256_DOMAIN_SEPARATED_DPAPI_PROTECTED_SECRET_PROVIDER_REQUIRED",
  rawMemberPersisted: false,
  truncatedFingerprintAuthority: false,
  anchorMustBeVerifiedBeforeMutation: true,
  currentFrozenSessionRetrofitAllowed: false,
  secureSecretProvider: "WINDOWS_DPAPI_AVAILABLE_LOCAL_PROVIDER_IMPLEMENTATION_REQUIRED",
  normalRecoveryRequiresNewOpA: false,
  futureOperationTargetBinding: "HISTORICAL_DESIGN_ONLY_NOT_AN_ACTIVE_M3_PATH",
});
