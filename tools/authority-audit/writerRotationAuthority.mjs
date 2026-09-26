import { createHash } from "node:crypto";

export const FROZEN_WRITER_SERVICE_ACCOUNT = "myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com";
export const REPLACEMENT_WRITER_SERVICE_ACCOUNT = "myweb-class-migration-writer-g2@my-management-app-8a933.iam.gserviceaccount.com";
export const ACTIVE_REPLACEMENT_WRITER_GENERATION = "REPLACEMENT_WRITER_GENERATION_2B";
export const ACTIVE_REPLACEMENT_WRITER_SERVICE_ACCOUNT = "myweb-class-mig-writer-g2@my-management-app-8a933.iam.gserviceaccount.com";
export const CLASS_CREATE_ROLE = "projects/my-management-app-8a933/roles/mywebClassMigrationCreateOnly";

const FROZEN_FORBIDDEN_OPERATIONS = new Set([
  "M3", "M4", "IMPERSONATION", "FIRESTORE_MIGRATION", "CLASS_WRITE", "TOKEN_GENERATION", "TRUSTED_MUTATION",
]);
const EXCEPTION_OPERATIONS = new Set(["QUARANTINE_CONTAINMENT", "READ_ONLY_FORENSIC"]);

export function classifyFutureWriterTarget({ resource, operation, separatelyApproved = false, verifiedRecoveryAnchor = false } = {}) {
  if (typeof resource !== "string" || typeof operation !== "string") return Object.freeze({ ok: false, code: "WRITER_TARGET_INVALID" });
  if (resource === FROZEN_WRITER_SERVICE_ACCOUNT) {
    if (EXCEPTION_OPERATIONS.has(operation) && separatelyApproved === true) {
      return Object.freeze({ ok: true, code: "FROZEN_WRITER_EXCEPTION_SEPARATELY_APPROVED" });
    }
    return Object.freeze({ ok: false, code: FROZEN_FORBIDDEN_OPERATIONS.has(operation) ? "FROZEN_WRITER_QUARANTINED" : "FROZEN_WRITER_UNAPPROVED_OPERATION" });
  }
  if (resource !== ACTIVE_REPLACEMENT_WRITER_SERVICE_ACCOUNT) return Object.freeze({ ok: false, code: "WRITER_TARGET_NOT_ACTIVE_GENERATION" });
  if (operation === "M3" && verifiedRecoveryAnchor !== true) return Object.freeze({ ok: false, code: "G2B_VERIFIED_RECOVERY_ANCHOR_REQUIRED" });
  return Object.freeze({ ok: true, code: "REPLACEMENT_WRITER_GENERATION_2B_SELECTED" });
}

export function buildOldWriterContainmentApprovalPacket() {
  return Object.freeze({
    stage: "P1.5-C2H2E3D-W1C-M3L3-OLD-WRITER-CONTAINMENT",
    type: "OLD_WRITER_CONTAINMENT",
    target: FROZEN_WRITER_SERVICE_ACCOUNT,
    operation: "iam.projects.serviceAccounts.disable",
    prestateRemoteReadsMax: 1,
    mutationAttemptsMax: 1,
    poststateRemoteReadsMax: 1,
    projectIamReadsMax: 0,
    retriesMax: 0,
    rollbacksMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false,
    serviceAccountKeyAllowed: false,
    approvalConsumptionPoint: "WHEN_OLD_WRITER_STATUS_PRESTATE_READ_BEGINS",
    preexistingDisabledPolicy: "SUCCESS_EQUIVALENT_NO_DISABLE_NO_ENABLE_NO_DELETE_NO_IAM_POLICY_MUTATION",
    indeterminatePolicy: "STOP_NO_RETRY_NO_ROLLBACK_NO_ENABLE_NO_SECOND_DISABLE_NO_M3_NO_M4",
    poststateRequired: true,
    disabledPoststateSuccessSemantics: "EXACT_OLD_WRITER_STATUS_DISABLED_CONFIRMED",
    serviceAccountEnableMutationsMax: 0,
    serviceAccountDeleteMutationsMax: 0,
    iamPolicyMutationsMax: 0,
  });
}

