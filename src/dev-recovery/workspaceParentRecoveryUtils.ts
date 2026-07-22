import {
  diagnosticFingerprint,
  type DiagnosticFingerprintNamespace,
} from "../shared/diagnosticFingerprint";

export const ALLOW_REAL_RECOVERY: boolean = false;
export const REAL_RECOVERY_ENV_FLAG = "VITE_ALLOW_REAL_WORKSPACE_PARENT_RECOVERY";
export const REAL_RECOVERY_CONFIRMATION_PHRASE = "RESTORE ORPHAN WORKSPACE PARENT";
export const DEFAULT_RECOVERY_WORKSPACE_NAME = "김민준 workspace";

export const RECOVERY_CHILD_COLLECTIONS = [
  "members",
  "notices",
  "academicSchedules",
  "assignments",
  "lessons",
  "timetable",
  "timetableSets",
  "periodTimes",
  "afterschoolPrograms",
  "clubPrograms",
  "specialLecturePrograms",
  "attendance",
  "students",
  "materials",
  "exams",
  "homeLetters",
  "schoolNotices",
] as const;

export type RecoveryConfidence = "high" | "medium" | "low" | "none";
export type RecoveryFieldCategory =
  | "required-with-evidence"
  | "optional-with-evidence"
  | "no-evidence"
  | "recovery-forbidden";

export interface RecoveryFieldProposal {
  fieldName: string;
  proposedValueSummary: string;
  evidenceSource: string;
  confidence: RecoveryConfidence;
  category: RecoveryFieldCategory;
  includeInRecovery: boolean;
}

export interface RecoveryBlockingIssue {
  code: string;
  message: string;
}

export interface RecoveryWarning {
  code: string;
  message: string;
}

export interface ChildCollectionCount {
  name: string;
  count: number;
}

export interface RecoveryDryRunResult {
  dryRun: true;
  writeExecuted: false;
  authUserPresent: boolean;
  isSystemOwner: boolean;
  firebaseProjectFingerprint: string;
  recoveryFirebaseProjectFingerprint: string;
  appNextFirebaseProjectFingerprint: string;
  sameFirebaseProject: boolean;
  firebaseAppName: string;
  firebaseAppCount: number;
  databaseIdKind: "default";
  authUserFingerprint: string;
  targetWorkspaceFingerprint: string;
  parentWorkspaceExists: boolean;
  parentRecoveryRequired: boolean;
  canonicalMembershipExists: boolean;
  canonicalMembershipRole: string;
  canonicalMembershipStatus: string;
  canonicalMembershipActive: boolean;
  canonicalMembershipWillChange: false;
  legacyMembershipExists: boolean;
  legacyMembershipRole: string;
  legacyMembershipStatus: string;
  membershipRecoveryRequired: boolean;
  membershipWillBeModified: false;
  childCollectionCounts: ChildCollectionCount[];
  recoveryEvidenceSources: string[];
  proposedParentFields: RecoveryFieldProposal[];
  proposedMembershipFields: RecoveryFieldProposal[];
  parentPayloadPreview: RecoveryParentPayloadPreview | null;
  confirmedWorkspaceName: string;
  confirmedDisplayName: string;
  nameSource: "explicit-user-confirmation" | "missing";
  createdAtEvidenceFound: boolean;
  createdAtEvidenceKind: string;
  createdAtEvidenceSourceKind: string;
  createdAtWillBeIncluded: boolean;
  createdAtPreview: string;
  usersCurrentWorkspaceWillChange: false;
  childCollectionsWillMove: false;
  rulesWillChange: false;
  estimatedParentWriteCount: number;
  estimatedMembershipWriteCount: number;
  estimatedTotalWriteCount: number;
  estimatedWriteCount: number;
  blockingIssues: RecoveryBlockingIssue[];
  warnings: RecoveryWarning[];
  readyForParentRecovery: boolean;
  readyForRecovery: boolean;
}

