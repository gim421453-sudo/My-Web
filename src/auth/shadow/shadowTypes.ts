import type {
  AppSession,
  SessionWarning,
} from "../authTypes";

export interface LegacySessionSnapshot {
  uid: string | null;
  email: string | null;
  status: string | null;
  role: string | null;
  currentRole: string | null;
  globalRole: string | null;
  workspaceRole: string | null;
  currentWorkspaceId: string | null;
  workspaceId: string | null;
  isSystemOwner: boolean | null;
  isAuthenticated: boolean;
}

export type ShadowMismatchCode =
  | "UID_MISMATCH"
  | "AUTH_STATE_MISMATCH"
  | "STATUS_MISMATCH"
  | "SYSTEM_OWNER_MISMATCH"
  | "GLOBAL_ROLE_MISMATCH"
  | "WORKSPACE_ID_MISMATCH"
  | "WORKSPACE_ROLE_MISMATCH"
  | "LEGACY_SESSION_MISSING"
  | "NEW_SESSION_MISSING";

export type ShadowMismatchSeverity =
  | "info"
  | "warning"
  | "critical";

export interface ShadowMismatch {
  code: ShadowMismatchCode;
  severity: ShadowMismatchSeverity;
  message: string;
  legacyValue?: string | boolean | null;
  shadowValue?: string | boolean | null;
}

export interface ShadowSessionComparison {
  uidMatches: boolean;
  authenticationMatches: boolean;
  statusMatches: boolean;
  systemOwnerMatches: boolean;
  globalRoleMatches: boolean;
  workspaceIdMatches: boolean;
  workspaceRoleMatches: boolean;
  mismatches: ShadowMismatch[];
  warnings: SessionWarning[];
}

export interface ShadowSessionDiagnostic {
  legacySession: LegacySessionSnapshot | null;
  shadowSession: AppSession | null;
  comparison: ShadowSessionComparison;
  timestamp: string;
}

export interface ShadowLoggerPayload {
  timestamp: string;
  uid: string | null;
  email: string | null;
  comparison: Pick<
    ShadowSessionComparison,
    | "uidMatches"
    | "authenticationMatches"
    | "statusMatches"
    | "systemOwnerMatches"
    | "globalRoleMatches"
    | "workspaceIdMatches"
    | "workspaceRoleMatches"
  >;
  mismatches: Array<Pick<ShadowMismatch, "code" | "severity" | "message">>;
  warnings: Array<Pick<SessionWarning, "code" | "message">>;
}
