import type { WorkspaceRole } from "../../authz/authorizationTypes.js";

export const LEGACY_INVITATION_SOURCES = Object.freeze([
  "ROOT_INVITES",
  "ROOT_INVITATIONS",
  "NESTED_INVITE_CODES",
] as const);

export type LegacyInvitationSource = typeof LEGACY_INVITATION_SOURCES[number];

export interface LegacyInvitationSourceDocument {
  readonly source: LegacyInvitationSource;
  readonly documentId: string;
  readonly parentWorkspaceId?: string;
  readonly data: unknown;
}

export type LegacySourceClassification =
  | "SHARED_ROOTS"
  | "INVITES_ONLY"
  | "INVITATIONS_ONLY"
  | "ROOTS_AND_NESTED"
  | "NESTED_ONLY"
  | "ALL_THREE"
  | "SOURCE_CONFLICT"
  | "MALFORMED";

export type LegacyFieldComparisonResult =
  | "EXACT_MATCH"
  | "SAFE_NORMALIZATION"
  | "MISSING_ONE_SIDE"
  | "DIVERGENT"
  | "SEMANTIC_UNKNOWN"
  | "MALFORMED";

export type LegacySecretSecurityClassification =
  | "LEGACY_SECRET_VERIFIED_STRONG"
  | "LEGACY_SECRET_STRENGTH_UNKNOWN"
  | "LEGACY_SECRET_WEAK_OR_INVALID"
  | "LEGACY_SECRET_NOT_RELEVANT_INACTIVE";

export type LegacyMigrationDisposition =
  | "MIGRATABLE_CANONICAL"
  | "MIGRATABLE_ARCHIVE_ONLY"
  | "REISSUE_REQUIRED"
  | "NEEDS_WORKSPACE_RESOLUTION"
  | "NEEDS_ROLE_RESOLUTION"
  | "NEEDS_STATUS_RESOLUTION"
  | "NEEDS_USAGE_RESOLUTION"
  | "NEEDS_SECRET_SECURITY_REVIEW"
  | "SOURCE_CONFLICT"
  | "MALFORMED"
  | "ALREADY_MIGRATED"
  | "MANUAL_REVIEW";

export type LegacyWorkspaceResolution = "VALID" | "MISSING" | "AMBIGUOUS" | "UNKNOWN";

export interface LegacyCanonicalCollision {
  readonly canonicalInvitationExists: boolean;
  readonly codeHashIndexExists: boolean;
  readonly migrationFingerprintConsumed: boolean;
}

export interface LegacyInvitationClassifierOptions {
  readonly nowMillis: number;
  readonly resolveWorkspace?: (workspaceId: string) => LegacyWorkspaceResolution;
  readonly assessSecret?: (
    legacyGroupFingerprint: string,
  ) => LegacySecretSecurityClassification;
  readonly resolveCollision?: (
    legacyGroupFingerprint: string,
  ) => LegacyCanonicalCollision;
}

export interface LegacyFieldComparison {
  readonly field: string;
  readonly result: LegacyFieldComparisonResult;
  readonly reasonCode: string;
}

export interface LegacySourceSummary {
  readonly source: LegacyInvitationSource;
  readonly sourceFingerprint: string;
}

export interface LegacyInvitationDryRunManifest {
  readonly schemaVersion: 1;
  readonly legacyGroupFingerprint: string;
  readonly sources: readonly LegacySourceSummary[];
  readonly sourceClassification: LegacySourceClassification;
  readonly fieldComparisons: readonly LegacyFieldComparison[];
  readonly migrationDisposition: LegacyMigrationDisposition;
  readonly workspaceResolution: Readonly<{
    state: LegacyWorkspaceResolution | "MALFORMED";
    workspaceFingerprint: string | null;
  }>;
  readonly roleResolution: Readonly<{
    state: "RESOLVED" | "MISSING" | "INVALID" | "CONFLICT" | "UNKNOWN";
    targetRole: WorkspaceRole | null;
  }>;
  readonly statusResolution: Readonly<{
    state: "RESOLVED" | "MISSING" | "INVALID" | "CONFLICT" | "UNKNOWN";
    canonicalStatus: "active" | "consumed" | "revoked" | null;
    historicalInactive: boolean;
  }>;
  readonly usageResolution: Readonly<{
    state: "RESOLVED" | "MISSING" | "INVALID" | "CONFLICT" | "UNKNOWN";
    maxUses: number | null;
    usedCount: number | null;
  }>;
  readonly expirationResolution: Readonly<{
    state: "RESOLVED" | "MISSING" | "INVALID" | "CONFLICT" | "UNKNOWN" | "NO_EXPIRY";
    expiresAtMillis: number | null;
  }>;
  readonly creatorResolution: Readonly<{
    state: "RESOLVED" | "MISSING" | "INVALID" | "CONFLICT" | "UNKNOWN";
    creatorFingerprint: string | null;
  }>;
  readonly secretSecurityClassification: LegacySecretSecurityClassification;
  readonly collisionResolution: Readonly<LegacyCanonicalCollision>;
  readonly canonicalPlan: Readonly<{
    action: "CREATE_CANONICAL" | "ARCHIVE_ONLY" | "REISSUE" | "NONE";
    invitationIdStrategy: "KEYED_DETERMINISTIC_V1";
    invitationId: null;
    requiresExecutionKey: true;
    preserveLegacyCode: boolean;
    createCodeHashIndex: boolean;
    targetRole: WorkspaceRole | null;
    status: "active" | "consumed" | "revoked" | null;
    maxUses: number | null;
    usedCount: number | null;
    expiresAtMillis: number | null;
    revokeAuthority: "CANONICAL_CREATOR_OR_ADMIN" | "WORKSPACE_ADMIN_OR_SYSTEM_OWNER";
    executionWriteImplemented: false;
  }>;
  readonly recommendedAction:
    | "EXECUTE_APPROVED_MIGRATION"
    | "ARCHIVE_WITHOUT_REDEEM_INDEX"
    | "ISSUE_NEW_CANONICAL_INVITATION"
    | "MANUAL_REVIEW";
  readonly reasonCodes: readonly string[];
}

export interface LegacyMigrationExecutionContract {
  readonly approvedManifestRequired: true;
  readonly productionBackupRequired: true;
  readonly collisionPreflightRequired: true;
  readonly idempotentTransactionRequired: true;
  readonly postWriteVerificationRequired: true;
  readonly legacyQuarantineOrWriteBlockRequired: true;
  readonly rollbackManifestRequired: true;
  readonly executionWriterImplemented: false;
}

export const LEGACY_MIGRATION_EXECUTION_CONTRACT: LegacyMigrationExecutionContract = Object.freeze({
  approvedManifestRequired: true,
  productionBackupRequired: true,
  collisionPreflightRequired: true,
  idempotentTransactionRequired: true,
  postWriteVerificationRequired: true,
  legacyQuarantineOrWriteBlockRequired: true,
  rollbackManifestRequired: true,
  executionWriterImplemented: false,
});
