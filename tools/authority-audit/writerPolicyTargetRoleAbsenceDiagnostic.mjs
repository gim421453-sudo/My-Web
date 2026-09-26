const TARGET_ROLE = "roles/iam.serviceAccountTokenCreator";

export const TARGET_ROLE_ABSENCE_RESULTS = Object.freeze({
  absentProven: "ABSENT_PROVEN",
  ambiguous: "AMBIGUOUS",
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isValidBinding(binding) {
  if (!isPlainObject(binding) || typeof binding.role !== "string") return false;
  if (!Array.isArray(binding.members) || binding.members.some((member) => typeof member !== "string")) {
    return false;
  }
  return !hasOwn(binding, "condition") || isPlainObject(binding.condition);
}

/**
 * Classifies exact target-role absence without inspecting or returning members.
 * The input is transient and must already be a parsed policy object.
 */
export function classifyWriterPolicyTargetRoleAbsence(policy) {
  try {
    if (!isPlainObject(policy)) return TARGET_ROLE_ABSENCE_RESULTS.ambiguous;
    if (policy.version !== 3 || typeof policy.etag !== "string" || policy.etag.length === 0) {
      return TARGET_ROLE_ABSENCE_RESULTS.ambiguous;
    }
    if (!hasOwn(policy, "bindings") || !Array.isArray(policy.bindings)) {
      return TARGET_ROLE_ABSENCE_RESULTS.ambiguous;
    }
    if (policy.bindings.some((binding) => !isValidBinding(binding))) {
      return TARGET_ROLE_ABSENCE_RESULTS.ambiguous;
    }
    if (policy.bindings.some((binding) => binding.role === TARGET_ROLE)) {
      return TARGET_ROLE_ABSENCE_RESULTS.ambiguous;
    }
    return TARGET_ROLE_ABSENCE_RESULTS.absentProven;
  } catch {
    return TARGET_ROLE_ABSENCE_RESULTS.ambiguous;
  }
}

export const WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT = Object.freeze({
  targetRoleMatch: "EXACT_STRING",
  acceptsCollapsedProjection: false,
  requiresExplicitBindingsArray: true,
  requiresSupportedVersion: 3,
  requiresNonEmptyEtag: true,
  inspectsMemberValues: false,
  returnsPresentProven: false,
  resultDomain: Object.freeze(["ABSENT_PROVEN", "AMBIGUOUS"]),
  rawPolicyReturned: false,
  rawMembersReturned: false,
  rawConditionsReturned: false,
});