export interface RecoveryPreflightInput {
  confirmedWorkspaceName: string;
  confirmedDisplayName?: string;
  confirmationPhrase?: string;
}

export interface RecoveryParentPayloadPreview {
  workspaceId: string;
  name: string;
  displayName: string;
  ownerUid: string;
  status: "active";
  createdAt: string;
  updatedAt: "serverTimestamp";
  createdBy: string;
}

export interface RecoveryExecutionReceipt {
  targetWorkspaceFingerprint: string;
  firebaseProjectFingerprint: string;
  authUserFingerprint: string;
  executionStartedAt: string;
  executionCompletedAt: string;
  parentWriteRequested: boolean;
  parentWriteCommitted: boolean;
  parentServerConfirmed: boolean;
  parentWorkspaceExistsAfterWrite: boolean;
  serverReadSucceededAfterWrite: boolean;
  workspaceFingerprintMatches: boolean;
  ownerFingerprintMatches: boolean;
  statusMatches: boolean;
  nameMatches: boolean;
  displayNameMatches: boolean;
  childCountsUnchanged: boolean;
  usersCurrentWorkspaceUnchanged: boolean;
  canonicalMembershipStillExists: boolean;
  canonicalMembershipUnchanged: boolean;
  legacyMembershipUnchanged: boolean;
  membershipWriteCount: 0;
  usersWriteCount: 0;
  childWriteCount: 0;
  childCountsBefore: ChildCollectionCount[];
  childCountsAfter: ChildCollectionCount[];
  sessionReloadSucceeded: boolean;
  noticeReadCountAfterRecovery: number;
  transportErrorKind: string;
}

export interface RecoveryExecutionGateInput {
  isDevelopment: boolean;
  isLocalHost: boolean;
  authenticated: boolean;
  status: string;
  isSystemOwner: boolean;
  sameFirebaseProject: boolean;
  targetWorkspaceMatchesUsersCurrentWorkspace: boolean;
  parentWorkspaceExists: boolean;
  childDataExists: boolean;
  canonicalMembershipExists: boolean;
  confirmedWorkspaceName: string;
  confirmedDisplayName: string;
  payloadPreviewConfirmed: boolean;
  confirmationPhrase: string;
  realRecoveryEnabled: boolean;
}

export type RecoverySessionGateFailureKind =
  | "none"
  | "auth-initializing"
  | "signed-out"
  | "session-load-failed"
  | "inactive-user"
  | "not-system-owner"
  | "missing-current-workspace"
  | "target-workspace-mismatch"
  | "unknown";

export type RecoveryGooglePopupResult =
  | "idle"
  | "pending"
  | "success"
  | "cancelled"
  | "failed";

export type RecoveryCoopWarningDisposition =
  | "none"
  | "benign-after-success"
  | "needs-investigation";

export interface RecoverySessionGateInput {
  authReady: boolean;
  phase: string;
  status?: string | null;
  authUserPresent: boolean;
  appSessionLoaded: boolean;
  isSystemOwner: boolean;
  currentWorkspaceId?: string | null;
  targetWorkspaceFingerprint?: string | null;
  expectedWorkspaceFingerprint?: string | null;
  writeApiDisabled: boolean;
  sessionErrorPresent?: boolean;
}

export interface RecoveryCoopWarningInput {
  googlePopupResult: RecoveryGooglePopupResult;
  authUserPresentAfterPopup: boolean;
  sessionResolvedAfterPopup: boolean;
}

export function isDevelopmentHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

export async function recoveryFingerprint(
  namespace: string,
  value: unknown,
): Promise<string> {
  const mappedNamespace: DiagnosticFingerprintNamespace = namespace === "project"
    ? "firebase-project"
    : namespace === "firebase-project" || namespace === "workspace" || namespace === "auth-user"
      ? namespace
      : "workspace";
  return diagnosticFingerprint(mappedNamespace, String(value ?? ""));
}

export function safeRole(value: unknown): string {
  const role = String(value ?? "").trim();
  return role || "-";
}

