const TARGET_ROLE = "roles/iam.serviceAccountTokenCreator";

export const TARGET_ROLE_ABSENCE_RESULTS_V2 = Object.freeze({
  absentProven: "ABSENT_PROVEN",
  ambiguous: "AMBIGUOUS",
});

export const TARGET_ROLE_ABSENCE_REASON_IDS_V2 = Object.freeze({
  completeEtagOnlyZeroBindings: "COMPLETE_ETAG_ONLY_ZERO_BINDINGS",
  completeExplicitEmptyBindings: "COMPLETE_EXPLICIT_EMPTY_BINDINGS",
  completeNoTargetRole: "COMPLETE_NO_TARGET_ROLE",
  targetRoleExists: "TARGET_ROLE_EXISTS",
  incompletePolicy: "INCOMPLETE_POLICY",
  malformedPolicy: "MALFORMED_POLICY",
  versionSemanticsUnsafe: "VERSION_SEMANTICS_UNSAFE",
});

const ABSENT_REASON_ALLOWLIST = Object.freeze([
  TARGET_ROLE_ABSENCE_REASON_IDS_V2.completeEtagOnlyZeroBindings,
  TARGET_ROLE_ABSENCE_REASON_IDS_V2.completeExplicitEmptyBindings,
  TARGET_ROLE_ABSENCE_REASON_IDS_V2.completeNoTargetRole,
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasOnlyKeys(value, keys) {
  const actual = Object.keys(value);
  return actual.every((key) => keys.includes(key));
}

function isValidEtag(policy) {
  return hasOwn(policy, "etag") && typeof policy.etag === "string" && policy.etag.length > 0;
}

function isValidBinding(binding) {
  if (!isPlainObject(binding) || !hasOnlyKeys(binding, ["role", "members", "condition"])) return false;
  if (typeof binding.role !== "string" || !Array.isArray(binding.members)) return false;
  if (binding.members.some((member) => typeof member !== "string")) return false;
  return !hasOwn(binding, "condition") || isPlainObject(binding.condition);
}

function result(state, reasonId) {
  return Object.freeze({ state, reasonId });
}

/**
 * Pure, asymmetric classifier for the exact R1B3D policy completeness contract.
 * It accepts a parsed transient object and never returns policy content.
 */
export function classifyWriterPolicyTargetRoleAbsenceV2(policy) {
  try {
    if (!isPlainObject(policy)) {
      return result(TARGET_ROLE_ABSENCE_RESULTS_V2.ambiguous, TARGET_ROLE_ABSENCE_REASON_IDS_V2.malformedPolicy);
    }

    if (hasOwn(policy, "etag") && !isValidEtag(policy)) {
      return result(TARGET_ROLE_ABSENCE_RESULTS_V2.ambiguous, TARGET_ROLE_ABSENCE_REASON_IDS_V2.malformedPolicy);
    }

    if (!hasOwn(policy, "bindings") && !hasOwn(policy, "version") && isValidEtag(policy)
      && Object.keys(policy).length === 1) {
      return result(TARGET_ROLE_ABSENCE_RESULTS_V2.absentProven,
        TARGET_ROLE_ABSENCE_REASON_IDS_V2.completeEtagOnlyZeroBindings);
    }

    if (!hasOwn(policy, "etag") && !hasOwn(policy, "bindings")) {
      return result(TARGET_ROLE_ABSENCE_RESULTS_V2.ambiguous, TARGET_ROLE_ABSENCE_REASON_IDS_V2.incompletePolicy);
    }
    if (!hasOwn(policy, "version") || ![1, 3].includes(policy.version) || !isValidEtag(policy)
      || !hasOwn(policy, "bindings") || !Array.isArray(policy.bindings) || !hasOnlyKeys(policy, ["version", "etag", "bindings"])) {
      return result(TARGET_ROLE_ABSENCE_RESULTS_V2.ambiguous, TARGET_ROLE_ABSENCE_REASON_IDS_V2.malformedPolicy);
    }

    if (policy.bindings.length === 0) {
      return result(TARGET_ROLE_ABSENCE_RESULTS_V2.absentProven,
        TARGET_ROLE_ABSENCE_REASON_IDS_V2.completeExplicitEmptyBindings);
    }

    if (policy.bindings.some((binding) => !isValidBinding(binding))) {
      return result(TARGET_ROLE_ABSENCE_RESULTS_V2.ambiguous, TARGET_ROLE_ABSENCE_REASON_IDS_V2.malformedPolicy);
    }
    if (policy.bindings.some((binding) => binding.role === TARGET_ROLE)) {
      return result(TARGET_ROLE_ABSENCE_RESULTS_V2.ambiguous, TARGET_ROLE_ABSENCE_REASON_IDS_V2.targetRoleExists);
    }
    if (policy.version !== 3 && policy.bindings.some((binding) => hasOwn(binding, "condition"))) {
      return result(TARGET_ROLE_ABSENCE_RESULTS_V2.ambiguous, TARGET_ROLE_ABSENCE_REASON_IDS_V2.versionSemanticsUnsafe);
    }
    return result(TARGET_ROLE_ABSENCE_RESULTS_V2.absentProven,
      TARGET_ROLE_ABSENCE_REASON_IDS_V2.completeNoTargetRole);
  } catch {
    return result(TARGET_ROLE_ABSENCE_RESULTS_V2.ambiguous, TARGET_ROLE_ABSENCE_REASON_IDS_V2.malformedPolicy);
  }
}

export const WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT_V2 = Object.freeze({
  targetRole: TARGET_ROLE,
  targetRoleMatchMode: "EXACT_STRING",
  resultDomain: Object.freeze(["ABSENT_PROVEN", "AMBIGUOUS"]),
  failClosedDefault: "AMBIGUOUS",
  emptyObjectResult: "AMBIGUOUS",
  etagOnlyResult: "ABSENT_PROVEN",
  bindingsMissingAndEtagMissingResult: "AMBIGUOUS",
  memberInspectionRequired: false,
  fingerprintMatchingUsed: false,
  returnsPresentProven: false,
  absentReasonAllowlist: ABSENT_REASON_ALLOWLIST,
  rawPolicyReturned: false,
  rawMembersReturned: false,
  rawConditionsReturned: false,
});

export { TARGET_ROLE };
