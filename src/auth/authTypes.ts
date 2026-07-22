import type { User } from "firebase/auth";
import type { GlobalRole, WorkspaceRole } from "../permissions/roles";

export type AccountStatus =
  | "pending"
  | "active"
  | "rejected"
  | "disabled";

export const ACCOUNT_STATUSES: readonly AccountStatus[] = [
  "pending",
  "active",
  "rejected",
  "disabled",
];

export type AuthPhase =
  | "initializing"
  | "signed_out"
  | "loading_session"
  | "authenticated"
  | "account_action_required"
  | "error";

export type SessionWarningCode =
  | "LEGACY_STATUS_FIELDS_PRESENT"
  | "STATUS_FIELD_CONFLICT"
  | "GLOBAL_ROLE_MISMATCH"
  | "LEGACY_ROLE_PRESENT"
  | "LEGACY_MEMBERSHIP_PRESENT"
  | "WORKSPACE_NOT_FOUND"
  | "MEMBERSHIP_NOT_FOUND"
  | "INVALID_WORKSPACE_ROLE"
  | "USER_DOCUMENT_MISSING"
  | "WORKSPACE_MEMBER_MISSING"
  | "LEGACY_ONLY_MEMBERSHIP"
  | "SYSTEM_OWNER_DOCUMENT_MISSING"
  | "INVALID_GLOBAL_ROLE"
  | "INVALID_STATUS"
  | "CURRENT_WORKSPACE_NOT_ACCESSIBLE"
  | "SESSION_READ_PERMISSION_DENIED"
  | "SESSION_READ_QUOTA_EXCEEDED"
  | "SESSION_READ_NETWORK_ERROR";

export interface SessionWarning {
  code: SessionWarningCode;
  message: string;
  details?: Record<string, unknown>;
}

export type WorkspaceResolutionFailureKind =
  | "none"
  | "workspace-document-missing"
  | "canonical-membership-missing"
  | "membership-inactive"
  | "membership-role-missing"
  | "system-owner-membership-required"
  | "server-current-workspace-missing"
  | "unknown";

export interface WorkspaceResolutionDiagnostics {
  serverCurrentWorkspacePresent: boolean;
  serverCurrentWorkspaceDocumentExists: boolean;
  canonicalMembershipExists: boolean;
  canonicalMembershipStatus: string | null;
  canonicalMembershipRole: string | null;
  legacyMembershipExists: boolean;
  legacyMembershipStatus: string | null;
  legacyMembershipRole: string | null;
  isSystemOwnerResolved: boolean;
  systemOwnerWorkspaceAccessAllowed: boolean;
  workspaceResolutionFailureKind: WorkspaceResolutionFailureKind;
}

export interface AppSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  status: AccountStatus;
  globalRole: GlobalRole;
  currentWorkspaceId: string | null;
  currentWorkspaceRole: WorkspaceRole | null;
  isSystemOwner: boolean;
  isAuthenticated: boolean;
  warnings: SessionWarning[];
  workspaceResolution?: WorkspaceResolutionDiagnostics;
}

export interface UserDocumentData {
  uid?: unknown;
  email?: unknown;
  displayName?: unknown;
  status?: unknown;
  globalRole?: unknown;
  role?: unknown;
  currentRole?: unknown;
  workspaceRole?: unknown;
  currentWorkspaceId?: unknown;
  workspaceId?: unknown;
  workspace_id?: unknown;
  active?: unknown;
  disabled?: unknown;
}

export interface AuthContextValue {
  phase: AuthPhase;
  firebaseUser: User | null;
  session: AppSession | null;
  error: import("./authErrors").AuthSessionError | null;
  signInWithEmail(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  reloadSession(): Promise<void>;
  switchWorkspace(workspaceId: string | null): Promise<void>;
}

export interface PostLoginTask {
  name: string;
  blocking: false;
  run(session: AppSession): Promise<void>;
}