export function safeStatus(value: unknown): string {
  const status = String(value ?? "").trim();
  return status || "-";
}

export function hasChildData(counts: ChildCollectionCount[]): boolean {
  return counts.some((item) => item.count > 0);
}

export function normalizedRecoveryName(value: string | null | undefined): string {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function isRealRecoveryExecutionEnabled({
  isDevelopment,
  envFlag: _envFlag,
}: {
  isDevelopment: boolean;
  envFlag: boolean;
}): boolean {
  return ALLOW_REAL_RECOVERY === true
    && isDevelopment;
}

export function recoveryExecutionGateFailureReasons(
  input: RecoveryExecutionGateInput,
): string[] {
  const reasons: string[] = [];
  if (!input.realRecoveryEnabled) reasons.push("real-recovery-flag-disabled");
  if (!input.isDevelopment) reasons.push("not-development");
  if (!input.isLocalHost) reasons.push("not-localhost");
  if (!input.authenticated) reasons.push("not-authenticated");
  if (input.status !== "active") reasons.push("inactive-user");
  if (!input.isSystemOwner) reasons.push("not-system-owner");
  if (!input.sameFirebaseProject) reasons.push("firebase-project-mismatch");
  if (!input.targetWorkspaceMatchesUsersCurrentWorkspace) reasons.push("target-workspace-mismatch");
  if (input.parentWorkspaceExists) reasons.push("parent-workspace-already-exists");
  if (!input.childDataExists) reasons.push("child-data-missing");
  if (!input.canonicalMembershipExists) reasons.push("canonical-membership-missing");
  if (!normalizedRecoveryName(input.confirmedWorkspaceName)) reasons.push("workspace-name-missing");
  if (!normalizedRecoveryName(input.confirmedDisplayName)) reasons.push("display-name-missing");
  if (!input.payloadPreviewConfirmed) reasons.push("payload-preview-not-confirmed");
  if (input.confirmationPhrase !== REAL_RECOVERY_CONFIRMATION_PHRASE) reasons.push("confirmation-phrase-mismatch");
  return reasons;
}

export function canExecuteRealRecovery(input: RecoveryExecutionGateInput): boolean {
  return recoveryExecutionGateFailureReasons(input).length === 0;
}

function comparableFingerprint(value: string | null | undefined): boolean {
  return Boolean(value && value !== "-" && value !== "unavailable");
}

export function recoverySessionGateFailureKind(
  input: RecoverySessionGateInput,
): RecoverySessionGateFailureKind {
  if (!input.authReady || input.phase === "initializing" || input.phase === "loading_session") {
    return "auth-initializing";
  }

  if (input.phase === "signed_out" || !input.authUserPresent) {
    return "signed-out";
  }

  if (input.phase === "error" || input.sessionErrorPresent || !input.appSessionLoaded) {
    return "session-load-failed";
  }

  if (input.status !== "active") {
    return "inactive-user";
  }

  if (!input.isSystemOwner) {
    return "not-system-owner";
  }

  if (!String(input.currentWorkspaceId || "").trim()) {
    return "missing-current-workspace";
  }

  if (
    comparableFingerprint(input.expectedWorkspaceFingerprint)
    && comparableFingerprint(input.targetWorkspaceFingerprint)
    && input.expectedWorkspaceFingerprint !== input.targetWorkspaceFingerprint
  ) {
    return "target-workspace-mismatch";
  }

  return "none";
}

export function canRunRecoveryDryRun(input: RecoverySessionGateInput): boolean {
  return recoverySessionGateFailureKind(input) === "none";
}

export function recoveryCoopWarningDisposition(
  input: RecoveryCoopWarningInput,
): RecoveryCoopWarningDisposition {
  if (input.googlePopupResult !== "success") {
    return "none";
  }

  return input.authUserPresentAfterPopup && input.sessionResolvedAfterPopup
    ? "benign-after-success"
    : "needs-investigation";
}

export function executeRecovery(): never {
  throw new Error("Real recovery execution is disabled in this dry-run tool.");
}
