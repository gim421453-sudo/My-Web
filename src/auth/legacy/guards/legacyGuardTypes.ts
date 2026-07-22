import type {
  AuthPhase,
} from "../../authTypes";
import type {
  WorkspaceRole,
} from "../../../permissions/roles";
import type {
  LegacyAuthAdapterSession,
} from "../legacyAuthAdapterTypes";

export type GuardLoadingReason =
  | "AUTH_INITIALIZING"
  | "SESSION_LOADING";

export type GuardAllowReason =
  | "AUTHENTICATED_ACTIVE"
  | "SYSTEM_OWNER"
  | "WORKSPACE_ROLE_ALLOWED"
  | "AUTHENTICATED_WITHOUT_WORKSPACE";

export type GuardDenyReason =
  | "SIGNED_OUT"
  | "ACCOUNT_PENDING"
  | "ACCOUNT_REJECTED"
  | "ACCOUNT_DISABLED"
  | "WORKSPACE_REQUIRED"
  | "WORKSPACE_ROLE_MISSING"
  | "WORKSPACE_ROLE_NOT_ALLOWED"
  | "SESSION_ERROR";

export type GuardReason =
  | GuardLoadingReason
  | GuardAllowReason
  | GuardDenyReason;

export type GuardExpectedDestination =
  | "/login"
  | "/pending"
  | "/rejected"
  | "/disabled"
  | "/workspace-select"
  | "/forbidden"
  | null;

export type GuardDecision =
  | {
      state: "loading";
      allow: false;
      reason: GuardLoadingReason;
      expectedDestination: null;
    }
  | {
      state: "allow";
      allow: true;
      reason: GuardAllowReason;
      expectedDestination: null;
    }
  | {
      state: "deny";
      allow: false;
      reason: GuardDenyReason;
      expectedDestination: GuardExpectedDestination;
    };

export interface LegacyGuardInput {
  phase: AuthPhase;
  loading: boolean;
  session: LegacyAuthAdapterSession | null;
  isAuthenticated: boolean;
  status: LegacyAuthAdapterSession["status"] | null;
  currentRole: WorkspaceRole | null;
  workspaceId: string | null;
  isSystemOwner: boolean;
  error: string | null;
}

export interface LegacyWorkspaceGuardInput extends LegacyGuardInput {
  allowedRoles: readonly WorkspaceRole[];
  requireWorkspace?: boolean;
  allowSystemOwnerBypass?: boolean;
}

export interface ResolveLegacyAuthGuardPreviewFlagInput {
  search?: string;
  envValue?: unknown;
  isDev?: boolean;
}