export function verifyOldWriterContainmentApprovalPacket(packet) {
  const expected = buildOldWriterContainmentApprovalPacket();
  const equalityFields = [
    "stage", "type", "target", "operation", "approvalConsumptionPoint",
    "preexistingDisabledPolicy", "indeterminatePolicy", "disabledPoststateSuccessSemantics",
  ];
  const exactBudgetFields = [
    "prestateRemoteReadsMax", "mutationAttemptsMax", "poststateRemoteReadsMax",
    "projectIamReadsMax", "retriesMax", "rollbacksMax", "m3MutationsMax", "m4MutationsMax",
    "serviceAccountEnableMutationsMax", "serviceAccountDeleteMutationsMax", "iamPolicyMutationsMax",
  ];
  const disabledFields = [
    "firestoreAllowed", "accessTokenAllowed", "cloudLoggingAllowed",
    "testIamPermissionsAllowed", "serviceAccountKeyAllowed",
  ];
  if (!packet || typeof packet !== "object") return Object.freeze({ ok: false, code: "CONTAINMENT_PACKET_INVALID" });
  if (equalityFields.some((field) => packet[field] !== expected[field])) return Object.freeze({ ok: false, code: "CONTAINMENT_LITERAL_POLICY_MISMATCH" });
  if (exactBudgetFields.some((field) => packet[field] !== expected[field])) return Object.freeze({ ok: false, code: "CONTAINMENT_BUDGET_MISMATCH" });
  if (packet.poststateRequired !== true) return Object.freeze({ ok: false, code: "CONTAINMENT_POSTSTATE_REQUIRED" });
  if (disabledFields.some((field) => packet[field] !== false)) return Object.freeze({ ok: false, code: "CONTAINMENT_FORBIDDEN_OPERATION_REACHABLE" });
  return Object.freeze({ ok: true, code: "CONTAINMENT_PACKET_FAIL_CLOSED" });
}

export function verifyOldWriterContainmentPacketBytes(bytes, expectedSha256) {
  if (!Buffer.isBuffer(bytes) || !/^[a-f0-9]{64}$/.test(expectedSha256 || "")) {
    return Object.freeze({ ok: false, code: "CONTAINMENT_PACKET_HASH_INPUT_INVALID" });
  }
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  return Object.freeze({
    ok: actualSha256 === expectedSha256,
    code: actualSha256 === expectedSha256 ? "CONTAINMENT_PACKET_HASH_MATCH" : "CONTAINMENT_PACKET_HASH_MISMATCH",
    actualSha256,
  });
}

export const WRITER_ROTATION_AUTHORITY_CONTRACT = Object.freeze({
  oldWriterState: "FROZEN_INDETERMINATE_M3_TARGET",
  oldWriterReusableForNewM3: false,
  oldWriterM4Allowed: false,
  failedGeneration2Selectable: false,
  activeReplacementGeneration: ACTIVE_REPLACEMENT_WRITER_GENERATION,
  activeReplacementResource: ACTIVE_REPLACEMENT_WRITER_SERVICE_ACCOUNT,
  activeReplacementSelectableBeforeExistenceConfirmation: false,
  replacementAvailabilityAsserted: true,
  replacementInitialM3Binding: "NONE_REQUIRED",
  replacementInitialM4RoleBinding: "NONE_REQUIRED",
  m2Role: CLASS_CREATE_ROLE,
  m2Permissions: Object.freeze(["datastore.databases.get", "datastore.entities.create"]),
  activeFutureM3Runtime: "G2B_RECOVERY_ANCHOR_HARDENED_RUNTIME_V1",
  activeM3RecoveryAnchorRequired: true,
  activeM3MutationWithoutVerifiedAnchorReachability: 0,
  remoteAccess: false,
});
